const db = require('../database');
const d365Api = require('../api/dynamics365');
const labelService = require('./labelService');

let isAutoLabelingEnabled = true;

const getAutoLabelingStatus = () => isAutoLabelingEnabled;
const setAutoLabelingStatus = (status) => {
  console.log(`Setting auto-processing to: ${status}`);
  isAutoLabelingEnabled = !!status;
};

const getStatusFromTags = (tagIds, allTagsMap) => {
  const orderTags = new Set((tagIds || []).map(id => allTagsMap[id]));
  // TODO: Update these tag names to match your ShipStation tags exactly
  if (orderTags.has('Replacement Order')) return 'Pending Approval';
  if (orderTags.has('Pallet')) return 'Pending Pallet Processing';
  return 'Ready for Processing';
};

const processNewOrders = (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return;

  const allTags = db.prepare('SELECT tag_id, name FROM tags').all().reduce((acc, tag) => {
      acc[tag.tag_id] = tag.name;
      return acc;
  }, {});

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO orders (
      shipstation_order_id, order_number, internal_status, customer_email,
      ship_to_name, ship_to_city, ship_to_state, ship_to_postal_code, ship_to_country,
      order_date, order_total, requested_shipping_service, items_json, tag_ids
    ) VALUES (
      @shipstation_order_id, @order_number, @internal_status, @customer_email,
      @ship_to_name, @ship_to_city, @ship_to_state, @ship_to_postal_code, @ship_to_country,
      @order_date, @order_total, @requested_shipping_service, @items_json, @tag_ids
    )
  `);

  const insertMany = db.transaction((items) => {
    for (const order of items) {
      order.items.forEach(item => {
        item.resolvedSku = item.fulfillmentSku || item.sku;
      });

      insertStmt.run({
        shipstation_order_id: order.orderId,
        order_number: order.orderNumber,
        internal_status: getStatusFromTags(order.tagIds, allTags),
        customer_email: order.customerEmail,
        ship_to_name: order.shipTo.name,
        ship_to_city: order.shipTo.city,
        ship_to_state: order.shipTo.state,
        ship_to_postal_code: order.shipTo.postalCode,
        ship_to_country: order.shipTo.country,
        order_date: order.orderDate,
        order_total: order.orderTotal,
        requested_shipping_service: order.requestedShippingService,
        items_json: JSON.stringify(order.items),
        tag_ids: JSON.stringify(order.tagIds || [])
      });
    }
  });

  insertMany(orders);
  processReadyOrders();
};

const processReadyOrders = async () => {
  if (!isAutoLabelingEnabled) {
    console.log('Auto-processing is currently OFF. Skipping processing.');
    return;
  }
  const ordersToProcess = db.prepare("SELECT * FROM orders WHERE internal_status = 'Ready for Processing'").all();
  if (ordersToProcess.length === 0) return;

  console.log(`Found ${ordersToProcess.length} orders to process.`);
  for (const orderRow of ordersToProcess) {
    await processSingleOrder(orderRow.shipstation_order_id, orderRow);
  }
};

const processSingleOrder = async (orderId, orderRow = null) => {
  const orderData = orderRow || db.prepare('SELECT * FROM orders WHERE shipstation_order_id = ?').get(orderId);
  if (!orderData) throw new Error('Order not found for processing.');

  const orderWithTags = addTagsToOrders([orderData])[0] || orderData;
  const tags = orderWithTags.tags || [];
  const isCaseOrder = tags.some(tag => /\bcase(s)?\b/i.test(tag));

  if (isCaseOrder) {
    console.log(`Order ${orderData.order_number} has Case tag(s); creating multipack label.`);
  }

  try {
    const labelResult = await labelService.createLabelForOrder(orderWithTags, { multipack: isCaseOrder });
    saveLabelUrls(orderData.shipstation_order_id, labelResult.labelUrls || []);
  } catch (error) {
    console.error(`Failed to generate label for order ${orderData.order_number}:`, error.message || error);
    throw new Error('Failed to create shipping label in ShipStation.');
  }

  console.log(`--- SIMULATING D365 INTEGRATION FOR ORDER: ${orderData.order_number} ---`);
  archiveOrder(orderData.shipstation_order_id, 'Synced', orderData.order_number);
  console.log(`Successfully SIMULATED and archived order ${orderData.order_number}.`);
};

const parseLabelUrls = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to parse stored label URLs:', error.message);
    return [];
  }
};

const addTagsToOrders = (orders) => {
  const allTags = db.prepare('SELECT tag_id, name FROM tags').all().reduce((acc, tag) => {
    acc[tag.tag_id] = tag.name;
    return acc;
  }, {});

  return orders.map(order => ({
    ...order,
    tags: JSON.parse(order.tag_ids || '[]').map(id => allTags[id]).filter(Boolean),
    labelUrls: parseLabelUrls(order.label_urls)
  }));
};

const getAllOrders = () => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  return addTagsToOrders(orders);
};

const getOrderById = (shipstationOrderId) => {
  const order = db.prepare('SELECT * FROM orders WHERE shipstation_order_id = ?').get(shipstationOrderId);
  if (order) {
    order.items = JSON.parse(order.items_json || '[]');
    const decorated = addTagsToOrders([order])[0];
    order.tags = decorated.tags;
    order.labelUrls = decorated.labelUrls;
  }
  return order;
};

const updateOrderStatus = (shipstationOrderId, newStatus, d365SalesOrderId = null) => {
  const stmt = db.prepare('UPDATE orders SET internal_status = ?, d365_sales_order_id = ? WHERE shipstation_order_id = ?');
  return stmt.run(newStatus, d365SalesOrderId, shipstationOrderId).changes > 0;
};

const saveLabelUrls = (shipstationOrderId, labelUrls = []) => {
  const normalized = Array.isArray(labelUrls) ? labelUrls : [];
  const stmt = db.prepare('UPDATE orders SET label_urls = ? WHERE shipstation_order_id = ?');
  stmt.run(JSON.stringify(normalized), shipstationOrderId);
};

const approveOrder = (orderId) => {
  const success = updateOrderStatus(orderId, 'Ready for Processing');
  if (success) {
    processReadyOrders();
  }
  return success;
};

const archiveOrder = (orderId, finalStatus, d365Id) => {
  const order = db.prepare('SELECT * FROM orders WHERE shipstation_order_id = ?').get(orderId);
  if (!order) return false;

  const insertArchive = db.prepare(`
    INSERT OR REPLACE INTO archive (
      shipstation_order_id, order_number, d365_sales_order_id, internal_status,
      customer_email, ship_to_name, ship_to_city, ship_to_state, ship_to_postal_code,
      ship_to_country, order_date, order_total, requested_shipping_service, items_json,
      label_urls, tag_ids, created_at
    ) VALUES (
      @shipstation_order_id, @order_number, @d365_sales_order_id, @internal_status,
      @customer_email, @ship_to_name, @ship_to_city, @ship_to_state, @ship_to_postal_code,
      @ship_to_country, @order_date, @order_total, @requested_shipping_service, @items_json,
      @label_urls, @tag_ids, @created_at
    )
  `);

  const deleteLive = db.prepare('DELETE FROM orders WHERE shipstation_order_id = ?');

  db.transaction(() => {
    order.internal_status = finalStatus;
    order.d365_sales_order_id = d365Id;
    insertArchive.run(order);
    deleteLive.run(orderId);
  })();
  return true;
};

const deleteOrder = (orderId) => {
  return db.prepare('DELETE FROM orders WHERE shipstation_order_id = ?').run(orderId).changes > 0;
};

const getArchivedOrders = () => {
  const orders = db.prepare('SELECT * FROM archive ORDER BY created_at DESC').all();
  return addTagsToOrders(orders);
};

module.exports = {
  getAutoLabelingStatus, setAutoLabelingStatus, processNewOrders,
  processReadyOrders, processSingleOrder, getAllOrders, getOrderById,
  approveOrder, archiveOrder, deleteOrder, getArchivedOrders
};

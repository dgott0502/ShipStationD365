const db = require('../database');
const d365Api = require('../api/dynamics365');

let isAutoLabelingEnabled = true;

const getAutoLabelingStatus = () => isAutoLabelingEnabled;
const setAutoLabelingStatus = (status) => {
  console.log(`Setting auto-processing to: ${status}`);
  isAutoLabelingEnabled = !!status;
};

const getStatusFromTags = (tagIds, allTagsMap) => {
  const orderTags = new Set((tagIds || []).map(id => allTagsMap[id]));
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

const processReadyOrders = async () => { /* ... (code from previous response) ... */ };
const processSingleOrder = async (orderId, orderRow = null) => { /* ... (code from previous response with simulation) ... */ };

const addTagsToOrders = (orders) => {
  const allTags = db.prepare('SELECT tag_id, name FROM tags').all().reduce((acc, tag) => {
    acc[tag.tag_id] = tag.name;
    return acc;
  }, {});

  return orders.map(order => ({
    ...order,
    tags: JSON.parse(order.tag_ids || '[]').map(id => allTags[id]).filter(Boolean)
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
    const allTags = db.prepare('SELECT tag_id, name FROM tags').all().reduce((acc, tag) => {
        acc[tag.tag_id] = tag.name;
        return acc;
    }, {});
    order.tags = JSON.parse(order.tag_ids || '[]').map(id => allTags[id]).filter(Boolean);
  }
  return order;
};

// ... (Other functions: approveOrder, archiveOrder, deleteOrder, etc. from previous responses)

module.exports = {
  getAutoLabelingStatus, setAutoLabelingStatus, processNewOrders,
  processReadyOrders, processSingleOrder, getAllOrders, getOrderById,
  approveOrder, archiveOrder, deleteOrder, getArchivedOrders
};
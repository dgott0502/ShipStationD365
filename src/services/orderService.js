const db = require('../database');
const d365Api = require('../api/dynamics365');

// --- Global Setting for Auto-Processing ---
let isAutoLabelingEnabled = true;

// --- Functions to control the toggle ---
const getAutoLabelingStatus = () => isAutoLabelingEnabled;
const setAutoLabelingStatus = (status) => {
  console.log(`Setting auto-processing to: ${status}`);
  isAutoLabelingEnabled = !!status;
};

// --- Main Processing Functions ---

// Insert incoming ShipStation orders into the local orders table.
const processNewOrders = (orders = []) => {
  if (!Array.isArray(orders) || orders.length === 0) return;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO orders (
      shipstation_order_id, order_number, internal_status, customer_email,
      ship_to_name, ship_to_city, ship_to_state, ship_to_postal_code,
      ship_to_country, order_date, order_total, requested_shipping_service,
      items_json, label_urls
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();

  const insertMany = db.transaction((items) => {
    for (const o of items) {
      const shipstationId = o.orderId || o.id || o.shipstation_order_id || null;
      const orderNum = o.orderNumber || o.order_number || '';
      const customerEmail = (o.customer && o.customer.username) || o.customerEmail || o.customer_email || '';
      const shipTo = o.shipTo || o.shipping || {};
      const shipName = shipTo.name || shipTo.shipTo || '';
      const city = shipTo.city || '';
      const state = shipTo.state || '';
      const postal = shipTo.postalCode || shipTo.postal || shipTo.postal_code || '';
      const country = shipTo.country || '';
      const orderDate = o.orderDate || o.createDate || o.order_date || now;
      const orderTotal = o.orderTotal || o.amountPaid || o.order_total || 0;
      const service = (o.requestedShippingService || o.requested_shipping_service) || '';
      const itemsJson = JSON.stringify(o.items || o.orderItems || []);

      insertStmt.run(
        shipstationId,
        orderNum,
        'Pending Approval',
        customerEmail,
        shipName,
        city,
        state,
        postal,
        country,
        orderDate,
        orderTotal,
        service,
        itemsJson,
        ''
      );
    }
  });

  try {
    insertMany(orders);
    console.log(`Inserted ${orders.length} orders from ShipStation (duplicates ignored).`);
  } catch (err) {
    console.error('Failed to insert new orders:', err);
  }
};

const processReadyOrders = async () => {
  if (!isAutoLabelingEnabled) {
    console.log('Auto-processing is currently OFF. Skipping processing.');
    return;
  }
  const ordersToProcess = db.prepare("SELECT * FROM orders WHERE internal_status = 'Ready for Processing'").all();
  if (!ordersToProcess || ordersToProcess.length === 0) return;

  console.log(`Found ${ordersToProcess.length} orders to process.`);
  for (const orderRow of ordersToProcess) {
    try {
      await processSingleOrder(orderRow.shipstation_order_id, orderRow);
    } catch (err) {
      console.error('Error processing order', orderRow.shipstation_order_id, err);
    }
  }
};

// This function simulates or performs the D365 integration for a single order.
const processSingleOrder = async (orderId, orderRow = null) => {
  const orderData = orderRow || db.prepare("SELECT * FROM orders WHERE shipstation_order_id = ?").get(orderId);
  if (!orderData) throw new Error('Order not found.');

  // Simulation: move to archive immediately.
  console.log(`--- SIMULATING D365 INTEGRATION FOR ORDER: ${orderData.order_number} ---`);
  archiveOrder(orderData.shipstation_order_id);
  console.log(`Successfully SIMULATED and archived order ${orderData.order_number}.`);

  /*
  // If you re-enable real D365 integration, use this pattern:
  updateOrderStatus(orderData.shipstation_order_id, 'Processing');
  try {
    const orderForMapping = {
      orderNumber: orderData.order_number,
      customerUsername: orderData.customer_email,
      items: JSON.parse(orderData.items_json || '[]')
    };
    const d365Payload = mapOrderToD365(orderForMapping);
    await d365Api.createSalesOrder(d365Payload);
    archiveOrder(orderData.shipstation_order_id);
    console.log(`Successfully processed and archived order ${orderData.order_number}.`);
  } catch (error) {
    console.error(`Failed to process order ${orderData.order_number}. Flagging as error.`, error);
    updateOrderStatus(orderData.shipstation_order_id, 'Error');
    throw error;
  }
  */
};

// --- Database Helper Functions ---
const getAllOrders = () => {
  return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
};

const getOrderById = (shipstationOrderId) => {
  return db.prepare('SELECT * FROM orders WHERE shipstation_order_id = ?').get(shipstationOrderId);
};

const updateOrderStatus = (shipstationOrderId, newStatus, d365SalesOrderId = null) => {
  const stmt = db.prepare('UPDATE orders SET internal_status = ?, d365_sales_order_id = ? WHERE shipstation_order_id = ?');
  const info = stmt.run(newStatus, d365SalesOrderId, shipstationOrderId);
  return info.changes > 0;
};

const approveOrder = (orderId) => {
  // Set internal status to 'Ready for Processing'
  return updateOrderStatus(orderId, 'Ready for Processing');
};

const archiveOrder = (orderId) => {
  const order = db.prepare('SELECT * FROM orders WHERE shipstation_order_id = ?').get(orderId);
  if (!order) return false;

  const insertArchive = db.prepare(`
    INSERT OR REPLACE INTO archive (
      shipstation_order_id, order_number, d365_sales_order_id, internal_status,
      customer_email, ship_to_name, ship_to_city, ship_to_state, ship_to_postal_code,
      ship_to_country, order_date, order_total, requested_shipping_service, items_json,
      label_urls, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const del = db.prepare('DELETE FROM orders WHERE shipstation_order_id = ?');

  const tx = db.transaction(() => {
    insertArchive.run(
      order.shipstation_order_id,
      order.order_number,
      order.d365_sales_order_id,
      order.internal_status,
      order.customer_email,
      order.ship_to_name,
      order.ship_to_city,
      order.ship_to_state,
      order.ship_to_postal_code,
      order.ship_to_country,
      order.order_date,
      order.order_total,
      order.requested_shipping_service,
      order.items_json,
      order.label_urls,
      order.created_at || new Date().toISOString()
    );
    del.run(orderId);
  });

  try {
    tx();
    return true;
  } catch (err) {
    console.error('Failed to archive order:', err);
    return false;
  }
};

const deleteOrder = (orderId) => {
  const stmt = db.prepare('DELETE FROM orders WHERE shipstation_order_id = ?');
  const info = stmt.run(orderId);
  return info.changes > 0;
};

const getArchivedOrders = () => {
  return db.prepare('SELECT * FROM archive ORDER BY created_at DESC').all();
};

// --- Data Mapping Function ---
const getUomForSku = (sku) => {
  const row = db.prepare('SELECT uom FROM uom_lookup WHERE sku = ?').get(sku);
  return row ? row.uom : 'ea';
};

const mapOrderToD365 = (order) => {
  // Minimal mapping - expand this when you re-enable D365 integration
  const header = {
    SalesOrderNumber: order.orderNumber || '',
    AccountNumber: order.customerUsername || ''
  };

  const lines = (order.items || []).map((it, idx) => ({
    LineNumber: idx + 1,
    ItemNumber: it.sku || it.itemId || '',
    QuantityOrdered: it.quantity || it.qty || 1,
    SalesUnitSymbol: getUomForSku(it.sku || it.itemId || '')
  }));

  return { header, lines };
};

// --- Module Exports ---
module.exports = {
  getAutoLabelingStatus,
  setAutoLabelingStatus,
  processNewOrders,
  processReadyOrders,
  processSingleOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  approveOrder,
  archiveOrder,
  deleteOrder,
  getArchivedOrders,
  getUomForSku,
  mapOrderToD365
};
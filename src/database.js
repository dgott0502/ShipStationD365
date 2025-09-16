const Database = require('better-sqlite3');
const db = new Database('history.db');

const createOrdersTableStmt = `
  CREATE TABLE IF NOT EXISTS orders (
    shipstation_order_id INTEGER PRIMARY KEY, order_number TEXT NOT NULL, d365_sales_order_id TEXT,
    internal_status TEXT NOT NULL, customer_email TEXT, ship_to_name TEXT, ship_to_city TEXT,
    ship_to_state TEXT, ship_to_postal_code TEXT, ship_to_country TEXT, order_date TEXT,
    order_total REAL, requested_shipping_service TEXT, items_json TEXT, label_urls TEXT,
    tag_ids TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;
db.exec(createOrdersTableStmt);

const createArchiveTableStmt = `
  CREATE TABLE IF NOT EXISTS archive (
    shipstation_order_id INTEGER PRIMARY KEY, order_number TEXT NOT NULL, d365_sales_order_id TEXT,
    internal_status TEXT NOT NULL, customer_email TEXT, ship_to_name TEXT, ship_to_city TEXT,
    ship_to_state TEXT, ship_to_postal_code TEXT, ship_to_country TEXT, order_date TEXT,
    order_total REAL, requested_shipping_service TEXT, items_json TEXT, label_urls TEXT,
    tag_ids TEXT,
    created_at TEXT
  );
`;
db.exec(createArchiveTableStmt);

const createUomTableStmt = `
  CREATE TABLE IF NOT EXISTS uom_lookup (
    sku TEXT PRIMARY KEY,
    uom TEXT NOT NULL
  );
`;
db.exec(createUomTableStmt);

const createTagsTableStmt = `
  CREATE TABLE IF NOT EXISTS tags (
    tag_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );
`;
db.exec(createTagsTableStmt);

module.exports = db;
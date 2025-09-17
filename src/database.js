const Database = require('better-sqlite3');
const db = new Database('history.db');
db.pragma('foreign_keys = ON');

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

const createProductsTableStmt = `
  CREATE TABLE IF NOT EXISTS products (
    product_id INTEGER PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT,
    fulfillment_sku TEXT COLLATE NOCASE,
    weight_value REAL,
    weight_unit TEXT,
    length REAL,
    width REAL,
    height REAL,
    dimension_unit TEXT,
    modify_date TEXT,
    active INTEGER DEFAULT 1,
    aliases_json TEXT,
    raw_json TEXT
  );
`;
db.exec(createProductsTableStmt);

const createProductAliasTableStmt = `
  CREATE TABLE IF NOT EXISTS product_aliases (
    alias TEXT PRIMARY KEY COLLATE NOCASE,
    product_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
  );
`;
db.exec(createProductAliasTableStmt);

const createFulfillmentSkuIndexStmt = `
  CREATE INDEX IF NOT EXISTS idx_products_fulfillment_sku
  ON products(fulfillment_sku);
`;
db.exec(createFulfillmentSkuIndexStmt);

module.exports = db;

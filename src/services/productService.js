const db = require('../database');
const config = require('../config');
const shipstationApi = require('../api/shipstation');

const sanitizeString = (value) => {
  if (value === null || value === undefined) return null;
  const stringValue = typeof value === 'string' ? value : String(value);
  const trimmed = stringValue.trim();
  return trimmed || null;
};

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const parseAliasStrings = (product) => {
  if (!product || !Array.isArray(product.aliases)) return [];

  const seen = new Set();
  const aliases = [];

  product.aliases.forEach((alias) => {
    if (!alias) return;

    let aliasValue = null;
    if (typeof alias === 'string') {
      aliasValue = alias;
    } else if (typeof alias === 'object') {
      aliasValue = alias.sku_alias || alias.sku || alias.alias;
    }

    const sanitized = sanitizeString(aliasValue);
    if (!sanitized) return;

    const normalized = sanitized.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      aliases.push(sanitized);
    }
  });

  return aliases;
};

const mapApiProductToRecord = (product) => {
  if (!product || typeof product !== 'object') return null;

  const productId = toNumberOrNull(product.product_id ?? product.productId);
  const sku = sanitizeString(product.sku);

  if (!productId || !sku) {
    return null;
  }

  const fulfillmentSku = sanitizeString(product.fulfillment_sku ?? product.fulfillmentSku);
  const weight = product.weight || {};
  const dimensions = product.dimensions || {};
  const aliasStrings = parseAliasStrings(product);

  return {
    record: {
      product_id: productId,
      sku,
      name: sanitizeString(product.name),
      fulfillment_sku: fulfillmentSku,
      weight_value: toNumberOrNull(weight.value),
      weight_unit: sanitizeString(weight.unit),
      length: toNumberOrNull(dimensions.length),
      width: toNumberOrNull(dimensions.width),
      height: toNumberOrNull(dimensions.height),
      dimension_unit: sanitizeString(dimensions.unit),
      modify_date: sanitizeString(product.modify_date ?? product.modifyDate),
      active: product.active === false ? 0 : 1,
      aliases_json: JSON.stringify(aliasStrings),
      raw_json: JSON.stringify(product)
    },
    aliases: aliasStrings
  };
};

const upsertProductStmt = db.prepare(`
  INSERT INTO products (
    product_id, sku, name, fulfillment_sku, weight_value, weight_unit,
    length, width, height, dimension_unit, modify_date, active,
    aliases_json, raw_json
  ) VALUES (
    @product_id, @sku, @name, @fulfillment_sku, @weight_value, @weight_unit,
    @length, @width, @height, @dimension_unit, @modify_date, @active,
    @aliases_json, @raw_json
  )
  ON CONFLICT(product_id) DO UPDATE SET
    sku = excluded.sku,
    name = excluded.name,
    fulfillment_sku = excluded.fulfillment_sku,
    weight_value = excluded.weight_value,
    weight_unit = excluded.weight_unit,
    length = excluded.length,
    width = excluded.width,
    height = excluded.height,
    dimension_unit = excluded.dimension_unit,
    modify_date = excluded.modify_date,
    active = excluded.active,
    aliases_json = excluded.aliases_json,
    raw_json = excluded.raw_json
`);

const deleteAliasesStmt = db.prepare('DELETE FROM product_aliases WHERE product_id = ?');

const upsertAliasStmt = db.prepare(`
  INSERT INTO product_aliases (product_id, alias)
  VALUES (?, ?)
  ON CONFLICT(alias) DO UPDATE SET product_id = excluded.product_id
`);

const upsertProducts = (products = []) => {
  if (!Array.isArray(products) || products.length === 0) return 0;

  const transaction = db.transaction((productList) => {
    let processed = 0;

    for (const product of productList) {
      const mapped = mapApiProductToRecord(product);
      if (!mapped) continue;

      upsertProductStmt.run(mapped.record);
      deleteAliasesStmt.run(mapped.record.product_id);
      for (const alias of mapped.aliases) {
        upsertAliasStmt.run(mapped.record.product_id, alias);
      }
      processed += 1;
    }

    return processed;
  });

  return transaction(products);
};

const parseAliasesFromJson = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(sanitizeString).filter(Boolean);
    }
  } catch (error) {
    console.warn('Unable to parse stored product aliases:', error.message);
  }
  return [];
};

const mapRowToProduct = (row = {}) => {
  if (!row || typeof row !== 'object') return null;

  const weightValue = toNumberOrNull(row.weight_value);
  const length = toNumberOrNull(row.length);
  const width = toNumberOrNull(row.width);
  const height = toNumberOrNull(row.height);
  const aliases = parseAliasesFromJson(row.aliases_json);

  const product = {
    productId: row.product_id,
    sku: row.sku,
    name: row.name || null,
    fulfillmentSku: row.fulfillment_sku || null,
    weightValue,
    weightUnit: row.weight_unit || null,
    length,
    width,
    height,
    dimensionUnit: row.dimension_unit || null,
    modifyDate: row.modify_date || null,
    active: row.active === 0 ? false : true,
    aliases
  };

  if (Number.isFinite(weightValue) && weightValue > 0) {
    product.weight = {
      value: weightValue,
      unit: product.weightUnit || 'ounce'
    };
  }

  if (Number.isFinite(length) && length > 0
    && Number.isFinite(width) && width > 0
    && Number.isFinite(height) && height > 0) {
    product.dimensions = {
      length,
      width,
      height,
      unit: product.dimensionUnit || 'inch'
    };
  }

  return product;
};

const getProductBySkuStmt = db.prepare('SELECT * FROM products WHERE sku = ? LIMIT 1');

const getProductBySku = (sku) => {
  const sanitized = sanitizeString(sku);
  if (!sanitized) return null;

  const row = getProductBySkuStmt.get(sanitized);
  return row ? mapRowToProduct(row) : null;
};

const normalizeKey = (value) => {
  const sanitized = sanitizeString(value);
  return sanitized ? sanitized.toLowerCase() : null;
};

const collectItemIdentifiers = (items = []) => {
  const identifiers = new Set();
  const productIds = new Set();

  items.forEach((item) => {
    if (!item) return;

    [
      item.fulfillmentSku,
      item.fulfillment_sku,
      item.sku,
      item.SKU,
      item.resolvedSku,
      item.upc,
      item.productCode,
      item.itemCode
    ].forEach((value) => {
      const sanitized = sanitizeString(value);
      if (sanitized) {
        identifiers.add(sanitized);
      }
    });

    [item.productId, item.product_id, item.productID].forEach((value) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        productIds.add(numeric);
      }
    });
  });

  return {
    identifiers: Array.from(identifiers),
    productIds: Array.from(productIds)
  };
};

const buildProductIndexForItems = (items = []) => {
  const { identifiers, productIds } = collectItemIdentifiers(items);

  if (identifiers.length === 0 && productIds.length === 0) {
    return { keyed: {}, byId: new Map() };
  }

  const rowsById = new Map();

  const addRows = (rows = []) => {
    rows.forEach((row) => {
      if (!rowsById.has(row.product_id)) {
        rowsById.set(row.product_id, row);
      }
    });
  };

  if (identifiers.length > 0) {
    const placeholder = identifiers.map(() => '?').join(', ');

    addRows(db.prepare(`SELECT * FROM products WHERE sku IN (${placeholder})`).all(...identifiers));
    addRows(db.prepare(`SELECT * FROM products WHERE fulfillment_sku IN (${placeholder})`).all(...identifiers));
    addRows(db.prepare(`
      SELECT p.* FROM products p
      JOIN product_aliases a ON a.product_id = p.product_id
      WHERE a.alias IN (${placeholder})
    `).all(...identifiers));
  }

  if (productIds.length > 0) {
    const placeholder = productIds.map(() => '?').join(', ');
    addRows(db.prepare(`SELECT * FROM products WHERE product_id IN (${placeholder})`).all(...productIds));
  }

  const keyed = {};
  const byId = new Map();

  rowsById.forEach((row) => {
    const product = mapRowToProduct(row);
    if (!product) return;

    byId.set(product.productId, product);

    [product.sku, product.fulfillmentSku, ...product.aliases].forEach((key) => {
      const normalized = normalizeKey(key);
      if (normalized) {
        keyed[normalized] = product;
      }
    });
  });

  return { keyed, byId };
};

const findProductForItem = (item, index = {}) => {
  if (!item || !index) return null;

  const keyed = index.keyed || {};
  const byId = index.byId instanceof Map ? index.byId : new Map();

  const candidateKeys = [
    item.fulfillmentSku,
    item.fulfillment_sku,
    item.sku,
    item.SKU,
    item.resolvedSku,
    item.upc,
    item.productCode,
    item.itemCode
  ];

  for (const candidate of candidateKeys) {
    const normalized = normalizeKey(candidate);
    if (normalized && keyed[normalized]) {
      return keyed[normalized];
    }
  }

  const candidateIds = [item.productId, item.product_id, item.productID];
  for (const candidateId of candidateIds) {
    const numeric = Number(candidateId);
    if (Number.isFinite(numeric) && byId.has(numeric)) {
      return byId.get(numeric);
    }
  }

  return null;
};

const refreshProductsFromShipStation = async () => {
  if (!config.shipstation?.v2ApiKey) {
    console.warn('ShipStation V2 API key is not configured; skipping product refresh.');
    return { imported: 0, skipped: true };
  }

  const pageSize = Math.max(1, config.shipstation?.productSyncPageSize || 200);
  let page = 1;
  let totalImported = 0;
  let pagesProcessed = 0;

  console.log('Refreshing products from ShipStation...');

  try {
    while (true) {
      const response = await shipstationApi.fetchProducts({ page_size: pageSize, page });
      const products = Array.isArray(response?.products) ? response.products : [];

      if (products.length === 0) {
        if (page === 1) {
          console.warn('No products returned from ShipStation.');
        }
        break;
      }

      totalImported += upsertProducts(products);
      pagesProcessed += 1;

      const totalPages = toNumberOrNull(response?.pages);
      if (Number.isFinite(totalPages) && page >= totalPages) {
        break;
      }

      if (!Number.isFinite(totalPages) && products.length < pageSize) {
        break;
      }

      page += 1;
    }
  } catch (error) {
    const details = error.response?.data || error.message || error;
    console.error('Failed to refresh products from ShipStation:', details);
    throw error;
  }

  console.log(`Successfully refreshed ${totalImported} products from ShipStation.`);
  return { imported: totalImported, pagesProcessed };
};

module.exports = {
  refreshProductsFromShipStation,
  buildProductIndexForItems,
  findProductForItem,
  getProductBySku
};

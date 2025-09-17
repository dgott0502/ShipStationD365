const shipstationApi = require('../api/shipstation');
const config = require('../config');

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to parse JSON array for label creation:', error.message);
    return [];
  }
};

const cleanObject = (obj = {}) => Object.fromEntries(
  Object.entries(obj).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const normalizeYesNo = (value) => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'yes' || normalized === 'no') return normalized;
    if (normalized === 'true') return 'yes';
    if (normalized === 'false') return 'no';
  }
  return value ? 'yes' : 'no';
};

const parseNumber = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const isPositive = (value) => Number.isFinite(value) && value > 0;

const normalizeWeightUnit = (unit = '') => {
  const lower = unit.toString().toLowerCase();
  if (!lower) return null;
  if (['oz', 'ounce', 'ounces'].includes(lower)) return 'ounce';
  if (['lb', 'lbs', 'pound', 'pounds'].includes(lower)) return 'pound';
  if (['gram', 'grams', 'g'].includes(lower)) return 'gram';
  if (['kilogram', 'kilograms', 'kg'].includes(lower)) return 'kilogram';
  return lower;
};

const convertWeightToOunces = (weight) => {
  if (!weight) return 0;
  const value = parseNumber(weight.value, null);
  if (!isPositive(value)) return 0;
  const unit = normalizeWeightUnit(weight.unit || weight.units);
  if (!unit) return 0;

  switch (unit) {
    case 'ounce':
      return value;
    case 'pound':
      return value * 16;
    case 'gram':
      return value * 0.03527396;
    case 'kilogram':
      return value * 35.27396;
    default:
      return value;
  }
};

const defaultPackage = () => {
  const defaults = config.shipstation?.defaultPackage || {};
  const weightDefaults = defaults.weight || {};
  const lengthDefaults = defaults.dimensions || {};

  const weightValue = parseNumber(weightDefaults.value, 16);
  const packageData = {
    weight: {
      value: isPositive(weightValue) ? weightValue : 16,
      unit: weightDefaults.unit || 'ounce'
    }
  };

  const length = parseNumber(lengthDefaults.length, null);
  const width = parseNumber(lengthDefaults.width, null);
  const height = parseNumber(lengthDefaults.height, null);
  const dimensionUnit = lengthDefaults.unit || 'inch';

  if (isPositive(length) && isPositive(width) && isPositive(height)) {
    packageData.dimensions = {
      length,
      width,
      height,
      unit: dimensionUnit
    };
  }

  return packageData;
};

const parseItemWeight = (item = {}) => {
  const weight = item.weight;
  if (!weight) return null;
  const value = parseNumber(weight.value, null);
  if (!isPositive(value)) return null;
  const unit = normalizeWeightUnit(weight.unit || weight.units);
  if (!unit) return null;
  return { value, unit };
};

const parseItemDimensions = (item = {}) => {
  const dims = item.dimensions;
  if (!dims) return null;

  const length = parseNumber(dims.length || dims.lengthIn, null);
  const width = parseNumber(dims.width || dims.widthIn, null);
  const height = parseNumber(dims.height || dims.heightIn, null);
  const unit = dims.unit || dims.units || dims.unitOfMeasure;

  if (isPositive(length) && isPositive(width) && isPositive(height)) {
    return {
      length,
      width,
      height,
      unit: unit || config.shipstation?.defaultPackage?.dimensions?.unit || 'inch'
    };
  }

  return null;
};

const parseItemInsuredValue = (item = {}) => {
  if (item.insuredValue?.amount) {
    const amount = parseNumber(item.insuredValue.amount, null);
    if (isPositive(amount)) {
      return {
        amount,
        currency: item.insuredValue.currency || 'USD'
      };
    }
  }

  const unitPrice = parseNumber(item.unitPrice, null);
  if (isPositive(unitPrice)) {
    return {
      amount: unitPrice,
      currency: 'USD'
    };
  }

  return null;
};

const buildPackageForItem = (item) => {
  const pkg = defaultPackage();
  const weight = parseItemWeight(item);
  if (weight) pkg.weight = weight;
  const dimensions = parseItemDimensions(item);
  if (dimensions) pkg.dimensions = dimensions;
  const insuredValue = parseItemInsuredValue(item);
  if (insuredValue) pkg.insured_value = insuredValue;
  return pkg;
};

const buildPackages = (items, multipack) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  if (multipack) {
    const packages = [];
    items.forEach((item) => {
      const quantity = Math.max(1, parseNumber(item.quantity, 1));
      for (let index = 0; index < quantity; index += 1) {
        packages.push(buildPackageForItem(item));
      }
    });
    return packages;
  }

  const aggregatedPackage = defaultPackage();
  const totalWeight = items.reduce((sum, item) => {
    const quantity = Math.max(1, parseNumber(item.quantity, 1));
    return sum + convertWeightToOunces(item.weight) * quantity;
  }, 0);

  if (totalWeight > 0) {
    aggregatedPackage.weight = {
      value: parseFloat(totalWeight.toFixed(2)),
      unit: 'ounce'
    };
  }

  const dimensions = parseItemDimensions(items[0]);
  if (dimensions) {
    aggregatedPackage.dimensions = dimensions;
  }

  return [aggregatedPackage];
};

const ensurePackages = (packages) => {
  if (Array.isArray(packages) && packages.length > 0) {
    return packages;
  }
  return [defaultPackage()];
};

const convertOrderAddress = (address = {}) => cleanObject({
  name: address.name,
  company_name: address.company,
  phone: address.phone,
  address_line1: address.street1 || address.address1,
  address_line2: address.street2 || address.address2,
  address_line3: address.street3 || address.address3,
  city_locality: address.city,
  state_province: address.state,
  postal_code: address.postalCode,
  country_code: address.country,
  address_residential_indicator: normalizeYesNo(address.residential)
});

const mapShipTo = (shipstationOrder, orderRecord) => {
  const address = shipstationOrder?.shipTo;
  if (!address || !(address.street1 || address.address1)) {
    throw new Error('Ship-to address is missing required street information.');
  }

  return convertOrderAddress({
    ...address,
    name: address.name || orderRecord?.ship_to_name,
    city: address.city || orderRecord?.ship_to_city,
    state: address.state || orderRecord?.ship_to_state,
    postalCode: address.postalCode || orderRecord?.ship_to_postal_code,
    country: address.country || orderRecord?.ship_to_country
  });
};

const mapShipFrom = (shipstationOrder) => {
  const address = shipstationOrder?.shipFrom;
  if (address && (address.street1 || address.address1)) {
    return convertOrderAddress(address);
  }

  const fallback = config.shipstation?.shipFrom || {};
  if (!fallback.addressLine1) {
    throw new Error('Ship-from address is not configured.');
  }

  return cleanObject({
    name: fallback.name,
    company_name: fallback.companyName,
    phone: fallback.phone,
    address_line1: fallback.addressLine1,
    address_line2: fallback.addressLine2,
    city_locality: fallback.cityLocality,
    state_province: fallback.stateProvince,
    postal_code: fallback.postalCode,
    country_code: fallback.countryCode || 'US',
    address_residential_indicator: normalizeYesNo(fallback.residentialIndicator)
  });
};

const determineServiceCode = (shipstationOrder, orderRecord) => {
  return shipstationOrder?.serviceCode
    || orderRecord?.requested_shipping_service
    || config.shipstation?.defaultServiceCode
    || null;
};

const determineInsuranceProvider = (shipstationOrder) => {
  return shipstationOrder?.insuranceOptions?.provider
    || config.shipstation?.defaultInsuranceProvider
    || undefined;
};

const extractLabelUrls = (response) => {
  const urls = [];
  const pushIfValid = (url) => {
    if (typeof url === 'string' && url.trim()) {
      urls.push(url.trim());
    }
  };

  if (!response || typeof response !== 'object') {
    return urls;
  }

  if (Array.isArray(response.labels)) {
    response.labels.forEach((label) => {
      pushIfValid(label?.label_download?.href);
      pushIfValid(label?.labelDownload?.href);
      pushIfValid(label?.label_url);
      pushIfValid(label?.labelUrl);
      pushIfValid(label?.labelDataHref);
    });
  }

  pushIfValid(response?.label_download?.href);
  pushIfValid(response?.labelDownload?.href);
  pushIfValid(response?.label_url);
  pushIfValid(response?.labelUrl);

  if (Array.isArray(response?.packages)) {
    response.packages.forEach((pkg) => {
      pushIfValid(pkg?.label_download?.href);
      pushIfValid(pkg?.labelUrl);
    });
  }

  return [...new Set(urls)];
};

const createLabelForOrder = async (orderRecord, options = {}) => {
  if (!orderRecord) {
    throw new Error('Order data is required to create a ShipStation label.');
  }

  const { multipack = false, testLabel = false } = options;
  const orderId = orderRecord.shipstation_order_id;

  if (!orderId) {
    throw new Error('Order is missing a ShipStation order identifier.');
  }

  let shipstationOrder;
  try {
    shipstationOrder = await shipstationApi.fetchOrderById(orderId);
  } catch (error) {
    throw new Error(`Unable to load ShipStation order ${orderId} for label creation: ${error.message || error}`);
  }

  const items = shipstationOrder?.items?.length
    ? shipstationOrder.items
    : parseJsonArray(orderRecord.items_json);

  const packages = ensurePackages(buildPackages(items, multipack));
  const shipTo = mapShipTo(shipstationOrder, orderRecord);
  const shipFrom = mapShipFrom(shipstationOrder);

  if (!shipTo.address_line1) {
    throw new Error('Ship-to address is missing line 1 for label creation.');
  }

  if (!shipFrom.address_line1) {
    throw new Error('Ship-from address is missing line 1 for label creation.');
  }

  const serviceCode = determineServiceCode(shipstationOrder, orderRecord);
  if (!serviceCode) {
    throw new Error('Unable to determine ShipStation service code for label creation.');
  }

  const shipment = cleanObject({
    service_code: serviceCode,
    carrier_code: shipstationOrder?.carrierCode,
    confirmation: shipstationOrder?.confirmation,
    ship_to: shipTo,
    ship_from: shipFrom,
    packages,
    insurance_provider: determineInsuranceProvider(shipstationOrder),
    ship_date: shipstationOrder?.shipDate
  });

  const payload = cleanObject({
    shipment,
    test_label: testLabel ? true : undefined
  });

  console.log(`Creating ${multipack ? 'multipack' : 'single package'} label for ShipStation order ${orderId}.`);

  const response = await shipstationApi.createLabel(payload);
  const labelUrls = extractLabelUrls(response);

  return {
    labelUrls,
    response,
    requestPayload: payload,
    multipackRequested: multipack,
    packagesCreated: packages.length
  };
};

module.exports = {
  createLabelForOrder
};

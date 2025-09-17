require('dotenv').config();

const safeParseFloat = (value, fallback) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

module.exports = {
  port: process.env.PORT || 3001,
  shipstation: {
    apiKey: process.env.SHIPSTATION_API_KEY,
    apiSecret: process.env.SHIPSTATION_API_SECRET,
    defaultServiceCode: process.env.SHIPSTATION_DEFAULT_SERVICE_CODE || null,
    defaultInsuranceProvider: process.env.SHIPSTATION_DEFAULT_INSURANCE_PROVIDER || 'carrier',
    shipFrom: {
      name: process.env.SHIPSTATION_SHIP_FROM_NAME || '',
      companyName: process.env.SHIPSTATION_SHIP_FROM_COMPANY || '',
      phone: process.env.SHIPSTATION_SHIP_FROM_PHONE || '',
      addressLine1: process.env.SHIPSTATION_SHIP_FROM_ADDRESS1 || '',
      addressLine2: process.env.SHIPSTATION_SHIP_FROM_ADDRESS2 || '',
      cityLocality: process.env.SHIPSTATION_SHIP_FROM_CITY || '',
      stateProvince: process.env.SHIPSTATION_SHIP_FROM_STATE || '',
      postalCode: process.env.SHIPSTATION_SHIP_FROM_POSTAL_CODE || '',
      countryCode: process.env.SHIPSTATION_SHIP_FROM_COUNTRY_CODE || 'US',
      residentialIndicator: process.env.SHIPSTATION_SHIP_FROM_RESIDENTIAL || 'no'
    },
    defaultPackage: {
      weight: {
        value: safeParseFloat(process.env.SHIPSTATION_DEFAULT_PACKAGE_WEIGHT_VALUE, 16),
        unit: process.env.SHIPSTATION_DEFAULT_PACKAGE_WEIGHT_UNIT || 'ounce'
      },
      dimensions: {
        length: safeParseFloat(process.env.SHIPSTATION_DEFAULT_PACKAGE_LENGTH, 10),
        width: safeParseFloat(process.env.SHIPSTATION_DEFAULT_PACKAGE_WIDTH, 10),
        height: safeParseFloat(process.env.SHIPSTATION_DEFAULT_PACKAGE_HEIGHT, 10),
        unit: process.env.SHIPSTATION_DEFAULT_PACKAGE_DIMENSION_UNIT || 'inch'
      }
    }
  },
  dynamics365: {
    url: process.env.D365_URL,
    tenantId: process.env.D365_TENANT_ID,
    clientId: process.env.D365_CLIENT_ID,
    clientSecret: process.env.D365_CLIENT_SECRET,
    companyId: process.env.D365_COMPANY_ID
  }
};
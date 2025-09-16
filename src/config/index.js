require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3001,
  shipstation: {
    apiKey: process.env.SHIPSTATION_API_KEY,
    apiSecret: process.env.SHIPSTATION_API_SECRET
  },
  dynamics365: {
    url: process.env.D365_URL,
    tenantId: process.env.D365_TENANT_ID,
    clientId: process.env.D365_CLIENT_ID,
    clientSecret: process.env.D365_CLIENT_SECRET,
    companyId: process.env.D365_COMPANY_ID
  }
};
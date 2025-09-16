const axios = require('axios');
const config = require('../config');

// In-memory cache for the auth token
let authToken = null;
let tokenExpiry = null;

// Function to get an OAuth2 token from Azure AD
const getAuthToken = async () => {
  if (authToken && new Date() < tokenExpiry) {
    return authToken;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${config.dynamics365.tenantId}/oauth2/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', config.dynamics365.clientId);
    params.append('client_secret', config.dynamics365.clientSecret);
    params.append('resource', config.dynamics365.url);

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    authToken = response.data.access_token;
    // Set expiry to 5 minutes before the actual token expiration
    tokenExpiry = new Date(new Date().getTime() + (response.data.expires_in - 300) * 1000);
    
    console.log('Successfully retrieved D365 Auth Token.');
    return authToken;
  } catch (error) {
    console.error('Error getting D365 Auth Token:', error.response ? error.response.data : error.message);
    throw new Error('Could not authenticate with Dynamics 365.');
  }
};

const createSalesOrder = async (orderPayload) => {
  const token = await getAuthToken();

  // Define a unique boundary for the multipart request
  const batchId = `batch_${Date.now()}`;
  const changesetId = `changeset_${Date.now()}`;
  let batchBody = [];

  // Start of the batch
  batchBody.push(`--${batchId}`);
  batchBody.push(`Content-Type: multipart/mixed; boundary=${changesetId}`);
  batchBody.push('');

  // Part 1: Create the Sales Order Header
  batchBody.push(`--${changesetId}`);
  batchBody.push('Content-Type: application/http');
  batchBody.push('Content-Transfer-Encoding: binary');
  batchBody.push('');
  batchBody.push(`POST ${config.dynamics365.url}/data/SalesOrderHeaders HTTP/1.1`);
  batchBody.push('Content-Type: application/json; odata=verbose');
  batchBody.push('');
  batchBody.push(JSON.stringify(orderPayload.header));
  batchBody.push('');

  // Part 2: Create each Sales Order Line, linking it to the header
  orderPayload.lines.forEach((line, index) => {
    batchBody.push(`--${changesetId}`);
    batchBody.push('Content-Type: application/http');
    batchBody.push('Content-Transfer-Encoding: binary');
    batchBody.push('');
    // NOTE: The URL links back to the header created in the same batch
    batchBody.push(`POST ${config.dynamics365.url}/data/SalesOrderLines HTTP/1.1`);
    batchBody.push('Content-Type: application/json; odata=verbose');
    batchBody.push('');
    // We add the SalesOrderNumber to the line here so it links correctly
    const linePayload = { ...line, SalesOrderNumber: orderPayload.header.SalesOrderNumber };
    batchBody.push(JSON.stringify(linePayload));
    batchBody.push('');
  });

  // End of the changeset and batch
  batchBody.push(`--${changesetId}--`);
  batchBody.push(`--${batchId}--`);

  const batchRequest = batchBody.join('\r\n');

  try {
    const response = await axios.post(`${config.dynamics365.url}/data/$batch`, batchRequest, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/mixed; boundary=${batchId}`,
        'Accept': 'application/json'
      }
    });

    // TODO: Add logic to check the batch response for errors
    console.log(`Batch request for order ${orderPayload.header.SalesOrderNumber} sent successfully.`);
    return response.data;
  } catch (error) {
    console.error('Error sending batch request to D365:', error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = {
  getAuthToken,
  createSalesOrder
};
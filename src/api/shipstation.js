const axios = require('axios');
const config = require('../config');

// Base64 encode the API key and secret for authentication
const authHeader = `Basic ${Buffer.from(`${config.shipstation.apiKey}:${config.shipstation.apiSecret}`).toString('base64')}`;
const shipstationAPI = axios.create({
  baseURL: 'https://ssapi.shipstation.com',
  headers: {
    'Authorization': authHeader
  }
});

// Fetches orders that are awaiting shipment
const fetchAwaitingShipmentOrders = async () => {
  try {
    const response = await shipstationAPI.get('/orders', {
      params: {
        orderStatus: 'awaiting_shipment',
        pageSize: 100 // Fetch up to 100 orders at a time
      }
    });
    return response.data.orders;
  } catch (error) {
    console.error('Error fetching orders from ShipStation:', error.message);
    return [];
  }
};

module.exports = { fetchAwaitingShipmentOrders };
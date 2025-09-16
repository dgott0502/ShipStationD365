const axios = require('axios');
const config = require('../config');

const authHeader = `Basic ${Buffer.from(`${config.shipstation.apiKey}:${config.shipstation.apiSecret}`).toString('base64')}`;
const shipstationAPI = axios.create({
  baseURL: 'https://ssapi.shipstation.com',
  headers: { 'Authorization': authHeader }
});

const fetchAwaitingShipmentOrders = async () => {
  try {
    const response = await shipstationAPI.get('/orders', {
      params: { orderStatus: 'awaiting_shipment', pageSize: 100 }
    });
    return response.data.orders;
  } catch (error) {
    console.error('Error fetching orders from ShipStation:', error.message);
    throw error; // Re-throw the error to be handled by the caller
  }
};

const fetchTags = async () => {
  try {
    const response = await shipstationAPI.get('/accounts/listtags');
    return response.data;
  } catch (error) {
    console.error('Error fetching tags from ShipStation:', error.message);
    return [];
  }
};

module.exports = { fetchAwaitingShipmentOrders, fetchTags };
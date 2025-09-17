const axios = require('axios');
const config = require('../config');

const V1_BASE_URL = 'https://ssapi.shipstation.com';
const V2_BASE_URL = 'https://api.shipstation.com/v2';

const ensureV1Credentials = () => {
  const apiKey = config.shipstation?.apiKey;
  const apiSecret = config.shipstation?.apiSecret;

  if (!apiKey || !apiSecret) {
    throw new Error('ShipStation V1 API credentials are not configured.');
  }

  return { apiKey, apiSecret };
};

const ensureV2ApiKey = () => {
  const apiKey = config.shipstation?.v2ApiKey;
  if (!apiKey) {
    throw new Error('ShipStation V2 API key is not configured.');
  }
  return apiKey;
};

const buildBasicAuthHeader = () => {
  const { apiKey, apiSecret } = ensureV1Credentials();
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
};

const shipstationV1Api = axios.create({
  baseURL: V1_BASE_URL,
  timeout: 60000
});

shipstationV1Api.interceptors.request.use((request) => {
  request.headers.Authorization = buildBasicAuthHeader();
  return request;
});

const shipstationV2Api = axios.create({
  baseURL: V2_BASE_URL,
  timeout: 60000
});

shipstationV2Api.interceptors.request.use((request) => {
  request.headers['api-key'] = ensureV2ApiKey();
  request.headers['Content-Type'] = request.headers['Content-Type'] || 'application/json';
  return request;
});

const extractErrorDetails = (error) => error.response?.data || error.message || error;

const fetchAwaitingShipmentOrders = async () => {
  try {
    const response = await shipstationV1Api.get('/orders', {
      params: { orderStatus: 'awaiting_shipment', pageSize: 100 }
    });
    return response.data.orders;
  } catch (error) {
    const details = extractErrorDetails(error);
    console.error('Error fetching orders from ShipStation:', details);
    throw error;
  }
};

const fetchTags = async () => {
  try {
    const response = await shipstationV1Api.get('/accounts/listtags');
    return response.data;
  } catch (error) {
    const details = extractErrorDetails(error);
    console.error('Error fetching tags from ShipStation:', details);
    return [];
  }
};

const fetchOrderById = async (orderId) => {
  try {
    const response = await shipstationV1Api.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    const details = extractErrorDetails(error);
    console.error(`Error fetching order ${orderId} from ShipStation:`, details);
    throw error;
  }
};

const createLabel = async (payload) => {
  try {
    const response = await shipstationV2Api.post('/labels', payload);
    return response.data;
  } catch (error) {
    const details = extractErrorDetails(error);
    console.error('Error creating label in ShipStation:', details);
    throw error;
  }
};

const fetchProducts = async (params = {}) => {
  try {
    const response = await shipstationV2Api.get('/products', { params });
    return response.data;
  } catch (error) {
    const details = extractErrorDetails(error);
    console.error('Error fetching products from ShipStation:', details);
    throw error;
  }
};

module.exports = {
  fetchAwaitingShipmentOrders,
  fetchTags,
  fetchOrderById,
  createLabel,
  fetchProducts
};

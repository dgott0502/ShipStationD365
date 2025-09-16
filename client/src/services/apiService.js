import axios from 'axios';

// The base URL for your backend server
const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL
});

// --- Settings ---
export const getAutoLabelStatus = () => api.get('/settings/autolabel');
export const toggleAutoLabel = (isEnabled) => api.post('/settings/autolabel', { isEnabled });

// --- Orders ---
export const getOrders = () => api.get('/orders');
export const getOrderDetails = (orderId) => api.get(`/orders/${orderId}`);
export const fetchOrdersNow = () => api.post('/orders/fetch-now');
export const approveOrder = (orderId) => api.post(`/orders/${orderId}/approve`);
export const processOrderNow = (orderId) => api.post(`/orders/${orderId}/process`);
export const clearOrder = (orderId) => api.delete(`/orders/${orderId}`);

// --- Archive ---
export const getArchivedOrders = () => api.get('/archive');
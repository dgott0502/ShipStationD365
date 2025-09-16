import React, { useState } from 'react';
import OrderTable from './OrderTable';
import OrderDetailsModal from './OrderDetailsModal';
// The 'getOrders' function has been added to this import list
import { getOrders, fetchOrdersNow, getOrderDetails, processOrderNow, clearOrder } from '../../services/apiService';

function Dashboard() {
  const [isFetching, setIsFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const forceTableRefresh = () => setRefreshKey(prevKey => prevKey + 1);

  const handleFetchNow = async () => {
    setIsFetching(true);
    setFetchMessage('Checking for new orders...');
    try {
      const response = await fetchOrdersNow();
      setFetchMessage(response.data.message);
      forceTableRefresh();
    } catch (error) {
      setFetchMessage(error.response?.data?.message || 'An error occurred.');
    }
    setIsFetching(false);
    setTimeout(() => setFetchMessage(''), 5000);
  };

  const handleSelectOrder = async (orderId) => {
    try {
      const response = await getOrderDetails(orderId);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error("Failed to fetch order details", error);
      alert("Could not load order details.");
    }
  };

  const handleCloseModal = () => setSelectedOrder(null);

  const handleProcessNow = async (orderId) => {
    if (window.confirm('Are you sure you want to process this order now?')) {
      try {
        const response = await processOrderNow(orderId);
        alert(response.data.message);
        forceTableRefresh();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to process order.');
      }
    }
  };

  const handleClearOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to permanently clear this order? This cannot be undone.')) {
      try {
        const response = await clearOrder(orderId);
        alert(response.data.message);
        forceTableRefresh();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to clear order.');
      }
    }
  };

  return (
    <div>
      <div className="dashboard-header">
        <h2>All Orders</h2>
        <button className="fetch-button" onClick={handleFetchNow} disabled={isFetching}>
          {isFetching ? 'Fetching...' : 'Get Orders Now 🔃'}
        </button>
      </div>
      {fetchMessage && <p className="fetch-message">{fetchMessage}</p>}
      <p>This table shows all recent orders in the system. It automatically refreshes.</p>
      
      <OrderTable 
        key={refreshKey} 
        onSelectOrder={handleSelectOrder}
        onAction={{
          process: handleProcessNow,
          clear: handleClearOrder,
        }}
        fetcher={getOrders}
      />

      <OrderDetailsModal 
        order={selectedOrder} 
        onClose={handleCloseModal} 
      />
    </div>
  );
}

export default Dashboard;
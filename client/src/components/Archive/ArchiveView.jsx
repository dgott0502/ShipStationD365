import React, { useState } from 'react';
import { getArchivedOrders } from '../../services/apiService';
import OrderTable from '../Dashboard/OrderTable';
import OrderDetailsModal from '../Dashboard/OrderDetailsModal';
import { getOrderDetails } from '../../services/apiService';

function ArchiveView() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  const handleSelectOrder = async (orderId) => {
    try {
      const response = await getOrderDetails(orderId);
      setSelectedOrder(response.data);
    } catch (error) {
      console.error("Failed to fetch order details", error);
      alert("Could not load order details.");
    }
  };
  
  return (
    <div>
      <h2>Archived Orders</h2>
      <p>These orders have been successfully processed and synced to D365.</p>
      <OrderTable
        fetcher={getArchivedOrders}
        onSelectOrder={handleSelectOrder}
        // No actions (onAction prop is omitted)
      />
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

export default ArchiveView;
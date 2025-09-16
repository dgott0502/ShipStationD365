import React, { useState } from 'react';
import { getOrders, approveOrder } from '../../services/apiService';
import OrderTable from '../Dashboard/OrderTable';
import OrderDetailsModal from '../Dashboard/OrderDetailsModal';
import { getOrderDetails } from '../../services/apiService';

function ApprovalsView() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const forceTableRefresh = () => setRefreshKey(prevKey => prevKey + 1);

  const handleApprove = async (orderId) => {
    if (window.confirm('Are you sure you want to approve this order?')) {
      try {
        await approveOrder(orderId);
        alert('Order approved and is now ready for processing.');
        forceTableRefresh();
      } catch (err) {
        alert('Failed to approve order.');
      }
    }
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

  const approvalFilter = (order) => order.internal_status === 'Pending Approval';
  
  const actionButtons = (order) => (
    <button className="action-button process" onClick={() => handleApprove(order.shipstation_order_id)}>
      Approve
    </button>
  );

  return (
    <div>
      <h2>Pending Approvals</h2>
      <p>These orders require manual approval before being sent to D365.</p>
      <OrderTable
        key={refreshKey}
        filter={approvalFilter}
        onAction={actionButtons}
        onSelectOrder={handleSelectOrder}
        fetcher={getOrders}
      />
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

export default ApprovalsView;
import React, { useState } from 'react';
import { getOrders } from '../../services/apiService';
import OrderTable from '../Dashboard/OrderTable';
import OrderDetailsModal from '../Dashboard/OrderDetailsModal';
import { getOrderDetails } from '../../services/apiService';

function PalletView() {
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
  
  const palletFilter = (order) => order.internal_status === 'Pending Pallet Processing';

  // TODO: Add actions for pallet orders if needed
  // const palletActions = (order) => ( ... );

  return (
    <div>
      <h2>Pallet Orders</h2>
      <p>These orders are tagged as pallets and require special handling.</p>
      <OrderTable
        filter={palletFilter}
        onSelectOrder={handleSelectOrder}
        fetcher={getOrders}
        // onAction={palletActions} 
      />
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </div>
  );
}

export default PalletView;
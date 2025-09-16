import React, { useState, useEffect } from 'react';

function OrderTable({ filter = () => true, onAction, onSelectOrder, fetcher }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!fetcher) return;
      try {
        const response = await fetcher();
        
        // ADDED: Safety check to ensure the API response is an array
        if (Array.isArray(response.data)) {
          setOrders(response.data);
        } else {
          console.error("API response is not an array!", response.data);
          setOrders([]); // Set to an empty array to prevent crashes
        }

      } catch (err) {
        setError('Failed to fetch orders. Is the backend server running?');
        console.error(err);
      }
    };

    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetcher]);

  if (error) {
    return <p className="error-message">{error}</p>;
  }

  return (
    <table className="order-table">
      <thead>
        <tr>
          <th>Order #</th>
          <th>Customer</th>
          <th>Date</th>
          <th>Status</th>
          <th>Total</th>
          <th>D365 SO #</th>
          {onAction && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {orders.filter(filter).map(order => (
          <tr key={order.shipstation_order_id}>
            <td>
              <a href="#" onClick={(e) => { e.preventDefault(); onSelectOrder && onSelectOrder(order.shipstation_order_id); }}>
                {order.order_number}
              </a>
            </td>
            <td>{order.ship_to_name}</td>
            <td>{new Date(order.order_date).toLocaleDateString()}</td>
            <td>
              <span className={`status ${order.internal_status.replace(/\s+/g, '-').toLowerCase()}`}>
                {order.internal_status}
              </span>
            </td>
            <td>${order.order_total}</td>
            <td>{order.d365_sales_order_id}</td>
            {onAction && (
              <td>
                <div className="action-buttons">
                  <button
                    className="action-button process"
                    title="Process this order now"
                    onClick={() => onAction.process(order.shipstation_order_id)}
                  >
                    Process
                  </button>
                  <button
                    className="action-button clear"
                    title="Clear this order from the list"
                    onClick={() => onAction.clear(order.shipstation_order_id)}
                  >
                    Clear
                  </button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default OrderTable;
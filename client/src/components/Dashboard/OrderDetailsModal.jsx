import React from 'react';

function OrderDetailsModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-button" onClick={onClose}>×</button>
        
        <div className="modal-section">
          <h3>Shipment Details</h3>
          <div className="details-grid">
            <div><strong>Ship To:</strong> {order.ship_to_name}</div>
            <div><strong>Address:</strong> {`${order.ship_to_city}, ${order.ship_to_state} ${order.ship_to_postal_code}`}</div>
            <div><strong>Order #:</strong> {order.order_number}</div>
            <div><strong>Order Date:</strong> {new Date(order.order_date).toLocaleString()}</div>
            <div><strong>Order Total:</strong> ${order.order_total}</div>
            <div><strong>Shipping:</strong> {order.requested_shipping_service}</div>
          </div>
        </div>

        <div className="modal-section">
          <h3>Shipment Items</h3>
          <table className="items-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Item Name</th>
                <th>Qty</th>
                <th>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map(item => (
                <tr key={item.orderItemId}>
                  <td>{item.resolvedSku}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>${item.unitPrice ? item.unitPrice.toFixed(2) : '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OrderDetailsModal;
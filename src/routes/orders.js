const express = require('express');
const router = express.Router();
const shipstationApi = require('../api/shipstation');
const orderService = require('../services/orderService');

// GET all orders for the dashboard (with added debugging)
router.get('/', (req, res) => {
  console.log('--- GET /api/orders route hit ---'); // Confirms the route is being called
  try {
    const orders = orderService.getAllOrders();
    
    // Logs the data just before sending it to the frontend
    console.log('Data being sent to frontend:', orders); 
    
    if (!Array.isArray(orders)) {
        console.error('CRITICAL: orderService.getAllOrders() did not return an array!');
    }

    res.json(orders);
  } catch (error) {
    console.error("CRITICAL ERROR in GET / route:", error);
    res.status(500).json({ message: "Failed to get orders due to a server error." });
  }
});

// GET a single order's full details for the modal
router.get('/:orderId', (req, res) => {
  try {
    const { orderId } = req.params;
    const order = orderService.getOrderById(orderId);
    if (order) {
      res.json(order);
    } else {
      res.status(404).send('Order not found.');
    }
  } catch (error) {
    console.error("Error in GET /:orderId route:", error);
    res.status(500).send('Error fetching order details.');
  }
});

// POST to approve a specific order
router.post('/:orderId/approve', async (req, res) => {
    try {
        await orderService.approveOrder(req.params.orderId);
        res.status(200).json({ message: 'Order approved successfully.' });
    } catch (error) {
        res.status(500).send('Failed to process approval.');
    }
});

// POST to manually trigger a fetch from ShipStation
router.post('/fetch-now', async (req, res) => {
  try {
    console.log('Manual fetch triggered by user...');
    const newOrders = await shipstationApi.fetchAwaitingShipmentOrders();
    
    if (newOrders && newOrders.length > 0) {
      orderService.processNewOrders(newOrders);
      res.status(200).json({ message: `Success! Found and processed ${newOrders.length} new orders.` });
    } else {
      res.status(200).json({ message: 'No new orders found in ShipStation.' });
    }
  } catch (error) {
    console.error('Manual fetch failed:', error);
    res.status(500).json({ message: 'An error occurred while fetching orders.' });
  }
});

// Route for the "Process Now" button
router.post('/:orderId/process', async (req, res) => {
    try {
        await orderService.processSingleOrder(req.params.orderId);
        res.status(200).json({ message: 'Order processed successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Route for the "Clear Order" button
router.delete('/:orderId', (req, res) => {
    const success = orderService.deleteOrder(req.params.orderId);
    if (success) {
        res.status(200).json({ message: 'Order cleared.' });
    } else {
        res.status(404).json({ message: 'Order not found.' });
    }
});

module.exports = router;
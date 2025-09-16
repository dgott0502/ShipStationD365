const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

// Return orders that are pending approval
router.get('/', (req, res) => {
	try {
		const orders = orderService.getAllOrders();
		const pending = Array.isArray(orders) ? orders.filter(o => o.internal_status === 'Pending Approval') : [];
		res.json(pending);
	} catch (err) {
		console.error('Error fetching approvals:', err);
		res.status(500).json({ message: 'Failed to fetch approvals' });
	}
});

module.exports = router;

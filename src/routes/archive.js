const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

router.get('/', (req, res) => {
    const orders = orderService.getArchivedOrders();
    res.json(orders);
});

module.exports = router;
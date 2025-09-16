const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

// GET the current status
router.get('/autolabel', (req, res) => {
  const status = orderService.getAutoLabelingStatus();
  res.json({ isEnabled: status });
});

// POST to update the status
router.post('/autolabel', (req, res) => {
  const { isEnabled } = req.body;
  orderService.setAutoLabelingStatus(isEnabled);
  res.status(200).json({ message: `Auto-labeling is now ${isEnabled ? 'ON' : 'OFF'}` });
});

module.exports = router;
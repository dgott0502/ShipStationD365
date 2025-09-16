const express = require('express');
const cors = require('cors');
const orderRoutes = require('./routes/orders');
const settingsRoutes = require('./routes/settings');
const archiveRoutes = require('./routes/archive');
const approvalsRoutes = require('./routes/approvals');

const app = express();

// Middleware
app.use(cors()); // Allows your frontend to communicate with this backend
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/approvals', approvalsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is healthy');
});

module.exports = app;
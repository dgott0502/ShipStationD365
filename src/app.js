const express = require('express');
const cors = require('cors');
const orderRoutes = require('./routes/orders');
const settingsRoutes = require('./routes/settings');
const archiveRoutes = require('./routes/archive');
const approvalsRoutes = require('./routes/approvals'); // This was missing

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} request to ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/approvals', approvalsRoutes); // This was missing

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('Server is healthy');
});

module.exports = app;
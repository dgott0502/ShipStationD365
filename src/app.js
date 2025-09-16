const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} request to ${req.originalUrl}`);
  next();
});
app.use('/api/orders', require('./routes/orders'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/archive', require('./routes/archive'));
app.use('/api/admin', require('./routes/admin'));
app.get('/health', (req, res) => res.status(200).send('Server is healthy'));
module.exports = app;
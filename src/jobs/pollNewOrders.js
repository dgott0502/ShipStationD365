const cron = require('node-cron');
const shipstationApi = require('../api/shipstation');
const orderService = require('../services/orderService');

// Schedule a task to run every 2 minutes.
// Use cron syntax for scheduling (e.g., '*/2 * * * *').
const initializeScheduledJobs = () => {
  cron.schedule('*/2 * * * *', async () => {
    console.log('Running scheduled job: Fetching new orders...');
    const newOrders = await shipstationApi.fetchAwaitingShipmentOrders();
    if (newOrders && newOrders.length > 0) {
      console.log(`Found ${newOrders.length} new orders.`);
      orderService.processNewOrders(newOrders);
    } else {
      console.log('No new orders found.');
    }
  });

  console.log('Scheduled polling for new orders has been initialized.');
};

module.exports = { initializeScheduledJobs };
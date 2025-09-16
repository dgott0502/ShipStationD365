const cron = require('node-cron');
const shipstationApi = require('../api/shipstation');
const orderService = require('../services/orderService');
const tagService = require('../services/tagService');

const initializeScheduledJobs = () => {
  cron.schedule('*/2 * * * *', async () => {
    console.log('Running scheduled job: Fetching new orders...');
    const newOrders = await shipstationApi.fetchAwaitingShipmentOrders();
    if (newOrders && newOrders.length > 0) {
      orderService.processNewOrders(newOrders);
    } else {
      console.log('No new orders found.');
    }
  });

  cron.schedule('0 2 * * *', () => {
    console.log('Running daily job: Refreshing ShipStation tags...');
    tagService.refreshTagsFromShipStation();
  });

  console.log('Scheduled polling for new orders has been initialized.');
  tagService.refreshTagsFromShipStation(); // Also run once on startup
};

module.exports = { initializeScheduledJobs };
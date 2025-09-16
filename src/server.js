const app = require('./app');
const config = require('./config');
const jobs = require('./jobs/pollNewOrders');

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  // Initialize and start the scheduled jobs
  jobs.initializeScheduledJobs();
});
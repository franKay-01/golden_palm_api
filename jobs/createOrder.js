const Queue = require('bull');
const queue = new Queue('myQueue');
const { workerData, parentPort } = require('worker_threads');

const { OrderItems, StripeTransactionInfo } = require("../models")

parentPort.on('message', async () => {
  const { order_reference_no, product_reference_no, webhook_event_id, unit_amount } = workerData;

  await OrderItems.create({ order_reference_no, product_reference_no, quantity, unit_amount })
  
  parentPort.postMessage('Task completed!');
});

// queue.on('completed', job => {
//   console.log(`${job.name} Job has been completed`);
// })

// queue.on('failed', async (job, error) => {
//   console.log(`${job.name} Job failed with error: ${error.message}`);
// });

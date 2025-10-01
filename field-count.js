// Simple script to count fields in MongoDB models
const TaskDetail = require('./functions/models/taskdetail');
const Orders = require('./functions/models/orders');
const OrderDetail = require('./functions/models/order-detail');
const Receipt = require('./functions/models/receipt');
const ReceiptDetail = require('./functions/models/receipt-detail');
const SyncConfig = require('./functions/models/sync-config');
const SyncJob = require('./functions/models/sync-job');
const SyncHistory = require('./functions/models/sync-history');

// Function to count schema fields
function countFields(schema) {
  return Object.keys(schema.paths).filter(path => 
    !path.startsWith('_') && 
    path !== 'id' && 
    path !== '__v' &&
    path !== 'createdAt' &&
    path !== 'updatedAt'
  ).length;
}

// Count and display fields for each model
console.log('Field Count Summary:');
console.log('-------------------');
console.log(`TaskDetail: ${countFields(TaskDetail.schema)} fields`);
console.log(`Orders: ${countFields(Orders.schema)} fields`);
console.log(`OrderDetail: ${countFields(OrderDetail.schema)} fields`);
console.log(`Receipt: ${countFields(Receipt.schema)} fields`);
console.log(`ReceiptDetail: ${countFields(ReceiptDetail.schema)} fields`);
console.log(`SyncConfig: ${countFields(SyncConfig.schema)} fields`);
console.log(`SyncJob: ${countFields(SyncJob.schema)} fields`);
console.log(`SyncHistory: ${countFields(SyncHistory.schema)} fields`);

// Script to count fields in MongoDB models
const mongoose = require('mongoose');
const TaskDetail = require('./functions/models/taskdetail');
const Orders = require('./functions/models/orders');
const OrderDetail = require('./functions/models/order-detail');
const Receipt = require('./functions/models/receipt');
const ReceiptDetail = require('./functions/models/receipt-detail');
const SyncConfig = require('./functions/models/sync-config');
const SyncJob = require('./functions/models/sync-job');
const SyncHistory = require('./functions/models/sync-history');

function countModelFields(model) {
  // Get the schema paths (fields)
  const paths = Object.keys(model.schema.paths);
  
  // Filter out Mongoose internal fields like _id, __v, etc.
  const userDefinedFields = paths.filter(path => 
    !path.startsWith('_') && 
    path !== 'id' && 
    path !== '__v' &&
    path !== 'createdAt' &&
    path !== 'updatedAt'
  );
  
  return {
    totalFields: paths.length,
    userDefinedFields: userDefinedFields.length,
    fields: userDefinedFields
  };
}

function analyzeModels() {
  const models = {
    'TaskDetail': TaskDetail,
    'Orders': Orders,
    'OrderDetail': OrderDetail,
    'Receipt': Receipt,
    'ReceiptDetail': ReceiptDetail,
    'SyncConfig': SyncConfig,
    'SyncJob': SyncJob,
    'SyncHistory': SyncHistory
  };
  
  console.log('MongoDB Collection Field Analysis\n');
  console.log('================================\n');
  
  for (const [name, model] of Object.entries(models)) {
    const analysis = countModelFields(model);
    console.log(`Collection: ${name}`);
    console.log(`- Total fields defined in schema: ${analysis.userDefinedFields}`);
    console.log(`- Total fields including Mongoose internal fields: ${analysis.totalFields}`);
    console.log('');
  }
  
  console.log('Note: Collections with strict:false option can store additional fields not defined in the schema.');
  console.log('The actual documents may contain more fields than listed here.');
}

// Run the analysis
analyzeModels();

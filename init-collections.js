// Script to initialize MongoDB collections without adding data
const mongoose = require('mongoose');

// Import the models
const TaskDetail = require('./functions/models/taskdetail');
const Orders = require('./functions/models/orders');
const OrderDetail = require('./functions/models/order-detail');
const Receipt = require('./functions/models/receipt');
const ReceiptDetail = require('./functions/models/receipt-detail');
const SyncConfig = require('./functions/models/sync-config');
const SyncJob = require('./functions/models/sync-job');
const SyncHistory = require('./functions/models/sync-history');

// MongoDB connection string from environment variable or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Connection options
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  maxPoolSize: 10
};

async function initializeCollections() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, options);
    console.log('Connected to MongoDB Atlas successfully');
    
    // Get the database instance
    const db = mongoose.connection.db;
    
    // List all collections before initialization
    console.log('\nExisting collections before initialization:');
    const collectionsBefore = await db.listCollections().toArray();
    collectionsBefore.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Initialize collections by creating an empty document and then deleting it
    // This will create the collection structure without adding any data
    console.log('\nInitializing collections...');
    
    // Initialize TaskDetail collection (if it doesn't already exist)
    if (!collectionsBefore.some(c => c.name === 'taskdetails')) {
      console.log('Creating TaskDetail collection...');
      const taskDetailDoc = new TaskDetail({
        SERIALKEY: 'INIT_DELETE_ME',
        WHSEID: 'INIT_DELETE_ME',
        TASKDETAILKEY: 'INIT_DELETE_ME'
      });
      await taskDetailDoc.save();
      await TaskDetail.deleteOne({ SERIALKEY: 'INIT_DELETE_ME' });
      console.log('TaskDetail collection created');
    } else {
      console.log('TaskDetail collection already exists');
    }
    
    // Initialize Orders collection
    console.log('Creating Orders collection...');
    const ordersDoc = new Orders({
      SERIALKEY: 'INIT_DELETE_ME',
      WHSEID: 'INIT_DELETE_ME',
      ORDERKEY: 'INIT_DELETE_ME'
    });
    await ordersDoc.save();
    await Orders.deleteOne({ SERIALKEY: 'INIT_DELETE_ME' });
    console.log('Orders collection created');
    
    // Initialize OrderDetail collection
    console.log('Creating OrderDetail collection...');
    const orderDetailDoc = new OrderDetail({
      SERIALKEY: 'INIT_DELETE_ME',
      WHSEID: 'INIT_DELETE_ME',
      ORDERKEY: 'INIT_DELETE_ME',
      ORDERLINENUMBER: 'INIT_DELETE_ME'
    });
    await orderDetailDoc.save();
    await OrderDetail.deleteOne({ SERIALKEY: 'INIT_DELETE_ME' });
    console.log('OrderDetail collection created');
    
    // Initialize Receipt collection
    console.log('Creating Receipt collection...');
    const receiptDoc = new Receipt({
      SERIALKEY: 'INIT_DELETE_ME',
      WHSEID: 'INIT_DELETE_ME',
      RECEIPTKEY: 'INIT_DELETE_ME'
    });
    await receiptDoc.save();
    await Receipt.deleteOne({ SERIALKEY: 'INIT_DELETE_ME' });
    console.log('Receipt collection created');
    
    // Initialize ReceiptDetail collection
    console.log('Creating ReceiptDetail collection...');
    const receiptDetailDoc = new ReceiptDetail({
      SERIALKEY: 'INIT_DELETE_ME',
      WHSEID: 'INIT_DELETE_ME',
      RECEIPTKEY: 'INIT_DELETE_ME',
      RECEIPTLINENUMBER: 'INIT_DELETE_ME'
    });
    await receiptDetailDoc.save();
    await ReceiptDetail.deleteOne({ SERIALKEY: 'INIT_DELETE_ME' });
    console.log('ReceiptDetail collection created');
    
    // Initialize SyncConfig collection
    console.log('Creating SyncConfig collection...');
    const syncConfigDoc = new SyncConfig({
      tableId: 'taskdetail',
      tableName: 'Task Detail',
      description: 'Initialization only'
    });
    await syncConfigDoc.save();
    await SyncConfig.deleteOne({ tableId: 'taskdetail' });
    console.log('SyncConfig collection created');
    
    // Initialize SyncHistory collection
    console.log('Creating SyncHistory collection...');
    const syncHistoryDoc = new SyncHistory({
      tableId: 'taskdetail',
      tableName: 'Task Detail',
      syncJobId: new mongoose.Types.ObjectId(),
      status: 'completed',
      startTime: new Date(),
      endTime: new Date()
    });
    await syncHistoryDoc.save();
    await SyncHistory.deleteOne({ _id: syncHistoryDoc._id });
    console.log('SyncHistory collection created');
    
    // List all collections after initialization
    console.log('\nExisting collections after initialization:');
    const collectionsAfter = await db.listCollections().toArray();
    collectionsAfter.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    console.log('\nCollection initialization complete!');
    
  } catch (error) {
    console.error('Error:', error);
    if (mongoose.connection) {
      await mongoose.disconnect();
    }
  }
}

// Run the function
initializeCollections();

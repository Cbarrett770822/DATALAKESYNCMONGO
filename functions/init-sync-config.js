// Netlify function to initialize default sync configurations
const mongodb = require('./utils/mongodb');
const SyncConfig = require('./models/sync-config');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

// Default sync configurations
const defaultConfigs = [
  {
    tableId: 'taskdetail',
    tableName: 'Task Detail',
    description: 'Warehouse tasks and operations',
    enabled: true,
    syncFrequency: 60, // 1 hour
    initialSync: true,
    batchSize: 1000,
    maxRecords: 10000,
    options: {
      whseid: 'WMD1'
    }
  },
  {
    tableId: 'receipt',
    tableName: 'Receipt',
    description: 'Warehouse receipts',
    enabled: true,
    syncFrequency: 120, // 2 hours
    initialSync: true,
    batchSize: 500,
    maxRecords: 5000,
    options: {
      whseid: 'WMD1'
    }
  },
  {
    tableId: 'receiptdetail',
    tableName: 'Receipt Detail',
    description: 'Warehouse receipt line items',
    enabled: true,
    syncFrequency: 120, // 2 hours
    initialSync: true,
    batchSize: 1000,
    maxRecords: 10000,
    options: {
      whseid: 'WMD1'
    }
  },
  {
    tableId: 'orders',
    tableName: 'Orders',
    description: 'Customer orders',
    enabled: true,
    syncFrequency: 60, // 1 hour
    initialSync: true,
    batchSize: 500,
    maxRecords: 5000,
    options: {
      whseid: 'WMD1'
    }
  },
  {
    tableId: 'orderdetail',
    tableName: 'Order Detail',
    description: 'Customer order line items',
    enabled: true,
    syncFrequency: 60, // 1 hour
    initialSync: true,
    batchSize: 1000,
    maxRecords: 10000,
    options: {
      whseid: 'WMD1'
    }
  }
];

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
  }
  
  try {
    // Connect to MongoDB
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, null, 500);
    }
    
    // Parse request body to check for force flag
    const requestBody = JSON.parse(event.body || '{}');
    const force = requestBody.force === true;
    
    // Check if configs already exist
    const existingCount = await SyncConfig.countDocuments();
    
    if (existingCount > 0 && !force) {
      await mongodb.disconnectFromDatabase();
      return successResponse({
        message: 'Sync configurations already exist. Use force=true to overwrite.',
        existingCount
      });
    }
    
    // If force is true, delete existing configs
    if (force) {
      console.log('Force flag is true, deleting existing configurations...');
      await SyncConfig.deleteMany({});
    }
    
    // Insert default configs
    console.log('Inserting default sync configurations...');
    const results = await SyncConfig.insertMany(defaultConfigs);
    
    await mongodb.disconnectFromDatabase();
    return successResponse({
      message: 'Default sync configurations initialized successfully',
      count: results.length,
      configs: results
    });
  } catch (error) {
    console.error('Error initializing sync configurations:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to initialize sync configurations',
      error.message,
      500
    );
  }
};

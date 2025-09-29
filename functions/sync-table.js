// Netlify function to sync any table data from DataFabric to MongoDB
const mongodb = require('./utils/mongodb');
const syncHelper = require('./utils/sync-helper');
const taskDetailSync = require('./utils/taskdetail-sync');
const SyncConfig = require('./models/sync-config');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    console.log('Received sync request');
    
    // Parse the request body
    let requestBody = {};
    try {
      requestBody = JSON.parse(event.body || '{}');
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return errorResponse('Invalid request body: ' + parseError.message, null, 400);
    }
    
    // Get table ID from request
    const tableId = requestBody.tableId || event.queryStringParameters?.tableId;
    
    if (!tableId) {
      return errorResponse('tableId is required', null, 400);
    }
    
    // Validate table ID
    const validTableIds = ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail'];
    if (!validTableIds.includes(tableId)) {
      return errorResponse(`Invalid tableId: ${tableId}. Must be one of: ${validTableIds.join(', ')}`, null, 400);
    }
    
    // Connect to MongoDB
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, { stack: dbError.stack }, 500);
    }
    
    // Check if sync config exists
    let syncConfig = await SyncConfig.findOne({ tableId }).lean();
    
    // If no config exists, create a default one
    if (!syncConfig) {
      console.log(`No sync configuration found for ${tableId}, creating default config`);
      
      // Default config based on table ID
      const defaultConfig = {
        tableId: tableId,
        tableName: tableId === 'taskdetail' ? 'Task Detail' : 
                  tableId === 'receipt' ? 'Receipt' : 
                  tableId === 'receiptdetail' ? 'Receipt Detail' : 
                  tableId === 'orders' ? 'Orders' : 
                  tableId === 'orderdetail' ? 'Order Detail' : tableId,
        description: `Default configuration for ${tableId}`,
        enabled: true,
        syncFrequency: 60,
        initialSync: true,
        batchSize: 1000,
        maxRecords: 10000,
        options: {
          whseid: requestBody.whseid || 'wmwhse1'
        }
      };
      
      try {
        // Create new config
        const newConfig = new SyncConfig(defaultConfig);
        await newConfig.save();
        console.log(`Created default config for ${tableId}`);
        
        // Use the new config
        syncConfig = newConfig.toObject();
      } catch (configError) {
        console.error(`Error creating default config for ${tableId}:`, configError);
        await mongodb.disconnectFromDatabase();
        return errorResponse(`Failed to create sync configuration for ${tableId}`, configError.message, 500);
      }
    }
    
    // Check if sync is enabled
    if (!syncConfig.enabled && !requestBody.force) {
      await mongodb.disconnectFromDatabase();
      return errorResponse(`Sync for table ${tableId} is disabled. Use force=true to override.`, null, 403);
    }
    
    // Get sync options from request body and sync config
    const syncOptions = {
      whseid: requestBody.whseid || syncConfig.options?.whseid,
      startDate: requestBody.startDate,
      endDate: requestBody.endDate,
      batchSize: requestBody.batchSize || syncConfig.batchSize,
      maxRecords: requestBody.maxRecords || syncConfig.maxRecords
    };
    
    console.log(`Starting ${tableId} sync with options:`, syncOptions);
    
    try {
      // Execute sync operation based on table type
      let result;
      
      if (tableId === 'taskdetail') {
        // Use specialized TaskDetail sync handler with improved error handling
        console.log('Using specialized TaskDetail sync handler');
        result = await taskDetailSync.executeTaskDetailSync(syncOptions);
      } else {
        // Use generic sync handler for other tables
        console.log(`Using generic sync handler for ${tableId}`);
        result = await syncHelper.executeSync(tableId, syncOptions);
      }
      
      // Disconnect from MongoDB
      await mongodb.disconnectFromDatabase();
      
      // Return success response
      return successResponse(result);
    } catch (syncError) {
      console.error(`Error in ${tableId} sync:`, syncError);
      
      // Disconnect from MongoDB
      await mongodb.disconnectFromDatabase();
      
      // Return error response with detailed information
      return errorResponse(
        syncError.message || `Failed to sync ${tableId} data`,
        {
          jobId: syncError.jobId,
          historyId: syncError.historyId,
          error: syncError.error,
          stats: syncError.stats
        },
        500
      );
    }
  } catch (error) {
    console.error('Error in sync-table function:', error);
    
    // Disconnect from MongoDB if connected
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to process sync request',
      error.message,
      500
    );
  }
};

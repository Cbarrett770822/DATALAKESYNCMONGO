// Netlify function to handle scheduled sync jobs
const mongodb = require('./utils/mongodb');
const syncHelper = require('./utils/sync-helper');
const SyncConfig = require('./models/sync-config');
const SyncHistory = require('./models/sync-history');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

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
    console.log('Received scheduled sync request');
    
    // Connect to MongoDB
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, null, 500);
    }
    
    // Get all enabled sync configs
    const syncConfigs = await SyncConfig.find({ enabled: true }).lean();
    
    if (syncConfigs.length === 0) {
      await mongodb.disconnectFromDatabase();
      return successResponse({
        message: 'No enabled sync configurations found',
        syncedTables: []
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each sync config
    for (const config of syncConfigs) {
      try {
        console.log(`Processing scheduled sync for ${config.tableId}`);
        
        // Check if it's time to sync based on frequency
        const shouldSync = checkSyncSchedule(config);
        
        if (!shouldSync) {
          console.log(`Skipping ${config.tableId} - not scheduled for sync yet`);
          continue;
        }
        
        // Prepare sync options
        const syncOptions = {
          whseid: config.options?.whseid,
          batchSize: config.batchSize,
          maxRecords: config.maxRecords
        };
        
        // If it's an initial sync, don't set date filters
        if (!config.initialSync) {
          // Set start date to last sync date if available
          if (config.lastSyncDate) {
            syncOptions.startDate = new Date(config.lastSyncDate).toISOString();
          }
        }
        
        // Execute sync
        const result = await syncHelper.executeSync(config.tableId, syncOptions);
        
        // Update initialSync flag if this was the first sync
        if (config.initialSync) {
          await SyncConfig.findByIdAndUpdate(config._id, { initialSync: false });
        }
        
        results.push({
          tableId: config.tableId,
          tableName: config.tableName,
          jobId: result.jobId,
          historyId: result.historyId,
          stats: result.stats
        });
      } catch (error) {
        console.error(`Error syncing ${config.tableId}:`, error);
        
        errors.push({
          tableId: config.tableId,
          tableName: config.tableName,
          error: error.message,
          jobId: error.jobId,
          historyId: error.historyId
        });
      }
    }
    
    await mongodb.disconnectFromDatabase();
    
    return successResponse({
      message: 'Scheduled sync completed',
      timestamp: new Date().toISOString(),
      syncedTables: results,
      errors: errors
    });
  } catch (error) {
    console.error('Error in scheduled-sync function:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to process scheduled sync',
      error.message,
      500
    );
  }
};

/**
 * Check if a sync should be performed based on the schedule
 * @param {Object} config - Sync configuration
 * @returns {boolean} - Whether sync should be performed
 */
function checkSyncSchedule(config) {
  // If it's an initial sync, always perform it
  if (config.initialSync) {
    return true;
  }
  
  // If there's no last sync date, perform sync
  if (!config.lastSyncDate) {
    return true;
  }
  
  // Calculate time since last sync in minutes
  const lastSyncDate = new Date(config.lastSyncDate);
  const now = new Date();
  const minutesSinceLastSync = (now - lastSyncDate) / (1000 * 60);
  
  // Check if enough time has passed based on frequency
  return minutesSinceLastSync >= config.syncFrequency;
}

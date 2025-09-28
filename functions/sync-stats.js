// Netlify function to get sync statistics for tables
const mongodb = require('./utils/mongodb');
const SyncConfig = require('./models/sync-config');
const SyncHistory = require('./models/sync-history');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
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
    
    // Get table ID from query parameters
    const tableId = event.queryStringParameters?.tableId;
    
    let stats;
    
    if (tableId) {
      // Get stats for a specific table
      stats = await getTableStats(tableId);
    } else {
      // Get stats for all tables
      stats = await getAllTablesStats();
    }
    
    await mongodb.disconnectFromDatabase();
    return successResponse(stats);
  } catch (error) {
    console.error('Error in sync-stats function:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to get sync statistics',
      error.message,
      500
    );
  }
};

/**
 * Get statistics for a specific table
 * @param {string} tableId - Table ID
 * @returns {Promise<Object>} - Table statistics
 */
async function getTableStats(tableId) {
  // Get sync config
  const syncConfig = await SyncConfig.findOne({ tableId }).lean();
  
  if (!syncConfig) {
    throw new Error(`Sync configuration for table ${tableId} not found`);
  }
  
  // Get latest history entry
  const latestHistory = await SyncHistory.findOne({ tableId })
    .sort({ startTime: -1 })
    .lean();
  
  // Get sync history count
  const historyCount = await SyncHistory.countDocuments({ tableId });
  
  // Get successful syncs count
  const successfulSyncs = await SyncHistory.countDocuments({ 
    tableId, 
    status: 'completed' 
  });
  
  // Get failed syncs count
  const failedSyncs = await SyncHistory.countDocuments({ 
    tableId, 
    status: 'failed' 
  });
  
  // Get total records processed
  const totalRecordsAgg = await SyncHistory.aggregate([
    { $match: { tableId } },
    { $group: {
      _id: null,
      totalProcessed: { $sum: '$recordsProcessed' },
      totalInserted: { $sum: '$recordsInserted' },
      totalUpdated: { $sum: '$recordsUpdated' },
      totalErrors: { $sum: '$recordsError' }
    }}
  ]);
  
  const totalRecords = totalRecordsAgg.length > 0 ? totalRecordsAgg[0] : {
    totalProcessed: 0,
    totalInserted: 0,
    totalUpdated: 0,
    totalErrors: 0
  };
  
  // Get average sync duration
  const durationAgg = await SyncHistory.aggregate([
    { $match: { tableId, status: 'completed' } },
    { $group: {
      _id: null,
      avgDuration: { $avg: '$duration' },
      minDuration: { $min: '$duration' },
      maxDuration: { $max: '$duration' }
    }}
  ]);
  
  const durationStats = durationAgg.length > 0 ? durationAgg[0] : {
    avgDuration: 0,
    minDuration: 0,
    maxDuration: 0
  };
  
  return {
    tableId,
    tableName: syncConfig.tableName,
    enabled: syncConfig.enabled,
    syncFrequency: syncConfig.syncFrequency,
    lastSync: latestHistory ? {
      date: latestHistory.endTime || latestHistory.startTime,
      status: latestHistory.status,
      recordsProcessed: latestHistory.recordsProcessed,
      duration: latestHistory.duration
    } : null,
    syncHistory: {
      total: historyCount,
      successful: successfulSyncs,
      failed: failedSyncs
    },
    records: {
      totalProcessed: totalRecords.totalProcessed,
      totalInserted: totalRecords.totalInserted,
      totalUpdated: totalRecords.totalUpdated,
      totalErrors: totalRecords.totalErrors
    },
    performance: {
      avgDuration: durationStats.avgDuration,
      minDuration: durationStats.minDuration,
      maxDuration: durationStats.maxDuration
    }
  };
}

/**
 * Get statistics for all tables
 * @returns {Promise<Object>} - All tables statistics
 */
async function getAllTablesStats() {
  // Get all sync configs
  const syncConfigs = await SyncConfig.find().lean();
  
  // Get stats for each table
  const tableStats = [];
  
  for (const config of syncConfigs) {
    try {
      const stats = await getTableStats(config.tableId);
      tableStats.push(stats);
    } catch (error) {
      console.error(`Error getting stats for ${config.tableId}:`, error);
      // Add basic info for tables with errors
      tableStats.push({
        tableId: config.tableId,
        tableName: config.tableName,
        enabled: config.enabled,
        error: error.message
      });
    }
  }
  
  // Get overall statistics
  const totalSyncs = await SyncHistory.countDocuments();
  const successfulSyncs = await SyncHistory.countDocuments({ status: 'completed' });
  const failedSyncs = await SyncHistory.countDocuments({ status: 'failed' });
  
  // Get total records processed across all tables
  const totalRecordsAgg = await SyncHistory.aggregate([
    { $group: {
      _id: null,
      totalProcessed: { $sum: '$recordsProcessed' },
      totalInserted: { $sum: '$recordsInserted' },
      totalUpdated: { $sum: '$recordsUpdated' },
      totalErrors: { $sum: '$recordsError' }
    }}
  ]);
  
  const totalRecords = totalRecordsAgg.length > 0 ? totalRecordsAgg[0] : {
    totalProcessed: 0,
    totalInserted: 0,
    totalUpdated: 0,
    totalErrors: 0
  };
  
  return {
    tables: tableStats,
    summary: {
      totalTables: syncConfigs.length,
      enabledTables: syncConfigs.filter(c => c.enabled).length,
      syncHistory: {
        total: totalSyncs,
        successful: successfulSyncs,
        failed: failedSyncs
      },
      records: {
        totalProcessed: totalRecords.totalProcessed,
        totalInserted: totalRecords.totalInserted,
        totalUpdated: totalRecords.totalUpdated,
        totalErrors: totalRecords.totalErrors
      }
    }
  };
}

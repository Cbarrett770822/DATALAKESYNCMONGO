// Sync Helper Utility
// Provides common functions for sync operations

const ionApi = require('./ion-api');
const mongodb = require('./mongodb');
const SyncJob = require('../models/sync-job');
const SyncHistory = require('../models/sync-history');
const SyncConfig = require('../models/sync-config');
const queryBuilder = require('./extended-query-builder');
const dataTransformer = require('./extended-data-transformer');

/**
 * Get the appropriate query builder function for a table
 * @param {string} tableId - Table ID
 * @param {string} queryType - Type of query (count, paginated)
 * @returns {Function} - Query builder function
 */
function getQueryBuilderFunction(tableId, queryType) {
  const functionMap = {
    taskdetail: {
      count: queryBuilder.buildTaskdetailCountQuery,
      paginated: queryBuilder.buildTaskdetailPaginatedQuery
    },
    receipt: {
      count: queryBuilder.buildReceiptCountQuery,
      paginated: queryBuilder.buildReceiptPaginatedQuery
    },
    receiptdetail: {
      count: queryBuilder.buildReceiptDetailCountQuery,
      paginated: queryBuilder.buildReceiptDetailPaginatedQuery
    },
    orders: {
      count: queryBuilder.buildOrdersCountQuery,
      paginated: queryBuilder.buildOrdersPaginatedQuery
    },
    orderdetail: {
      count: queryBuilder.buildOrderDetailCountQuery,
      paginated: queryBuilder.buildOrderDetailPaginatedQuery
    }
  };
  
  return functionMap[tableId]?.[queryType];
}

/**
 * Get the appropriate data transformer functions for a table
 * @param {string} tableId - Table ID
 * @returns {Object} - Object containing transformer functions
 */
function getDataTransformerFunctions(tableId) {
  const functionMap = {
    taskdetail: {
      transformResults: dataTransformer.transformTaskdetailResults,
      createBulkWriteOperations: dataTransformer.createBulkWriteOperations
    },
    receipt: {
      transformResults: dataTransformer.transformReceiptResults,
      createBulkWriteOperations: dataTransformer.createReceiptBulkWriteOperations
    },
    receiptdetail: {
      transformResults: dataTransformer.transformReceiptDetailResults,
      createBulkWriteOperations: dataTransformer.createReceiptDetailBulkWriteOperations
    },
    orders: {
      transformResults: dataTransformer.transformOrdersResults,
      createBulkWriteOperations: dataTransformer.createOrdersBulkWriteOperations
    },
    orderdetail: {
      transformResults: dataTransformer.transformOrderDetailResults,
      createBulkWriteOperations: dataTransformer.createOrderDetailBulkWriteOperations
    }
  };
  
  return functionMap[tableId];
}

/**
 * Get the appropriate model for a table
 * @param {string} tableId - Table ID
 * @returns {Object} - Mongoose model
 */
function getModelForTable(tableId) {
  const modelMap = {
    taskdetail: require('../models/taskdetail'),
    receipt: require('../models/receipt'),
    receiptdetail: require('../models/receipt-detail'),
    orders: require('../models/orders'),
    orderdetail: require('../models/order-detail')
  };
  
  return modelMap[tableId];
}

/**
 * Create a sync job record
 * @param {string} tableId - Table ID
 * @param {Object} options - Sync options
 * @param {Object} stats - Sync statistics
 * @returns {Promise<Object>} - Created sync job
 */
async function createSyncJob(tableId, options, stats) {
  const syncJob = new SyncJob({
    jobType: tableId,
    status: stats.status || 'completed',
    options: options,
    stats: stats,
    error: stats.error
  });
  
  await syncJob.save();
  return syncJob;
}

/**
 * Create a sync history entry
 * @param {string} tableId - Table ID
 * @param {string} tableName - Table name
 * @param {Object} syncJob - Sync job
 * @param {Object} stats - Sync statistics
 * @returns {Promise<Object>} - Created sync history entry
 */
async function createSyncHistory(tableId, tableName, syncJob, stats) {
  const historyEntry = new SyncHistory({
    tableId,
    tableName,
    syncJobId: syncJob._id,
    status: stats.status || 'completed',
    startTime: stats.startTime,
    endTime: stats.endTime,
    duration: stats.duration,
    recordsProcessed: stats.processedRecords || 0,
    recordsInserted: stats.insertedRecords || 0,
    recordsUpdated: stats.updatedRecords || 0,
    recordsError: stats.errorRecords || 0,
    error: stats.error,
    options: syncJob.options
  });
  
  await historyEntry.save();
  return historyEntry;
}

/**
 * Update sync config with latest sync information
 * @param {string} tableId - Table ID
 * @param {Object} historyEntry - Sync history entry
 * @returns {Promise<Object>} - Updated sync config
 */
async function updateSyncConfig(tableId, historyEntry) {
  return await SyncConfig.findOneAndUpdate(
    { tableId },
    { 
      $set: { 
        lastSyncDate: historyEntry.endTime,
        lastSyncStatus: historyEntry.status,
        lastSyncJobId: historyEntry._id
      }
    },
    { new: true }
  );
}

/**
 * Execute a sync operation for a table
 * @param {string} tableId - Table ID
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync results
 */
async function executeSync(tableId, options) {
  // Get the appropriate functions and model
  const countQueryBuilder = getQueryBuilderFunction(tableId, 'count');
  const paginatedQueryBuilder = getQueryBuilderFunction(tableId, 'paginated');
  const transformers = getDataTransformerFunctions(tableId);
  const Model = getModelForTable(tableId);
  
  if (!countQueryBuilder || !paginatedQueryBuilder || !transformers || !Model) {
    throw new Error(`Invalid table ID: ${tableId}`);
  }
  
  // Get sync config
  const syncConfig = await SyncConfig.findOne({ tableId }).lean();
  if (!syncConfig) {
    throw new Error(`Sync configuration for table ${tableId} not found`);
  }
  
  // Merge options with sync config
  const syncOptions = {
    ...syncConfig,
    ...options
  };
  
  // Track sync statistics
  const stats = {
    totalRecords: 0,
    processedRecords: 0,
    insertedRecords: 0,
    updatedRecords: 0,
    errorRecords: 0,
    startTime: new Date(),
    endTime: null,
    status: 'in_progress'
  };
  
  try {
    // Build and submit count query
    const countQuery = countQueryBuilder(syncOptions);
    const countQueryResponse = await ionApi.submitQuery(countQuery);
    const countQueryId = countQueryResponse.queryId || countQueryResponse.id;
    
    // Wait for count query to complete
    let countStatus = await ionApi.checkStatus(countQueryId);
    while (countStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      countStatus = await ionApi.checkStatus(countQueryId);
      
      if (countStatus.status === 'failed') {
        throw new Error(`Count query failed: ${countStatus.message}`);
      }
    }
    
    // Get count results
    const countResults = await ionApi.getResults(countQueryId);
    const totalRecords = parseInt(countResults.results[0].count, 10);
    stats.totalRecords = totalRecords;
    
    // Limit the number of records to sync
    const recordsToSync = Math.min(totalRecords, syncOptions.maxRecords || 10000);
    
    // Calculate the number of batches
    const batchSize = syncOptions.batchSize || 1000;
    const numBatches = Math.ceil(recordsToSync / batchSize);
    
    // Process each batch
    for (let batch = 0; batch < numBatches; batch++) {
      const offset = batch * batchSize;
      const limit = Math.min(batchSize, recordsToSync - offset);
      
      // Build and submit batch query
      const batchOptions = {
        ...syncOptions,
        offset,
        limit
      };
      const batchQuery = paginatedQueryBuilder(batchOptions);
      const batchQueryResponse = await ionApi.submitQuery(batchQuery);
      const batchQueryId = batchQueryResponse.queryId || batchQueryResponse.id;
      
      // Wait for batch query to complete
      let batchStatus = await ionApi.checkStatus(batchQueryId);
      while (batchStatus.status !== 'completed') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        batchStatus = await ionApi.checkStatus(batchQueryId);
        
        if (batchStatus.status === 'failed') {
          throw new Error(`Batch query failed: ${batchStatus.message}`);
        }
      }
      
      // Get batch results
      const batchResults = await ionApi.getResults(batchQueryId);
      const records = batchResults.results || [];
      
      // Transform records
      const documents = transformers.transformResults(records);
      
      // Create bulk write operations
      const bulkOperations = transformers.createBulkWriteOperations(documents);
      
      // Skip if no operations
      if (bulkOperations.length === 0) {
        continue;
      }
      
      // Perform bulk write
      try {
        const bulkResult = await Model.bulkWrite(bulkOperations);
        
        // Update stats
        stats.processedRecords += records.length;
        stats.insertedRecords += bulkResult.insertedCount || 0;
        stats.updatedRecords += bulkResult.modifiedCount || 0;
      } catch (error) {
        console.error(`Error in batch ${batch + 1}:`, error);
        stats.errorRecords += records.length;
      }
    }
    
    // Update final stats
    stats.endTime = new Date();
    stats.status = 'completed';
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    
    // Create sync job record
    const syncJob = await createSyncJob(tableId, syncOptions, stats);
    
    // Get table name from sync config
    const tableName = syncConfig.tableName || tableId;
    
    // Create sync history entry
    const historyEntry = await createSyncHistory(tableId, tableName, syncJob, stats);
    
    // Update sync config
    await updateSyncConfig(tableId, historyEntry);
    
    return {
      message: `${tableId} sync completed successfully`,
      jobId: syncJob._id,
      historyId: historyEntry._id,
      stats
    };
  } catch (error) {
    // Update error stats
    stats.endTime = new Date();
    stats.status = 'failed';
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    stats.error = error.message;
    
    // Create failed sync job record
    const syncJob = await createSyncJob(tableId, syncOptions, stats);
    
    // Get table name from sync config
    const tableName = syncConfig.tableName || tableId;
    
    // Create sync history entry
    const historyEntry = await createSyncHistory(tableId, tableName, syncJob, stats);
    
    // Update sync config
    await updateSyncConfig(tableId, historyEntry);
    
    throw {
      message: `Failed to sync ${tableId} data`,
      jobId: syncJob._id,
      historyId: historyEntry._id,
      error: error.message,
      stats
    };
  }
}

module.exports = {
  executeSync,
  createSyncJob,
  createSyncHistory,
  updateSyncConfig
};

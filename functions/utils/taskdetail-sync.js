// TaskDetail Sync Utility
// Specialized handling for TaskDetail synchronization with robust error handling

const mongoose = require('mongoose');
const TaskDetail = require('../models/taskdetail');
const SyncJob = require('../models/sync-job');
const SyncHistory = require('../models/sync-history');
const SyncConfig = require('../models/sync-config');
const ionApi = require('./ion-api');
const queryBuilder = require('./extended-query-builder');
const dataTransformer = require('./extended-data-transformer');

/**
 * Maximum number of retries for transient errors
 */
const MAX_RETRIES = 5;

/**
 * Initial retry delay in milliseconds
 */
const INITIAL_RETRY_DELAY = 500;

/**
 * Check if an error is a transient MongoDB error that can be retried
 * @param {Error} error - The error to check
 * @returns {boolean} - Whether the error is transient
 */
function isTransientError(error) {
  // Check for MongoDB transient error labels
  if (error.hasErrorLabel && (
    error.hasErrorLabel('TransientTransactionError') ||
    error.hasErrorLabel('UnknownTransactionCommitResult')
  )) {
    return true;
  }
  
  // Check for specific error messages
  if (error.message && (
    error.message.includes('WriteConflict') ||
    error.message.includes('OperationNotSupportedInTransaction') ||
    error.message.includes('Transaction numbers') ||
    error.message.includes('TransactionCoordinatorSteppingDown') ||
    error.message.includes('Could not find session') ||
    error.message.includes('connection pool closed') ||
    error.message.includes('interrupted at shutdown')
  )) {
    return true;
  }
  
  return false;
}

/**
 * Execute a TaskDetail sync operation with robust error handling
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} - Sync results
 */
async function executeTaskDetailSync(options) {
  // Get sync config
  const syncConfig = await SyncConfig.findOne({ tableId: 'taskdetail' }).lean();
  if (!syncConfig) {
    throw new Error('Sync configuration for TaskDetail not found');
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
  
  // Create sync job record
  const syncJob = new SyncJob({
    jobType: 'taskdetail',
    status: 'in_progress',
    options: syncOptions,
    stats: stats,
    createdBy: 'system'
  });
  
  await syncJob.save();
  console.log(`Created sync job with ID: ${syncJob._id}`);
  
  try {
    // Build and submit count query
    const countQuery = queryBuilder.buildTaskdetailCountQuery(syncOptions);
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
    console.log(`Total TaskDetail records: ${totalRecords}`);
    
    // Update sync job with total records
    await SyncJob.findByIdAndUpdate(syncJob._id, {
      'stats.totalRecords': totalRecords
    });
    
    // Limit the number of records to sync
    const recordsToSync = Math.min(totalRecords, syncOptions.maxRecords || 10000);
    
    // Calculate the number of batches
    const batchSize = syncOptions.batchSize || 1000;
    const numBatches = Math.ceil(recordsToSync / batchSize);
    console.log(`Will process ${recordsToSync} records in ${numBatches} batches of ${batchSize}`);
    
    // Process each batch
    for (let batch = 0; batch < numBatches; batch++) {
      const offset = batch * batchSize;
      const limit = Math.min(batchSize, recordsToSync - offset);
      console.log(`Processing batch ${batch + 1}/${numBatches}, offset: ${offset}, limit: ${limit}`);
      
      // Build and submit batch query
      const batchOptions = {
        ...syncOptions,
        offset,
        limit
      };
      const batchQuery = queryBuilder.buildTaskdetailPaginatedQuery(batchOptions);
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
      console.log(`Retrieved ${records.length} records in batch ${batch + 1}`);
      
      // Transform records
      const documents = dataTransformer.transformTaskdetailResults(records);
      console.log(`Transformed ${documents.length} records`);
      
      // Create bulk write operations
      const bulkOperations = dataTransformer.createTaskdetailBulkWriteOperations(documents);
      console.log(`Created ${bulkOperations.length} bulk operations`);
      
      // Skip if no operations
      if (bulkOperations.length === 0) {
        console.log('No operations to perform, skipping batch');
        continue;
      }
      
      // Perform bulk write with retries for transient errors
      let retries = 0;
      let lastError = null;
      let success = false;
      
      while (retries <= MAX_RETRIES && !success) {
        // Create a session for transaction
        const session = await mongoose.startSession();
        
        try {
          // Start transaction
          session.startTransaction();
          console.log(`Starting transaction (attempt ${retries + 1})`);
          
          // Execute bulk write within transaction
          const bulkResult = await TaskDetail.bulkWrite(bulkOperations, { session });
          
          // Commit the transaction
          await session.commitTransaction();
          console.log('Transaction committed successfully');
          
          // Update stats
          stats.processedRecords += records.length;
          stats.insertedRecords += bulkResult.insertedCount || 0;
          stats.updatedRecords += bulkResult.modifiedCount || 0;
          
          // Update sync job with progress
          await SyncJob.findByIdAndUpdate(syncJob._id, {
            'stats.processedRecords': stats.processedRecords,
            'stats.insertedRecords': stats.insertedRecords,
            'stats.updatedRecords': stats.updatedRecords
          });
          
          success = true;
        } catch (error) {
          lastError = error;
          console.error(`Error in batch ${batch + 1} (attempt ${retries + 1}):`, error.message);
          
          // Check if this is a transient error
          if (isTransientError(error)) {
            console.log('Detected transient error, will retry');
            retries++;
            
            // Abort the transaction if it's still active
            if (session.inTransaction()) {
              try {
                await session.abortTransaction();
                console.log('Transaction aborted');
              } catch (abortError) {
                console.error('Error aborting transaction:', abortError.message);
              }
            }
            
            // Exponential backoff
            const delay = INITIAL_RETRY_DELAY * Math.pow(2, retries - 1);
            console.log(`Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            // Non-transient error, don't retry
            console.error('Non-transient error, will not retry');
            break;
          }
        } finally {
          // End session
          await session.endSession();
        }
      }
      
      // If all retries failed, update error stats
      if (!success) {
        stats.errorRecords += records.length;
        await SyncJob.findByIdAndUpdate(syncJob._id, {
          'stats.errorRecords': stats.errorRecords
        });
        console.error(`Failed to process batch ${batch + 1} after ${MAX_RETRIES} retries`);
      }
    }
    
    // Update final stats
    stats.endTime = new Date();
    stats.status = 'completed';
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    
    // Update sync job with final stats
    await SyncJob.findByIdAndUpdate(syncJob._id, {
      status: 'completed',
      stats: stats,
      updatedBy: 'system'
    });
    
    // Get table name from sync config
    const tableName = syncConfig.tableName || 'Task Detail';
    
    // Create sync history entry
    const historyEntry = new SyncHistory({
      tableId: 'taskdetail',
      tableName: tableName,
      syncJobId: syncJob._id,
      status: 'completed',
      startTime: stats.startTime,
      endTime: stats.endTime,
      duration: stats.duration,
      recordsProcessed: stats.processedRecords,
      recordsInserted: stats.insertedRecords,
      recordsUpdated: stats.updatedRecords,
      recordsError: stats.errorRecords,
      options: syncOptions
    });
    
    await historyEntry.save();
    
    // Update sync config
    await SyncConfig.findOneAndUpdate(
      { tableId: 'taskdetail' },
      { 
        $set: { 
          lastSyncDate: stats.endTime,
          lastSyncStatus: 'completed',
          lastSyncJobId: historyEntry._id
        }
      }
    );
    
    console.log('TaskDetail sync completed successfully');
    
    return {
      message: 'TaskDetail sync completed successfully',
      jobId: syncJob._id,
      historyId: historyEntry._id,
      stats
    };
  } catch (error) {
    console.error('Error in TaskDetail sync:', error);
    
    // Update error stats
    stats.endTime = new Date();
    stats.status = 'failed';
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    stats.error = error.message;
    
    // Update sync job with error status
    await SyncJob.findByIdAndUpdate(syncJob._id, {
      status: 'failed',
      stats: stats,
      error: error.message,
      updatedBy: 'system'
    });
    
    // Get table name from sync config
    const tableName = syncConfig?.tableName || 'Task Detail';
    
    // Create sync history entry for failed job
    const historyEntry = new SyncHistory({
      tableId: 'taskdetail',
      tableName: tableName,
      syncJobId: syncJob._id,
      status: 'failed',
      startTime: stats.startTime,
      endTime: stats.endTime,
      duration: stats.duration,
      recordsProcessed: stats.processedRecords,
      recordsInserted: stats.insertedRecords,
      recordsUpdated: stats.updatedRecords,
      recordsError: stats.errorRecords,
      error: error.message,
      options: syncOptions
    });
    
    await historyEntry.save();
    
    // Update sync config with failure status
    await SyncConfig.findOneAndUpdate(
      { tableId: 'taskdetail' },
      { 
        $set: { 
          lastSyncDate: stats.endTime,
          lastSyncStatus: 'failed',
          lastSyncJobId: historyEntry._id
        }
      }
    );
    
    throw {
      message: `Failed to sync TaskDetail data: ${error.message}`,
      jobId: syncJob._id,
      historyId: historyEntry._id,
      error: error.message,
      stats
    };
  }
}

module.exports = {
  executeTaskDetailSync,
  isTransientError
};

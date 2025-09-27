// Netlify function to sync taskdetail data from DataFabric to MongoDB
const ionApi = require('./utils/ion-api');
const mongodb = require('./utils/mongodb');
const queryBuilder = require('./utils/query-builder');
const dataTransformer = require('./utils/data-transformer');
const TaskDetail = require('./models/taskdetail');
const SyncJob = require('./models/sync-job');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    
    // Get sync options
    const syncOptions = {
      whseid: requestBody.whseid,
      startDate: requestBody.startDate,
      endDate: requestBody.endDate,
      taskType: requestBody.taskType,
      batchSize: requestBody.batchSize || 1000,
      maxRecords: requestBody.maxRecords || 10000
    };
    
    console.log('Starting taskdetail sync with options:', syncOptions);
    
    // Connect to MongoDB
    await mongodb.connectToDatabase();
    
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
    
    // Build a query to get the count of records
    const countQuery = queryBuilder.buildTaskdetailCountQuery(syncOptions);
    
    // Submit the count query
    const countQueryResponse = await ionApi.submitQuery(countQuery);
    const countQueryId = countQueryResponse.queryId || countQueryResponse.id;
    
    // Wait for the count query to complete
    let countStatus = await ionApi.checkStatus(countQueryId);
    while (countStatus.status !== 'completed') {
      // Wait for 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      countStatus = await ionApi.checkStatus(countQueryId);
      
      // Check for errors
      if (countStatus.status === 'failed') {
        throw new Error(`Count query failed: ${countStatus.message}`);
      }
    }
    
    // Get the count results
    const countResults = await ionApi.getResults(countQueryId);
    const totalRecords = parseInt(countResults.results[0].count, 10);
    stats.totalRecords = totalRecords;
    
    console.log(`Found ${totalRecords} records to sync`);
    
    // Limit the number of records to sync
    const recordsToSync = Math.min(totalRecords, syncOptions.maxRecords);
    
    // Calculate the number of batches
    const batchSize = syncOptions.batchSize;
    const numBatches = Math.ceil(recordsToSync / batchSize);
    
    // Process each batch
    for (let batch = 0; batch < numBatches; batch++) {
      const offset = batch * batchSize;
      const limit = Math.min(batchSize, recordsToSync - offset);
      
      console.log(`Processing batch ${batch + 1}/${numBatches} (offset: ${offset}, limit: ${limit})`);
      
      // Build a query for this batch
      const batchOptions = {
        ...syncOptions,
        offset,
        limit
      };
      const batchQuery = queryBuilder.buildTaskdetailPaginatedQuery(batchOptions);
      
      // Submit the batch query
      const batchQueryResponse = await ionApi.submitQuery(batchQuery);
      const batchQueryId = batchQueryResponse.queryId || batchQueryResponse.id;
      
      // Wait for the batch query to complete
      let batchStatus = await ionApi.checkStatus(batchQueryId);
      while (batchStatus.status !== 'completed') {
        // Wait for 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        batchStatus = await ionApi.checkStatus(batchQueryId);
        
        // Check for errors
        if (batchStatus.status === 'failed') {
          throw new Error(`Batch query failed: ${batchStatus.message}`);
        }
      }
      
      // Get the batch results
      const batchResults = await ionApi.getResults(batchQueryId);
      const records = batchResults.results || [];
      
      // Transform the records
      const documents = dataTransformer.transformTaskdetailResults(records);
      
      // Create bulk write operations
      const bulkOperations = dataTransformer.createBulkWriteOperations(documents);
      
      // Skip if no operations
      if (bulkOperations.length === 0) {
        console.log('No records to update in this batch');
        continue;
      }
      
      // Perform the bulk write
      try {
        const bulkResult = await TaskDetail.bulkWrite(bulkOperations);
        
        // Update stats
        stats.processedRecords += records.length;
        stats.insertedRecords += bulkResult.insertedCount || 0;
        stats.updatedRecords += bulkResult.modifiedCount || 0;
        
        console.log(`Batch ${batch + 1} completed: ${bulkResult.insertedCount} inserted, ${bulkResult.modifiedCount} updated`);
      } catch (error) {
        console.error(`Error in batch ${batch + 1}:`, error);
        stats.errorRecords += records.length;
      }
    }
    
    // Update final stats
    stats.endTime = new Date();
    stats.status = 'completed';
    stats.duration = (stats.endTime - stats.startTime) / 1000; // in seconds
    
    console.log('Sync completed:', stats);
    
    // Create a sync job record
    const syncJob = new SyncJob({
      jobType: 'taskdetail',
      status: 'completed',
      options: syncOptions,
      stats: stats
    });
    
    await syncJob.save();
    
    // Disconnect from MongoDB
    await mongodb.disconnectFromDatabase();
    
    // Return success response
    return successResponse({
      message: 'Taskdetail sync completed successfully',
      jobId: syncJob._id,
      stats
    });
  } catch (error) {
    console.error('Error in sync-taskdetail function:', error);
    
    // Create a failed sync job record if possible
    try {
      const syncJob = new SyncJob({
        jobType: 'taskdetail',
        status: 'failed',
        options: syncOptions || {},
        stats: stats || {},
        error: error.message || 'Unknown error'
      });
      
      await syncJob.save();
    } catch (jobError) {
      console.error('Error creating failed sync job record:', jobError);
    }
    
    // Disconnect from MongoDB
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    // Return error response
    return errorResponse(
      'Failed to sync taskdetail data',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};

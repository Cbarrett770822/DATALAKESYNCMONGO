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
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, null, 500);
    }
    
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
    
    console.log('Initialized sync statistics');
    
    // Build a query to get the count of records
    try {
      console.log('Building count query...');
      const countQuery = queryBuilder.buildTaskdetailCountQuery(syncOptions);
      console.log('Count query:', countQuery);
      
      // Submit the count query
      console.log('Submitting count query to ION API...');
      const countQueryResponse = await ionApi.submitQuery(countQuery);
      console.log('Count query submitted, response:', countQueryResponse);
      
      const countQueryId = countQueryResponse.queryId || countQueryResponse.id;
      if (!countQueryId) {
        throw new Error('No query ID returned from ION API');
      }
      
      // Wait for the count query to complete
      console.log('Waiting for count query to complete...');
      let countStatus = await ionApi.checkStatus(countQueryId);
      console.log('Initial count status:', countStatus);
      
      while (countStatus.status !== 'completed') {
        // Wait for 2 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));
        countStatus = await ionApi.checkStatus(countQueryId);
        console.log('Updated count status:', countStatus);
        
        // Check for errors
        if (countStatus.status === 'failed') {
          throw new Error(`Count query failed: ${countStatus.message}`);
        }
      }
    } catch (ionError) {
      console.error('Error in ION API interaction:', ionError);
      await mongodb.disconnectFromDatabase();
      return errorResponse('ION API error: ' + ionError.message, null, 500);
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
    
    try {
      // Create a sync job record
      console.log('Creating sync job record...');
      const syncJob = new SyncJob({
        jobType: 'taskdetail',
        status: 'completed',
        options: syncOptions,
        stats: stats
      });
      
      console.log('Saving sync job record...');
      await syncJob.save();
      console.log('Sync job saved with ID:', syncJob._id);
      
      // Disconnect from MongoDB
      console.log('Disconnecting from MongoDB...');
      await mongodb.disconnectFromDatabase();
      console.log('Disconnected from MongoDB');
      
      // Return success response
      return successResponse({
        message: 'Taskdetail sync completed successfully',
        jobId: syncJob._id,
        stats
      });
    } catch (saveError) {
      console.error('Error saving sync job record:', saveError);
      
      try {
        await mongodb.disconnectFromDatabase();
      } catch (disconnectError) {
        console.error('Error disconnecting from MongoDB:', disconnectError);
      }
      
      return errorResponse(
        'Sync completed but failed to save job record',
        saveError.message,
        500
      );
    }
  } catch (error) {
    console.error('Error in sync-taskdetail function:', error);
    console.error('Error stack:', error.stack);
    
    // Create a failed sync job record if possible
    let syncJobId = null;
    try {
      console.log('Creating failed sync job record...');
      const syncJob = new SyncJob({
        jobType: 'taskdetail',
        status: 'failed',
        options: syncOptions || {},
        stats: stats || {},
        error: error.message || 'Unknown error'
      });
      
      console.log('Saving failed sync job record...');
      await syncJob.save();
      syncJobId = syncJob._id;
      console.log('Failed sync job saved with ID:', syncJobId);
    } catch (jobError) {
      console.error('Error creating failed sync job record:', jobError);
      console.error('Job error stack:', jobError.stack);
    }
    
    // Disconnect from MongoDB
    try {
      console.log('Disconnecting from MongoDB...');
      await mongodb.disconnectFromDatabase();
      console.log('Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
      console.error('Disconnect error stack:', disconnectError.stack);
    }
    
    // Return error response with detailed information
    return errorResponse(
      'Failed to sync taskdetail data',
      {
        message: error.message || 'Unknown error',
        type: error.constructor.name,
        stack: error.stack,
        jobId: syncJobId
      },
      error.statusCode || 500
    );
  }
};

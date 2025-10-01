// Simplified version of sync-status function for testing
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Get job ID from query parameters
    const jobId = event.queryStringParameters?.jobId;
    
    if (!jobId) {
      return errorResponse('jobId is required', null, 400);
    }
    
    console.log(`Checking status for job ${jobId}`);
    
    // Parse job ID to get timestamp
    const timestamp = parseInt(jobId.split('_')[1], 10);
    const now = Date.now();
    const elapsedSeconds = (now - timestamp) / 1000;
    
    // Mock job status based on elapsed time
    let status, progress, stats;
    
    if (elapsedSeconds < 5) {
      // Job is still pending or just started
      status = 'in_progress';
      progress = Math.min(Math.floor(elapsedSeconds * 20), 100);
      stats = {
        totalRecords: 100,
        processedRecords: Math.floor(progress),
        insertedRecords: Math.floor(progress * 0.7),
        updatedRecords: Math.floor(progress * 0.3),
        errorRecords: 0,
        startTime: new Date(timestamp).toISOString(),
        duration: elapsedSeconds
      };
    } else {
      // Job is completed
      status = 'completed';
      progress = 100;
      stats = {
        totalRecords: 100,
        processedRecords: 100,
        insertedRecords: 70,
        updatedRecords: 30,
        errorRecords: 0,
        startTime: new Date(timestamp).toISOString(),
        endTime: new Date().toISOString(),
        duration: elapsedSeconds
      };
    }
    
    // Return job status
    return successResponse({
      job: {
        id: jobId,
        status: status,
        progress: progress,
        stats: stats
      },
      history: [
        {
          _id: `hist_${timestamp}`,
          tableId: 'taskdetail',
          tableName: 'Task Detail',
          status: status,
          startTime: new Date(timestamp).toISOString(),
          endTime: status === 'completed' ? new Date().toISOString() : null,
          duration: elapsedSeconds,
          recordsProcessed: stats.processedRecords,
          recordsInserted: stats.insertedRecords,
          recordsUpdated: stats.updatedRecords,
          recordsError: stats.errorRecords
        }
      ]
    });
  } catch (error) {
    console.error('Error in sync-status function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to get sync status',
      error.message,
      500
    );
  }
};

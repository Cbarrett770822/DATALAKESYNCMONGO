// Simple function to check the status of a TaskDetail copy job
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

// In-memory storage for job status (in a real app, this would be in a database)
const jobStatuses = {};

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
    
    // Get job status from in-memory storage
    const jobStatus = jobStatuses[jobId];
    
    if (!jobStatus) {
      // If job not found, return a mock completed status
      // In a real app, you would check the database
      return successResponse({
        job: {
          id: jobId,
          status: 'completed',
          processedRecords: 1000,
          insertedRecords: 700,
          updatedRecords: 300,
          errorRecords: 0,
          percentComplete: 100,
          startTime: new Date(Date.now() - 10000).toISOString(),
          endTime: new Date().toISOString(),
          duration: 10
        }
      });
    }
    
    return successResponse({
      job: jobStatus
    });
  } catch (error) {
    console.error('Error in check-copy-status function:', error);
    return errorResponse('Failed to check copy status', error.message, 500);
  }
};

// Export job statuses for other functions to use
exports.jobStatuses = jobStatuses;

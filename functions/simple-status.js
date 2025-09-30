// Simple status check endpoint
const { handlePreflight, successResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Get job ID from query parameters
  const jobId = event.queryStringParameters?.jobId || 'unknown';
  
  // Return a mock status
  return successResponse({
    job: {
      id: jobId,
      status: 'in_progress',
      processedRecords: 500,
      totalRecords: 22197,
      insertedRecords: 450,
      updatedRecords: 50,
      errorRecords: 0,
      percentComplete: 2,
      message: 'Copy in progress...'
    }
  });
};

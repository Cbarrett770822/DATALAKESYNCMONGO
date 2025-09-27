// Netlify function to check the status of a DataFabric query
const ionApi = require('./utils/ion-api');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Get the query ID from the query parameters
    const queryId = event.queryStringParameters?.queryId;
    
    if (!queryId) {
      return errorResponse('Query ID is required', null, 400);
    }
    
    console.log('Checking status for queryId:', queryId);
    
    // Check the status using the ION API module
    const response = await ionApi.checkStatus(queryId);
    
    // Return success response
    return successResponse({
      queryId: queryId,
      status: response.status,
      progress: response.progress || 0,
      message: response.message || ''
    });
  } catch (error) {
    console.error('Error in check-status function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to check status',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};

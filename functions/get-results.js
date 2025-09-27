// Netlify function to get the results of a DataFabric query
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
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
    const limit = parseInt(event.queryStringParameters?.limit || '1000', 10);
    
    if (!queryId) {
      return errorResponse('Query ID is required', null, 400);
    }
    
    console.log('Getting results for queryId:', queryId);
    
    // Get the results using the ION API module
    const response = await ionApi.getResults(queryId, offset, limit);
    
    // Return success response
    return successResponse({
      queryId: queryId,
      offset: offset,
      limit: limit,
      total: response.total || 0,
      results: response.results || []
    });
  } catch (error) {
    console.error('Error in get-results function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to get results',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};

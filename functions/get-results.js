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
    
    // Add debug information
    console.log('[DEBUG] Results response:', JSON.stringify(response, null, 2));
    
    // Format the response based on the structure returned by the API
    let formattedResponse = {
      queryId: queryId,
      offset: offset,
      limit: limit
    };
    
    // Handle different response formats from the API
    if (response.rows) {
      // Format with rows and columns
      formattedResponse.total = response.rows.length;
      formattedResponse.columns = response.columns || [];
      formattedResponse.rows = response.rows;
    } else if (response.results) {
      // Format with results array
      formattedResponse.total = response.total || 0;
      formattedResponse.results = response.results;
    } else {
      // Generic format
      formattedResponse.data = response;
    }
    
    // Return success response
    return successResponse(formattedResponse);
  } catch (error) {
    console.error('Error in get-results function:', error);
    
    // Extract error details
    let errorMessage = 'Failed to get results';
    let errorDetails = error.message || 'Unknown error';
    let statusCode = error.statusCode || 500;
    
    // Handle specific error cases
    if (statusCode === 202) {
      errorMessage = 'Query is still running';
      errorDetails = 'The query is still being processed. Please try again later.';
    } else if (error.data) {
      // Include additional error data if available
      return errorResponse(errorMessage, errorDetails, statusCode, error.data);
    }
    
    // Return error response
    return errorResponse(errorMessage, errorDetails, statusCode);
  }
};

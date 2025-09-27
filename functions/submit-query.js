// Netlify function to submit a query to DataFabric
const ionApi = require('./utils/ion-api');
const queryBuilder = require('./utils/query-builder');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    
    // Check if a custom SQL query is provided
    let sqlQuery;
    if (requestBody.sqlQuery) {
      sqlQuery = requestBody.sqlQuery;
    } else {
      // Otherwise, build a query using the query builder
      const queryOptions = {
        whseid: requestBody.whseid,
        startDate: requestBody.startDate,
        endDate: requestBody.endDate,
        taskType: requestBody.taskType,
        limit: requestBody.limit || 1000
      };
      
      sqlQuery = queryBuilder.buildTaskdetailQuery(queryOptions);
    }
    
    console.log('Submitting query:', sqlQuery);
    
    // Submit the query using the ION API module
    const response = await ionApi.submitQuery(sqlQuery);
    
    // Return success response
    return successResponse({
      queryId: response.queryId || response.id,
      status: response.status || 'submitted'
    });
  } catch (error) {
    console.error('Error in submit-query function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to submit query',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};

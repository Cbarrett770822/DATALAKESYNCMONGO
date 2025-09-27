// Simplified version of submit-query function for testing
const { corsHeaders } = require('./utils/cors-headers');
const ionApi = require('./utils/ion-api');
const queryBuilder = require('./utils/query-builder');

// Flag to control whether to use real API or mock data
const USE_REAL_API = process.env.USE_REAL_API === 'true';

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }
  
  try {
    console.log('Received query submission request');
    
    // Parse the request body
    let requestBody = {};
    try {
      requestBody = JSON.parse(event.body || '{}');
      console.log('Parsed request body:', requestBody);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Invalid request body',
          details: parseError.message
        })
      };
    }
    
    // Get the SQL query
    let sqlQuery = requestBody.sqlQuery || '';
    
    // If no SQL query provided but we have filter parameters, build a query
    if (!sqlQuery && requestBody.whseid) {
      const queryOptions = {
        whseid: requestBody.whseid,
        startDate: requestBody.startDate,
        endDate: requestBody.endDate,
        taskType: requestBody.taskType,
        limit: requestBody.limit || 1000
      };
      
      try {
        sqlQuery = queryBuilder.buildTaskdetailQuery(queryOptions);
      } catch (queryBuildError) {
        console.error('Error building query:', queryBuildError);
        // Continue with empty query, will be caught below
      }
    }
    
    if (!sqlQuery) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'SQL query is required',
          details: 'Please provide a SQL query or valid filter parameters'
        })
      };
    }
    
    console.log('SQL query:', sqlQuery);
    
    // Try to use the real API if enabled
    if (USE_REAL_API) {
      try {
        console.log('Attempting to use real API...');
        const response = await ionApi.submitQuery(sqlQuery);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            queryId: response.id || response.queryId,
            status: response.status || 'submitted',
            message: 'Query submitted successfully (real API)',
            usingRealApi: true
          })
        };
      } catch (apiError) {
        console.error('Error using real API, falling back to mock:', apiError);
        // Fall back to mock data
      }
    }
    
    // Generate a mock query ID
    const queryId = 'mock-query-' + Date.now();
    
    // Return mock success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        queryId: queryId,
        status: 'submitted',
        message: 'Query submitted successfully (mock)',
        usingRealApi: false
      })
    };
  } catch (error) {
    console.error('Error in submit-query-simple function:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to submit query',
        details: {
          message: error.message || 'Unknown error',
          type: error.constructor.name,
          stack: error.stack
        }
      })
    };
  }
};

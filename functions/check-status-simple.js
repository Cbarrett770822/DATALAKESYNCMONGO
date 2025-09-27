// Simplified version of check-status function for testing
const { corsHeaders } = require('./utils/cors-headers');
const ionApi = require('./utils/ion-api');

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
    console.log('Received check status request');
    
    // Get the query ID from the query parameters
    const queryId = event.queryStringParameters?.queryId;
    
    if (!queryId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Query ID is required',
          details: 'Please provide a query ID'
        })
      };
    }
    
    console.log('Query ID:', queryId);
    
    // Check if this is a mock query ID
    const isMockQuery = queryId.startsWith('mock-query-');
    
    // Try to use the real API if enabled and not a mock query
    if (USE_REAL_API && !isMockQuery) {
      try {
        console.log('Attempting to use real API for status check...');
        const response = await ionApi.checkStatus(queryId);
        
        // Map the response to our expected format
        let status = response.status?.toLowerCase() || 'pending';
        let progress = 0;
        
        // Calculate progress based on status
        if (status === 'completed') {
          progress = 100;
        } else if (status === 'running' || status === 'in_progress') {
          progress = response.progress || 50;
          status = 'in_progress'; // Normalize status name
        } else if (status === 'failed') {
          progress = 100;
          status = 'failed';
        }
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            queryId: queryId,
            status: status,
            progress: progress,
            message: `Query is ${status} (real API)`,
            usingRealApi: true,
            details: response
          })
        };
      } catch (apiError) {
        console.error('Error using real API for status check, falling back to mock:', apiError);
        // Fall back to mock data
      }
    }
    
    // For mock queries, simulate different statuses based on elapsed time
    const timestamp = isMockQuery ? parseInt(queryId.split('-')[2], 10) : 0;
    const currentTime = Date.now();
    const elapsedTime = currentTime - timestamp;
    
    // Simulate different statuses based on elapsed time
    let status = 'pending';
    let progress = 0;
    
    if (elapsedTime > 10000) {
      status = 'completed';
      progress = 100;
    } else if (elapsedTime > 5000) {
      status = 'in_progress';
      progress = Math.min(Math.floor((elapsedTime - 5000) / 50), 99);
    } else {
      status = 'pending';
      progress = Math.min(Math.floor(elapsedTime / 50), 10);
    }
    
    // Return mock success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        queryId: queryId,
        status: status,
        progress: progress,
        message: `Query is ${status} (mock)`,
        usingRealApi: false
      })
    };
  } catch (error) {
    console.error('Error in check-status-simple function:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to check status',
        details: {
          message: error.message || 'Unknown error',
          type: error.constructor.name,
          stack: error.stack
        }
      })
    };
  }
};

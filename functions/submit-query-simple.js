// Simplified version of submit-query function for testing
const { corsHeaders } = require('./utils/cors-headers');

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
    const sqlQuery = requestBody.sqlQuery || '';
    
    if (!sqlQuery) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'SQL query is required',
          details: 'Please provide a SQL query'
        })
      };
    }
    
    console.log('SQL query:', sqlQuery);
    
    // Generate a mock query ID
    const queryId = 'mock-query-' + Date.now();
    
    // Return success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        queryId: queryId,
        status: 'submitted',
        message: 'Query submitted successfully (mock)'
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

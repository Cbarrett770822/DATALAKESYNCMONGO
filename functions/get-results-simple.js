// Simplified version of get-results function for testing
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
    console.log('Received get results request');
    
    // Get the query ID from the query parameters
    const queryId = event.queryStringParameters?.queryId;
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
    const limit = parseInt(event.queryStringParameters?.limit || '1000', 10);
    
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
    console.log('Offset:', offset);
    console.log('Limit:', limit);
    
    // Check if this is a mock query ID
    const isMockQuery = queryId.startsWith('mock-query-');
    
    // Try to use the real API if enabled and not a mock query
    if (USE_REAL_API && !isMockQuery) {
      try {
        console.log('Attempting to use real API for results...');
        const response = await ionApi.getResults(queryId, offset, limit);
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            queryId: queryId,
            offset: offset,
            limit: limit,
            total: response.total || response.count || 0,
            results: response.results || response.data || [],
            message: 'Results retrieved successfully (real API)',
            usingRealApi: true
          })
        };
      } catch (apiError) {
        console.error('Error using real API for results, falling back to mock:', apiError);
        // Fall back to mock data
      }
    }
    
    // Generate mock results
    const totalRecords = 1000;
    const results = [];
    
    // Generate mock data based on the query ID
    // This ensures consistent results for the same query ID
    const seed = parseInt(queryId.split('-')[2], 10) || Date.now();
    
    // Generate mock results
    for (let i = 0; i < Math.min(limit, 50); i++) {
      const index = offset + i;
      if (index >= totalRecords) break;
      
      results.push({
        id: `record-${seed}-${index}`,
        taskId: `TASK${100000 + index}`,
        whseid: 'wmwhse1',
        taskType: ['PICK', 'PUTAWAY', 'CYCLE', 'LOAD'][index % 4],
        status: ['COMPLETE', 'PENDING', 'IN_PROGRESS'][index % 3],
        addDate: new Date(seed + (index * 86400000)).toISOString().split('T')[0],
        addWho: `USER${index % 10}`,
        editDate: new Date(seed + (index * 86400000) + 3600000).toISOString().split('T')[0],
        editWho: `USER${(index + 5) % 10}`
      });
    }
    
    // Return mock success response
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        queryId: queryId,
        offset: offset,
        limit: limit,
        total: totalRecords,
        results: results,
        message: 'Results retrieved successfully (mock)',
        usingRealApi: false
      })
    };
  } catch (error) {
    console.error('Error in get-results-simple function:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to get results',
        details: {
          message: error.message || 'Unknown error',
          type: error.constructor.name,
          stack: error.stack
        }
      })
    };
  }
};

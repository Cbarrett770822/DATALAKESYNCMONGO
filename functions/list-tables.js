// Netlify function to list available tables in DataFabric
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const ionApi = require('./utils/ion-api');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  console.log('list-tables function called');
  
  try {
    // Build a query to list tables
    const query = `
      SELECT 
        table_name 
      FROM 
        information_schema.tables 
      WHERE 
        table_name LIKE '%TASK%'
      ORDER BY 
        table_name
    `;
    
    console.log('Submitting query to list tables:', query);
    
    // Submit the query
    const queryResponse = await ionApi.submitQuery(query);
    console.log('Query response:', JSON.stringify(queryResponse, null, 2));
    
    const queryId = queryResponse.queryId || queryResponse.id;
    console.log('Query ID:', queryId);
    
    // Wait for query to complete
    let queryStatus = await ionApi.checkStatus(queryId);
    
    while (queryStatus.status !== 'completed' && queryStatus.status !== 'COMPLETED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      
      if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
        return errorResponse('Query failed', queryStatus, 500);
      }
    }
    
    // Get results
    const results = await ionApi.getResults(queryId);
    
    return successResponse({
      tables: results.results || [],
      message: 'Tables retrieved successfully'
    });
  } catch (error) {
    console.error('Error listing tables:', error);
    return errorResponse('Failed to list tables', error.message, 500);
  }
};

// Index file for Netlify Functions
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
  
  // Return a list of available functions
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      message: 'WMS DataLake Sync API',
      version: '1.0.0',
      functions: [
        { name: 'submit-query', description: 'Submit a query to the DataFabric API' },
        { name: 'check-status', description: 'Check the status of a query' },
        { name: 'get-results', description: 'Get the results of a query' },
        { name: 'sync-taskdetail', description: 'Sync taskdetail data from DataFabric to MongoDB' },
        { name: 'check-sync-status', description: 'Check the status of a sync job' },
        { name: 'get-sync-history', description: 'Get sync job history' },
        { name: 'get-taskdetail-stats', description: 'Get taskdetail statistics' }
      ]
    })
  };
};

// Simplified version of sync-taskdetail function for testing
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
    console.log('Received sync request');
    
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
    
    // Get sync options
    const syncOptions = {
      whseid: requestBody.whseid || '',
      startDate: requestBody.startDate || null,
      endDate: requestBody.endDate || null,
      taskType: requestBody.taskType || '',
      batchSize: requestBody.batchSize || 1000,
      maxRecords: requestBody.maxRecords || 10000,
      sqlQuery: requestBody.sqlQuery || null
    };
    
    console.log('Sync options:', syncOptions);
    
    // Generate a mock SQL query for demonstration
    let sqlQuery = syncOptions.sqlQuery || `SELECT * FROM wmwhse_taskdetail.taskdetail`;
    const conditions = [];
    
    if (syncOptions.whseid) {
      conditions.push(`WHSEID = '${syncOptions.whseid}'`);
    }
    
    if (syncOptions.taskType) {
      conditions.push(`TASKTYPE = '${syncOptions.taskType}'`);
    }
    
    if (syncOptions.startDate) {
      conditions.push(`ADDDATE >= '${syncOptions.startDate}'`);
    }
    
    if (syncOptions.endDate) {
      conditions.push(`ADDDATE <= '${syncOptions.endDate}'`);
    }
    
    if (conditions.length > 0 && !syncOptions.sqlQuery) {
      sqlQuery += ' WHERE ' + conditions.join(' AND ');
    }
    
    if (!syncOptions.sqlQuery) {
      sqlQuery += ` LIMIT ${syncOptions.maxRecords}`;
    }
    
    console.log('Generated SQL query:', sqlQuery);
    
    // Create mock stats
    const stats = {
      totalRecords: Math.floor(Math.random() * 1000) + 100,
      processedRecords: Math.floor(Math.random() * 100) + 50,
      insertedRecords: Math.floor(Math.random() * 50) + 10,
      updatedRecords: Math.floor(Math.random() * 50) + 10,
      errorRecords: Math.floor(Math.random() * 10),
      startTime: new Date(),
      endTime: new Date(),
      duration: Math.random() * 10 + 1
    };
    
    // Return success response with mock data
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Taskdetail sync completed successfully (mock)',
        jobId: 'mock-job-' + Date.now(),
        sqlQuery: sqlQuery,
        stats: stats
      })
    };
  } catch (error) {
    console.error('Error in sync-taskdetail-simple function:', error);
    console.error('Error stack:', error.stack);
    
    // Return error response
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to sync taskdetail data',
        details: {
          message: error.message || 'Unknown error',
          type: error.constructor.name,
          stack: error.stack
        }
      })
    };
  }
};

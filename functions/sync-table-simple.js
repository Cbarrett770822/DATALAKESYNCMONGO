// Simplified version of sync-table function for testing
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
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
      return errorResponse('Invalid request body: ' + parseError.message, null, 400);
    }
    
    // Get table ID from request
    const tableId = requestBody.tableId || event.queryStringParameters?.tableId;
    
    if (!tableId) {
      return errorResponse('tableId is required', null, 400);
    }
    
    // Validate table ID
    const validTableIds = ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail'];
    if (!validTableIds.includes(tableId)) {
      return errorResponse(`Invalid tableId: ${tableId}. Must be one of: ${validTableIds.join(', ')}`, null, 400);
    }
    
    // Create a mock job ID
    const jobId = `job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Return a mock response
    return successResponse({
      message: `Started sync for ${tableId}`,
      jobId: jobId,
      status: 'pending',
      stats: {
        totalRecords: 0,
        processedRecords: 0,
        startTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error in sync-table-simple function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to process sync request',
      error.message,
      500
    );
  }
};

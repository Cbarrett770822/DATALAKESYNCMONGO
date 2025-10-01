// Netlify function to check the status of a DataFabric query
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
    
    if (!queryId) {
      return errorResponse('Query ID is required', null, 400);
    }
    
    console.log('Checking status for queryId:', queryId);
    
    // Check if this is a direct debug request
    const isDebug = event.queryStringParameters?.debug === 'true';
    
    if (isDebug) {
      console.log('DIRECT STATUS CHECK: Bypassing normal flow for debugging');
      
      try {
        // Get token directly
        const token = await ionApi.getToken();
        console.log('Token obtained successfully for direct status check');
        
        // Get credentials directly
        const credentials = ionApi.loadCredentials();
        console.log('Credentials loaded for direct status check:', {
          tenant: credentials.tenant,
          hasApiUrl: !!credentials.ionApiUrl,
          urlLength: credentials.ionApiUrl?.length
        });
        
        // Prepare the direct request URL
        const statusUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/status/`);
        
        console.log('Direct status URL:', statusUrl.toString());
        
        // Make a direct HTTP request
        const https = require('https');
        const directResponse = await new Promise((resolve, reject) => {
          const options = {
            hostname: statusUrl.hostname,
            port: statusUrl.port || 443,
            path: statusUrl.pathname,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          };
          
          console.log('Direct status request options:', {
            url: `https://${options.hostname}${options.path}`,
            method: options.method
          });
          
          const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              console.log('Direct status response status code:', res.statusCode);
              try {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                  const jsonData = JSON.parse(data);
                  console.log('Direct status response parsed successfully');
                  console.log('Direct status response:', jsonData);
                  resolve(jsonData);
                } else {
                  console.error('Direct status response error status:', res.statusCode);
                  console.error('Direct status response headers:', res.headers);
                  console.error('Direct status response body:', data.substring(0, 500));
                  reject({
                    statusCode: res.statusCode,
                    message: `HTTP Error: ${res.statusCode}`,
                    data: data
                  });
                }
              } catch (e) {
                console.error('Error parsing direct status response:', e.message);
                reject(e);
              }
            });
          });
          
          req.on('error', (e) => {
            console.error('Direct status request error:', e.message);
            reject(e);
          });
          
          req.end();
        });
        
        console.log('Direct status response received:', directResponse ? 'not null' : 'null');
        if (directResponse) {
          console.log('Direct status response type:', typeof directResponse);
          console.log('Direct status response keys:', Object.keys(directResponse));
          console.log('Direct status value:', directResponse.status);
        }
        
        // Return the direct response
        return successResponse({
          queryId: queryId,
          status: directResponse.status,
          progress: directResponse.progress || 0,
          message: directResponse.message || '',
          directFetch: true
        });
      } catch (directError) {
        console.error('Direct status fetch error:', directError);
        return errorResponse(
          'Failed to check status directly',
          directError.message || 'Unknown error',
          directError.statusCode || 500
        );
      }
    }
    
    // Normal flow - check the status using the ION API module
    const response = await ionApi.checkStatus(queryId);
    
    // Add debug information
    console.log('[DEBUG] Status response:', JSON.stringify(response, null, 2));
    
    // Prepare response data
    const responseData = {
      queryId: queryId,
      status: response.status,
      progress: response.progress || 0,
      message: response.message || ''
    };
    
    // Add error details if available
    if (response.status === 'FAILED') {
      responseData.error = response.error || 'Unknown error';
      responseData.errorDetails = response.errorDetails || response.message || '';
      console.error(`Query ${queryId} failed:`, responseData.error, responseData.errorDetails);
    }
    
    // Return success response
    return successResponse(responseData);
  } catch (error) {
    console.error('Error in check-status function:', error);
    
    // Return error response
    return errorResponse(
      'Failed to check status',
      error.message || 'Unknown error',
      error.statusCode || 500
    );
  }
};

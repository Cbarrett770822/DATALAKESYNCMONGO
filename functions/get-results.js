// Netlify function to get the results of a DataFabric query
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
    const offset = parseInt(event.queryStringParameters?.offset || '0', 10);
    const limit = parseInt(event.queryStringParameters?.limit || '1000', 10);
    
    if (!queryId) {
      return errorResponse('Query ID is required', null, 400);
    }
    
    console.log('Getting results for queryId:', queryId);
    
    // Log the query parameters
    console.log('DIRECT FETCH: Bypassing status check and directly fetching results for debugging');
    console.log('Query parameters:', { queryId, offset, limit });
    
    try {
      // Get the token
      const token = await ionApi.getToken();
      console.log('Token obtained successfully');
      
      // Get credentials directly
      const credentials = require('./utils/ion-api').loadCredentials();
      console.log('Credentials loaded:', {
        tenant: credentials.tenant,
        hasApiUrl: !!credentials.ionApiUrl,
        urlLength: credentials.ionApiUrl?.length
      });
      
      // Prepare the direct request URL
      const resultsUrl = new URL(`${credentials.ionApiUrl}/${credentials.tenant}/DATAFABRIC/compass/v2/jobs/${queryId}/result/`);
      resultsUrl.searchParams.append('offset', offset);
      resultsUrl.searchParams.append('limit', limit);
      
      console.log('Direct URL:', resultsUrl.toString());
      
      // Make a direct HTTP request
      const https = require('https');
      const directResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: resultsUrl.hostname,
          port: resultsUrl.port || 443,
          path: resultsUrl.pathname + resultsUrl.search,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        };
        
        console.log('Direct request options:', {
          url: `https://${options.hostname}${options.path}`,
          method: options.method
        });
        
        const req = https.request(options, (res) => {
          let data = '';
          
          res.on('data', (chunk) => {
            data += chunk;
          });
          
          res.on('end', () => {
            console.log('Direct response status:', res.statusCode);
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                const jsonData = JSON.parse(data);
                console.log('Direct response parsed successfully');
                resolve(jsonData);
              } else {
                console.error('Direct response error status:', res.statusCode);
                console.error('Direct response headers:', res.headers);
                console.error('Direct response body:', data.substring(0, 500));
                reject({
                  statusCode: res.statusCode,
                  message: `HTTP Error: ${res.statusCode}`,
                  data: data
                });
              }
            } catch (e) {
              console.error('Error parsing direct response:', e.message);
              reject(e);
            }
          });
        });
        
        req.on('error', (e) => {
          console.error('Direct request error:', e.message);
          reject(e);
        });
        
        req.end();
      });
      
      console.log('Direct response received:', directResponse ? 'not null' : 'null');
      if (directResponse) {
        console.log('Direct response type:', typeof directResponse);
        if (directResponse.rows) {
          console.log('Direct rows count:', directResponse.rows.length);
        } else if (directResponse.results) {
          console.log('Direct results count:', directResponse.results.length);
        } else {
          console.log('Direct response keys:', Object.keys(directResponse));
        }
      }
    } catch (directError) {
      console.error('Direct fetch error:', directError);
    }
    
    // Now proceed with the normal flow
    const response = await ionApi.getResults(queryId, offset, limit);
    
    // Add debug information
    console.log('[DEBUG] Results response:', JSON.stringify(response, null, 2));
    
    // Check if the response contains an error
    if (response && response.error === true) {
      console.error('[DEBUG] Error in results response:', response.message);
      return errorResponse(
        'Failed to get results', 
        response.message || 'Unknown error', 
        500, 
        response.details
      );
    }
    
    // Format the response based on the structure returned by the API
    let formattedResponse = {
      queryId: queryId,
      offset: offset,
      limit: limit
    };
    
    // Handle different response formats from the API
    if (response.rows) {
      // Format with rows and columns
      formattedResponse.total = response.rows.length;
      formattedResponse.columns = response.columns || [];
      formattedResponse.rows = response.rows;
    } else if (response.results) {
      // Format with results array
      formattedResponse.total = response.total || 0;
      formattedResponse.results = response.results;
    } else {
      // Generic format
      formattedResponse.data = response;
    }
    
    // Return success response
    return successResponse(formattedResponse);
  } catch (error) {
    console.error('Error in get-results function:', error);
    
    // Extract error details
    let errorMessage = 'Failed to get results';
    let errorDetails = error.message || 'Unknown error';
    let statusCode = error.statusCode || 500;
    
    // Handle specific error cases
    if (statusCode === 202) {
      errorMessage = 'Query is still running';
      errorDetails = 'The query is still being processed. Please try again later.';
    } else if (error.data) {
      // Include additional error data if available
      return errorResponse(errorMessage, errorDetails, statusCode, error.data);
    }
    
    // Return error response
    return errorResponse(errorMessage, errorDetails, statusCode);
  }
};

// Netlify function to submit a query to DataFabric
const ionApi = require('./utils/ion-api');
const queryBuilder = require('./utils/query-builder');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');
const fs = require('fs');
const path = require('path');

// Enhanced logging function
function logDebug(message, data) {
  console.log(`[DEBUG] ${message}`, data);
}

/**
 * Automatically correct common table name format issues
 * @param {string} sqlQuery - The SQL query to correct
 * @returns {string} - The corrected SQL query
 */
function correctTableNameFormat(sqlQuery) {
  // Replace wmwhse_taskdetail.taskdetail with "CSWMS_wmwhse_TASKDETAIL"
  let corrected = sqlQuery.replace(/wmwhse_taskdetail\.taskdetail/g, '"CSWMS_wmwhse_TASKDETAIL"');
  
  // Replace unquoted CSWMS_wmwhse_TASKDETAIL with quoted version
  // This regex avoids replacing already quoted instances
  corrected = corrected.replace(/([^"'])CSWMS_wmwhse_TASKDETAIL([^"'])/g, '$1"CSWMS_wmwhse_TASKDETAIL"$2');
  
  return corrected;
}

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  try {
    // Log environment information
    logDebug('Environment variables', {
      NODE_ENV: process.env.NODE_ENV,
      hasIonTenant: !!process.env.ION_TENANT,
      hasIonSaak: !!process.env.ION_SAAK,
      hasIonSask: !!process.env.ION_SASK,
      hasIonClientId: !!process.env.ION_CLIENT_ID,
      hasIonClientSecret: !!process.env.ION_CLIENT_SECRET,
      hasIonApiUrl: !!process.env.ION_API_URL,
      hasIonSsoUrl: !!process.env.ION_SSO_URL,
      hasIonCredentialsPath: !!process.env.ION_CREDENTIALS_PATH,
      currentDir: __dirname,
      filesInUtilsDir: fs.existsSync(path.join(__dirname, 'utils')) ? 
        fs.readdirSync(path.join(__dirname, 'utils')) : 'utils dir not found'
    });
    
    // Parse the request body
    const requestBody = JSON.parse(event.body);
    logDebug('Request body', requestBody);
    
    // Check if a custom SQL query is provided
    let sqlQuery;
    if (requestBody.sqlQuery) {
      sqlQuery = requestBody.sqlQuery;
      
      // Check if auto-correction is enabled
      if (requestBody.autoCorrectTableNames !== false) {
        const originalQuery = sqlQuery;
        sqlQuery = correctTableNameFormat(sqlQuery);
        
        // Log if corrections were made
        if (sqlQuery !== originalQuery) {
          logDebug('Auto-corrected table names in query', {
            original: originalQuery,
            corrected: sqlQuery
          });
        }
      }
      
      // Basic SQL validation
      logDebug('Validating custom SQL query', { query: sqlQuery });
      
      // Check for common SQL syntax issues
      const validationIssues = [];
      
      // Check for unbalanced quotes
      const singleQuotes = (sqlQuery.match(/'/g) || []).length;
      if (singleQuotes % 2 !== 0) {
        validationIssues.push('Unbalanced single quotes');
      }
      
      const doubleQuotes = (sqlQuery.match(/"/g) || []).length;
      if (doubleQuotes % 2 !== 0) {
        validationIssues.push('Unbalanced double quotes');
      }
      
      // Check for missing semicolons at the end
      if (!sqlQuery.trim().endsWith(';') && !requestBody.skipSemicolonCheck) {
        logDebug('SQL query does not end with semicolon', { query: sqlQuery });
        // Don't add as an issue, just a warning
      }
      
      // Check for common SQL keywords
      if (!sqlQuery.toUpperCase().includes('SELECT')) {
        validationIssues.push('Query does not contain SELECT keyword');
      }
      
      // Check for potential table name issues
      if (sqlQuery.includes('"CSWMS_wmwhse_TASKDETAIL"')) {
        logDebug('Using correct table name format', { tableName: '"CSWMS_wmwhse_TASKDETAIL"' });
      } else if (sqlQuery.includes('CSWMS_wmwhse_TASKDETAIL')) {
        logDebug('Using CSWMS table name format without quotes', { tableName: 'CSWMS_wmwhse_TASKDETAIL' });
        // Suggest adding quotes
        validationIssues.push('Table name should be enclosed in double quotes: "CSWMS_wmwhse_TASKDETAIL"');
      } else if (sqlQuery.includes('wmwhse_taskdetail.taskdetail')) {
        logDebug('Using incorrect table name format', { tableName: 'wmwhse_taskdetail.taskdetail' });
        // Add warning about incorrect table name format
        validationIssues.push('Incorrect table name format. Use "CSWMS_wmwhse_TASKDETAIL" instead of wmwhse_taskdetail.taskdetail');
      } else {
        logDebug('Could not identify known table name pattern', { query: sqlQuery });
      }
      
      // Log validation results
      if (validationIssues.length > 0) {
        logDebug('SQL validation issues found', { issues: validationIssues });
        console.warn('SQL validation issues:', validationIssues);
      } else {
        logDebug('SQL validation passed', { query: sqlQuery });
      }
    } else {
      // Otherwise, build a query using the query builder
      const queryOptions = {
        whseid: requestBody.whseid,
        startDate: requestBody.startDate,
        endDate: requestBody.endDate,
        taskType: requestBody.taskType,
        limit: requestBody.limit || 1000
      };
      
      logDebug('Building query with options', queryOptions);
      sqlQuery = queryBuilder.buildTaskdetailQuery(queryOptions);
    }
    
    console.log('Submitting query:', sqlQuery);
    
    // Verify ION API module
    logDebug('ION API module functions', {
      hasSubmitQuery: typeof ionApi.submitQuery === 'function',
      hasGetToken: typeof ionApi.getToken === 'function',
      hasCheckStatus: typeof ionApi.checkStatus === 'function',
      hasGetResults: typeof ionApi.getResults === 'function'
    });
    
    // Submit the query using the ION API module
    const response = await ionApi.submitQuery(sqlQuery);
    logDebug('API response', response);
    
    // Return success response
    return successResponse({
      queryId: response.queryId || response.id,
      status: response.status || 'submitted'
    });
  } catch (error) {
    console.error('Error in submit-query function:', error);
    console.error('Error stack:', error.stack);
    
    // Log additional error details
    if (error.response) {
      console.error('Error response:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      });
    }
    
    // Check if it's an ION API error
    if (error.message && error.message.includes('ION API credentials')) {
      console.error('ION API credentials error. Checking credentials path...');
      const credentialsPath = process.env.ION_CREDENTIALS_PATH;
      if (credentialsPath) {
        console.error('ION_CREDENTIALS_PATH:', credentialsPath);
        console.error('File exists:', fs.existsSync(credentialsPath));
        if (fs.existsSync(credentialsPath)) {
          try {
            const stats = fs.statSync(credentialsPath);
            console.error('File stats:', {
              size: stats.size,
              isFile: stats.isFile(),
              permissions: stats.mode.toString(8)
            });
          } catch (statError) {
            console.error('Error getting file stats:', statError);
          }
        }
      } else {
        console.error('ION_CREDENTIALS_PATH not set');
      }
    }
    
    // Return error response with more details
    return errorResponse(
      'Failed to submit query',
      error.message || 'Unknown error',
      error.statusCode || 500,
      {
        stack: error.stack,
        code: error.code,
        type: error.constructor.name,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      }
    );
  }
};

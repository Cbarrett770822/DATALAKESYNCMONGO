// Debug info function to help diagnose deployment issues
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  try {
    // Collect environment info (without exposing sensitive values)
    const envInfo = {
      NODE_ENV: process.env.NODE_ENV,
      // List environment variables without their values
      envVars: Object.keys(process.env).filter(key => 
        // Filter out sensitive variables
        !key.includes('KEY') && 
        !key.includes('SECRET') && 
        !key.includes('PASSWORD') && 
        !key.includes('TOKEN') &&
        !key.includes('SAAK') &&
        !key.includes('SASK')
      ),
      // Check if important env vars exist (without showing values)
      hasIonTenant: !!process.env.ION_TENANT,
      hasIonSaak: !!process.env.ION_SAAK,
      hasIonSask: !!process.env.ION_SASK,
      hasIonClientId: !!process.env.ION_CLIENT_ID,
      hasIonClientSecret: !!process.env.ION_CLIENT_SECRET,
      hasIonApiUrl: !!process.env.ION_API_URL,
      hasIonSsoUrl: !!process.env.ION_SSO_URL,
      hasMongoDbUri: !!process.env.MONGODB_URI,
      hasIonCredentialsPath: !!process.env.ION_CREDENTIALS_PATH
    };

    // Get file system info
    const fsInfo = {
      currentDirectory: __dirname,
      parentDirectory: path.dirname(__dirname),
      filesInCurrentDir: [],
      filesInParentDir: [],
      filesInUtilsDir: []
    };

    // Try to list files in current directory
    try {
      fsInfo.filesInCurrentDir = fs.readdirSync(__dirname);
    } catch (error) {
      fsInfo.filesInCurrentDir = [`Error: ${error.message}`];
    }

    // Try to list files in parent directory
    try {
      fsInfo.filesInParentDir = fs.readdirSync(path.dirname(__dirname));
    } catch (error) {
      fsInfo.filesInParentDir = [`Error: ${error.message}`];
    }

    // Try to list files in utils directory
    try {
      fsInfo.filesInUtilsDir = fs.readdirSync(path.join(__dirname, 'utils'));
    } catch (error) {
      fsInfo.filesInUtilsDir = [`Error: ${error.message}`];
    }

    // Check for ION credentials file
    let ionCredentialsInfo = {
      path: process.env.ION_CREDENTIALS_PATH || 'Not set',
      exists: false,
      readable: false,
      error: null
    };

    if (process.env.ION_CREDENTIALS_PATH) {
      try {
        ionCredentialsInfo.exists = fs.existsSync(process.env.ION_CREDENTIALS_PATH);
        if (ionCredentialsInfo.exists) {
          try {
            // Just check if we can read it, don't actually read the contents
            fs.accessSync(process.env.ION_CREDENTIALS_PATH, fs.constants.R_OK);
            ionCredentialsInfo.readable = true;
          } catch (error) {
            ionCredentialsInfo.readable = false;
            ionCredentialsInfo.error = `File exists but is not readable: ${error.message}`;
          }
        }
      } catch (error) {
        ionCredentialsInfo.error = `Error checking file: ${error.message}`;
      }
    }

    // Try to load ion-api module
    let ionApiInfo = {
      moduleExists: false,
      canImport: false,
      error: null
    };

    try {
      const ionApiPath = path.join(__dirname, 'utils', 'ion-api.js');
      ionApiInfo.moduleExists = fs.existsSync(ionApiPath);
      if (ionApiInfo.moduleExists) {
        try {
          // Try to import the module
          const ionApi = require('./utils/ion-api');
          ionApiInfo.canImport = true;
          // Check if required functions exist
          ionApiInfo.hasGetToken = typeof ionApi.getToken === 'function';
          ionApiInfo.hasSubmitQuery = typeof ionApi.submitQuery === 'function';
          ionApiInfo.hasCheckStatus = typeof ionApi.checkStatus === 'function';
          ionApiInfo.hasGetResults = typeof ionApi.getResults === 'function';
        } catch (error) {
          ionApiInfo.canImport = false;
          ionApiInfo.error = `Cannot import module: ${error.message}`;
        }
      }
    } catch (error) {
      ionApiInfo.error = `Error checking module: ${error.message}`;
    }

    // Return debug info
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Debug information',
        timestamp: new Date().toISOString(),
        environment: envInfo,
        fileSystem: fsInfo,
        ionCredentials: ionCredentialsInfo,
        ionApi: ionApiInfo
      }, null, 2)
    };
  } catch (error) {
    console.error('Error in debug-info function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error generating debug information',
        message: error.message,
        stack: error.stack
      })
    };
  }
};

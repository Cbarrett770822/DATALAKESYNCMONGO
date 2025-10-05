// Utility functions for DataFabric API testing
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Try to load the application's ion-api utility
let ionApi = null;
try {
  const ionApiPath = path.join(__dirname, 'functions', 'utils', 'ion-api.js');
  if (fs.existsSync(ionApiPath)) {
    ionApi = require(ionApiPath);
    console.log('Successfully loaded application ion-api utility');
  }
} catch (error) {
  console.log('Could not load application ion-api utility:', error.message);
}

// Get authentication token using the application's ion-api utility if available
async function getToken(config) {
  try {
    console.log('Getting authentication token...');
    
    // Try to use the application's ion-api utility first
    if (ionApi && typeof ionApi.getToken === 'function') {
      console.log('Using application ion-api utility to get token');
      const token = await ionApi.getToken();
      console.log('Token obtained successfully via ion-api utility');
      return token;
    }
    
    // Fall back to direct API call
    console.log('Using direct API call to get token');
    const tokenResponse = await axios.post(`${config.apiUrl}/v1/token`, {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tenant: config.tenant,
      saak: config.saak,
      sask: config.sask
    });
    
    console.log('Token obtained successfully via direct API call');
    return tokenResponse.data.token;
  } catch (error) {
    console.error('Error getting token:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  getToken
};

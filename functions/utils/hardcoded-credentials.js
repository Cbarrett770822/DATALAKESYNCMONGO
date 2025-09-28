/**
 * Hardcoded credentials module - FOR TESTING ONLY
 * WARNING: Do not use in production or commit with real credentials
 */

// Default credentials for testing
// Replace these with your actual credentials for testing
const defaultCredentials = {
  tenant: "YOUR_TENANT",
  saak: "YOUR_SAAK",
  sask: "YOUR_SASK",
  clientId: "YOUR_CLIENT_ID",
  clientSecret: "YOUR_CLIENT_SECRET",
  ionApiUrl: "https://mingle-ionapi.inforcloudsuite.com",
  ssoUrl: "https://mingle-sso.inforcloudsuite.com:443/YOUR_TENANT/as/"
};

/**
 * Get hardcoded credentials
 * @returns {Object} Credentials object
 */
function getHardcodedCredentials() {
  return defaultCredentials;
}

module.exports = {
  getHardcodedCredentials
};

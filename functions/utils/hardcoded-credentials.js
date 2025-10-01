/**
 * Hardcoded credentials module - FOR TESTING ONLY
 * WARNING: Do not use in production or commit with real credentials
 */

// Default credentials for testing
// These are the actual credentials provided by the user
const defaultCredentials = {
  tenant: "SLSGDENA131_AX2",
  saak: "SLSGDENA131_AX2#B_AMh_MOFYHXRGR3l1MLEeQwcH09uLlLmip8HLa4ZloF60oFZ3VOkhLYehdpeWiAeq5_gbgpcebaAkejLgxZDA",
  sask: "YffSA_Xqewf_4hEX7g-OhmK4AEiE_ICZE60uHrFRfjIkfTG5_1SwWbyyX3C-aQoCJblK1AxkUrCUcMD1GSXCKg",
  clientId: "SLSGDENA131_AX2~SBR7-UEDJ1PO2U-ITLZQGbN1H3V8Au4ak2NMmso2EeE",
  clientSecret: "L3qpMp7kR9f9OtKI5C4Gfw3KCAx4aDV4UYsMEIHansuXgauR4nsQIr5_y7x_pfZ-MImBrgi8uk8JlC6oX9uz1A",
  ionApiUrl: "https://mingle-ionapi.inforcloudsuite.com",
  ssoUrl: "https://mingle-sso.inforcloudsuite.com:443/SLSGDENA131_AX2/as/"
};

/**
 * Check if credentials are actually set or still placeholders
 */
function areCredentialsSet() {
  return (
    defaultCredentials.tenant !== "YOUR_TENANT" &&
    defaultCredentials.saak !== "YOUR_SAAK" &&
    defaultCredentials.sask !== "YOUR_SASK" &&
    defaultCredentials.clientId !== "YOUR_CLIENT_ID" &&
    defaultCredentials.clientSecret !== "YOUR_CLIENT_SECRET"
  );
}

/**
 * Get hardcoded credentials
 * @returns {Object} Credentials object
 */
function getHardcodedCredentials() {
  // Check if credentials are actually set
  if (!areCredentialsSet()) {
    throw new Error(
      "Hardcoded credentials are not set with real values. " +
      "Please run 'node update-credentials.js' to set real credentials or " +
      "set environment variables in Netlify dashboard."
    );
  }
  
  return defaultCredentials;
}

module.exports = {
  getHardcodedCredentials
};

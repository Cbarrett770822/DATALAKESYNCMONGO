/**
 * Script to update hardcoded credentials for testing
 * WARNING: This script is for development/testing only
 * Do not commit the updated file with real credentials to version control
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to the hardcoded credentials file
const credentialsFilePath = path.join(__dirname, 'functions', 'utils', 'hardcoded-credentials.js');

// Path to the ION credentials file (if available)
const ionCredentialsPath = process.env.ION_CREDENTIALS_PATH || 
  path.join(__dirname, '..', 'ION_Credentials', 'IONAPI_CREDENTIALS.ionapi');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to read ION credentials from file
function readIonCredentialsFile() {
  try {
    if (fs.existsSync(ionCredentialsPath)) {
      console.log(`Reading credentials from ${ionCredentialsPath}`);
      const data = fs.readFileSync(ionCredentialsPath, 'utf8');
      const credentials = JSON.parse(data);
      
      return {
        tenant: credentials.ti,
        saak: credentials.saak,
        sask: credentials.sask,
        clientId: credentials.ci,
        clientSecret: credentials.cs,
        ionApiUrl: credentials.iu || 'https://mingle-ionapi.inforcloudsuite.com',
        ssoUrl: credentials.pu || `https://mingle-sso.inforcloudsuite.com:443/${credentials.ti}/as/`
      };
    }
  } catch (error) {
    console.error(`Error reading ION credentials file: ${error.message}`);
  }
  
  return null;
}

// Function to read credentials from environment variables
function readEnvCredentials() {
  if (process.env.ION_TENANT && 
      process.env.ION_SAAK && 
      process.env.ION_SASK && 
      process.env.ION_CLIENT_ID && 
      process.env.ION_CLIENT_SECRET) {
    
    console.log('Reading credentials from environment variables');
    
    return {
      tenant: process.env.ION_TENANT,
      saak: process.env.ION_SAAK,
      sask: process.env.ION_SASK,
      clientId: process.env.ION_CLIENT_ID,
      clientSecret: process.env.ION_CLIENT_SECRET,
      ionApiUrl: process.env.ION_API_URL || 'https://mingle-ionapi.inforcloudsuite.com',
      ssoUrl: process.env.ION_SSO_URL || `https://mingle-sso.inforcloudsuite.com:443/${process.env.ION_TENANT}/as/`
    };
  }
  
  return null;
}

// Function to prompt user for credentials
function promptForCredentials() {
  return new Promise((resolve) => {
    const credentials = {};
    
    rl.question('Enter tenant: ', (tenant) => {
      credentials.tenant = tenant;
      
      rl.question('Enter SAAK: ', (saak) => {
        credentials.saak = saak;
        
        rl.question('Enter SASK: ', (sask) => {
          credentials.sask = sask;
          
          rl.question('Enter client ID: ', (clientId) => {
            credentials.clientId = clientId;
            
            rl.question('Enter client secret: ', (clientSecret) => {
              credentials.clientSecret = clientSecret;
              
              rl.question('Enter ION API URL (default: https://mingle-ionapi.inforcloudsuite.com): ', (ionApiUrl) => {
                credentials.ionApiUrl = ionApiUrl || 'https://mingle-ionapi.inforcloudsuite.com';
                
                rl.question(`Enter SSO URL (default: https://mingle-sso.inforcloudsuite.com:443/${credentials.tenant}/as/): `, (ssoUrl) => {
                  credentials.ssoUrl = ssoUrl || `https://mingle-sso.inforcloudsuite.com:443/${credentials.tenant}/as/`;
                  
                  resolve(credentials);
                });
              });
            });
          });
        });
      });
    });
  });
}

// Function to update the hardcoded credentials file
function updateCredentialsFile(credentials) {
  const fileContent = `/**
 * Hardcoded credentials module - FOR TESTING ONLY
 * WARNING: Do not use in production or commit with real credentials
 */

// Default credentials for testing
// Replace these with your actual credentials for testing
const defaultCredentials = {
  tenant: "${credentials.tenant}",
  saak: "${credentials.saak}",
  sask: "${credentials.sask}",
  clientId: "${credentials.clientId}",
  clientSecret: "${credentials.clientSecret}",
  ionApiUrl: "${credentials.ionApiUrl}",
  ssoUrl: "${credentials.ssoUrl}"
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
};`;

  fs.writeFileSync(credentialsFilePath, fileContent, 'utf8');
  console.log(`Updated hardcoded credentials in ${credentialsFilePath}`);
}

// Main function
async function main() {
  console.log('Updating hardcoded credentials for testing');
  console.log('WARNING: This is for development/testing only');
  console.log('Do not commit the updated file with real credentials to version control');
  console.log('');
  
  // Try to read credentials from file or environment variables first
  let credentials = readIonCredentialsFile() || readEnvCredentials();
  
  if (credentials) {
    console.log('Found existing credentials');
    
    // Ask if user wants to use these credentials
    rl.question('Use these credentials? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        updateCredentialsFile(credentials);
        rl.close();
      } else {
        // Prompt for new credentials
        promptForCredentials().then((newCredentials) => {
          updateCredentialsFile(newCredentials);
          rl.close();
        });
      }
    });
  } else {
    console.log('No existing credentials found');
    
    // Prompt for new credentials
    const newCredentials = await promptForCredentials();
    updateCredentialsFile(newCredentials);
    rl.close();
  }
}

// Run the main function
main();

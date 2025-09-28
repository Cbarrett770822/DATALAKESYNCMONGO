/**
 * Script to embed credentials directly in ion-api.js for deployment
 * WARNING: This is for testing only and should not be used in production
 * Do not commit the modified ion-api.js file to version control
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to the ion-api.js file
const ionApiFilePath = path.join(__dirname, 'functions', 'utils', 'ion-api.js');

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

// Function to update the ion-api.js file with embedded credentials
function embedCredentialsInIonApi(credentials) {
  // Read the current file
  const fileContent = fs.readFileSync(ionApiFilePath, 'utf8');
  
  // Create the embedded credentials code
  const embeddedCredentialsCode = `
// EMBEDDED CREDENTIALS - FOR TESTING ONLY
// WARNING: Do not commit this file with real credentials to version control
const embeddedCredentials = {
  tenant: "${credentials.tenant}",
  saak: "${credentials.saak}",
  sask: "${credentials.sask}",
  clientId: "${credentials.clientId}",
  clientSecret: "${credentials.clientSecret}",
  ionApiUrl: "${credentials.ionApiUrl}",
  ssoUrl: "${credentials.ssoUrl}"
};

// Flag to use embedded credentials
const USE_EMBEDDED_CREDENTIALS = true;
`;
  
  // Add code to use embedded credentials in loadCredentials function
  const updatedLoadCredentials = `
// Load ION API credentials from environment variables, file, or embedded
function loadCredentials() {
  try {
    // Use embedded credentials if available and enabled
    if (USE_EMBEDDED_CREDENTIALS) {
      console.log('Using embedded credentials (FOR TESTING ONLY)');
      return embeddedCredentials;
    }
    
    // Log environment for debugging
    console.log('Current directory:', __dirname);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NETLIFY_ENV:', process.env.NETLIFY_ENV || 'Not set');
    console.log('CONTEXT:', process.env.CONTEXT || 'Not set');`;
  
  // Replace the loadCredentials function with our updated version
  const updatedContent = fileContent
    .replace(/\/\/ Load ION API credentials from environment variables or file\nfunction loadCredentials\(\) \{[\s\S]*?try \{/, updatedLoadCredentials)
    .replace(/\/\/ ION API Authentication Module/, `// ION API Authentication Module\n${embeddedCredentialsCode}`);
  
  // Write the updated file
  fs.writeFileSync(ionApiFilePath, updatedContent, 'utf8');
  console.log(`Updated ion-api.js with embedded credentials at ${ionApiFilePath}`);
  
  // Create a backup of the original file
  fs.writeFileSync(`${ionApiFilePath}.bak`, fileContent, 'utf8');
  console.log(`Created backup of original file at ${ionApiFilePath}.bak`);
}

// Main function
async function main() {
  console.log('Embedding credentials directly in ion-api.js');
  console.log('WARNING: This is for testing only and should not be used in production');
  console.log('Do not commit the modified ion-api.js file to version control');
  console.log('');
  
  // Try to read credentials from file or environment variables first
  let credentials = readIonCredentialsFile() || readEnvCredentials();
  
  if (credentials) {
    console.log('Found existing credentials');
    
    // Ask if user wants to use these credentials
    rl.question('Use these credentials? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        embedCredentialsInIonApi(credentials);
        rl.close();
      } else {
        // Prompt for new credentials
        promptForCredentials().then((newCredentials) => {
          embedCredentialsInIonApi(newCredentials);
          rl.close();
        });
      }
    });
  } else {
    console.log('No existing credentials found');
    
    // Prompt for new credentials
    const newCredentials = await promptForCredentials();
    embedCredentialsInIonApi(newCredentials);
    rl.close();
  }
}

// Run the main function
main();

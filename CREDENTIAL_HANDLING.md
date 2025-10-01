# Credential Handling for Netlify Deployment

This document explains different approaches for handling ION API credentials in the DataLake Sync application, particularly for Netlify deployment.

## Option 1: Environment Variables (Recommended for Production)

The most secure approach is to set environment variables in the Netlify dashboard:

1. Go to Netlify dashboard > Site settings > Build & deploy > Environment
2. Add the following environment variables:
   - `ION_TENANT`
   - `ION_SAAK`
   - `ION_SASK`
   - `ION_CLIENT_ID`
   - `ION_CLIENT_SECRET`
   - `ION_API_URL` (optional, defaults to https://mingle-ionapi.inforcloudsuite.com)
   - `ION_SSO_URL` (optional, defaults to https://mingle-sso.inforcloudsuite.com:443/YOUR_TENANT/as/)

**Advantages:**
- Credentials are not stored in code
- Credentials can be updated without redeploying
- Netlify secures sensitive environment variables

**Disadvantages:**
- Requires manual setup in Netlify dashboard
- Cannot be tested locally without setting up local environment variables

## Option 2: Hardcoded Credentials (For Testing Only)

For quick testing, you can use hardcoded credentials:

1. Run the update-credentials.js script:
   ```
   node update-credentials.js
   ```
2. Follow the prompts to enter your credentials
3. Deploy the application

**Advantages:**
- Quick to set up
- Works without environment variables
- Can be used for local testing

**Disadvantages:**
- SECURITY RISK: Credentials are stored in code
- Requires redeployment to update credentials
- Not suitable for production

## Option 3: Embedded Credentials (For Testing Only)

For more direct integration, you can embed credentials directly in the ion-api.js file:

1. Run the embed-credentials.js script:
   ```
   node embed-credentials.js
   ```
2. Follow the prompts to enter your credentials
3. Deploy the application

**Advantages:**
- Guaranteed to work regardless of environment
- Bypasses file path issues
- Can be used for local testing

**Disadvantages:**
- SECURITY RISK: Credentials are stored in code
- Requires redeployment to update credentials
- Not suitable for production
- Modifies the source code directly

## Option 4: Credentials File in Build Process

The build.sh script can create a credentials file during the build process:

1. Set environment variables in Netlify
2. The build.sh script will create a credentials file in the correct location
3. The application will use this file

**Advantages:**
- Credentials are not stored in code
- Works with the existing file-based approach
- Can be used for local testing with a local credentials file

**Disadvantages:**
- Depends on build script execution
- May have path issues in some environments

## Troubleshooting Credential Issues

If you encounter credential-related errors:

1. Check the function logs in Netlify dashboard
2. Look for error messages like:
   - "Error loading ION API credentials"
   - "ENOENT: no such file or directory"
   - "Failed to load ION API credentials"

3. Use the debug-info function to see which environment variables are set:
   - Go to https://your-site-name.netlify.app/debug.html
   - Click "Get Debug Info"
   - Check the environment section

4. If using a credentials file, verify the file path:
   - The error will show which path it's trying to use
   - Make sure the file exists at that path
   - Check that the file has the correct permissions

5. Try a different approach from the options above

## Security Considerations

- NEVER commit real credentials to version control
- Use environment variables for production deployments
- Options 2 and 3 are for testing only
- If using Option 2 or 3, make sure to remove credentials before committing
- Consider using Netlify's "sensitive variable" feature for extra security

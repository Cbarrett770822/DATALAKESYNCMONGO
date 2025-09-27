# DataLake Sync Deployment Troubleshooting Guide

This guide addresses common deployment issues with the DataLake Sync application on Netlify, particularly focusing on API connection errors.

## Common Issues and Solutions

### 1. Missing Icon in Manifest

**Issue:** Error message in console: `Error while trying to use the following icon from the Manifest: https://datalakesync.netlify.app/logo192.png`

**Solution:**
- The manifest.json file references icon files that don't exist or have the wrong path
- Either create the missing icon files or update the manifest.json to remove references to them
- This is a minor issue that doesn't affect functionality

### 2. API 500 Internal Server Error

**Issue:** Error when calling API endpoints: `POST https://datalakesync.netlify.app/.netlify/functions/submit-query 500 (Internal Server Error)`

**Solution:**

#### Check Environment Variables
Make sure the following environment variables are set in your Netlify deployment:

```
ION_TENANT=YOUR_TENANT
ION_SAAK=YOUR_SAAK
ION_SASK=YOUR_SASK
ION_CLIENT_ID=YOUR_CLIENT_ID
ION_CLIENT_SECRET=YOUR_CLIENT_SECRET
ION_API_URL=https://mingle-ionapi.inforcloudsuite.com
ION_SSO_URL=https://mingle-sso.inforcloudsuite.com:443/YOUR_TENANT/as/
```

To set these in Netlify:
1. Go to Site settings > Build & deploy > Environment
2. Add each variable and its value
3. Trigger a new deployment

#### Use the Debug Tools

We've added debugging tools to help diagnose issues:

1. Access the debug page at: https://datalakesync.netlify.app/debug.html
2. Click "Get Debug Info" to see detailed environment information
3. Check if the ION API credentials are properly loaded
4. Test each API endpoint individually to see specific error messages

#### Check Netlify Function Logs

1. Go to your Netlify dashboard
2. Navigate to Functions > submit-query
3. Look at the function logs for detailed error messages
4. Pay attention to credential loading errors or API connection issues

## Enhanced Error Handling

We've implemented several improvements to make debugging easier:

1. **Detailed Error Responses**: API errors now include more information about what went wrong
2. **Improved Credentials Loading**: The application now tries multiple paths to find credentials
3. **Debug Function**: A dedicated debug-info function provides detailed environment information
4. **Debug UI**: A simple HTML page to test API endpoints and view detailed error information

## Credentials File Issues

If you're using a credentials file instead of environment variables:

1. Make sure the file is included in your Git repository (in a secure way)
2. Check that the file path is correct in your environment variables
3. Verify the file format is correct (valid JSON)
4. Ensure the file has the necessary permissions

## Next Steps if Issues Persist

1. Try setting all credentials directly as environment variables instead of using a file
2. Check for network restrictions that might prevent API calls
3. Verify your ION API credentials are valid by testing them in another tool
4. Contact Infor support to verify your DataFabric API access

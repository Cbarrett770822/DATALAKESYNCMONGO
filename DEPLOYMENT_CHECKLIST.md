# DataLake Sync Deployment Checklist

Use this checklist to ensure a successful deployment of the DataLake Sync application to Netlify.

## Pre-Deployment Tasks

- [ ] Ensure all code changes are committed to the repository
- [ ] Run tests locally to verify functionality
- [ ] Check that all API endpoints are working correctly
- [ ] Verify that the build process completes successfully

## Netlify Environment Variables

Set the following environment variables in the Netlify dashboard:

- [ ] `ION_TENANT` - Your Infor tenant ID
- [ ] `ION_SAAK` - Your Infor SAAK
- [ ] `ION_SASK` - Your Infor SASK
- [ ] `ION_CLIENT_ID` - Your Infor client ID
- [ ] `ION_CLIENT_SECRET` - Your Infor client secret
- [ ] `ION_API_URL` - Infor ION API URL (default: https://mingle-ionapi.inforcloudsuite.com)
- [ ] `ION_SSO_URL` - Infor SSO URL (default: https://mingle-sso.inforcloudsuite.com:443/YOUR_TENANT/as/)
- [ ] `MONGODB_URI` - MongoDB connection string

## Build Settings

Verify the following build settings in the Netlify dashboard:

- [ ] Build command: `chmod +x build.sh && ./build.sh`
- [ ] Publish directory: `build`
- [ ] Functions directory: `functions`
- [ ] Node.js version: 16.x or higher

## Post-Deployment Verification

After deployment, verify the following:

- [ ] The application loads correctly at the Netlify URL
- [ ] The debug page is accessible at `/debug.html`
- [ ] API endpoints are accessible and return expected responses
- [ ] No 500 errors appear in the browser console
- [ ] Netlify function logs show no critical errors

## Troubleshooting

If you encounter issues during deployment:

1. Check the Netlify build logs for errors
2. Verify that all environment variables are set correctly
3. Check the function logs for specific error messages
4. Use the debug page to get detailed information about the environment
5. Refer to the `DEPLOYMENT_TROUBLESHOOTING.md` document for common issues and solutions

## Rollback Plan

If the deployment fails or introduces critical issues:

1. Go to the Netlify dashboard
2. Navigate to the "Deploys" section
3. Find the last known good deployment
4. Click "Publish deploy" to roll back to that version

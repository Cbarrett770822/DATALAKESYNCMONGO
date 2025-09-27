# Deployment Guide for WMS DataLake Sync Web Application

This guide provides step-by-step instructions for deploying the WMS DataLake Sync Web Application to Netlify.

## Prerequisites

- GitHub account with the repository cloned
- Netlify account
- MongoDB Atlas account
- Infor ION API credentials

## Deployment Steps

### 1. Prepare Environment Variables

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01
ION_CREDENTIALS_PATH=path_to_your_ion_credentials_file
```

### 2. Deploy to Netlify

#### Option 1: Deploy via Netlify UI

1. Log in to your Netlify account
2. Click "New site from Git"
3. Select GitHub as your Git provider
4. Authorize Netlify to access your GitHub account
5. Select the `DATALAKESYNC` repository
6. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Functions directory: `functions`
7. Click "Show advanced" and add the environment variables from your `.env` file
8. Click "Deploy site"

#### Option 2: Deploy via Netlify CLI

1. Install the Netlify CLI:
   ```
   npm install -g netlify-cli
   ```

2. Log in to Netlify:
   ```
   netlify login
   ```

3. Initialize a new Netlify site:
   ```
   netlify init
   ```

4. Follow the prompts to configure your site
5. Deploy your site:
   ```
   netlify deploy --prod
   ```

### 3. Configure Environment Variables in Netlify

1. Go to your site's dashboard in Netlify
2. Click "Site settings"
3. Click "Environment variables"
4. Add the following environment variables:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `ION_CREDENTIALS_PATH`: Path to your ION API credentials file

### 4. Set Up Continuous Deployment

1. Go to your site's dashboard in Netlify
2. Click "Site settings"
3. Click "Build & deploy"
4. Configure the build settings:
   - Build command: `npm run build`
   - Publish directory: `build`
   - Functions directory: `functions`
5. Set up deploy notifications (optional)

### 5. Verify Deployment

1. Visit your Netlify site URL
2. Log in to the application
3. Navigate to the Dashboard
4. Verify that the application is connected to MongoDB Atlas
5. Verify that the application can communicate with the Infor DataFabric API

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**:
   - Check that the MongoDB URI is correct
   - Verify that the IP address is whitelisted in MongoDB Atlas

2. **ION API Connection Error**:
   - Check that the ION API credentials are correct
   - Verify that the credentials file path is accessible

3. **Netlify Functions Not Working**:
   - Check that the functions directory is correctly specified
   - Verify that the functions are properly exported

4. **Environment Variables Not Available**:
   - Check that the environment variables are correctly set in Netlify
   - Verify that the environment variables are being accessed correctly in the code

## Post-Deployment Tasks

1. Set up scheduled sync jobs (if applicable)
2. Configure email notifications (if applicable)
3. Set up monitoring and alerts
4. Perform a full sync test
5. Document any custom configurations

# WMS DataLake Sync Web Application - Implementation Plan

## Overview

The WMS DataLake Sync Web Application provides a user-friendly interface to synchronize data from Infor WMS DataLake to MongoDB Atlas. This implementation plan outlines the steps required to deploy, configure, and use the application.

## Prerequisites

1. **Node.js and npm**: Version 16.x or higher
2. **MongoDB Atlas Account**: With a database cluster created
3. **Infor ION API Credentials**: Valid credentials for accessing the DataFabric API
4. **Netlify Account**: For deploying the application (optional for local development)

## Deployment Steps

### 1. Local Development Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd DATALAKESYNC/webapp
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Create a `.env` file in the root directory
   - Add the following variables:
     ```
     MONGODB_URI=mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01
     ION_CREDENTIALS_PATH=D:\Cascade\DATALAKESYNC\ION_Credentials\IONAPI_CREDENTIALS.ionapi
     ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Access the application at `http://localhost:3000`

### 2. Netlify Deployment

1. Build the application:
   ```
   npm run build
   ```

2. Deploy to Netlify:
   - Connect your GitHub repository to Netlify
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `build`
     - Functions directory: `functions`
   - Configure environment variables in Netlify dashboard
   - Deploy the application

3. Access the application at your Netlify URL

## Configuration

### MongoDB Configuration

1. Create a MongoDB Atlas cluster if you don't have one
2. Create a database user with read/write permissions
3. Whitelist your IP address or allow access from anywhere
4. Get the connection string from MongoDB Atlas
5. Update the `MONGODB_URI` environment variable

### ION API Configuration

1. Ensure your ION API credentials are valid
2. Place the credentials file in a secure location
3. Update the `ION_CREDENTIALS_PATH` environment variable

### Application Settings

1. Access the Settings page in the application
2. Configure the following settings:
   - Connection settings: MongoDB URI and ION Credentials Path
   - Sync settings: Default warehouse, batch size, and max records
   - Schedule settings: Enable scheduled sync and set cron expression
   - Notification settings: Configure email notifications

## Usage Guide

### Dashboard

The Dashboard provides an overview of the sync status and recent sync jobs. It also offers quick actions to start a new sync or view sync history.

### Sync Configuration

The Sync Configuration page allows you to configure and start a sync job:

1. Select the warehouse ID
2. Choose a task type (optional)
3. Set date range filters (optional)
4. Configure batch size and max records
5. Use custom SQL query if needed
6. Click "Start Sync" to begin the synchronization process

### Sync History

The Sync History page displays a list of all sync jobs with their status, progress, and results. You can filter the list by job type and status.

### Settings

The Settings page allows you to configure application settings:

1. Connection settings: MongoDB URI and ION Credentials Path
2. Sync settings: Default warehouse, batch size, and max records
3. Schedule settings: Enable scheduled sync and set cron expression
4. Notification settings: Configure email notifications

## Data Model

### TaskDetail Collection

The TaskDetail collection in MongoDB stores the synchronized data from the Infor WMS DataLake. The schema includes all fields from the taskdetail table in the DataLake, plus additional metadata fields for sync tracking.

### SyncJob Collection

The SyncJob collection stores information about sync jobs, including:

- Job type (taskdetail, inventory, etc.)
- Status (pending, in_progress, completed, failed)
- Options (warehouse ID, date range, etc.)
- Statistics (total records, processed records, etc.)
- Error information (if applicable)
- Timestamps (created, updated)

### Setting Collection

The Setting collection stores application settings as key-value pairs.

## Troubleshooting

### Common Issues

1. **Connection Issues**:
   - Check MongoDB connection string
   - Verify ION API credentials
   - Check network connectivity

2. **Sync Failures**:
   - Check error messages in sync history
   - Verify DataFabric API access
   - Check MongoDB write permissions

3. **Performance Issues**:
   - Adjust batch size and max records
   - Add indexes to MongoDB collections
   - Optimize DataFabric queries

### Logs

- Check browser console for frontend errors
- Check Netlify function logs for backend errors
- Enable verbose logging in settings for detailed information

## Maintenance

### Regular Tasks

1. **Database Maintenance**:
   - Monitor database size
   - Create indexes for frequently queried fields
   - Set up data retention policies

2. **Application Updates**:
   - Keep dependencies up to date
   - Apply security patches
   - Test updates in a staging environment

### Backup and Recovery

1. **MongoDB Backup**:
   - Use MongoDB Atlas backup features
   - Schedule regular backups
   - Test restoration procedures

2. **Application Backup**:
   - Back up application code
   - Back up environment variables
   - Back up custom configurations

## Future Enhancements

1. **Advanced Data Processing**:
   - Support complex transformations
   - Add data validation rules
   - Implement data enrichment

2. **Multi-Environment Support**:
   - Dev/Test/Prod configurations
   - Environment-specific settings

3. **Team Collaboration**:
   - User roles and permissions
   - Shared configurations
   - Activity audit logs

4. **Performance Optimizations**:
   - Parallel processing
   - Streaming data transfer
   - Optimized batch sizes

5. **Integration Expansion**:
   - Support for additional data sources
   - Two-way synchronization
   - Data comparison tools

## Support

For support, please contact:
- Email: support@example.com
- Phone: +1-123-456-7890
- Documentation: [Link to documentation]

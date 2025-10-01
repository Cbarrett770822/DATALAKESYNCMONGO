# DataLake Sync Backend

This directory contains the backend implementation for the DataLake Sync application. The backend is built using Netlify Functions and MongoDB.

## Architecture

The backend is organized into the following components:

### Models

- `sync-job.js` - Schema for sync jobs
- `sync-config.js` - Schema for sync configurations
- `sync-history.js` - Schema for sync history
- `taskdetail.js` - Schema for taskdetail data
- `receipt.js` - Schema for receipt data
- `receipt-detail.js` - Schema for receipt detail data
- `orders.js` - Schema for orders data
- `order-detail.js` - Schema for order detail data
- `setting.js` - Schema for application settings

### API Functions

- `sync-config.js` - CRUD operations for sync configurations
- `sync-table.js` - Start a sync job for a specific table
- `sync-status.js` - Check the status of a sync job
- `sync-history.js` - Get sync history
- `sync-stats.js` - Get sync statistics
- `scheduled-sync.js` - Run scheduled sync jobs
- `init-sync-config.js` - Initialize default sync configurations
- `update-sync-history.js` - Update sync history entries

### Utility Functions

- `mongodb.js` - MongoDB connection utility
- `extended-query-builder.js` - SQL query builders for DataFabric API
- `extended-data-transformer.js` - Data transformation utilities
- `db-helper.js` - Enhanced MongoDB operations with retry logic
- `validation-helper.js` - Validation utilities for sync operations
- `sync-helper.js` - Common functions for sync operations
- `cors-headers.js` - CORS headers utility
- `ion-api.js` - ION API authentication and interaction
- `api-handler.js` - API request/response handler
- `hardcoded-credentials.js` - Hardcoded credentials for testing

## Data Flow

1. The frontend requests a sync operation via the `sync-table.js` function
2. The function validates the request and retrieves the sync configuration
3. The `sync-helper.js` utility executes the sync operation:
   - Builds and submits a count query to DataFabric API
   - Calculates the number of batches based on the total records
   - For each batch:
     - Builds and submits a paginated query to DataFabric API
     - Transforms the results using the appropriate transformer
     - Creates bulk write operations for MongoDB
     - Executes the bulk write operations with retry logic
   - Creates a sync job record and sync history entry
   - Updates the sync configuration with the latest sync information
4. The function returns the sync results to the frontend

## Error Handling

The backend includes robust error handling:

- MongoDB transaction error handling with retry logic
- Validation of all input parameters
- Proper error responses with detailed information
- Consistent CORS headers for all responses

## Testing

The `test-sync-api.js` script can be used to test the backend functions. It includes tests for:

- Initializing sync configurations
- Getting sync configurations
- Updating sync configurations
- Starting sync jobs
- Checking sync status
- Getting sync history
- Getting sync statistics
- Running scheduled sync jobs

## Environment Variables

The following environment variables are used:

- `MONGODB_URI` - MongoDB connection string
- `ION_TENANT` - ION API tenant
- `ION_SAAK` - ION API SAAK
- `ION_SASK` - ION API SASK
- `ION_CLIENT_ID` - ION API client ID
- `ION_CLIENT_SECRET` - ION API client secret
- `ION_API_URL` - ION API URL
- `ION_SSO_URL` - ION SSO URL

If these environment variables are not set, the backend will attempt to load credentials from the `ION_Credentials/IONAPI_CREDENTIALS.ionapi` file.

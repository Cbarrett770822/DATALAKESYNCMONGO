# Data Lake Sync Application

A serverless application for synchronizing data from Infor DataFabric to MongoDB.

## Architecture

This application uses a modular, event-driven architecture to reliably process large datasets in a serverless environment:

1. **Initiator Function** (`start-sync.js`): Starts the sync process and triggers the first batch
2. **Batch Processor** (`process-batch.js`): Processes a single batch and triggers the next batch
3. **Status Reporter** (`get-sync-status.js`): Provides status updates for the frontend

## Key Features

- **Reliable Processing**: Handles large datasets (22,000+ records) without timeouts
- **Real-time Progress**: Provides detailed status updates to the frontend
- **Error Resilience**: Implements robust error handling and connection management
- **Efficient Data Transfer**: Processes data in optimized batches of 1000 records

## Technical Implementation

- **Netlify Background Functions**: Extends function timeout to 15 minutes
- **Self-triggering Webhook Pattern**: Ensures each batch gets a fresh execution context
- **Enhanced MongoDB Connection Management**: Implements connection pooling and retry logic
- **Bulk Operations**: Uses MongoDB bulk writes for efficient data insertion

## Setup and Deployment

1. Install dependencies:
   ```
   npm install
   ```

2. Set up environment variables:
   - `MONGODB_URI`: MongoDB connection string
   - `DEPLOY_URL`: URL of the deployed application

3. Deploy to Netlify:
   ```
   netlify deploy --prod
   ```

## API Endpoints

- `/.netlify/functions/start-sync`: Initiates a new sync job
- `/.netlify/functions/get-sync-status?jobId=<jobId>`: Gets the status of a sync job

## Frontend Integration

The frontend should poll the `get-sync-status` endpoint to display real-time progress updates to the user.

# Simplified DATALAKESYNC Application

This document describes the simplified version of the DATALAKESYNC application, which focuses solely on TaskDetail synchronization.

## Overview

The application has been streamlined to include only two main pages:

1. **Data Sync Page** - For TaskDetail synchronization
2. **API Tester Page** - For testing DataFabric API queries

All other functionality has been removed to create a more focused application.

## Data Sync Page

The Data Sync page provides a simple interface for synchronizing TaskDetail data from Infor WMS DataLake to MongoDB Atlas. It includes:

- A button to start the TaskDetail sync process
- Real-time progress tracking with a progress bar
- Detailed statistics (total records, processed, inserted, updated)
- Sync history showing previous sync operations

## API Tester Page

The API Tester page allows users to:

- Construct and submit DataFabric API queries
- View query results
- Test API connectivity

## Technical Implementation

### Frontend

- React components with Material UI
- Comprehensive logging system for debugging
- Real-time progress updates

### Backend

- Netlify Functions (serverless)
- MongoDB with Mongoose
- Specialized TaskDetail sync handler with robust error handling
- Transaction management for data consistency

## Key Files

1. **Frontend**:
   - `src/components/DataSync.js` - Main component for TaskDetail synchronization
   - `src/components/ApiTester.js` - Component for testing API queries
   - `src/App.js` - Simplified routing
   - `src/components/Layout.js` - Simplified navigation

2. **Backend**:
   - `functions/sync-table.js` - Main sync endpoint
   - `functions/utils/taskdetail-sync.js` - Specialized TaskDetail sync handler
   - `functions/utils/extended-data-transformer.js` - Data transformation utilities
   - `functions/utils/extended-query-builder.js` - Query building utilities

## How to Use

1. **TaskDetail Synchronization**:
   - Navigate to the Data Sync page
   - Click "Start TaskDetail Sync"
   - Monitor progress in real-time
   - View sync history for past operations

2. **API Testing**:
   - Navigate to the API Tester page
   - Construct a query using the form
   - Submit the query and view results

## Future Enhancements

While the application is currently focused on TaskDetail synchronization, it can be expanded in the future to include:

1. Additional data tables (Orders, Receipts, etc.)
2. More configuration options
3. Advanced filtering capabilities
4. User authentication and authorization
5. Scheduled synchronization

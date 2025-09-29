# TaskDetail Synchronization Process

## What Happens When You Click "Play" for TaskDetail Sync

This document explains the step-by-step process that occurs when a user initiates a TaskDetail synchronization by clicking the "Play" button in the UI.

### 1. Frontend Initiates the Sync Request

When the user clicks the "Play" button:

1. The UI sends a POST request to the `/sync-table` Netlify function endpoint
2. The request includes parameters:
   - `tableId: 'taskdetail'`
   - `whseid`: The warehouse ID from configuration
   - `batchSize`: Number of records to process in each batch
   - `maxRecords`: Maximum number of records to sync

### 2. Backend Processes the Sync Request

The `/sync-table` function:

1. Validates the request parameters
2. Connects to MongoDB Atlas
3. Retrieves the sync configuration for TaskDetail
4. Detects that the request is for TaskDetail and uses the specialized `taskdetail-sync.js` handler
5. Creates a new `SyncJob` document with status "in_progress"
6. Returns the job ID to the frontend

### 3. Data Extraction and Processing

The specialized TaskDetail sync handler:

1. Builds and submits a count query to determine the total number of records
2. Calculates the number of batches based on the batch size
3. For each batch:
   - Builds and submits a paginated query to retrieve records
   - Transforms the records to match the MongoDB schema
   - Creates bulk write operations for MongoDB

### 4. MongoDB Operations with Robust Error Handling

For each batch of records:

1. Starts a MongoDB transaction using a session
2. Performs bulk write operations within the transaction
3. Implements robust error handling:
   - Detects transient MongoDB errors (e.g., WriteConflict, TransientTransactionError)
   - Implements retry logic with exponential backoff (starting at 500ms)
   - Properly manages session state and transaction lifecycle
   - Ensures proper cleanup in all code paths

### 5. Progress Tracking and Reporting

Throughout the process:

1. Updates the SyncJob document with progress statistics:
   - Total records
   - Processed records
   - Inserted records
   - Updated records
   - Error records
2. The frontend polls the `/sync-status` endpoint to get the latest status
3. The UI updates to show the current progress

### 6. Completion and History Recording

When the sync completes:

1. Updates the SyncJob status to "completed" or "failed"
2. Creates a SyncHistory entry with detailed statistics
3. Updates the SyncConfig with the last sync date and status
4. The frontend displays the final result and refreshes the sync history

### 7. Error Handling

If errors occur:

1. The backend captures detailed error information
2. Transient errors are retried up to 5 times with exponential backoff
3. Non-transient errors are reported immediately
4. All errors are properly logged and propagated to the frontend
5. The UI displays appropriate error messages

## Technical Implementation Details

The TaskDetail sync process uses several advanced techniques:

1. **MongoDB Transactions**: Ensures data consistency during bulk operations
2. **Exponential Backoff**: Intelligently retries operations that fail due to transient errors
3. **Session Management**: Properly handles MongoDB sessions to prevent resource leaks
4. **Batch Processing**: Processes large datasets in manageable chunks
5. **Real-time Progress Updates**: Keeps the user informed of the sync progress

This implementation follows best practices for MongoDB operations and error handling, incorporating lessons learned from previous issues with transaction handling and connection management.

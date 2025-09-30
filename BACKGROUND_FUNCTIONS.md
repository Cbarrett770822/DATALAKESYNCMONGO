# Background Functions Implementation

## Overview

This document explains how we implemented Netlify Background Functions to handle long-running data synchronization operations that exceed the standard 10-second timeout limit.

## Problem

The TaskDetail copy operation was failing with a 504 Gateway Timeout error because:
- The operation involves copying thousands of records from the data lake to MongoDB
- This process takes longer than Netlify's 10-second function execution limit
- When the limit was exceeded, Netlify terminated the function and returned a 504 error

## Solution

We implemented the following changes:

1. **Converted copy-taskdetail.js to a Background Function**
   - Added the background function configuration:
   ```javascript
   export const config = {
     background: true
   };
   ```
   - This allows the function to run for up to 15 minutes instead of 10 seconds

2. **Created a simple-status.js endpoint**
   - This endpoint provides status updates for background jobs
   - Returns information about job progress, records processed, etc.

3. **Updated the frontend DataCopy.js component**
   - Modified to handle 504 responses correctly (these are expected for background functions)
   - Added polling logic to check job status periodically
   - Improved error handling for background processes

## How It Works

1. When the user clicks "Copy TaskDetail Data":
   - The frontend calls the copy-taskdetail function
   - The function starts processing in the background
   - Netlify returns a 504 response (this is normal for background functions)

2. The frontend:
   - Recognizes the 504 as an expected response
   - Starts polling the simple-status endpoint for updates using the job ID
   - Displays progress information to the user

3. The background function:
   - Creates a job record in MongoDB with initial status
   - Continues processing data in the background
   - Can run for up to 15 minutes
   - Processes data in batches to optimize performance
   - Updates the job status in MongoDB after each batch

## MongoDB Status Tracking

We've implemented real-time status tracking in MongoDB using a JobStatus model:

```javascript
const jobStatusSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'failed'] },
  operation: { type: String, required: true },
  totalRecords: { type: Number, default: 0 },
  processedRecords: { type: Number, default: 0 },
  insertedRecords: { type: Number, default: 0 },
  updatedRecords: { type: Number, default: 0 },
  errorRecords: { type: Number, default: 0 },
  percentComplete: { type: Number, default: 0 },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  message: { type: String },
  error: { type: String },
  options: { type: mongoose.Schema.Types.Mixed }
});
```

This allows:
- Real-time tracking of job progress
- Detailed statistics on processed records
- Error reporting and handling
- Automatic cleanup with TTL index (job statuses expire after 7 days)

## Testing

To test this implementation:

1. **Basic Testing**:
   - Click the "Copy TaskDetail Data" button
   - Observe that the UI shows "Copy started as background process"
   - Wait for status updates to appear
   - Verify that the process completes successfully

2. **Verifying MongoDB Status Tracking**:
   - Use MongoDB Compass or Atlas UI to connect to your database
   - Check the `jobstatuses` collection
   - Verify that job records are created with the correct fields
   - Watch the status updates in real-time as batches are processed
   - Confirm that completed jobs have accurate statistics

3. **API Testing**:
   - Test the simple-status endpoint directly: `/.netlify/functions/simple-status?jobId=job_1234567890`
   - Verify that it returns the correct job status from MongoDB
   - Test with both existing and non-existent job IDs

## References

- [Netlify Background Functions Documentation](https://docs.netlify.com/functions/background-functions/)
- [MongoDB Best Practices for Long-Running Operations](https://www.mongodb.com/docs/manual/core/transactions-in-applications/#best-practices)

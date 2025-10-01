// Netlify function to update sync history entries
const mongodb = require('./utils/mongodb');
const SyncHistory = require('./models/sync-history');
const SyncConfig = require('./models/sync-config');
const { handlePreflight, successResponse, errorResponse } = require('./utils/cors-headers');

exports.handler = async function(event, context) {
  // Handle OPTIONS request (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return handlePreflight();
  }
  
  // Only allow PUT requests
  if (event.httpMethod !== 'PUT') {
    return errorResponse(`Method ${event.httpMethod} not allowed`, null, 405);
  }
  
  try {
    // Connect to MongoDB
    try {
      console.log('Connecting to MongoDB...');
      await mongodb.connectToDatabase();
      console.log('Connected to MongoDB successfully');
    } catch (dbError) {
      console.error('Failed to connect to MongoDB:', dbError);
      return errorResponse('Database connection error: ' + dbError.message, null, 500);
    }
    
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}');
    const historyId = event.queryStringParameters?.id;
    
    if (!historyId) {
      await mongodb.disconnectFromDatabase();
      return errorResponse('History ID is required', null, 400);
    }
    
    // Find the history entry
    const historyEntry = await SyncHistory.findById(historyId);
    
    if (!historyEntry) {
      await mongodb.disconnectFromDatabase();
      return errorResponse(`Sync history entry with ID ${historyId} not found`, null, 404);
    }
    
    // Update fields
    if (requestBody.status) {
      historyEntry.status = requestBody.status;
    }
    
    if (requestBody.endTime) {
      historyEntry.endTime = new Date(requestBody.endTime);
    } else if (requestBody.status === 'completed' || requestBody.status === 'failed') {
      // Set end time automatically if status is completed or failed
      historyEntry.endTime = new Date();
    }
    
    // Calculate duration if we have both start and end time
    if (historyEntry.startTime && historyEntry.endTime) {
      historyEntry.duration = (historyEntry.endTime - historyEntry.startTime) / 1000; // in seconds
    }
    
    // Update record counts if provided
    if (typeof requestBody.recordsProcessed === 'number') {
      historyEntry.recordsProcessed = requestBody.recordsProcessed;
    }
    
    if (typeof requestBody.recordsInserted === 'number') {
      historyEntry.recordsInserted = requestBody.recordsInserted;
    }
    
    if (typeof requestBody.recordsUpdated === 'number') {
      historyEntry.recordsUpdated = requestBody.recordsUpdated;
    }
    
    if (typeof requestBody.recordsError === 'number') {
      historyEntry.recordsError = requestBody.recordsError;
    }
    
    // Update error message if provided
    if (requestBody.error) {
      historyEntry.error = requestBody.error;
    }
    
    // Save the updated history entry
    await historyEntry.save();
    
    // If status is completed or failed, update the sync config
    if (historyEntry.status === 'completed' || historyEntry.status === 'failed') {
      try {
        await SyncConfig.findOneAndUpdate(
          { tableId: historyEntry.tableId },
          { 
            $set: { 
              lastSyncDate: historyEntry.endTime,
              lastSyncStatus: historyEntry.status,
              lastSyncJobId: historyEntry._id
            }
          }
        );
      } catch (configError) {
        console.error(`Error updating sync config for ${historyEntry.tableId}:`, configError);
        // Continue execution even if this fails
      }
    }
    
    await mongodb.disconnectFromDatabase();
    return successResponse(historyEntry);
  } catch (error) {
    console.error('Error updating sync history entry:', error);
    
    try {
      await mongodb.disconnectFromDatabase();
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    return errorResponse(
      'Failed to update sync history entry',
      error.message,
      500
    );
  }
};

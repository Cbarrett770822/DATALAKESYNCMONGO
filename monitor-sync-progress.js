// Script to monitor synchronization progress between MongoDB and DataLake
const mongoose = require('mongoose');
const TaskDetail = require('./functions/models/taskdetail');
const ionApi = require('./functions/utils/ion-api');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charleslengchai_db_user:1ZbUxIUsqJxmRRlm@cbcluster01.jrsfdsz.mongodb.net/?retryWrites=true&w=majority&appName=CBCLUSTER01';

// Task types we're monitoring
const taskTypes = ['PK', 'PP', 'PA', 'CC', 'LD', 'TD', 'RC', 'PIA', 'PIB', 'DP', 'MV', 'RP', 'CR'];

// Function to execute a DataLake query and get results
async function executeDataLakeQuery(query) {
  try {
    console.log('Executing DataLake query:', query.replace(/\s+/g, ' ').trim());
    
    // Submit the query
    const response = await ionApi.submitQuery(query);
    const queryId = response.queryId || response.id;
    
    if (!queryId) {
      throw new Error('No query ID returned from API');
    }
    
    // Check status until completed
    let status;
    do {
      status = await ionApi.checkStatus(queryId);
      
      if (status.status === 'failed' || status.status === 'FAILED') {
        throw new Error(`Query failed: ${JSON.stringify(status)}`);
      }
      
      if (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } while (status.status !== 'completed' && status.status !== 'COMPLETED' && status.status !== 'FINISHED');
    
    // Get results
    const results = await ionApi.getResults(queryId);
    return results;
  } catch (error) {
    console.error('Error executing DataLake query:', error.message);
    throw error;
  }
}

// Function to extract count from DataLake results
function extractDataLakeCount(results) {
  if (results.results && results.results[0] && results.results[0].count !== undefined) {
    return parseInt(results.results[0].count, 10);
  } else if (results.rows && results.rows[0] && results.rows[0][0] !== undefined) {
    return parseInt(results.rows[0][0], 10);
  } else {
    return 0;
  }
}

// Function to save results to a log file
function saveResultsToLog(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logDir = path.join(__dirname, 'sync_logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, `sync_progress_${timestamp}.json`);
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2));
  
  console.log(`Results saved to ${logFile}`);
  
  // Also update the latest results file
  const latestFile = path.join(logDir, 'latest_sync_progress.json');
  fs.writeFileSync(latestFile, JSON.stringify(results, null, 2));
}

// Main function to monitor synchronization progress
async function monitorSyncProgress() {
  console.log('Monitoring TaskDetail Synchronization Progress');
  console.log('===========================================');
  console.log('Date/Time:', new Date().toISOString());
  
  try {
    // Connect to MongoDB
    console.log('\nConnecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });
    console.log('Connected to MongoDB successfully');
    
    // Get total counts
    console.log('\nCounting total records...');
    
    // MongoDB total count
    const mongoTotalCount = await TaskDetail.countDocuments();
    console.log(`Total records in MongoDB: ${mongoTotalCount}`);
    
    // DataLake total count
    const dataLakeTotalQuery = `SELECT COUNT(*) as count FROM "CSWMS_wmwhse_TASKDETAIL"`;
    const dataLakeTotalResults = await executeDataLakeQuery(dataLakeTotalQuery);
    const dataLakeTotalCount = extractDataLakeCount(dataLakeTotalResults);
    console.log(`Total records in DataLake: ${dataLakeTotalCount}`);
    
    // Calculate overall progress
    const overallProgress = (mongoTotalCount / dataLakeTotalCount) * 100;
    console.log(`Overall progress: ${overallProgress.toFixed(2)}%`);
    
    // Compare task type counts
    console.log('\nTask type progress:');
    console.log('------------------');
    console.log('Task Type | MongoDB | DataLake | Progress');
    console.log('---------|---------|----------|--------');
    
    const taskTypeProgress = [];
    
    // Get counts for each task type
    for (const taskType of taskTypes) {
      // MongoDB count
      const mongoCount = await TaskDetail.countDocuments({ TASKTYPE: taskType });
      
      // DataLake count
      const dataLakeQuery = `
        SELECT COUNT(*) as count
        FROM "CSWMS_wmwhse_TASKDETAIL"
        WHERE TASKTYPE = '${taskType}'
      `;
      const dataLakeResults = await executeDataLakeQuery(dataLakeQuery);
      const dataLakeCount = extractDataLakeCount(dataLakeResults);
      
      // Calculate progress percentage
      const progress = dataLakeCount > 0 ? (mongoCount / dataLakeCount) * 100 : 0;
      
      // Store progress data
      taskTypeProgress.push({
        taskType,
        mongoCount,
        dataLakeCount,
        progress: progress.toFixed(2)
      });
      
      // Print progress
      console.log(`${taskType.padEnd(9)} | ${mongoCount.toString().padEnd(7)} | ${dataLakeCount.toString().padEnd(8)} | ${progress.toFixed(2)}%`);
    }
    
    // Get combined counts for monitored task types
    console.log('\nCombined progress for monitored task types:');
    
    // MongoDB combined count
    const mongoCombinedCount = await TaskDetail.countDocuments({ TASKTYPE: { $in: taskTypes } });
    
    // DataLake combined count
    const dataLakeCombinedQuery = `
      SELECT COUNT(*) as count
      FROM "CSWMS_wmwhse_TASKDETAIL"
      WHERE TASKTYPE IN ('${taskTypes.join("', '")}')
    `;
    const dataLakeCombinedResults = await executeDataLakeQuery(dataLakeCombinedQuery);
    const dataLakeCombinedCount = extractDataLakeCount(dataLakeCombinedResults);
    
    // Calculate combined progress
    const combinedProgress = (mongoCombinedCount / dataLakeCombinedCount) * 100;
    
    console.log(`Combined progress: ${combinedProgress.toFixed(2)}%`);
    
    // Prepare results object
    const results = {
      timestamp: new Date().toISOString(),
      overall: {
        mongoCount: mongoTotalCount,
        dataLakeCount: dataLakeTotalCount,
        progress: parseFloat(overallProgress.toFixed(2))
      },
      combined: {
        mongoCount: mongoCombinedCount,
        dataLakeCount: dataLakeCombinedCount,
        progress: parseFloat(combinedProgress.toFixed(2))
      },
      taskTypes: taskTypeProgress
    };
    
    // Save results to log file
    saveResultsToLog(results);
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    
    return results;
    
  } catch (error) {
    console.error('Monitoring failed:', error);
    
    // Ensure MongoDB connection is closed
    try {
      await mongoose.disconnect();
      console.log('Disconnected from MongoDB');
    } catch (disconnectError) {
      console.error('Error disconnecting from MongoDB:', disconnectError);
    }
    
    throw error;
  }
}

// Run the monitoring function
monitorSyncProgress()
  .then(results => {
    console.log('\nMonitoring completed successfully');
  })
  .catch(error => {
    console.error('\nMonitoring failed:', error);
    process.exit(1);
  });

/**
 * Data Transformer Utility
 * Transforms data from DataFabric format to MongoDB format
 */
const logger = require('./logger');

/**
 * Transform raw data from DataFabric to MongoDB format
 * @param {Array} records - Raw records from DataFabric
 * @returns {Array} Transformed records ready for MongoDB
 */
function transformData(records) {
  if (!records || !Array.isArray(records)) {
    logger.warn('No records to transform or invalid data format');
    return [];
  }

  logger.info(`Transforming ${records.length} records`);
  
  return records.map(record => {
    // Create a new object with all properties from the record
    const transformedRecord = { ...record };
    
    // Convert date fields from strings to Date objects
    if (record.STARTTIME) transformedRecord.STARTTIME = new Date(record.STARTTIME);
    if (record.ENDTIME) transformedRecord.ENDTIME = new Date(record.ENDTIME);
    if (record.RELEASEDATE) transformedRecord.RELEASEDATE = new Date(record.RELEASEDATE);
    if (record.ADDDATE) transformedRecord.ADDDATE = new Date(record.ADDDATE);
    if (record.EDITDATE) transformedRecord.EDITDATE = new Date(record.EDITDATE);
    if (record.ORIGINALSTARTTIME) transformedRecord.ORIGINALSTARTTIME = new Date(record.ORIGINALSTARTTIME);
    if (record.ORIGINALENDTIME) transformedRecord.ORIGINALENDTIME = new Date(record.ORIGINALENDTIME);
    if (record.REQUESTEDSHIPDATE) transformedRecord.REQUESTEDSHIPDATE = new Date(record.REQUESTEDSHIPDATE);
    
    // Add metadata for sync tracking
    transformedRecord._syncDate = new Date();
    transformedRecord._syncStatus = 'synced';
    
    return transformedRecord;
  });
}

/**
 * Create bulk operations for MongoDB
 * @param {Array} records - Transformed records
 * @returns {Array} Bulk operations for MongoDB
 */
function createBulkOperations(records) {
  if (!records || !Array.isArray(records)) {
    return [];
  }
  
  return records.map(record => {
    return {
      updateOne: {
        filter: { 
          WHSEID: record.WHSEID, 
          TASKDETAILKEY: record.TASKDETAILKEY 
        },
        update: { $set: record },
        upsert: true
      }
    };
  });
}

module.exports = {
  transformData,
  createBulkOperations
};

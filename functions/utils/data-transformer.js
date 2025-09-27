// Data Transformation Layer
// Handles transforming data between DataFabric and MongoDB formats

/**
 * Transform a DataFabric result row to MongoDB document format
 * @param {Object} row - DataFabric result row
 * @returns {Object} - MongoDB document
 */
function transformTaskdetailRow(row) {
  // Create a new object for the MongoDB document
  const document = { ...row };
  
  // Transform date fields
  const dateFields = [
    'STARTTIME', 'ENDTIME', 'RELEASEDATE', 'ADDDATE', 'EDITDATE',
    'ORIGINALSTARTTIME', 'ORIGINALENDTIME', 'REQUESTEDSHIPDATE',
    'EXT_UDF_DATE1', 'EXT_UDF_DATE2', 'EXT_UDF_DATE3', 'EXT_UDF_DATE4', 'EXT_UDF_DATE5'
  ];
  
  // Convert date strings to Date objects
  dateFields.forEach(field => {
    if (document[field] && typeof document[field] === 'string') {
      try {
        document[field] = new Date(document[field]);
      } catch (error) {
        console.warn(`Failed to parse date for field ${field}:`, document[field]);
      }
    }
  });
  
  // Transform numeric fields
  const numericFields = [
    'UOMQTY', 'QTY', 'TAREWGT', 'NETWGT', 'GROSSWGT',
    'EXT_UDF_FLOAT1', 'EXT_UDF_FLOAT2', 'EXT_UDF_FLOAT3', 'EXT_UDF_FLOAT4', 'EXT_UDF_FLOAT5'
  ];
  
  // Convert string numbers to actual numbers
  numericFields.forEach(field => {
    if (document[field] && typeof document[field] === 'string') {
      try {
        document[field] = parseFloat(document[field]);
      } catch (error) {
        console.warn(`Failed to parse number for field ${field}:`, document[field]);
      }
    }
  });
  
  // Add metadata for sync tracking
  document._syncDate = new Date();
  document._syncStatus = 'synced';
  
  return document;
}

/**
 * Transform an array of DataFabric results to MongoDB documents
 * @param {Array} results - DataFabric results
 * @returns {Array} - MongoDB documents
 */
function transformTaskdetailResults(results) {
  if (!Array.isArray(results)) {
    console.warn('Expected array of results, got:', typeof results);
    return [];
  }
  
  return results.map(row => transformTaskdetailRow(row));
}

/**
 * Create a MongoDB update operation for upsert
 * @param {Object} document - MongoDB document
 * @returns {Object} - MongoDB update operation
 */
function createUpsertOperation(document) {
  // Create a filter to find the document
  const filter = {
    WHSEID: document.WHSEID,
    TASKDETAILKEY: document.TASKDETAILKEY
  };
  
  // Create an update operation
  const update = {
    $set: document
  };
  
  return {
    filter,
    update,
    options: { upsert: true }
  };
}

/**
 * Create MongoDB bulk write operations for multiple documents
 * @param {Array} documents - MongoDB documents
 * @returns {Array} - MongoDB bulk write operations
 */
function createBulkWriteOperations(documents) {
  return documents.map(doc => {
    const { filter, update, options } = createUpsertOperation(doc);
    return {
      updateOne: {
        filter,
        update,
        upsert: options.upsert
      }
    };
  });
}

module.exports = {
  transformTaskdetailRow,
  transformTaskdetailResults,
  createUpsertOperation,
  createBulkWriteOperations
};

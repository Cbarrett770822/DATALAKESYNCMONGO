// Extended Data Transformation Layer
// Handles transforming data between DataFabric and MongoDB formats for various models

/**
 * Transform a DataFabric result row to MongoDB document format with date and number conversion
 * @param {Object} row - DataFabric result row
 * @param {Array} dateFields - Array of field names that should be converted to Date objects
 * @param {Array} numericFields - Array of field names that should be converted to numbers
 * @returns {Object} - MongoDB document
 */
function transformRow(row, dateFields = [], numericFields = []) {
  // Create a new object for the MongoDB document
  const document = { ...row };
  
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
 * @param {Function} rowTransformer - Function to transform each row
 * @returns {Array} - MongoDB documents
 */
function transformResults(results, rowTransformer) {
  if (!Array.isArray(results)) {
    console.warn('Expected array of results, got:', typeof results);
    return [];
  }
  
  return results.map(row => rowTransformer(row));
}

/**
 * Create MongoDB bulk write operations for multiple documents
 * @param {Array} documents - MongoDB documents
 * @param {Object} keyFields - Object defining the fields to use as unique keys
 * @returns {Array} - MongoDB bulk write operations
 */
function createBulkWriteOperations(documents, keyFields) {
  return documents.map(doc => {
    // Create a filter to find the document
    const filter = {};
    
    // Add each key field to the filter
    Object.keys(keyFields).forEach(key => {
      filter[key] = doc[key];
    });
    
    // Create an update operation
    return {
      updateOne: {
        filter,
        update: { $set: doc },
        upsert: true
      }
    };
  });
}

// Receipt specific transformers
const receiptDateFields = [
  'RECEIPTDATE', 'STATUSDATE', 'SCHEDULEDARRIVALDATE', 'ACTUALARRIVALDATE',
  'CLOSEDDATE', 'ADDDATE', 'EDITDATE', 'EFFECTIVEDATE'
];

const receiptNumericFields = [
  'TOTALCUBIC', 'TOTALGROSS', 'TOTALNET', 'TOTALCASES', 'TOTALPALLETS',
  'TOTALVALUE', 'TOTALLINES', 'TOTALUNITS', 'TOTALWEIGHT'
];

function transformReceiptRow(row) {
  return transformRow(row, receiptDateFields, receiptNumericFields);
}

function transformReceiptResults(results) {
  return transformResults(results, transformReceiptRow);
}

function createReceiptBulkWriteOperations(documents) {
  return createBulkWriteOperations(documents, { WHSEID: 1, RECEIPTKEY: 1 });
}

// Receipt Detail specific transformers
const receiptDetailDateFields = [
  'STATUSDATE', 'ADDDATE', 'EDITDATE', 'EFFECTIVEDATE'
];

const receiptDetailNumericFields = [
  'QTYEXPECTED', 'QTYRECEIVED', 'QTYREJECTED', 'UOMQTY'
];

function transformReceiptDetailRow(row) {
  return transformRow(row, receiptDetailDateFields, receiptDetailNumericFields);
}

function transformReceiptDetailResults(results) {
  return transformResults(results, transformReceiptDetailRow);
}

function createReceiptDetailBulkWriteOperations(documents) {
  return createBulkWriteOperations(documents, { WHSEID: 1, RECEIPTKEY: 1, RECEIPTLINENUMBER: 1 });
}

// Orders specific transformers
const ordersDateFields = [
  'ORDERDATE', 'DELIVERYDATE', 'ADDDATE', 'EDITDATE'
];

const ordersNumericFields = [];

function transformOrdersRow(row) {
  return transformRow(row, ordersDateFields, ordersNumericFields);
}

function transformOrdersResults(results) {
  return transformResults(results, transformOrdersRow);
}

function createOrdersBulkWriteOperations(documents) {
  return createBulkWriteOperations(documents, { WHSEID: 1, ORDERKEY: 1 });
}

// Order Detail specific transformers
const orderDetailDateFields = [
  'ADDDATE', 'EDITDATE'
];

const orderDetailNumericFields = [
  'QTYORDERED', 'QTYPICKED', 'QTYSHIPPED', 'OPENQTY', 
  'ALLOCATEDQTY', 'PICKEDQTY', 'SHIPPEDQTY', 'UOMQTY'
];

function transformOrderDetailRow(row) {
  return transformRow(row, orderDetailDateFields, orderDetailNumericFields);
}

function transformOrderDetailResults(results) {
  return transformResults(results, transformOrderDetailRow);
}

function createOrderDetailBulkWriteOperations(documents) {
  return createBulkWriteOperations(documents, { WHSEID: 1, ORDERKEY: 1, ORDERLINENUMBER: 1 });
}

module.exports = {
  // Generic functions
  transformRow,
  transformResults,
  createBulkWriteOperations,
  
  // Receipt specific
  transformReceiptRow,
  transformReceiptResults,
  createReceiptBulkWriteOperations,
  
  // Receipt Detail specific
  transformReceiptDetailRow,
  transformReceiptDetailResults,
  createReceiptDetailBulkWriteOperations,
  
  // Orders specific
  transformOrdersRow,
  transformOrdersResults,
  createOrdersBulkWriteOperations,
  
  // Order Detail specific
  transformOrderDetailRow,
  transformOrderDetailResults,
  createOrderDetailBulkWriteOperations
};

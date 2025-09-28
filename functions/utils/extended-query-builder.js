// Extended Query Builders for DataFabric API
// Builds SQL queries for different tables in the DataFabric API

/**
 * Build a SQL query to count records for any table
 */
function buildCountQuery(tableName, options = {}) {
  const { whseid, startDate, endDate } = options;
  
  // Start building the query
  let query = `SELECT COUNT(*) AS count FROM "${tableName}"`;
  
  // Build WHERE clause
  const conditions = [];
  
  // Add warehouse filter
  if (whseid) conditions.push(`WHSEID = '${whseid}'`);
  
  // Add date range filter
  if (startDate) conditions.push(`ADDDATE >= '${startDate}'`);
  if (endDate) conditions.push(`ADDDATE <= '${endDate}'`);
  
  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  return query;
}

/**
 * Build a SQL query with pagination for any table
 */
function buildPaginatedQuery(tableName, options = {}) {
  const { whseid, startDate, endDate, offset = 0, limit = 1000 } = options;
  
  // Start building the query
  let query = `SELECT * FROM "${tableName}"`;
  
  // Build WHERE clause
  const conditions = [];
  
  // Add warehouse filter
  if (whseid) conditions.push(`WHSEID = '${whseid}'`);
  
  // Add date range filter
  if (startDate) conditions.push(`ADDDATE >= '${startDate}'`);
  if (endDate) conditions.push(`ADDDATE <= '${endDate}'`);
  
  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add ORDER BY clause for consistent pagination
  query += ' ORDER BY SERIALKEY';
  
  // Add LIMIT and OFFSET clauses
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  
  return query;
}

// Receipt specific queries
function buildReceiptCountQuery(options = {}) {
  return buildCountQuery('CSWMS_wmwhse_RECEIPT', options);
}

function buildReceiptPaginatedQuery(options = {}) {
  return buildPaginatedQuery('CSWMS_wmwhse_RECEIPT', options);
}

// Receipt Detail specific queries
function buildReceiptDetailCountQuery(options = {}) {
  return buildCountQuery('CSWMS_wmwhse_RECEIPTDETAIL', options);
}

function buildReceiptDetailPaginatedQuery(options = {}) {
  return buildPaginatedQuery('CSWMS_wmwhse_RECEIPTDETAIL', options);
}

// Orders specific queries
function buildOrdersCountQuery(options = {}) {
  return buildCountQuery('CSWMS_wmwhse_ORDERS', options);
}

function buildOrdersPaginatedQuery(options = {}) {
  return buildPaginatedQuery('CSWMS_wmwhse_ORDERS', options);
}

// Order Detail specific queries
function buildOrderDetailCountQuery(options = {}) {
  return buildCountQuery('CSWMS_wmwhse_ORDERDETAIL', options);
}

function buildOrderDetailPaginatedQuery(options = {}) {
  return buildPaginatedQuery('CSWMS_wmwhse_ORDERDETAIL', options);
}

module.exports = {
  buildReceiptCountQuery,
  buildReceiptPaginatedQuery,
  buildReceiptDetailCountQuery,
  buildReceiptDetailPaginatedQuery,
  buildOrdersCountQuery,
  buildOrdersPaginatedQuery,
  buildOrderDetailCountQuery,
  buildOrderDetailPaginatedQuery
};

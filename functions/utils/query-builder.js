// DataFabric Query Builder
// Builds SQL queries for the DataFabric API

/**
 * Build a SQL query for the taskdetail table
 * @param {Object} options - Query options
 * @param {string} options.whseid - Warehouse ID to filter by (optional)
 * @param {string} options.startDate - Start date for filtering (optional)
 * @param {string} options.endDate - End date for filtering (optional)
 * @param {string} options.taskType - Task type to filter by (optional)
 * @param {number} options.limit - Maximum number of records to return (optional)
 * @returns {string} - SQL query
 */
function buildTaskdetailQuery(options = {}) {
  // Default options
  const defaults = {
    whseid: null,
    startDate: null,
    endDate: null,
    taskType: null,
    limit: 1000
  };
  
  // Merge options with defaults
  const queryOptions = { ...defaults, ...options };
  
  // Start building the query
  let query = 'SELECT * FROM "CSWMS_wmwhse_TASKDETAIL"';
  
  // Build WHERE clause
  const conditions = [];
  
  // Add warehouse filter
  if (queryOptions.whseid) {
    conditions.push(`WHSEID = '${queryOptions.whseid}'`);
  }
  
  // Add date range filter
  if (queryOptions.startDate) {
    conditions.push(`ADDDATE >= '${queryOptions.startDate}'`);
  }
  
  if (queryOptions.endDate) {
    conditions.push(`ADDDATE <= '${queryOptions.endDate}'`);
  }
  
  // Add task type filter
  if (queryOptions.taskType) {
    conditions.push(`TASKTYPE = '${queryOptions.taskType}'`);
  }
  
  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add LIMIT clause
  if (queryOptions.limit) {
    query += ` LIMIT ${queryOptions.limit}`;
  }
  
  return query;
}

/**
 * Build a SQL query to count taskdetail records
 * @param {Object} options - Query options
 * @param {string} options.whseid - Warehouse ID to filter by (optional)
 * @param {string} options.startDate - Start date for filtering (optional)
 * @param {string} options.endDate - End date for filtering (optional)
 * @param {string} options.taskType - Task type to filter by (optional)
 * @returns {string} - SQL query
 */
function buildTaskdetailCountQuery(options = {}) {
  // Default options
  const defaults = {
    whseid: null,
    startDate: null,
    endDate: null,
    taskType: null
  };
  
  // Merge options with defaults
  const queryOptions = { ...defaults, ...options };
  
  // Start building the query
  let query = 'SELECT COUNT(*) AS count FROM "CSWMS_wmwhse_TASKDETAIL"';
  
  // Build WHERE clause
  const conditions = [];
  
  // Add warehouse filter
  if (queryOptions.whseid) {
    conditions.push(`WHSEID = '${queryOptions.whseid}'`);
  }
  
  // Add date range filter
  if (queryOptions.startDate) {
    conditions.push(`ADDDATE >= '${queryOptions.startDate}'`);
  }
  
  if (queryOptions.endDate) {
    conditions.push(`ADDDATE <= '${queryOptions.endDate}'`);
  }
  
  // Add task type filter
  if (queryOptions.taskType) {
    conditions.push(`TASKTYPE = '${queryOptions.taskType}'`);
  }
  
  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  return query;
}

/**
 * Build a SQL query for the taskdetail table with pagination
 * @param {Object} options - Query options
 * @param {string} options.whseid - Warehouse ID to filter by (optional)
 * @param {string} options.startDate - Start date for filtering (optional)
 * @param {string} options.endDate - End date for filtering (optional)
 * @param {string} options.taskType - Task type to filter by (optional)
 * @param {number} options.offset - Offset for pagination (optional)
 * @param {number} options.limit - Maximum number of records to return (optional)
 * @returns {string} - SQL query
 */
function buildTaskdetailPaginatedQuery(options = {}) {
  // Default options
  const defaults = {
    whseid: null,
    startDate: null,
    endDate: null,
    taskType: null,
    offset: 0,
    limit: 1000
  };
  
  // Merge options with defaults
  const queryOptions = { ...defaults, ...options };
  
  // Start building the query
  let query = 'SELECT * FROM "CSWMS_wmwhse_TASKDETAIL"';
  
  // Build WHERE clause
  const conditions = [];
  
  // Add warehouse filter
  if (queryOptions.whseid) {
    conditions.push(`WHSEID = '${queryOptions.whseid}'`);
  }
  
  // Add date range filter
  if (queryOptions.startDate) {
    conditions.push(`ADDDATE >= '${queryOptions.startDate}'`);
  }
  
  if (queryOptions.endDate) {
    conditions.push(`ADDDATE <= '${queryOptions.endDate}'`);
  }
  
  // Add task type filter
  if (queryOptions.taskType) {
    conditions.push(`TASKTYPE = '${queryOptions.taskType}'`);
  }
  
  // Add WHERE clause if conditions exist
  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  
  // Add ORDER BY clause for consistent pagination
  query += ' ORDER BY SERIALKEY';
  
  // Add LIMIT and OFFSET clauses
  query += ` LIMIT ${queryOptions.limit} OFFSET ${queryOptions.offset}`;
  
  return query;
}

/**
 * Build a SQL query to get the latest taskdetail record
 * @param {Object} options - Query options
 * @param {string} options.whseid - Warehouse ID to filter by (optional)
 * @returns {string} - SQL query
 */
function buildLatestTaskdetailQuery(options = {}) {
  // Default options
  const defaults = {
    whseid: null
  };
  
  // Merge options with defaults
  const queryOptions = { ...defaults, ...options };
  
  // Start building the query
  let query = 'SELECT * FROM "CSWMS_wmwhse_TASKDETAIL"';
  
  // Add warehouse filter
  if (queryOptions.whseid) {
    query += ` WHERE WHSEID = '${queryOptions.whseid}'`;
  }
  
  // Add ORDER BY clause to get the latest record
  query += ' ORDER BY ADDDATE DESC LIMIT 1';
  
  return query;
}

module.exports = {
  buildTaskdetailQuery,
  buildTaskdetailCountQuery,
  buildTaskdetailPaginatedQuery,
  buildLatestTaskdetailQuery
};

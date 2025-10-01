/**
 * Query Builder Utility
 * Generates SQL queries for DataFabric
 */

/**
 * Build SQL query for TaskDetail with pagination
 * @param {number} offset - Starting offset (0-based)
 * @param {number} limit - Number of records to retrieve
 * @param {string} whseid - Warehouse ID
 * @returns {string} SQL query
 */
function buildTaskDetailQuery(offset, limit, whseid = 'wmwhse') {
  return `
    SELECT *
    FROM (
      SELECT 
        *,
        ROW_NUMBER() OVER (ORDER BY TASKDETAILKEY) AS row_num
      FROM 
        "CSWMS_${whseid}_TASKDETAIL"
    ) AS numbered_rows
    WHERE row_num BETWEEN ${offset + 1} AND ${offset + limit}
  `;
}

/**
 * Build SQL query to count total TaskDetail records
 * @param {string} whseid - Warehouse ID
 * @returns {string} SQL query
 */
function buildTaskDetailCountQuery(whseid = 'wmwhse') {
  return `
    SELECT COUNT(*) as count
    FROM "CSWMS_${whseid}_TASKDETAIL"
  `;
}

module.exports = {
  buildTaskDetailQuery,
  buildTaskDetailCountQuery
};

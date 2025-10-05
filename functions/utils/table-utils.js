// Utility functions for table operations

/**
 * Extract table name from SQL query
 * @param {string} sqlQuery - SQL query
 * @returns {string|null} - Table name or null if not found
 */
function extractTableNameFromSQL(sqlQuery) {
  if (!sqlQuery) return null;
  
  // Convert to uppercase for case-insensitive matching
  const upperQuery = sqlQuery.toUpperCase();
  
  // Look for FROM clause
  const fromMatch = upperQuery.match(/FROM\s+["']?([^"'\s,)]+)["']?/i);
  if (fromMatch && fromMatch[1]) {
    // Clean up the table name (remove quotes, etc.)
    let tableName = fromMatch[1].replace(/["']/g, '');
    
    // If it's a fully qualified name (schema.table), get just the table part
    if (tableName.includes('.')) {
      tableName = tableName.split('.').pop();
    }
    
    return tableName;
  }
  
  return null;
}

/**
 * Generate MongoDB schema from column definitions
 * @param {Array} columns - Column definitions from job status API
 * @returns {Object} - MongoDB schema definition
 */
function generateMongoDBSchema(columns) {
  if (!columns || !Array.isArray(columns) || columns.length === 0) {
    return {};
  }
  
  const schema = {};
  
  columns.forEach(column => {
    const fieldName = column.name;
    let fieldType;
    
    // Map SQL data types to MongoDB/Mongoose types
    switch ((column.datatype || '').toLowerCase()) {
      case 'varchar':
      case 'char':
      case 'text':
      case 'string':
        fieldType = String;
        break;
      case 'int':
      case 'integer':
      case 'smallint':
      case 'tinyint':
      case 'bigint':
        fieldType = Number;
        break;
      case 'float':
      case 'double':
      case 'decimal':
      case 'numeric':
        fieldType = Number;
        break;
      case 'date':
      case 'datetime':
      case 'timestamp':
        fieldType = Date;
        break;
      case 'boolean':
      case 'bit':
        fieldType = Boolean;
        break;
      default:
        // Default to mixed type for unknown data types
        fieldType = require('mongoose').Schema.Types.Mixed;
    }
    
    schema[fieldName] = fieldType;
  });
  
  return schema;
}

/**
 * Identify primary key fields from column definitions and sample record
 * @param {Array} columns - Column definitions from job status API
 * @param {Object} sampleRecord - Sample record to verify field existence
 * @returns {Array} - Array of primary key field names
 */
function identifyPrimaryKeyFields(columns, sampleRecord = null) {
  if (!columns || !Array.isArray(columns)) {
    return ['_id']; // Default to MongoDB's _id
  }
  
  // Get all available field names from the sample record if provided
  const availableFields = sampleRecord ? Object.keys(sampleRecord) : [];
  
  // First try to find exact primary key matches
  const exactPkMatches = columns.filter(col => {
    const name = (col.name || '').toUpperCase();
    return (name === 'ID' || name === 'KEY' || name === 'PK' || name.endsWith('KEY') || name.endsWith('ID')) &&
           (!sampleRecord || availableFields.includes(col.name));
  }).map(col => col.name);
  
  if (exactPkMatches.length > 0) {
    console.log(`Found exact primary key matches: ${exactPkMatches.join(', ')}`);
    return exactPkMatches;
  }
  
  // Then look for common primary key field patterns
  const potentialPkFields = columns.filter(col => {
    const name = (col.name || '').toUpperCase();
    return (name.includes('KEY') || name.includes('ID') || name.endsWith('PK')) &&
           (!sampleRecord || availableFields.includes(col.name));
  }).map(col => col.name);
  
  // If we found potential PK fields, use them
  if (potentialPkFields.length > 0) {
    console.log(`Found potential primary key fields: ${potentialPkFields.join(', ')}`);
    return potentialPkFields;
  }
  
  // If we have a sample record but no PK fields found, use the first field as a fallback
  if (sampleRecord && availableFields.length > 0) {
    console.log(`No primary key fields found, using first available field: ${availableFields[0]}`);
    return [availableFields[0]];
  }
  
  // Otherwise, return MongoDB's default _id
  console.log('No suitable primary key fields found, using MongoDB _id');
  return ['_id'];
}

module.exports = {
  extractTableNameFromSQL,
  generateMongoDBSchema,
  identifyPrimaryKeyFields
};

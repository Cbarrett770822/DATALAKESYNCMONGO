// Validation Helper Utility
// Provides validation functions for sync operations

/**
 * Validate sync options
 * @param {Object} options - Sync options to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateSyncOptions(options) {
  const errors = [];
  
  // Check if options is an object
  if (!options || typeof options !== 'object') {
    return {
      isValid: false,
      errors: ['Sync options must be an object']
    };
  }
  
  // Validate tableId
  if (options.tableId) {
    const validTableIds = ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail'];
    if (!validTableIds.includes(options.tableId)) {
      errors.push(`Invalid tableId: ${options.tableId}. Must be one of: ${validTableIds.join(', ')}`);
    }
  }
  
  // Validate whseid
  if (options.whseid && typeof options.whseid !== 'string') {
    errors.push('whseid must be a string');
  }
  
  // Validate date strings
  if (options.startDate) {
    if (!isValidDateString(options.startDate)) {
      errors.push('startDate must be a valid ISO date string');
    }
  }
  
  if (options.endDate) {
    if (!isValidDateString(options.endDate)) {
      errors.push('endDate must be a valid ISO date string');
    }
  }
  
  // Validate numeric fields
  if (options.batchSize !== undefined) {
    if (!isValidPositiveInteger(options.batchSize)) {
      errors.push('batchSize must be a positive integer');
    }
  }
  
  if (options.maxRecords !== undefined) {
    if (!isValidPositiveInteger(options.maxRecords)) {
      errors.push('maxRecords must be a positive integer');
    }
  }
  
  if (options.syncFrequency !== undefined) {
    if (!isValidPositiveInteger(options.syncFrequency)) {
      errors.push('syncFrequency must be a positive integer');
    }
  }
  
  // Validate boolean fields
  if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  
  if (options.initialSync !== undefined && typeof options.initialSync !== 'boolean') {
    errors.push('initialSync must be a boolean');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate sync config
 * @param {Object} config - Sync config to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateSyncConfig(config) {
  const errors = [];
  
  // Check if config is an object
  if (!config || typeof config !== 'object') {
    return {
      isValid: false,
      errors: ['Sync config must be an object']
    };
  }
  
  // Validate required fields
  if (!config.tableId) {
    errors.push('tableId is required');
  }
  
  if (!config.tableName) {
    errors.push('tableName is required');
  }
  
  // Validate tableId
  if (config.tableId) {
    const validTableIds = ['taskdetail', 'receipt', 'receiptdetail', 'orders', 'orderdetail'];
    if (!validTableIds.includes(config.tableId)) {
      errors.push(`Invalid tableId: ${config.tableId}. Must be one of: ${validTableIds.join(', ')}`);
    }
  }
  
  // Validate numeric fields
  if (config.batchSize !== undefined) {
    if (!isValidPositiveInteger(config.batchSize)) {
      errors.push('batchSize must be a positive integer');
    }
  }
  
  if (config.maxRecords !== undefined) {
    if (!isValidPositiveInteger(config.maxRecords)) {
      errors.push('maxRecords must be a positive integer');
    }
  }
  
  if (config.syncFrequency !== undefined) {
    if (!isValidPositiveInteger(config.syncFrequency)) {
      errors.push('syncFrequency must be a positive integer');
    }
  }
  
  // Validate boolean fields
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push('enabled must be a boolean');
  }
  
  if (config.initialSync !== undefined && typeof config.initialSync !== 'boolean') {
    errors.push('initialSync must be a boolean');
  }
  
  // Validate options
  if (config.options && typeof config.options !== 'object') {
    errors.push('options must be an object');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if a value is a valid positive integer
 * @param {any} value - Value to check
 * @returns {boolean} - Whether the value is a valid positive integer
 */
function isValidPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

/**
 * Check if a string is a valid ISO date string
 * @param {string} dateString - Date string to check
 * @returns {boolean} - Whether the string is a valid ISO date
 */
function isValidDateString(dateString) {
  if (typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Sanitize sync options
 * @param {Object} options - Sync options to sanitize
 * @returns {Object} - Sanitized sync options
 */
function sanitizeSyncOptions(options) {
  const sanitized = { ...options };
  
  // Convert string numbers to actual numbers
  if (sanitized.batchSize && typeof sanitized.batchSize === 'string') {
    sanitized.batchSize = parseInt(sanitized.batchSize, 10);
  }
  
  if (sanitized.maxRecords && typeof sanitized.maxRecords === 'string') {
    sanitized.maxRecords = parseInt(sanitized.maxRecords, 10);
  }
  
  if (sanitized.syncFrequency && typeof sanitized.syncFrequency === 'string') {
    sanitized.syncFrequency = parseInt(sanitized.syncFrequency, 10);
  }
  
  // Convert string booleans to actual booleans
  if (sanitized.enabled !== undefined) {
    if (sanitized.enabled === 'true') sanitized.enabled = true;
    if (sanitized.enabled === 'false') sanitized.enabled = false;
  }
  
  if (sanitized.initialSync !== undefined) {
    if (sanitized.initialSync === 'true') sanitized.initialSync = true;
    if (sanitized.initialSync === 'false') sanitized.initialSync = false;
  }
  
  return sanitized;
}

module.exports = {
  validateSyncOptions,
  validateSyncConfig,
  sanitizeSyncOptions,
  isValidPositiveInteger,
  isValidDateString
};

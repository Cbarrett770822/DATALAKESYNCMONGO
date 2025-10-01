/**
 * Enhanced logger for consistent logging across functions
 */

const logger = {
  info: (message) => console.log(message),
  error: (message) => console.error(message),
  warn: (message) => console.warn(message),
  debug: (message) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] ${message}`);
    }
  }
};

module.exports = logger;

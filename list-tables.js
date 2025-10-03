/**
 * Script to list available tables in the DataFabric API
 */

const ionApi = require('./functions/utils/ion-api');

// Simple logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  success: (message) => console.log(`[SUCCESS] ${message}`),
};

async function listTables() {
  logger.info('Attempting to list available tables in DataFabric...');
  
  try {
    // Try a simple query to get table information
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      LIMIT 100
    `;
    
    logger.info(`Submitting query: ${query}`);
    const response = await ionApi.submitQuery(query);
    
    if (!response || !response.queryId && !response.id) {
      logger.error('Invalid response from ION API');
      return;
    }
    
    const queryId = response.queryId || response.id;
    logger.info(`Query ID: ${queryId}`);
    
    // Wait for query to complete
    logger.info('Checking query status...');
    let queryStatus = await ionApi.checkStatus(queryId);
    let attempts = 1;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && 
           queryStatus.status !== 'completed' && 
           queryStatus.status !== 'COMPLETED' && 
           queryStatus.status !== 'FINISHED' &&
           queryStatus.status !== 'failed' && 
           queryStatus.status !== 'FAILED') {
      logger.info(`Query status: ${queryStatus.status}, waiting 1 second... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      queryStatus = await ionApi.checkStatus(queryId);
      attempts++;
    }
    
    if (queryStatus.status === 'failed' || queryStatus.status === 'FAILED') {
      logger.error(`Query failed with status: ${queryStatus.status}`);
      logger.info('Trying alternative approach...');
      
      // Try an alternative query format
      const altQuery = `
        SHOW TABLES
      `;
      
      logger.info(`Submitting alternative query: ${altQuery}`);
      const altResponse = await ionApi.submitQuery(altQuery);
      
      if (!altResponse || !altResponse.queryId && !altResponse.id) {
        logger.error('Invalid response from ION API for alternative query');
        return;
      }
      
      const altQueryId = altResponse.queryId || altResponse.id;
      logger.info(`Alternative query ID: ${altQueryId}`);
      
      // Wait for alternative query to complete
      let altQueryStatus = await ionApi.checkStatus(altQueryId);
      attempts = 1;
      
      while (attempts < maxAttempts && 
             altQueryStatus.status !== 'completed' && 
             altQueryStatus.status !== 'COMPLETED' && 
             altQueryStatus.status !== 'FINISHED' &&
             altQueryStatus.status !== 'failed' && 
             altQueryStatus.status !== 'FAILED') {
        logger.info(`Alternative query status: ${altQueryStatus.status}, waiting 1 second... (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        altQueryStatus = await ionApi.checkStatus(altQueryId);
        attempts++;
      }
      
      if (altQueryStatus.status === 'failed' || altQueryStatus.status === 'FAILED') {
        logger.error(`Alternative query also failed with status: ${altQueryStatus.status}`);
        logger.info('Trying a third approach...');
        
        // Try a third query format
        const thirdQuery = `
          SELECT name FROM sys.tables
        `;
        
        logger.info(`Submitting third query: ${thirdQuery}`);
        const thirdResponse = await ionApi.submitQuery(thirdQuery);
        
        if (!thirdResponse || !thirdResponse.queryId && !thirdResponse.id) {
          logger.error('Invalid response from ION API for third query');
          return;
        }
        
        const thirdQueryId = thirdResponse.queryId || thirdResponse.id;
        logger.info(`Third query ID: ${thirdQueryId}`);
        
        // Wait for third query to complete
        let thirdQueryStatus = await ionApi.checkStatus(thirdQueryId);
        attempts = 1;
        
        while (attempts < maxAttempts && 
               thirdQueryStatus.status !== 'completed' && 
               thirdQueryStatus.status !== 'COMPLETED' && 
               thirdQueryStatus.status !== 'FINISHED' &&
               thirdQueryStatus.status !== 'failed' && 
               thirdQueryStatus.status !== 'FAILED') {
          logger.info(`Third query status: ${thirdQueryStatus.status}, waiting 1 second... (attempt ${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          thirdQueryStatus = await ionApi.checkStatus(thirdQueryId);
          attempts++;
        }
        
        if (thirdQueryStatus.status === 'failed' || thirdQueryStatus.status === 'FAILED') {
          logger.error(`All table listing approaches failed. Please check API documentation for the correct syntax.`);
        } else {
          // Get results
          const thirdResults = await ionApi.getResults(thirdQueryId);
          logger.success(`Tables found using third approach: ${JSON.stringify(thirdResults, null, 2)}`);
        }
      } else {
        // Get results
        const altResults = await ionApi.getResults(altQueryId);
        logger.success(`Tables found using alternative approach: ${JSON.stringify(altResults, null, 2)}`);
      }
    } else {
      // Get results
      const results = await ionApi.getResults(queryId);
      logger.success(`Tables found: ${JSON.stringify(results, null, 2)}`);
    }
  } catch (error) {
    logger.error(`Error listing tables: ${error.message}`);
  }
}

// Run the function
listTables().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

/**
 * Wait for query completion
 */
async function waitForQueryCompletion(ionApi, queryId, maxAttempts = 30, interval = 2000) {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    const status = await ionApi.checkStatus(queryId);
    const currentStatus = status.status?.toUpperCase();
    
    if (['COMPLETED', 'FINISHED', 'DONE'].includes(currentStatus)) {
      return status;
    }
    
    if (currentStatus === 'FAILED') {
      throw new Error(`Query failed: ${status.message || 'Unknown error'}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Query timed out after ${maxAttempts} attempts`);
}

module.exports = { waitForQueryCompletion };

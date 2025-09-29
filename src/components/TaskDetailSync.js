import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TaskDetailSync.css';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8888/.netlify/functions';

// Logger utility
const logger = {
  info: (message, data) => {
    console.log(`%c[TaskDetailSync][INFO] ${message}`, 'color: #2196f3; font-weight: bold;', data || '');
  },
  success: (message, data) => {
    console.log(`%c[TaskDetailSync][SUCCESS] ${message}`, 'color: #4caf50; font-weight: bold;', data || '');
  },
  warn: (message, data) => {
    console.warn(`%c[TaskDetailSync][WARNING] ${message}`, 'color: #ff9800; font-weight: bold;', data || '');
  },
  error: (message, data) => {
    console.error(`%c[TaskDetailSync][ERROR] ${message}`, 'color: #f44336; font-weight: bold;', data || '');
  },
  api: (method, url, data) => {
    console.log(
      `%c[TaskDetailSync][API] ${method} ${url}`, 
      'color: #9c27b0; font-weight: bold;', 
      data || ''
    );
  },
  response: (url, status, data) => {
    console.log(
      `%c[TaskDetailSync][RESPONSE] ${url} (${status})`, 
      'color: #009688; font-weight: bold;', 
      data || ''
    );
  },
  performance: (label, durationMs) => {
    console.log(
      `%c[TaskDetailSync][PERFORMANCE] ${label}: ${durationMs.toFixed(2)}ms`, 
      'color: #ff5722; font-weight: bold;'
    );
  },
  networkTiming: (url, timingInfo) => {
    console.log(
      `%c[TaskDetailSync][NETWORK] ${url}`, 
      'color: #795548; font-weight: bold;',
      timingInfo
    );
  }
};

// Performance monitoring wrapper for API calls
const monitorApiCall = async (method, url, options = {}) => {
  const startTime = performance.now();
  const requestStartTime = new Date().toISOString();
  
  logger.api(method, url, options.data);
  
  try {
    // Create a unique ID for this request for tracking
    const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Record navigation timing if available
    const navStart = performance.timing ? performance.timing.navigationStart : 0;
    const relativeStartTime = navStart ? (startTime - navStart) : 0;
    
    logger.info(`API call started [${requestId}]`, {
      method,
      url,
      startTime: requestStartTime,
      relativeStartTime: `${relativeStartTime.toFixed(2)}ms since navigation`
    });
    
    // Make the actual API call
    let response;
    if (method.toUpperCase() === 'GET') {
      response = await axios.get(url, options);
    } else if (method.toUpperCase() === 'POST') {
      response = await axios.post(url, options.data, options);
    } else if (method.toUpperCase() === 'PUT') {
      response = await axios.put(url, options.data, options);
    } else if (method.toUpperCase() === 'DELETE') {
      response = await axios.delete(url, options);
    } else {
      throw new Error(`Unsupported method: ${method}`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log response and timing information
    logger.response(url, response.status, response.data);
    logger.performance(`${method} ${url}`, duration);
    
    // More detailed network timing if supported by browser
    if (window.performance && window.performance.getEntriesByType) {
      try {
        const resourceEntries = window.performance.getEntriesByType('resource');
        const thisRequest = resourceEntries.find(entry => entry.name.includes(url.split('?')[0]));
        
        if (thisRequest) {
          logger.networkTiming(url, {
            dnsLookup: thisRequest.domainLookupEnd - thisRequest.domainLookupStart,
            tcpHandshake: thisRequest.connectEnd - thisRequest.connectStart,
            requestTime: thisRequest.responseStart - thisRequest.requestStart,
            responseTime: thisRequest.responseEnd - thisRequest.responseStart,
            totalTime: thisRequest.duration,
            details: thisRequest
          });
        }
      } catch (timingError) {
        logger.warn('Could not capture detailed timing information', timingError);
      }
    }
    
    return response;
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    logger.error(`API call failed: ${method} ${url} (${duration.toFixed(2)}ms)`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw error;
  }
};

// TaskDetail sync component
const TaskDetailSync = () => {
  // State variables
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [syncConfig, setSyncConfig] = useState(null);

  // Fetch sync configuration on component mount
  useEffect(() => {
    logger.info('Component mounted - Initializing data');
    fetchSyncConfig();
    fetchSyncHistory();
    
    // Log component unmount
    return () => {
      logger.info('Component unmounted');
    };
  }, []);

  // Fetch sync configuration
  const fetchSyncConfig = async () => {
    const endpoint = `${API_BASE_URL}/sync-config?tableId=taskdetail`;
    logger.info('Fetching sync configuration');
    
    try {
      setLoading(true);
      const response = await monitorApiCall('GET', endpoint);
      
      logger.success('Sync config fetched successfully');
      setSyncConfig(response.data);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch sync configuration', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError('Failed to fetch sync configuration');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sync history
  const fetchSyncHistory = async () => {
    const endpoint = `${API_BASE_URL}/sync-history?tableId=taskdetail&limit=5`;
    logger.info('Fetching sync history');
    
    try {
      setLoading(true);
      const response = await monitorApiCall('GET', endpoint);
      
      logger.success('Sync history fetched successfully');
      logger.info(`Retrieved ${response.data.length} history records`);
      
      setSyncHistory(response.data);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch sync history', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError('Failed to fetch sync history');
    } finally {
      setLoading(false);
    }
  };

  // Start sync process
  const startSync = async () => {
    logger.info('Starting TaskDetail sync process');
    
    try {
      setSyncing(true);
      setError(null);
      setSyncStatus({
        status: 'starting',
        message: 'Starting TaskDetail sync...'
      });
      
      logger.info('Preparing sync options');
      // Prepare sync options
      const syncOptions = {
        tableId: 'taskdetail',
        whseid: syncConfig?.options?.whseid || 'wmwhse1',
        batchSize: syncConfig?.batchSize || 100,
        maxRecords: syncConfig?.maxRecords || 1000
      };
      
      logger.info('Sync options prepared', syncOptions);
      
      // Start sync
      const endpoint = `${API_BASE_URL}/sync-table`;
      const response = await monitorApiCall('POST', endpoint, { data: syncOptions });
      
      // Get job ID
      const jobId = response.data.jobId;
      logger.info(`Received job ID: ${jobId}`);
      
      setSyncStatus({
        status: 'in_progress',
        message: 'Sync in progress...',
        jobId: jobId
      });
      
      // Poll for status
      logger.info('Starting status polling');
      pollSyncStatus(jobId);
    } catch (err) {
      logger.error('Failed to start sync', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data
      });
      setError(err.response?.data?.message || 'Failed to start sync');
      setSyncing(false);
      setSyncStatus(null);
    }
  };

  // Poll sync status
  const pollSyncStatus = async (jobId) => {
    const endpoint = `${API_BASE_URL}/sync-status?jobId=${jobId}`;
    logger.info(`Polling sync status for job ${jobId}`);
    
    try {
      const response = await monitorApiCall('GET', endpoint);
      
      const job = response.data.job;
      const history = response.data.history;
      
      // Calculate progress percentage
      let progressPercent = 0;
      if (job.stats && job.stats.totalRecords > 0) {
        progressPercent = Math.round((job.stats.processedRecords / job.stats.totalRecords) * 100);
      }
      
      logger.info(`Current status: ${job.status.toUpperCase()}, Progress: ${progressPercent}%`, {
        jobId,
        status: job.status,
        progress: progressPercent
      });
      
      // Log detailed stats if available
      if (job.stats) {
        logger.info('Sync progress stats', {
          totalRecords: job.stats.totalRecords,
          processedRecords: job.stats.processedRecords,
          insertedRecords: job.stats.insertedRecords,
          updatedRecords: job.stats.updatedRecords,
          errorRecords: job.stats.errorRecords,
          duration: job.stats.duration ? `${job.stats.duration.toFixed(2)}s` : 'N/A'
        });
      }

      // Update status
      setSyncStatus({
        status: job.status,
        message: getStatusMessage(job.status),
        jobId: jobId,
        stats: job.stats,
        history: history
      });

      // If still in progress, poll again
      if (job.status === 'in_progress' || job.status === 'pending') {
        logger.info(`Job still in progress, polling again in 3 seconds`);
        setTimeout(() => pollSyncStatus(jobId), 3000);
      } else {
        // Sync completed or failed
        if (job.status === 'completed') {
          logger.success('Sync completed successfully', job.stats);
        } else if (job.status === 'failed') {
          logger.error('Sync failed', { error: job.error, stats: job.stats });
        }
        
        setSyncing(false);
        // Refresh sync history
        logger.info('Refreshing sync history after job completion');
        fetchSyncHistory();
      }
    } catch (err) {
      logger.error('Error polling sync status', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        jobId
      });
      setError('Failed to get sync status');
      setSyncing(false);
    }
  };

  // Get status message
  const getStatusMessage = (status) => {
    let message;
    switch (status) {
      case 'completed':
        message = 'Sync completed successfully';
        break;
      case 'failed':
        message = 'Sync failed';
        break;
      case 'in_progress':
        message = 'Sync in progress...';
        break;
      case 'pending':
        message = 'Sync pending...';
        break;
      default:
        message = 'Unknown status';
    }
    
    logger.info(`Status message for '${status}': ${message}`);
    return message;
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!syncStatus?.stats) {
      logger.info('Cannot calculate progress: No stats available');
      return 0;
    }
    
    const { totalRecords, processedRecords } = syncStatus.stats;
    
    if (!totalRecords || totalRecords === 0) {
      logger.info('Cannot calculate progress: Total records is zero or undefined');
      return 0;
    }
    
    const progress = Math.round((processedRecords / totalRecords) * 100);
    logger.info(`Progress calculation: ${processedRecords}/${totalRecords} = ${progress}%`);
    return progress;
  };

  // Log render state
  React.useEffect(() => {
    if (syncStatus) {
      logger.info('Rendering with sync status', {
        status: syncStatus.status,
        jobId: syncStatus.jobId,
        hasStats: !!syncStatus.stats,
        progress: syncStatus.stats ? calculateProgress() : 'N/A'
      });
    }
  }, [syncStatus]);
  
  React.useEffect(() => {
    if (error) {
      logger.warn('Rendering with error state', { error });
    }
  }, [error]);
  
  // Log when sync config changes
  React.useEffect(() => {
    if (syncConfig) {
      logger.info('Sync configuration loaded', {
        whseid: syncConfig.options?.whseid,
        batchSize: syncConfig.batchSize,
        maxRecords: syncConfig.maxRecords,
        lastSyncDate: syncConfig.lastSyncDate
      });
    }
  }, [syncConfig]);

  // Log UI interactions
  const handleSyncClick = () => {
    logger.info('Sync button clicked');
    startSync();
  };
  
  const handleRefreshClick = () => {
    logger.info('Refresh button clicked');
    fetchSyncConfig();
    fetchSyncHistory();
  };
  
  return (
    <div className="task-detail-sync">
      <h2>TaskDetail Synchronization</h2>
      {error && <div className="error-message">{error}</div>}
      
      <div className="sync-config">
        <h3>Configuration</h3>
        {loading ? (
          <p>Loading configuration...</p>
        ) : syncConfig ? (
          <div>
            <p>Warehouse ID: {syncConfig.options?.whseid || 'N/A'}</p>
            <p>Batch Size: {syncConfig.batchSize || 'N/A'}</p>
            <p>Max Records: {syncConfig.maxRecords || 'N/A'}</p>
            <p>Last Sync: {syncConfig.lastSyncDate ? new Date(syncConfig.lastSyncDate).toLocaleString() : 'Never'}</p>
            <p>Last Status: {syncConfig.lastSyncStatus || 'N/A'}</p>
          </div>
        ) : (
          <p>No configuration available</p>
        )}
      </div>
      
      {/* Sync Status */}
      {syncStatus && (
        <div className="sync-status">
          <h3>Sync Status</h3>
          <div className={`status-badge ${syncStatus.status}`}>
            {syncStatus.status.toUpperCase()}
          </div>
          <p>{syncStatus.message}</p>
          
          {syncStatus.stats && (
            <div className="sync-stats">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${calculateProgress()}%` }}
                ></div>
                <span>{calculateProgress()}%</span>
              </div>
              
              <div className="stats-details">
                <p>Total Records: {syncStatus.stats.totalRecords || 0}</p>
                <p>Processed: {syncStatus.stats.processedRecords || 0}</p>
                <p>Inserted: {syncStatus.stats.insertedRecords || 0}</p>
                <p>Updated: {syncStatus.stats.updatedRecords || 0}</p>
                <p>Errors: {syncStatus.stats.errorRecords || 0}</p>
                {syncStatus.stats.duration && (
                  <p>Duration: {syncStatus.stats.duration.toFixed(2)} seconds</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Sync History */}
      <div className="sync-history">
        <h3>Sync History</h3>
        {syncHistory && syncHistory.length > 0 ? (
          <ul>
            {syncHistory.map((item) => (
              <li key={item._id} className={`history-item ${item.status}`}>
                <span className="history-date">
                  {new Date(item.startTime).toLocaleString()}
                </span>
                <span className="history-status">{item.status}</span>
                <span className="history-records">
                  {item.recordsProcessed} records
                </span>
                {item.error && (
                  <span className="history-error">{item.error}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p>No sync history available</p>
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="action-buttons">
        <button 
          className="sync-button"
          onClick={handleSyncClick} 
          disabled={syncing || loading}
        >
          {syncing ? 'Syncing...' : 'Start Sync'}
        </button>
        
        <button
          className="refresh-button"
          onClick={handleRefreshClick}
          disabled={loading || syncing}
        >
          Refresh
        </button>
      </div>
    </div>
  );
};

export default TaskDetailSync;

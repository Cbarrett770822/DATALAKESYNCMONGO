import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DataSync.css';
import {
  Box, Typography, Card, CardContent, Button, LinearProgress, 
  Alert, Grid, List, ListItem, ListItemText, Paper
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';

// API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8888/.netlify/functions';

// Logger utility
const logger = {
  info: (message, data) => console.log(`%c[DataSync][INFO] ${message}`, 'color: #2196f3; font-weight: bold;', data || ''),
  success: (message, data) => console.log(`%c[DataSync][SUCCESS] ${message}`, 'color: #4caf50; font-weight: bold;', data || ''),
  warn: (message, data) => console.warn(`%c[DataSync][WARNING] ${message}`, 'color: #ff9800; font-weight: bold;', data || ''),
  error: (message, data) => console.error(`%c[DataSync][ERROR] ${message}`, 'color: #f44336; font-weight: bold;', data || ''),
  api: (method, url, data) => console.log(`%c[DataSync][API] ${method} ${url}`, 'color: #9c27b0; font-weight: bold;', data || '')
};

const DataSync = () => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [error, setError] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);

  useEffect(() => {
    logger.info('Component mounted - Initializing data');
    fetchSyncHistory();
    return () => logger.info('Component unmounted');
  }, []);

  // Fetch sync history
  const fetchSyncHistory = async () => {
    logger.info('Fetching sync history');
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/sync-history?tableId=taskdetail&limit=5`);
      logger.success('Sync history fetched successfully');
      setSyncHistory(response.data);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch sync history', err);
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
      setSyncStatus({ status: 'starting', message: 'Starting TaskDetail sync...' });
      
      const syncOptions = { tableId: 'taskdetail', whseid: 'wmwhse1' };
      logger.api('POST', `${API_BASE_URL}/sync-table`, syncOptions);
      
      const response = await axios.post(`${API_BASE_URL}/sync-table`, syncOptions);
      const jobId = response.data.jobId;
      
      setSyncStatus({ status: 'in_progress', message: 'Sync in progress...', jobId });
      pollSyncStatus(jobId);
    } catch (err) {
      logger.error('Failed to start sync', err);
      setError('Failed to start sync');
      setSyncing(false);
      setSyncStatus(null);
    }
  };

  // Poll sync status
  const pollSyncStatus = async (jobId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sync-status?jobId=${jobId}`);
      const job = response.data.job;
      
      setSyncStatus({
        status: job.status,
        message: getStatusMessage(job.status),
        jobId,
        stats: job.stats
      });

      if (job.status === 'in_progress' || job.status === 'pending') {
        setTimeout(() => pollSyncStatus(jobId), 3000);
      } else {
        setSyncing(false);
        fetchSyncHistory();
      }
    } catch (err) {
      logger.error('Error polling sync status', err);
      setError('Failed to get sync status');
      setSyncing(false);
    }
  };

  // Get status message
  const getStatusMessage = (status) => {
    switch (status) {
      case 'completed': return 'Sync completed successfully';
      case 'failed': return 'Sync failed';
      case 'in_progress': return 'Sync in progress...';
      case 'pending': return 'Sync pending...';
      default: return 'Unknown status';
    }
  };

  // Calculate progress percentage
  const calculateProgress = () => {
    if (!syncStatus?.stats) return 0;
    const { totalRecords, processedRecords } = syncStatus.stats;
    if (!totalRecords || totalRecords === 0) return 0;
    return Math.round((processedRecords / totalRecords) * 100);
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>TaskDetail Synchronization</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Sync Status */}
      {syncStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">Current Sync Status: {syncStatus.status.toUpperCase()}</Typography>
            <Typography>{syncStatus.message}</Typography>
            
            {syncStatus.stats && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={calculateProgress()} sx={{ height: 10, borderRadius: 5 }} />
                <Typography align="center" sx={{ mt: 1 }}>{calculateProgress()}%</Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2">Total: {syncStatus.stats.totalRecords || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2">Processed: {syncStatus.stats.processedRecords || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2">Inserted: {syncStatus.stats.insertedRecords || 0}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="body2">Updated: {syncStatus.stats.updatedRecords || 0}</Typography>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Sync History */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Sync History</Typography>
        {syncHistory && syncHistory.length > 0 ? (
          <List>
            {syncHistory.map((item) => (
              <ListItem key={item._id} divider>
                <ListItemText
                  primary={`${new Date(item.startTime).toLocaleString()} - ${item.status.toUpperCase()}`}
                  secondary={`Records: ${item.recordsProcessed || 0} | Duration: ${item.duration ? item.duration.toFixed(2) + 's' : 'N/A'}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography>No sync history available</Typography>
        )}
      </Paper>
      
      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          onClick={startSync}
          disabled={syncing || loading}
        >
          {syncing ? 'Syncing...' : 'Start TaskDetail Sync'}
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchSyncHistory}
          disabled={loading || syncing}
        >
          Refresh History
        </Button>
      </Box>
    </Box>
  );
};

export default DataSync;

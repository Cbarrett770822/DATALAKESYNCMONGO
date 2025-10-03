import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, LinearProgress, 
  Alert, Grid, Paper, Card, CardContent,
  TextField, MenuItem, FormControl, InputLabel, Select,
  Divider, Stack
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

// API base URL
const API_BASE_URL = '/.netlify/functions';

// Logger utility
const logger = {
  info: (message) => console.log(`[DataCopy][INFO] ${message}`),
  error: (message) => console.error(`[DataCopy][ERROR] ${message}`),
  warn: (message) => console.warn(`[DataCopy][WARNING] ${message}`),
  api: (method, url) => console.log(`[DataCopy][API] ${method} ${url}`)
};

// Task types for dropdown
const taskTypes = [
  { value: 'PICK', label: 'Pick' },
  { value: 'PACK', label: 'Pack' },
  { value: 'PUT', label: 'Put' },
  { value: 'REPLEN', label: 'Replenishment' },
  { value: 'COUNT', label: 'Count' },
  { value: 'MOVE', label: 'Move' }
];

// Generate years for dropdown (last 5 years)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Warehouse IDs
const warehouseIds = [
  { value: 'wmwhse1', label: 'Warehouse 1' },
  { value: 'wmwhse2', label: 'Warehouse 2' },
  { value: 'wmwhse3', label: 'Warehouse 3' },
  { value: 'wmwhse4', label: 'Warehouse 4' },
  { value: 'wmwhse', label: 'Default Warehouse' }
];

const DataCopy = () => {
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter states
  const [warehouseId, setWarehouseId] = useState('wmwhse');
  const [year, setYear] = useState('');
  const [taskType, setTaskType] = useState('');

  // Start copy process
  const startCopy = async () => {
    logger.info('Starting TaskDetail copy process');
    
    // Generate a client-side job ID that will be consistent
    // Moved outside try block to be accessible in catch block
    const clientJobId = `job_${Date.now()}`;
    logger.info(`Generated client-side job ID: ${clientJobId}`);
    
    try {
      setCopying(true);
      setError(null);
      setCopyStatus({ status: 'starting', message: 'Starting TaskDetail copy...' });
      
      // Add a warning if using year filter
      if (year) {
        logger.warn('Year filtering may not be supported by all SQL dialects. If the query fails, please try without year filtering.');
      }
      
      const copyOptions = { 
        whseid: warehouseId,
        clientJobId: clientJobId, // Pass the client job ID to the backend
        // Add filter parameters
        year: year || null,
        taskType: taskType || null
      };
      
      logger.info(`Using filters: Warehouse=${warehouseId}, Year=${year || 'All'}, TaskType=${taskType || 'All'}`);
      logger.api('POST', `${API_BASE_URL}/copy-taskdetail`);
      
      // For background functions, the initial response will come back quickly
      // with a jobId, even though processing continues on the server
      const response = await axios.post(`${API_BASE_URL}/copy-taskdetail`, copyOptions, {
        // Increase timeout for the initial request
        timeout: 30000
      });
      
      // Check if we have a job ID in the response
      const jobId = response.data.jobId || `job_${Date.now()}`;
      
      // Update status with whatever information we have
      setCopyStatus({
        status: 'in_progress',
        message: 'Copy started as background process. This may take several minutes...',
        jobId,
        processedRecords: 0,
        totalRecords: response.data.totalRecords || 0,
        percentComplete: 0,
        ...(response.data.progress || {})
      });
      
      // Start polling for status updates
      setTimeout(() => pollCopyStatus(jobId), 5000);
    } catch (err) {
      // Check if this is a 504 timeout which is expected for background functions
      if (err.response && err.response.status === 504) {
        // This is actually expected for background functions
        logger.info('Function started as background process (504 expected)');
        
        // Use the client-generated job ID we already sent to the server
        logger.info(`Using client-generated job ID: ${clientJobId}`);
        
        setCopyStatus({
          status: 'in_progress',
          message: 'Copy started as background process. This may take several minutes...',
          jobId: clientJobId,
          processedRecords: 0,
          percentComplete: 0
        });
        
        // Start polling for status after a delay
        setTimeout(() => pollCopyStatus(clientJobId), 10000);
      } else {
        // This is an actual error
        logger.error('Failed to start copy: ' + (err.message || 'Unknown error'));
        
        // Check for specific error types and provide more helpful messages
        let errorMessage = `Failed to start copy: ${err.message || 'Unknown error'}`;
        
        // Check for SQL syntax errors
        if (err.message && err.message.toLowerCase().includes('syntax')) {
          errorMessage = 'SQL syntax error in the query. This might be due to incompatible filtering options. Try without year filtering.';
        }
        // Check for authentication errors
        else if (err.message && (err.message.toLowerCase().includes('auth') || err.message.toLowerCase().includes('token'))) {
          errorMessage = 'Authentication error. Please check your ION API credentials.';
        }
        // Check for connection errors
        else if (err.message && (err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('connect'))) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        
        setError(errorMessage);
        setCopying(false);
        setCopyStatus(null);
      }
    }
  };

  // Poll copy status
  const pollCopyStatus = async (jobId) => {
    try {
      // Use the simple-status endpoint instead of check-copy-status
      const response = await axios.get(`${API_BASE_URL}/simple-status?jobId=${jobId}`);
      const job = response.data.job;
      
      // Calculate percentage complete based on the data we have
      let percentComplete = job.percentComplete || 0;
      
      // If we have processed records and total records, calculate percentage
      // This is a fallback in case the server doesn't provide percentComplete
      if (job.processedRecords > 0 && job.totalRecords > 0) {
        const calculatedPercent = Math.round((job.processedRecords / job.totalRecords) * 100);
        // Use the calculated percentage if it's valid and the server didn't provide one
        if (calculatedPercent >= 0 && calculatedPercent <= 100 && !job.percentComplete) {
          percentComplete = calculatedPercent;
        }
      }
      
      // If job is completed, always show 100%
      if (job.status === 'completed') {
        percentComplete = 100;
      }
      
      // Log detailed status information
      logger.info(`Job status update: ${job.status}, processed: ${job.processedRecords}, total: ${job.totalRecords}, percent: ${percentComplete}%`);
      
      setCopyStatus({
        status: job.status,
        message: getStatusMessage(job.status),
        jobId,
        processedRecords: job.processedRecords,
        insertedRecords: job.insertedRecords,
        updatedRecords: job.updatedRecords,
        errorRecords: job.errorRecords,
        totalRecords: job.totalRecords,
        percentComplete: percentComplete
      });

      if (job.status === 'in_progress' || job.status === 'pending' || job.status === 'not_found') {
        // Continue polling for these statuses
        const pollDelay = job.status === 'not_found' ? 5000 : 3000; // Longer delay for not_found
        setTimeout(() => pollCopyStatus(jobId), pollDelay);
      } else {
        // For completed or failed status, stop polling
        setCopying(false);
      }
    } catch (err) {
      logger.error('Error polling copy status');
      setError('Failed to get copy status');
      setCopying(false);
    }
  };

  // Get status message
  const getStatusMessage = (status) => {
    switch (status) {
      case 'completed': return 'Copy completed successfully';
      case 'failed': return 'Copy failed';
      case 'in_progress': return 'Copy in progress...';
      case 'pending': return 'Copy pending...';
      case 'not_found': return 'Waiting for job to start...';
      default: return 'Unknown status';
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>TaskDetail Data Copy</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Copy Status */}
      {copyStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6">Status: {copyStatus.status.toUpperCase()}</Typography>
            <Typography>{copyStatus.message}</Typography>
            
            {copyStatus.processedRecords !== undefined && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={copyStatus.percentComplete || 0} 
                  sx={{ height: 10, borderRadius: 5 }}
                />
                <Typography align="center" sx={{ mt: 1 }}>
                  {copyStatus.percentComplete || 0}%
                </Typography>
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">{copyStatus.processedRecords || 0}</Typography>
                      <Typography variant="body2">Processed</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">{(copyStatus.insertedRecords || 0) + (copyStatus.upsertedRecords || 0)}</Typography>
                      <Typography variant="body2">Inserted/Upserted</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">{copyStatus.totalRecords || 'Unknown'}</Typography>
                      <Typography variant="body2">Total Records</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center', bgcolor: copyStatus.status === 'completed' ? '#e8f5e9' : 'inherit' }}>
                      <Typography variant="h6">{copyStatus.percentComplete || 0}%</Typography>
                      <Typography variant="body2">Complete</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Filter Options */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Filter Options</Typography>
          <Grid container spacing={2}>
            {/* Warehouse ID Filter */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="warehouse-select-label">Warehouse</InputLabel>
                <Select
                  labelId="warehouse-select-label"
                  id="warehouse-select"
                  value={warehouseId}
                  label="Warehouse"
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={copying}
                >
                  {warehouseIds.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Year Filter */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="year-select-label">Year</InputLabel>
                <Select
                  labelId="year-select-label"
                  id="year-select"
                  value={year}
                  label="Year"
                  onChange={(e) => setYear(e.target.value)}
                  disabled={copying}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {/* Task Type Filter */}
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel id="task-type-select-label">Task Type</InputLabel>
                <Select
                  labelId="task-type-select-label"
                  id="task-type-select"
                  value={taskType}
                  label="Task Type"
                  onChange={(e) => setTaskType(e.target.value)}
                  disabled={copying}
                >
                  <MenuItem value="">All Task Types</MenuItem>
                  {taskTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Action Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<CloudDownloadIcon />}
        onClick={startCopy}
        disabled={copying}
        sx={{ mt: 2 }}
      >
        {copying ? 'Copying...' : 'Copy TaskDetail Data'}
      </Button>
    </Box>
  );
};

export default DataCopy;

import React, { useState } from 'react';
import axios from 'axios';
import {
  Box, Typography, Button, LinearProgress, 
  Alert, Grid, Paper, Card, CardContent
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

// API base URL
const API_BASE_URL = '/.netlify/functions';

// Logger utility
const logger = {
  info: (message) => console.log(`[DataCopy][INFO] ${message}`),
  error: (message) => console.error(`[DataCopy][ERROR] ${message}`),
  api: (method, url) => console.log(`[DataCopy][API] ${method} ${url}`)
};

const DataCopy = () => {
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [error, setError] = useState(null);

  // Start copy process
  const startCopy = async () => {
    logger.info('Starting TaskDetail copy process');
    try {
      setCopying(true);
      setError(null);
      setCopyStatus({ status: 'starting', message: 'Starting TaskDetail copy...' });
      
      const copyOptions = { whseid: 'wmwhse1' };
      logger.api('POST', `${API_BASE_URL}/copy-taskdetail`);
      
      const response = await axios.post(`${API_BASE_URL}/copy-taskdetail`, copyOptions);
      const jobId = response.data.jobId;
      
      setCopyStatus({
        status: 'in_progress',
        message: 'Copy in progress...',
        jobId,
        ...(response.data.progress || {})
      });
      
      pollCopyStatus(jobId);
    } catch (err) {
      logger.error('Failed to start copy');
      setError('Failed to start copy');
      setCopying(false);
      setCopyStatus(null);
    }
  };

  // Poll copy status
  const pollCopyStatus = async (jobId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/check-copy-status?jobId=${jobId}`);
      const job = response.data.job;
      
      setCopyStatus({
        status: job.status,
        message: getStatusMessage(job.status),
        jobId,
        processedRecords: job.processedRecords,
        insertedRecords: job.insertedRecords,
        updatedRecords: job.updatedRecords,
        errorRecords: job.errorRecords,
        percentComplete: job.percentComplete
      });

      if (job.status === 'in_progress' || job.status === 'pending') {
        setTimeout(() => pollCopyStatus(jobId), 3000);
      } else {
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
                      <Typography variant="h6">{copyStatus.insertedRecords || 0}</Typography>
                      <Typography variant="body2">Inserted</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Action Button */}
      <Button
        variant="contained"
        color="primary"
        startIcon={<CloudDownloadIcon />}
        onClick={startCopy}
        disabled={copying}
      >
        {copying ? 'Copying...' : 'Copy TaskDetail Data'}
      </Button>
    </Box>
  );
};

export default DataCopy;

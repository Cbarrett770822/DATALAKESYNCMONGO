import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Grid, 
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { submitQuery, checkStatus, getResults } from '../utils/api';

function ApiTester() {
  // State for SQL query
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM wmwhse_taskdetail.taskdetail LIMIT 10');
  
  // State for API responses
  const [tokenStatus, setTokenStatus] = useState({ loading: false, success: false, error: null });
  const [queryStatus, setQueryStatus] = useState({ loading: false, success: false, error: null, queryId: null });
  const [jobStatus, setJobStatus] = useState({ loading: false, status: null, progress: 0, error: null });
  const [resultsStatus, setResultsStatus] = useState({ loading: false, success: false, error: null, data: null });
  
  // State for polling
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Handle SQL query change
  const handleSqlQueryChange = (event) => {
    setSqlQuery(event.target.value);
  };

  // Submit query
  const handleSubmitQuery = async () => {
    try {
      // Reset states
      setQueryStatus({ loading: true, success: false, error: null, queryId: null });
      setJobStatus({ loading: false, status: null, progress: 0, error: null });
      setResultsStatus({ loading: false, success: false, error: null, data: null });
      
      // Stop any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setIsPolling(false);
      }
      
      // Submit query
      const response = await submitQuery(sqlQuery);
      
      // Update query status
      setQueryStatus({
        loading: false,
        success: true,
        error: null,
        queryId: response.queryId
      });
      
      // Start polling for status
      startPolling(response.queryId);
    } catch (error) {
      console.error('Error submitting query:', error);
      setQueryStatus({
        loading: false,
        success: false,
        error: error.message || 'Failed to submit query',
        queryId: null
      });
    }
  };

  // Start polling for job status
  const startPolling = (queryId) => {
    setIsPolling(true);
    setJobStatus({ loading: true, status: 'pending', progress: 0, error: null });
    
    const interval = setInterval(async () => {
      try {
        const statusResponse = await checkStatus(queryId);
        
        setJobStatus({
          loading: true,
          status: statusResponse.status,
          progress: statusResponse.progress || 0,
          error: null
        });
        
        // If job is completed or failed, stop polling
        if (statusResponse.status === 'completed' || statusResponse.status === 'failed') {
          clearInterval(interval);
          setIsPolling(false);
          setJobStatus(prev => ({ ...prev, loading: false }));
          
          // If completed, fetch results
          if (statusResponse.status === 'completed') {
            fetchResults(queryId);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        setJobStatus({
          loading: false,
          status: 'error',
          progress: 0,
          error: error.message || 'Failed to check status'
        });
        
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 2000); // Check every 2 seconds
    
    setPollingInterval(interval);
  };

  // Fetch results
  const fetchResults = async (queryId) => {
    try {
      setResultsStatus({ loading: true, success: false, error: null, data: null });
      
      const resultsResponse = await getResults(queryId);
      
      setResultsStatus({
        loading: false,
        success: true,
        error: null,
        data: resultsResponse
      });
    } catch (error) {
      console.error('Error fetching results:', error);
      setResultsStatus({
        loading: false,
        success: false,
        error: error.message || 'Failed to fetch results',
        data: null
      });
    }
  };

  // Cancel polling
  const handleCancelPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setIsPolling(false);
      setJobStatus(prev => ({ ...prev, loading: false }));
    }
  };

  // Format JSON for display
  const formatJson = (json) => {
    try {
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return 'Error formatting JSON';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        API Tester
      </Typography>
      <Typography variant="body1" paragraph>
        Use this tool to test the DataFabric API integration. Enter a SQL query and submit it to verify that the token acquisition, query submission, job monitoring, and result retrieval are working correctly.
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          SQL Query
        </Typography>
        <TextField
          label="SQL Query"
          value={sqlQuery}
          onChange={handleSqlQueryChange}
          multiline
          rows={4}
          fullWidth
          variant="outlined"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            variant="contained"
            onClick={handleSubmitQuery}
            disabled={queryStatus.loading || isPolling}
          >
            {queryStatus.loading ? <CircularProgress size={24} /> : 'Submit Query'}
          </Button>
          {isPolling && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleCancelPolling}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Query Submission Status */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Step 1: Query Submission
                {queryStatus.loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
                {queryStatus.success && <span style={{ color: 'green', marginLeft: '8px' }}>✓</span>}
                {queryStatus.error && <span style={{ color: 'red', marginLeft: '8px' }}>✗</span>}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {queryStatus.error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {queryStatus.error}
                </Alert>
              ) : queryStatus.success ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Query submitted successfully! Query ID: {queryStatus.queryId}
                </Alert>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Submit a query to see the results here.
                </Typography>
              )}
              
              {queryStatus.queryId && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Query ID:</Typography>
                  <Paper sx={{ p: 1, bgcolor: '#f5f5f5' }}>
                    <Typography variant="body2" component="code">
                      {queryStatus.queryId}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Job Status */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={!!queryStatus.queryId}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Step 2: Job Status
                {jobStatus.loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
                {jobStatus.status === 'completed' && <span style={{ color: 'green', marginLeft: '8px' }}>✓</span>}
                {jobStatus.status === 'failed' && <span style={{ color: 'red', marginLeft: '8px' }}>✗</span>}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {jobStatus.error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {jobStatus.error}
                </Alert>
              ) : jobStatus.status ? (
                <>
                  <Alert 
                    severity={
                      jobStatus.status === 'completed' ? 'success' : 
                      jobStatus.status === 'failed' ? 'error' : 
                      'info'
                    } 
                    sx={{ mb: 2 }}
                  >
                    Job Status: {jobStatus.status.toUpperCase()}
                  </Alert>
                  
                  {jobStatus.status !== 'completed' && jobStatus.status !== 'failed' && (
                    <Box sx={{ width: '100%', mt: 2 }}>
                      <LinearProgress 
                        variant="determinate" 
                        value={jobStatus.progress} 
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                      <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                        {jobStatus.progress}% Complete
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Submit a query to see job status here.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Results */}
        <Grid item xs={12}>
          <Accordion defaultExpanded={!!resultsStatus.data}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Step 3: Results
                {resultsStatus.loading && <CircularProgress size={20} sx={{ ml: 2 }} />}
                {resultsStatus.success && <span style={{ color: 'green', marginLeft: '8px' }}>✓</span>}
                {resultsStatus.error && <span style={{ color: 'red', marginLeft: '8px' }}>✗</span>}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {resultsStatus.error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {resultsStatus.error}
                </Alert>
              ) : resultsStatus.data ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Retrieved {resultsStatus.data.results?.length || 0} records successfully!
                  </Alert>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">Result Statistics:</Typography>
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6">{resultsStatus.data.total || 0}</Typography>
                          <Typography variant="body2">Total Records</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6">{resultsStatus.data.offset || 0}</Typography>
                          <Typography variant="body2">Offset</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6">{resultsStatus.data.limit || 0}</Typography>
                          <Typography variant="body2">Limit</Typography>
                        </Paper>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="h6">{resultsStatus.data.results?.length || 0}</Typography>
                          <Typography variant="body2">Retrieved</Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2">Results Data:</Typography>
                    <Paper 
                      sx={{ 
                        p: 2, 
                        bgcolor: '#272822', 
                        color: '#f8f8f2',
                        maxHeight: '400px',
                        overflow: 'auto'
                      }}
                    >
                      <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.875rem' }}>
                        {formatJson(resultsStatus.data.results)}
                      </pre>
                    </Paper>
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Complete the query process to see results here.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Raw Response */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Raw Response Data
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle2" gutterBottom>Query Response:</Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: '#f5f5f5',
                  maxHeight: '200px',
                  overflow: 'auto',
                  mb: 2
                }}
              >
                <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.875rem' }}>
                  {formatJson(queryStatus.success ? { queryId: queryStatus.queryId } : null)}
                </pre>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>Job Status Response:</Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: '#f5f5f5',
                  maxHeight: '200px',
                  overflow: 'auto',
                  mb: 2
                }}
              >
                <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.875rem' }}>
                  {formatJson(jobStatus.status ? { 
                    status: jobStatus.status,
                    progress: jobStatus.progress
                  } : null)}
                </pre>
              </Paper>
              
              <Typography variant="subtitle2" gutterBottom>Results Response:</Typography>
              <Paper 
                sx={{ 
                  p: 2, 
                  bgcolor: '#f5f5f5',
                  maxHeight: '200px',
                  overflow: 'auto'
                }}
              >
                <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.875rem' }}>
                  {formatJson(resultsStatus.data)}
                </pre>
              </Paper>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
}

export default ApiTester;

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
import { submitQuery, checkQueryStatus as checkStatus, getQueryResults as getResults } from '../utils/api';

function ApiTester() {
  // State for SQL query
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM "CSWMS_wmwhse_TASKDETAIL" LIMIT 1');
  
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
      
      // Extract detailed error information
      const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to submit query';
      const statusCode = error.response?.status || 'Unknown';
      
      setQueryStatus({
        loading: false,
        success: false,
        error: `API Error (${statusCode}): ${errorDetails}`,
        queryId: null,
        rawError: error
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
        
        // Convert status to uppercase for case-insensitive comparison
        const status = (statusResponse.status || '').toUpperCase();
        console.log(`Current job status: "${status}" (original: "${statusResponse.status}")`);
        
        // Check if job is completed, finished, or failed
        const isCompleted = ['COMPLETED', 'FINISHED', 'DONE'].includes(status);
        const isFailed = status === 'FAILED';
        
        // If job is completed, finished, or failed, stop polling
        if (isCompleted || isFailed) {
          clearInterval(interval);
          setIsPolling(false);
          setJobStatus(prev => ({ ...prev, loading: false }));
          
          // If completed or finished, fetch results
          if (isCompleted) {
            console.log(`Job completed with status: ${statusResponse.status}, fetching results...`);
            fetchResults(queryId);
          }
        }
      } catch (error) {
        console.error('Error checking status:', error);
        
        // Extract detailed error information
        const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to check status';
        const statusCode = error.response?.status || 'Unknown';
        
        setJobStatus({
          loading: false,
          status: 'error',
          progress: 0,
          error: `API Error (${statusCode}): ${errorDetails}`,
          rawError: error
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
      console.log('Results response received:', resultsResponse);
      
      // Check if we have data in the response
      if (resultsResponse) {
        // If we have columns from the status response, use them
        if (resultsResponse.columns && resultsResponse.columns.length > 0) {
          console.log(`Found ${resultsResponse.columns.length} columns in the response`);
        }
        
        // If we have rows but they're empty, check if we have data in the status response
        if (resultsResponse.rows && resultsResponse.rows.length === 0 && resultsResponse.fromStatus) {
          console.log('No rows in results, but we have metadata from status');
        }
        
        // Create a standardized response format
        const standardizedResponse = {
          queryId: queryId,
          total: resultsResponse.total || resultsResponse.rowCount || 0,
          offset: resultsResponse.offset || 0,
          limit: resultsResponse.limit || 1000,
          columns: resultsResponse.columns || [],
          // Handle different result formats
          results: resultsResponse.rows || resultsResponse.results || [],
          // Add additional metadata
          location: resultsResponse.location || null,
          fromStatus: resultsResponse.fromStatus || false,
          message: resultsResponse.message || null
        };
        
        console.log('Standardized response:', standardizedResponse);
        
        setResultsStatus({
          loading: false,
          success: true,
          error: null,
          data: standardizedResponse
        });
      } else {
        // Handle empty response
        setResultsStatus({
          loading: false,
          success: true,
          error: null,
          data: {
            queryId: queryId,
            total: 0,
            offset: 0,
            limit: 1000,
            columns: [],
            results: [],
            message: 'No results returned from API'
          }
        });
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      
      // Extract detailed error information
      const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to fetch results';
      const statusCode = error.response?.status || 'Unknown';
      
      setResultsStatus({
        loading: false,
        success: false,
        error: `API Error (${statusCode}): ${errorDetails}`,
        data: null,
        rawError: error
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
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {queryStatus.error}
                  </Alert>
                  {queryStatus.rawError && queryStatus.rawError.response && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Response Details:</Typography>
                      <Paper sx={{ p: 1, bgcolor: '#f5f5f5', maxHeight: '200px', overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}>
                          {formatJson(queryStatus.rawError.response.data)}
                        </pre>
                      </Paper>
                    </Box>
                  )}
                </>
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
                {(jobStatus.status === 'completed' || jobStatus.status === 'COMPLETED' || 
                  jobStatus.status === 'finished' || jobStatus.status === 'FINISHED') && 
                  <span style={{ color: 'green', marginLeft: '8px' }}>✓</span>
                }
                {(jobStatus.status === 'failed' || jobStatus.status === 'FAILED') && 
                  <span style={{ color: 'red', marginLeft: '8px' }}>✗</span>
                }
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {jobStatus.error ? (
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {jobStatus.error}
                  </Alert>
                  {jobStatus.rawError && jobStatus.rawError.response && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Response Details:</Typography>
                      <Paper sx={{ p: 1, bgcolor: '#f5f5f5', maxHeight: '200px', overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}>
                          {formatJson(jobStatus.rawError.response.data)}
                        </pre>
                      </Paper>
                    </Box>
                  )}
                </>
              ) : jobStatus.status ? (
                <>
                  <Alert 
                    severity={
                      jobStatus.status?.toLowerCase() === 'completed' || jobStatus.status?.toLowerCase() === 'finished' ? 'success' : 
                      jobStatus.status?.toLowerCase() === 'failed' ? 'error' : 
                      'info'
                    } 
                    sx={{ mb: 2 }}
                  >
                    Job Status: {jobStatus.status?.toUpperCase()}
                  </Alert>
                  
                  {!['completed', 'finished', 'failed', 'COMPLETED', 'FINISHED', 'FAILED'].includes(jobStatus.status) && (
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
                <>
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {resultsStatus.error}
                  </Alert>
                  {resultsStatus.rawError && resultsStatus.rawError.response && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Response Details:</Typography>
                      <Paper sx={{ p: 1, bgcolor: '#f5f5f5', maxHeight: '200px', overflow: 'auto' }}>
                        <pre style={{ margin: 0, fontFamily: '"Roboto Mono", monospace', fontSize: '0.75rem' }}>
                          {formatJson(resultsStatus.rawError.response.data)}
                        </pre>
                      </Paper>
                    </Box>
                  )}
                </>
              ) : resultsStatus.data ? (
                <>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    {resultsStatus.data.results?.length > 0 ? 
                      `Retrieved ${resultsStatus.data.results.length} records successfully!` : 
                      resultsStatus.data.columns?.length > 0 ? 
                        `Query completed successfully! Retrieved column definitions for ${resultsStatus.data.columns.length} columns.` :
                        'Query completed successfully!'
                    }
                    {resultsStatus.data.appliedClientLimit && 
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        <strong>Note:</strong> Client-side limit applied. {resultsStatus.data.message || 
                          `Showing ${resultsStatus.data.results?.length} of ${resultsStatus.data.total} total records.`}
                      </Typography>
                    }
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
                    
                    {resultsStatus.data.columns && resultsStatus.data.columns.length > 0 && (
                      <>
                        <Typography variant="subtitle2" sx={{ mt: 2 }}>Column Definitions:</Typography>
                        <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '200px', overflow: 'auto', mb: 2 }}>
                          <Grid container spacing={1}>
                            {resultsStatus.data.columns.slice(0, 20).map((column, index) => (
                              <Grid item xs={6} sm={4} md={3} key={index}>
                                <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column' }}>
                                  <Typography variant="body2" fontWeight="bold">{column.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{column.datatype}</Typography>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                          {resultsStatus.data.columns.length > 20 && (
                            <Typography variant="caption" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                              Showing 20 of {resultsStatus.data.columns.length} columns
                            </Typography>
                          )}
                        </Paper>
                      </>
                    )}
                    
                    <Divider sx={{ my: 2 }} />
                    
                    <Typography variant="subtitle2">Results Data:</Typography>
                    {resultsStatus.data.results && resultsStatus.data.results.length > 0 ? (
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
                    ) : (
                      <Paper sx={{ p: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          {resultsStatus.data.message || 'No results returned from the query.'}
                          {resultsStatus.data.fromStatus && ' Results metadata was retrieved from the status response.'}
                        </Typography>
                        {resultsStatus.data.columns && resultsStatus.data.columns.length > 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            The query returned column definitions but no rows. This could be because the query matched no records.
                          </Typography>
                        )}
                      </Paper>
                    )}
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

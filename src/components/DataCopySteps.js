import React, { useState } from 'react';
import { 
  Box, Typography, Button, Grid, Card, CardContent, CardHeader,
  Stepper, Step, StepLabel, StepContent, FormControl, InputLabel, Select, MenuItem,
  TextField, LinearProgress, Alert, CircularProgress, Divider, Chip
} from '@mui/material';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { submitQuery, checkQueryStatus, getQueryResults, pushToMongoDB } from '../utils/api';

// Task types for dropdown
const taskTypes = [
  { value: 'PK', label: 'Pick (PK)' },
  { value: 'PP', label: 'Pack (PP)' },
  { value: 'PA', label: 'Put Away (PA)' },
  { value: 'CC', label: 'Cycle Count (CC)' },
  { value: 'LD', label: 'Load (LD)' },
  { value: 'TD', label: 'Task Detail (TD)' },
  { value: 'RC', label: 'Receive (RC)' }
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
  { value: 'all', label: 'All Warehouses' }
];

function DataCopySteps() {
  // Active step in the process
  const [activeStep, setActiveStep] = useState(0);
  
  // Filter states
  const [warehouseId, setWarehouseId] = useState('wmwhse1');
  const [year, setYear] = useState('');
  const [taskType, setTaskType] = useState('');
  
  // Pagination states
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(100);
  
  // Process states
  const [queryStatus, setQueryStatus] = useState({ loading: false, success: false, error: null, queryId: null });
  const [jobStatus, setJobStatus] = useState({ loading: false, status: null, progress: 0, error: null });
  const [resultsStatus, setResultsStatus] = useState({ loading: false, success: false, error: null, data: null });
  const [mongoDbStatus, setMongoDbStatus] = useState({ 
    loading: false, success: false, error: null, stats: null,
    progress: 0, processingChunks: false, currentChunk: 0, totalChunks: 0
  });
  
  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState(null);
  
  // Generated SQL query
  const [generatedSql, setGeneratedSql] = useState('');
  
  // Track which steps are expanded
  const [expandedSteps, setExpandedSteps] = useState([0]); // Start with first step expanded
  
  // Handle step expansion toggle
  const handleStepToggle = (step) => {
    setExpandedSteps(prev => {
      if (prev.includes(step)) {
        return prev.filter(s => s !== step);
      } else {
        return [...prev, step];
      }
    });
  };
  
  // Handle form changes
  const handleWarehouseChange = (event) => setWarehouseId(event.target.value);
  const handleYearChange = (event) => setYear(event.target.value);
  const handleTaskTypeChange = (event) => setTaskType(event.target.value);
  const handleOffsetChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setOffset(isNaN(value) ? 0 : Math.max(0, value));
  };
  const handleLimitChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setLimit(isNaN(value) ? 100 : Math.max(1, value));
  };
  
  // Generate SQL query based on filters
  const generateSqlQuery = () => {
    // Use the correct table name
    let tableName = warehouseId === 'all' 
      ? 'CSWMS_wmwhse_TASKDETAIL' 
      : `CSWMS_${warehouseId}_TASKDETAIL`;
    
    // Create a simple base query
    let sql = `SELECT * FROM "${tableName}"`;
    
    // Add WHERE clause if filters are applied
    const conditions = [];
    if (taskType) conditions.push(`TASKTYPE = '${taskType}'`);
    if (year) conditions.push(`EXTRACT(YEAR FROM ADDDATE) = ${year}`);
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add ORDER BY clause
    sql += ` ORDER BY ADDDATE DESC`;
    
    setGeneratedSql(sql);
    return sql;
  };
  
  // Step 1: Submit query to DataFabric
  const handleSubmitQuery = async () => {
    try {
      // Reset states
      setQueryStatus({ loading: true, success: false, error: null, queryId: null });
      setJobStatus({ loading: false, status: null, progress: 0, error: null });
      setResultsStatus({ loading: false, success: false, error: null, data: null });
      setMongoDbStatus({
        loading: false, success: false, error: null, stats: null,
        progress: 0, processingChunks: false, currentChunk: 0, totalChunks: 0
      });
      
      // Stop any existing polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setIsPolling(false);
      }
      
      // Generate SQL query
      const sqlQuery = generateSqlQuery();
      
      // Submit query with pagination parameters handled by the API
      const response = await submitQuery({
        sqlQuery,
        offset: offset,  // These will be handled by the DataFabric API
        limit: limit
      });
      
      // Update query status
      setQueryStatus({
        loading: false,
        success: true,
        error: null,
        queryId: response.queryId
      });
      
      // Move to next step and ensure it's expanded
      const nextStep = 1;
      setActiveStep(nextStep);
      setExpandedSteps(prev => {
        if (!prev.includes(nextStep)) {
          return [...prev, nextStep];
        }
        return prev;
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
        const statusResponse = await checkQueryStatus(queryId);
        
        setJobStatus({
          loading: true,
          status: statusResponse.status,
          progress: statusResponse.progress || 0,
          error: null
        });
        
        // Convert status to uppercase for case-insensitive comparison
        const status = (statusResponse.status || '').toUpperCase();
        
        // Check if job is completed, finished, or failed
        const isCompleted = ['COMPLETED', 'FINISHED', 'DONE'].includes(status);
        const isFailed = status === 'FAILED';
        
        if (isCompleted || isFailed) {
          clearInterval(interval);
          setIsPolling(false);
          setJobStatus(prev => ({ ...prev, loading: false }));
          
          if (isCompleted) {
            fetchResults(queryId);
          }
        }
      } catch (error) {
        console.error('Error checking query status:', error);
        
        const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to check query status';
        const statusCode = error.response?.status || 'Unknown';
        
        setJobStatus({
          loading: false,
          status: 'error',
          progress: 0,
          error: `API Error (${statusCode}): ${errorDetails}`
        });
        
        clearInterval(interval);
        setIsPolling(false);
      }
    }, 3000);
    
    setPollingInterval(interval);
  };
  
  // Step 2: Fetch query results
  const fetchResults = async (queryId) => {
    try {
      setResultsStatus({ loading: true, success: false, error: null, data: null });
      
      const response = await getQueryResults(queryId);
      
      setResultsStatus({
        loading: false,
        success: true,
        error: null,
        data: response
      });
      
      // Move to next step and ensure it's expanded
      const nextStep = 2;
      setActiveStep(nextStep);
      setExpandedSteps(prev => prev.includes(nextStep) ? prev : [...prev, nextStep]);
    } catch (error) {
      console.error('Error fetching results:', error);
      
      const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to fetch results';
      const statusCode = error.response?.status || 'Unknown';
      
      setResultsStatus({
        loading: false,
        success: false,
        error: `API Error (${statusCode}): ${errorDetails}`,
        data: null
      });
    }
  };
  
  // Step 3: Push results to MongoDB
  const handlePushToMongoDB = async () => {
    if (!resultsStatus.data || !resultsStatus.data.results) {
      setMongoDbStatus({
        loading: false,
        success: false,
        error: 'No results available to push to MongoDB',
        stats: null
      });
      return;
    }
    
    try {
      const records = resultsStatus.data.results;
      const totalRecords = records.length;
      
      const CHUNK_SIZE = 50;
      const needsChunking = totalRecords > CHUNK_SIZE;
      const totalChunks = needsChunking ? Math.ceil(totalRecords / CHUNK_SIZE) : 1;
      
      setMongoDbStatus({
        loading: true,
        success: false,
        error: null,
        stats: null,
        progress: 0,
        processingChunks: needsChunking,
        currentChunk: 0,
        totalChunks: totalChunks
      });
      
      // Extract table information from results
      const tableInfo = {
        // Try to extract table name from SQL query
        sqlQuery: generatedSql,
        // Pass column definitions from results
        columns: resultsStatus.data.columns || [],
      };
      
      console.log('Pushing data to MongoDB with table info:', tableInfo);
      
      // Push data to MongoDB
      const response = await pushToMongoDB(records, tableInfo);
      
      setMongoDbStatus({
        loading: false,
        success: true,
        error: null,
        stats: response.stats,
        progress: 100,
        processingChunks: false,
        currentChunk: totalChunks,
        totalChunks: totalChunks
      });
      
      // Move to next step and ensure it's expanded
      const nextStep = 3;
      setActiveStep(nextStep);
      setExpandedSteps(prev => prev.includes(nextStep) ? prev : [...prev, nextStep]);
    } catch (error) {
      console.error('Error pushing to MongoDB:', error);
      
      // Extract detailed error information
      const errorDetails = error.response?.data?.details || error.response?.data?.error || error.message || 'Failed to push to MongoDB';
      const statusCode = error.response?.status || 'Unknown';
      
      setMongoDbStatus({
        loading: false,
        success: false,
        error: `API Error (${statusCode}): ${errorDetails}`,
        stats: null,
        progress: 0,
        processingChunks: false,
        currentChunk: 0,
        totalChunks: 0
      });
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Copy
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" paragraph>
        Copy data from DataFabric to MongoDB in a step-by-step process
      </Typography>
      
      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 4 }} nonLinear>
        {/* Step 1: Configure and Submit Query */}
        <Step expanded={expandedSteps.includes(0)}>
          <StepLabel onClick={() => handleStepToggle(0)} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">Configure and Submit Query</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader title="Filter Options" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="warehouse-label">Warehouse</InputLabel>
                      <Select
                        labelId="warehouse-label"
                        value={warehouseId}
                        onChange={handleWarehouseChange}
                        label="Warehouse"
                        disabled={queryStatus.loading}
                      >
                        {warehouseIds.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="year-label">Year</InputLabel>
                      <Select
                        labelId="year-label"
                        value={year}
                        onChange={handleYearChange}
                        label="Year"
                        disabled={queryStatus.loading}
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
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel id="task-type-label">Task Type</InputLabel>
                      <Select
                        labelId="task-type-label"
                        value={taskType}
                        onChange={handleTaskTypeChange}
                        label="Task Type"
                        disabled={queryStatus.loading}
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
            
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader title="Pagination Options" />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Offset"
                      type="number"
                      value={offset}
                      onChange={handleOffsetChange}
                      fullWidth
                      disabled={queryStatus.loading}
                      helperText="Starting record number"
                      InputProps={{ inputProps: { min: 0 } }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Limit"
                      type="number"
                      value={limit}
                      onChange={handleLimitChange}
                      fullWidth
                      disabled={queryStatus.loading}
                      helperText="Maximum number of records to retrieve"
                      InputProps={{ inputProps: { min: 1, max: 1000 } }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmitQuery}
                disabled={queryStatus.loading}
                startIcon={queryStatus.loading ? <CircularProgress size={20} color="inherit" /> : <CloudDownloadIcon />}
              >
                {queryStatus.loading ? 'Submitting Query...' : 'Submit Query'}
              </Button>
            </Box>
            
            {queryStatus.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {queryStatus.error}
              </Alert>
            )}
          </StepContent>
        </Step>
        
        {/* Step 2: Monitor Query Execution */}
        <Step expanded={expandedSteps.includes(1)}>
          <StepLabel onClick={() => handleStepToggle(1)} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">Monitor Query Execution</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader 
                title="Query Status" 
                subheader={jobStatus.status ? `Status: ${jobStatus.status}` : 'Waiting for status...'}
              />
              <CardContent>
                {jobStatus.loading && (
                  <Box sx={{ width: '100%', mb: 2 }}>
                    <LinearProgress 
                      variant={jobStatus.progress > 0 ? "determinate" : "indeterminate"} 
                      value={jobStatus.progress} 
                    />
                    <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
                      {jobStatus.progress > 0 ? `${Math.round(jobStatus.progress)}% complete` : 'Processing query...'}
                    </Typography>
                  </Box>
                )}
                
                {generatedSql && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>Generated SQL Query:</Typography>
                    <Card variant="outlined" sx={{ bgcolor: 'grey.100', p: 2, mb: 2 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {generatedSql}
                      </Typography>
                    </Card>
                  </Box>
                )}
                
                {jobStatus.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {jobStatus.error}
                  </Alert>
                )}
                
                {!jobStatus.loading && jobStatus.status === 'completed' && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    Query completed successfully!
                  </Alert>
                )}
              </CardContent>
            </Card>
            
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  if (queryStatus.queryId && jobStatus.status === 'completed') {
                    fetchResults(queryStatus.queryId);
                  } else {
                    setActiveStep(2);
                  }
                }}
                disabled={jobStatus.loading || !jobStatus.status || jobStatus.status !== 'completed'}
                startIcon={<CheckCircleIcon />}
              >
                View Results
              </Button>
            </Box>
          </StepContent>
        </Step>
        
        {/* Step 3: View Results and Push to MongoDB */}
        <Step expanded={expandedSteps.includes(2)}>
          <StepLabel onClick={() => handleStepToggle(2)} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">View Results and Push to MongoDB</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader 
                title="Query Results" 
                subheader={resultsStatus.data ? 
                  `${resultsStatus.data.results?.length || 0} records retrieved` : 
                  'No results available'}
              />
              <CardContent>
                {resultsStatus.loading && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
                    <CircularProgress />
                  </Box>
                )}
                
                {resultsStatus.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {resultsStatus.error}
                  </Alert>
                )}
                
                {resultsStatus.data && resultsStatus.data.results && (
                  <Box sx={{ mt: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Chip 
                          label={`${resultsStatus.data.results.length} Records`} 
                          color="primary" 
                          variant="outlined" 
                          sx={{ mr: 1 }}
                        />
                        {resultsStatus.data.columns && (
                          <Chip 
                            label={`${resultsStatus.data.columns.length} Columns`} 
                            color="secondary" 
                            variant="outlined" 
                          />
                        )}
                      </Grid>
                    </Grid>
                    
                    {resultsStatus.data.results.length > 0 && (
                      <Box sx={{ mt: 2, mb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>Sample Data (First Record):</Typography>
                        <Card variant="outlined" sx={{ bgcolor: 'grey.100', p: 2 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(resultsStatus.data.results[0], null, 2)}
                          </Typography>
                        </Card>
                      </Box>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
            
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={handlePushToMongoDB}
                disabled={mongoDbStatus.loading || !resultsStatus.data || !resultsStatus.data.results}
                startIcon={mongoDbStatus.loading ? <CircularProgress size={20} color="inherit" /> : <StorageIcon />}
                color="primary"
              >
                {mongoDbStatus.loading ? 'Pushing to MongoDB...' : 'Push to MongoDB'}
              </Button>
            </Box>
            
            {mongoDbStatus.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {mongoDbStatus.error}
              </Alert>
            )}
          </StepContent>
        </Step>
        
        {/* Step 4: Completion */}
        <Step expanded={expandedSteps.includes(3)}>
          <StepLabel onClick={() => handleStepToggle(3)} style={{ cursor: 'pointer' }}>
            <Typography variant="h6">Complete</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardHeader 
                title="Operation Complete" 
                subheader={mongoDbStatus.stats ? 
                  `Processed ${mongoDbStatus.stats.total || 0} records` : 
                  'Processing complete'}
              />
              <CardContent>
                {mongoDbStatus.success && mongoDbStatus.stats && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      Data successfully copied to MongoDB!
                    </Alert>
                    
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={6} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h5" color="primary">{mongoDbStatus.stats.inserted || 0}</Typography>
                          <Typography variant="body2" color="text.secondary">Inserted</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h5" color="secondary">{mongoDbStatus.stats.updated || 0}</Typography>
                          <Typography variant="body2" color="text.secondary">Updated</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h5" color="error">{mongoDbStatus.stats.errors || 0}</Typography>
                          <Typography variant="body2" color="text.secondary">Errors</Typography>
                        </Card>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Card variant="outlined" sx={{ textAlign: 'center', py: 2 }}>
                          <Typography variant="h5">{mongoDbStatus.stats.total || 0}</Typography>
                          <Typography variant="body2" color="text.secondary">Total</Typography>
                        </Card>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
            
            <Box sx={{ mb: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  // Reset all states
                  setActiveStep(0);
                  setExpandedSteps([0]); // Only expand first step
                  setQueryStatus({ loading: false, success: false, error: null, queryId: null });
                  setJobStatus({ loading: false, status: null, progress: 0, error: null });
                  setResultsStatus({ loading: false, success: false, error: null, data: null });
                  setMongoDbStatus({
                    loading: false, success: false, error: null, stats: null,
                    progress: 0, processingChunks: false, currentChunk: 0, totalChunks: 0
                  });
                }}
                startIcon={<RefreshIcon />}
              >
                Start New Copy
              </Button>
            </Box>
          </StepContent>
        </Step>
      </Stepper>
    </Box>
  );
}

export default DataCopySteps;

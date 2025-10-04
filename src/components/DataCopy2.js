import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  Alert,
  AlertTitle,
  LinearProgress,
  TextField
} from '@mui/material';
import axios from 'axios';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import StopIcon from '@mui/icons-material/Stop';

// Logger utility
const logger = {
  info: (message) => console.log(`[DataCopy2][INFO] ${message}`),
  error: (message) => console.error(`[DataCopy2][ERROR] ${message}`),
  warn: (message) => console.warn(`[DataCopy2][WARNING] ${message}`),
  api: (method, url) => console.log(`[DataCopy2][API] ${method} ${url}`)
};

// Task types for dropdown
const taskTypes = [
  // Primary task types
  { value: 'PK', label: 'Pick (PK)' },
  { value: 'PP', label: 'Pack (PP)' },
  { value: 'PA', label: 'Put Away (PA)' },
  { value: 'CC', label: 'Cycle Count (CC)' },
  { value: 'LD', label: 'Load (LD)' },
  { value: 'TD', label: 'Task Detail (TD)' },
  { value: 'RC', label: 'Receive (RC)' },
  // Additional high-volume task types
  { value: 'PIA', label: 'PIA' },
  { value: 'PIB', label: 'PIB' },
  { value: 'DP', label: 'DP' },
  { value: 'MV', label: 'Move (MV)' },
  { value: 'RP', label: 'RP' },
  { value: 'CR', label: 'CR' }
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
  { value: 'all', label: 'All Warehouse' }
];

const DataCopy2 = () => {
  const [copying, setCopying] = useState(false);
  const [copyStatus, setCopyStatus] = useState(null);
  const [error, setError] = useState(null);
  
  // Filter states
  const [warehouseId, setWarehouseId] = useState('all');
  const [year, setYear] = useState('');
  const [taskType, setTaskType] = useState('');
  const [recordLimit, setRecordLimit] = useState(10); // Default to 10 records
  const [processingDelay, setProcessingDelay] = useState(1000); // Default to 1 second delay between records

  // State for SQL queries
  const [sqlQueries, setSqlQueries] = useState({
    countQuery: '',
    dataQuery: ''
  });

  // State for current record being processed
  const [currentRecord, setCurrentRecord] = useState(null);
  const [processedRecords, setProcessedRecords] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [paused, setPaused] = useState(false);

  // Start copy process
  const startCopy = async () => {
    try {
      setCopying(true);
      setPaused(false);
      setError(null);
      setCopyStatus(null);
      setProcessedRecords(0);
      setCurrentRecord(null);
      setSqlQueries({
        countQuery: '',
        dataQuery: ''
      });
      
      logger.info('Starting TaskDetail copy with single record processing');
      logger.info(`Filters: warehouseId=${warehouseId}, year=${year}, taskType=${taskType}, recordLimit=${recordLimit}, processingDelay=${processingDelay}`);
      
      // Call the backend to start the copy process
      const response = await axios.post('/.netlify/functions/copy-taskdetail-single', {
        whseid: warehouseId,
        year: year || null,
        taskType: taskType || null,
        recordLimit: recordLimit,
        processingDelay: processingDelay
      });
      
      logger.info('Copy started successfully', response.data);
      
      // Set initial status
      setCopyStatus({
        jobId: response.data.jobId,
        totalRecords: response.data.totalRecords,
        status: response.data.status,
        processedRecords: 0,
        insertedRecords: 0,
        currentRecord: null
      });
      
      // Capture SQL queries if available
      if (response.data.queries) {
        logger.info('Received SQL queries from backend', response.data.queries);
        setSqlQueries({
          countQuery: response.data.queries.countQuery || '',
          dataQuery: response.data.queries.dataQuery || ''
        });
      }
      
      // Set total records
      setTotalRecords(response.data.totalRecords);
      
      // Start polling for status updates
      pollStatus(response.data.jobId);
      
    } catch (err) {
      logger.error('Error starting copy:', err);
      
      // Handle 504 Gateway Timeout specifically
      if (err.response && err.response.status === 504) {
        setError({
          title: 'Request Timeout',
          message: 'The request took too long to complete. The copy process may still be running in the background. Check the job status for updates.'
        });
        // Keep SQL queries if they were set
        setCopying(false);
      } else {
        setError({
          title: 'Error Starting Copy',
          message: err.response?.data?.message || err.message || 'Unknown error'
        });
        setCopying(false);
        setSqlQueries({
          countQuery: '',
          dataQuery: ''
        });
      }
    }
  };
  
  // Poll for status updates
  const pollStatus = async (jobId) => {
    if (!copying || paused) return;
    
    try {
      const response = await axios.get(`/.netlify/functions/copy-taskdetail-single-status?jobId=${jobId}`);
      
      logger.info('Status update received:', response.data);
      
      // Update status
      setCopyStatus(response.data);
      
      // Update processed records
      setProcessedRecords(response.data.processedRecords || 0);
      
      // Update current record
      if (response.data.currentRecord) {
        setCurrentRecord(response.data.currentRecord);
      }
      
      // Check if complete
      if (response.data.status === 'completed') {
        logger.info('Copy process completed');
        setCopying(false);
      } else {
        // Continue polling
        setTimeout(() => pollStatus(jobId), 2000);
      }
      
    } catch (err) {
      logger.error('Error polling status:', err);
      setError({
        title: 'Error Checking Status',
        message: err.response?.data?.message || err.message || 'Unknown error'
      });
      setCopying(false);
    }
  };
  
  // Pause/resume copy process
  const togglePause = async () => {
    try {
      if (!copyStatus || !copyStatus.jobId) return;
      
      if (paused) {
        // Resume
        logger.info('Resuming copy process');
        await axios.post('/.netlify/functions/copy-taskdetail-single-control', {
          jobId: copyStatus.jobId,
          action: 'resume'
        });
        setPaused(false);
        pollStatus(copyStatus.jobId);
      } else {
        // Pause
        logger.info('Pausing copy process');
        await axios.post('/.netlify/functions/copy-taskdetail-single-control', {
          jobId: copyStatus.jobId,
          action: 'pause'
        });
        setPaused(true);
      }
    } catch (err) {
      logger.error('Error toggling pause state:', err);
      setError({
        title: 'Error Controlling Copy Process',
        message: err.response?.data?.message || err.message || 'Unknown error'
      });
    }
  };
  
  // Stop copy process
  const stopCopy = async () => {
    try {
      if (!copyStatus || !copyStatus.jobId) return;
      
      logger.info('Stopping copy process');
      await axios.post('/.netlify/functions/copy-taskdetail-single-control', {
        jobId: copyStatus.jobId,
        action: 'stop'
      });
      
      setCopying(false);
      setPaused(false);
      
    } catch (err) {
      logger.error('Error stopping copy process:', err);
      setError({
        title: 'Error Stopping Copy Process',
        message: err.response?.data?.message || err.message || 'Unknown error'
      });
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Copy TaskDetail Data (Single Record Mode)
      </Typography>
      
      <Typography variant="body1" paragraph>
        This page allows you to copy TaskDetail data from the DataLake to MongoDB one record at a time.
        This is useful for testing and debugging, or when you want more control over the copy process.
      </Typography>
      
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="warehouse-label">Warehouse</InputLabel>
                <Select
                  labelId="warehouse-label"
                  value={warehouseId}
                  label="Warehouse"
                  onChange={(e) => setWarehouseId(e.target.value)}
                  disabled={copying}
                >
                  {warehouseIds.map((wh) => (
                    <MenuItem key={wh.value} value={wh.value}>
                      {wh.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="year-label">Year</InputLabel>
                <Select
                  labelId="year-label"
                  value={year}
                  label="Year"
                  onChange={(e) => setYear(e.target.value)}
                  disabled={copying}
                >
                  <MenuItem value="">All Years</MenuItem>
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel id="task-type-label">Task Type</InputLabel>
                <Select
                  labelId="task-type-label"
                  value={taskType}
                  label="Task Type"
                  onChange={(e) => setTaskType(e.target.value)}
                  disabled={copying}
                >
                  <MenuItem value="">All Task Types</MenuItem>
                  {taskTypes.map((tt) => (
                    <MenuItem key={tt.value} value={tt.value}>
                      {tt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Record Limit"
                type="number"
                value={recordLimit}
                onChange={(e) => setRecordLimit(parseInt(e.target.value) || 1)}
                disabled={copying}
                InputProps={{ inputProps: { min: 1, max: 1000 } }}
                helperText="Maximum number of records to process"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Processing Delay (ms)"
                type="number"
                value={processingDelay}
                onChange={(e) => setProcessingDelay(parseInt(e.target.value) || 0)}
                disabled={copying}
                InputProps={{ inputProps: { min: 0, max: 10000 } }}
                helperText="Delay between processing records (ms)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={9}>
              <Box sx={{ display: 'flex', gap: 2, height: '100%', alignItems: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={startCopy}
                  disabled={copying}
                  startIcon={<PlayArrowIcon />}
                >
                  Start Copy
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={togglePause}
                  disabled={!copying}
                  startIcon={paused ? <PlayArrowIcon /> : <PauseIcon />}
                >
                  {paused ? 'Resume' : 'Pause'}
                </Button>
                
                <Button
                  variant="contained"
                  color="error"
                  onClick={stopCopy}
                  disabled={!copying}
                  startIcon={<StopIcon />}
                >
                  Stop
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* Status Display */}
      {copyStatus && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Copy Status
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body1" sx={{ mr: 1 }}>
                    Status: 
                  </Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {copyStatus.status === 'completed' ? 'Completed' : copying ? (paused ? 'Paused' : 'Running') : 'Stopped'}
                  </Typography>
                  {copying && !paused && (
                    <CircularProgress size={20} sx={{ ml: 1 }} />
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Job ID: {copyStatus.jobId}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  Total Records: {copyStatus.totalRecords}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    Progress: {processedRecords} / {totalRecords} records
                    ({totalRecords > 0 ? Math.round((processedRecords / totalRecords) * 100) : 0}%)
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={totalRecords > 0 ? (processedRecords / totalRecords) * 100 : 0} 
                  sx={{ height: 10, borderRadius: 1 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {/* Current Record Display */}
      {currentRecord && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Current Record
            </Typography>
            
            <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: '300px', overflow: 'auto' }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(currentRecord, null, 2)}
              </pre>
            </Paper>
          </CardContent>
        </Card>
      )}
      
      {/* SQL Queries Display */}
      {(sqlQueries.countQuery || sqlQueries.dataQuery) && (
        <Card sx={{ mb: 3, bgcolor: '#f5f5f5' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>SQL Queries</Typography>
            
            {sqlQueries.countQuery && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>Count Query:</Typography>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#263238', 
                    color: '#fff', 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    overflowX: 'auto'
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sqlQueries.countQuery}</pre>
                </Paper>
              </Box>
            )}
            
            {sqlQueries.dataQuery && (
              <Box>
                <Typography variant="subtitle1" gutterBottom>Data Query:</Typography>
                <Paper 
                  sx={{ 
                    p: 2, 
                    bgcolor: '#263238', 
                    color: '#fff', 
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    overflowX: 'auto'
                  }}
                >
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sqlQueries.dataQuery}</pre>
                </Paper>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>{error.title}</AlertTitle>
          {error.message}
        </Alert>
      )}
    </Container>
  );
};

export default DataCopy2;

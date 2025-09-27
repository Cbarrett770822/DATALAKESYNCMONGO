import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { format } from 'date-fns';

// Import API service
import { startSync, checkSyncStatus } from '../utils/api';

// Task types
const taskTypes = [
  { value: '', label: 'All Types' },
  { value: 'PK', label: 'Pick (PK)' },
  { value: 'CC', label: 'Cycle Count (CC)' },
  { value: 'LD', label: 'Load (LD)' },
  { value: 'TD', label: 'Transport (TD)' },
  { value: 'PP', label: 'Putaway (PP)' },
  { value: 'PA', label: 'Put to Area (PA)' },
  { value: 'RC', label: 'Receive (RC)' },
];

// Warehouse IDs
const warehouseIds = [
  { value: 'wmwhse1', label: 'Warehouse 1' },
  { value: 'wmwhse2', label: 'Warehouse 2' },
  { value: 'wmwhse3', label: 'Warehouse 3' },
  { value: 'wmwhse4', label: 'Warehouse 4' },
];

// Sync steps
const syncSteps = [
  'Configure Sync',
  'Sync in Progress',
  'Sync Complete',
];

function SyncConfig() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncJobId, setSyncJobId] = useState(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStats, setSyncStats] = useState(null);
  const [sqlQuery, setSqlQuery] = useState('');
  const [showSqlQuery, setShowSqlQuery] = useState(false);
  
  // Form state
  const [formState, setFormState] = useState({
    whseid: 'wmwhse1',
    taskType: '',
    startDate: null,
    endDate: null,
    useCustomQuery: false,
    customQuery: '',
    batchSize: 1000,
    maxRecords: 10000,
  });
  
  // Handle form changes
  const handleFormChange = (field) => (event) => {
    setFormState({
      ...formState,
      [field]: event.target.value,
    });
  };
  
  // Handle date changes
  const handleDateChange = (field) => (date) => {
    setFormState({
      ...formState,
      [field]: date,
    });
  };
  
  // Handle switch change
  const handleSwitchChange = (event) => {
    setFormState({
      ...formState,
      useCustomQuery: event.target.checked,
    });
  };
  
  // Start sync
  const handleStartSync = async () => {
    try {
      setLoading(true);
      setError(null);
      setSqlQuery('');
      setShowSqlQuery(false);
      
      // Prepare sync options
      const syncOptions = {
        whseid: formState.whseid,
        taskType: formState.taskType,
        batchSize: formState.batchSize,
        maxRecords: formState.maxRecords,
      };
      
      // Add date filters if provided
      if (formState.startDate) {
        syncOptions.startDate = format(formState.startDate, 'yyyy-MM-dd');
      }
      
      if (formState.endDate) {
        syncOptions.endDate = format(formState.endDate, 'yyyy-MM-dd');
      }
      
      // Add custom query if enabled
      if (formState.useCustomQuery && formState.customQuery) {
        syncOptions.sqlQuery = formState.customQuery;
        setSqlQuery(formState.customQuery);
      } else {
        // Generate a preview of the SQL query that will be used
        let query = `SELECT * FROM wmwhse_taskdetail.taskdetail`;
        const conditions = [];
        
        if (syncOptions.whseid) {
          conditions.push(`WHSEID = '${syncOptions.whseid}'`);
        }
        
        if (syncOptions.taskType) {
          conditions.push(`TASKTYPE = '${syncOptions.taskType}'`);
        }
        
        if (syncOptions.startDate) {
          conditions.push(`ADDDATE >= '${syncOptions.startDate}'`);
        }
        
        if (syncOptions.endDate) {
          conditions.push(`ADDDATE <= '${syncOptions.endDate}'`);
        }
        
        if (conditions.length > 0) {
          query += ' WHERE ' + conditions.join(' AND ');
        }
        
        query += ` LIMIT ${syncOptions.maxRecords}`;
        
        setSqlQuery(query);
      }
      
      // Show the SQL query
      setShowSqlQuery(true);
      
      // Start sync
      const response = await startSync(syncOptions);
      
      // Set sync job ID
      setSyncJobId(response.jobId);
      
      // Handle simplified response (for testing)
      if (response.stats) {
        // If we got stats directly, skip polling and go to completion
        setSyncStats(response.stats);
        setActiveStep(2); // Go directly to completion step
        setSuccess('Sync completed successfully!');
        setLoading(false);
      } else {
        // Normal flow - move to progress step and start polling
        setActiveStep(1);
        pollSyncStatus(response.jobId);
      }
    } catch (err) {
      console.error('Error starting sync:', err);
      setError('Failed to start sync. Please try again.');
      setLoading(false);
    }
  };
  
  // Poll sync status
  const pollSyncStatus = async (jobId) => {
    try {
      const response = await checkSyncStatus(jobId);
      
      // Update progress and stats
      setSyncProgress(response.progress || 0);
      setSyncStats(response.stats || null);
      
      // Check if sync is complete
      if (response.status === 'completed') {
        setActiveStep(2);
        setSuccess('Sync completed successfully!');
        setLoading(false);
      } else if (response.status === 'failed') {
        setError('Sync failed: ' + (response.error || 'Unknown error'));
        setLoading(false);
      } else {
        // Continue polling
        setTimeout(() => pollSyncStatus(jobId), 2000);
      }
    } catch (err) {
      console.error('Error checking sync status:', err);
      setError('Failed to check sync status. Please check the history page for updates.');
      setLoading(false);
    }
  };
  
  // View history
  const handleViewHistory = () => {
    navigate('/history');
  };
  
  // Reset form
  const handleReset = () => {
    setActiveStep(0);
    setLoading(false);
    setError(null);
    setSuccess(null);
    setSyncJobId(null);
    setSyncProgress(0);
    setSyncStats(null);
    setSqlQuery('');
    setShowSqlQuery(false);
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sync Configuration
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {syncSteps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {activeStep === 0 && (
        <Card>
          <CardHeader title="Configure Sync Options" />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Warehouse</InputLabel>
                  <Select
                    value={formState.whseid}
                    label="Warehouse"
                    onChange={handleFormChange('whseid')}
                  >
                    {warehouseIds.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Task Type</InputLabel>
                  <Select
                    value={formState.taskType}
                    label="Task Type"
                    onChange={handleFormChange('taskType')}
                  >
                    {taskTypes.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date"
                    value={formState.startDate}
                    onChange={handleDateChange('startDate')}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="End Date"
                    value={formState.endDate}
                    onChange={handleDateChange('endDate')}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                </LocalizationProvider>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Batch Size"
                  type="number"
                  value={formState.batchSize}
                  onChange={handleFormChange('batchSize')}
                  fullWidth
                  helperText="Number of records to process in each batch"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  label="Max Records"
                  type="number"
                  value={formState.maxRecords}
                  onChange={handleFormChange('maxRecords')}
                  fullWidth
                  helperText="Maximum number of records to sync"
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formState.useCustomQuery}
                      onChange={handleSwitchChange}
                    />
                  }
                  label="Use Custom SQL Query"
                />
              </Grid>
              
              {formState.useCustomQuery && (
                <Grid item xs={12}>
                  <TextField
                    label="Custom SQL Query"
                    multiline
                    rows={4}
                    value={formState.customQuery}
                    onChange={handleFormChange('customQuery')}
                    fullWidth
                    helperText="Enter a custom SQL query for the DataFabric API"
                  />
                </Grid>
              )}
              
              {showSqlQuery && (
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      SQL Query to be executed:
                    </Typography>
                    <Box 
                      component="pre"
                      sx={{
                        p: 2,
                        bgcolor: '#272822',
                        color: '#f8f8f2',
                        borderRadius: 1,
                        overflowX: 'auto',
                        fontSize: '0.875rem',
                        fontFamily: '"Roboto Mono", monospace'
                      }}
                    >
                      {sqlQuery}
                    </Box>
                  </Paper>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={handleStartSync}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Start Sync'}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      
      {activeStep === 1 && (
        <Card>
          <CardHeader title="Sync in Progress" />
          <Divider />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
              <CircularProgress
                variant="determinate"
                value={syncProgress}
                size={80}
                thickness={4}
                sx={{ mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                {syncProgress}% Complete
              </Typography>
              <Typography variant="body2" color="textSecondary" align="center">
                Please wait while the sync is in progress. This may take several minutes depending on the amount of data.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      
      {activeStep === 2 && (
        <Card>
          <CardHeader title="Sync Complete" />
          <Divider />
          <CardContent>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Sync Results
              </Typography>
              
              {syncStats && (
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Total Records
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.totalRecords?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Processed
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.processedRecords?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Duration
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.duration ? `${syncStats.duration.toFixed(2)} seconds` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Inserted
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.insertedRecords?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Updated
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.updatedRecords?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="subtitle2" color="textSecondary">
                        Errors
                      </Typography>
                      <Typography variant="h6">
                        {syncStats.errorRecords?.toLocaleString() || 0}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleReset}
                  sx={{ mr: 1 }}
                >
                  New Sync
                </Button>
                <Button
                  variant="contained"
                  onClick={handleViewHistory}
                >
                  View History
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default SyncConfig;

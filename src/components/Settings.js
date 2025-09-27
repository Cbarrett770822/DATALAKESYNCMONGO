import React, { useState, useEffect } from 'react';
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
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  Snackbar,
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

// Import API service
import { getSettings, saveSettings } from '../utils/api';

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    // Connection settings
    mongodbUri: '',
    ionCredentialsPath: '',
    
    // Sync settings
    defaultWhseid: 'wmwhse1',
    defaultBatchSize: 1000,
    defaultMaxRecords: 10000,
    
    // Schedule settings
    enableScheduledSync: false,
    scheduleCron: '0 0 * * *', // Daily at midnight
    
    // Notification settings
    enableEmailNotifications: false,
    notificationEmail: '',
    notifyOnSuccess: false,
    notifyOnFailure: true,
  });
  
  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Get settings
        const response = await getSettings();
        
        // Update settings state
        setSettings({
          ...settings,
          ...response,
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching settings:', err);
        setError('Failed to load settings. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  // Handle settings changes
  const handleSettingChange = (field) => (event) => {
    setSettings({
      ...settings,
      [field]: event.target.value,
    });
  };
  
  // Handle switch changes
  const handleSwitchChange = (field) => (event) => {
    setSettings({
      ...settings,
      [field]: event.target.checked,
    });
  };
  
  // Save settings
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save settings
      await saveSettings(settings);
      
      setSaving(false);
      setSuccess('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings. Please try again.');
      setSaving(false);
    }
  };
  
  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSuccess(null);
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        message={success}
      />
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* Connection Settings */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Connection Settings" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="MongoDB URI"
                      value={settings.mongodbUri}
                      onChange={handleSettingChange('mongodbUri')}
                      fullWidth
                      helperText="MongoDB connection string"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="ION Credentials Path"
                      value={settings.ionCredentialsPath}
                      onChange={handleSettingChange('ionCredentialsPath')}
                      fullWidth
                      helperText="Path to the ION API credentials file"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Sync Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Sync Settings" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Default Warehouse</InputLabel>
                      <Select
                        value={settings.defaultWhseid}
                        label="Default Warehouse"
                        onChange={handleSettingChange('defaultWhseid')}
                      >
                        <MenuItem value="wmwhse1">Warehouse 1</MenuItem>
                        <MenuItem value="wmwhse2">Warehouse 2</MenuItem>
                        <MenuItem value="wmwhse3">Warehouse 3</MenuItem>
                        <MenuItem value="wmwhse4">Warehouse 4</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Default Batch Size"
                      type="number"
                      value={settings.defaultBatchSize}
                      onChange={handleSettingChange('defaultBatchSize')}
                      fullWidth
                      helperText="Number of records to process in each batch"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      label="Default Max Records"
                      type="number"
                      value={settings.defaultMaxRecords}
                      onChange={handleSettingChange('defaultMaxRecords')}
                      fullWidth
                      helperText="Maximum number of records to sync"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Schedule Settings */}
          <Grid item xs={12} md={6}>
            <Card sx={{ height: '100%' }}>
              <CardHeader title="Schedule Settings" />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enableScheduledSync}
                            onChange={handleSwitchChange('enableScheduledSync')}
                          />
                        }
                        label="Enable Scheduled Sync"
                      />
                    </FormGroup>
                  </Grid>
                  
                  {settings.enableScheduledSync && (
                    <Grid item xs={12}>
                      <TextField
                        label="Schedule (Cron Expression)"
                        value={settings.scheduleCron}
                        onChange={handleSettingChange('scheduleCron')}
                        fullWidth
                        helperText="Cron expression for sync schedule (e.g., '0 0 * * *' for daily at midnight)"
                      />
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.enableEmailNotifications}
                            onChange={handleSwitchChange('enableEmailNotifications')}
                          />
                        }
                        label="Enable Email Notifications"
                      />
                    </FormGroup>
                  </Grid>
                  
                  {settings.enableEmailNotifications && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          label="Notification Email"
                          value={settings.notificationEmail}
                          onChange={handleSettingChange('notificationEmail')}
                          fullWidth
                          helperText="Email address for notifications"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <FormGroup>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={settings.notifyOnSuccess}
                                onChange={handleSwitchChange('notifyOnSuccess')}
                              />
                            }
                            label="Notify on Success"
                          />
                          <FormControlLabel
                            control={
                              <Switch
                                checked={settings.notifyOnFailure}
                                onChange={handleSwitchChange('notifyOnFailure')}
                              />
                            }
                            label="Notify on Failure"
                          />
                        </FormGroup>
                      </Grid>
                    </>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Save Button */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveSettings}
                disabled={saving}
              >
                {saving ? <CircularProgress size={24} /> : 'Save Settings'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Settings;

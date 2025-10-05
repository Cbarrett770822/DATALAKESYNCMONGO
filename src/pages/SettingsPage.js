import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  LinearProgress,
  Card,
  CardContent,
  CardHeader,
  Switch,
  FormControlLabel,
  InputAdornment,
  IconButton,
  Tabs,
  Tab
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getSettings, saveSettings } from '../utils/api';

// Tab panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function SettingsPage() {
  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  
  // State for settings
  const [settings, setSettings] = useState({
    credentials: {
      dataFabric: {
        tenant: '',
        saak: '',
        sask: '',
        clientId: '',
        clientSecret: '',
        apiUrl: '',
        ssoUrl: ''
      },
      mongodb: {
        uri: '',
        database: '',
        username: '',
        password: ''
      }
    },
    options: {
      batchSize: 50,
      timeout: 30000,
      retryAttempts: 3
    }
  });
  
  // State for loading and notifications
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  
  // State for password visibility
  const [showPasswords, setShowPasswords] = useState({
    clientSecret: false,
    sask: false,
    mongoPassword: false
  });
  
  // Load settings on component mount
  useEffect(() => {
    fetchSettings();
  }, []);
  
  // Fetch settings from API
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await getSettings();
      setSettings(response);
      setNotification({
        open: true,
        message: 'Settings loaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      setNotification({
        open: true,
        message: `Error loading settings: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Save settings to API
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      setNotification({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({
        open: true,
        message: `Error saving settings: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Handle settings changes
  const handleSettingChange = (section, subsection, field, value) => {
    setSettings(prevSettings => {
      if (subsection) {
        return {
          ...prevSettings,
          [section]: {
            ...prevSettings[section],
            [subsection]: {
              ...prevSettings[section][subsection],
              [field]: value
            }
          }
        };
      } else {
        return {
          ...prevSettings,
          [section]: {
            ...prevSettings[section],
            [field]: value
          }
        };
      }
    });
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Settings
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchSettings}
              disabled={loading || saving}
              sx={{ mr: 2 }}
            >
              Reload
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
              onClick={handleSaveSettings}
              disabled={loading || saving}
            >
              Save Settings
            </Button>
          </Box>
        </Box>
        
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab label="DataFabric API" id="settings-tab-0" />
            <Tab label="MongoDB Atlas" id="settings-tab-1" />
            <Tab label="Options" id="settings-tab-2" />
          </Tabs>
        </Box>
        
        {/* DataFabric API Settings Tab */}
        <TabPanel value={tabValue} index={0}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="DataFabric API Credentials" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Tenant"
                    value={settings.credentials?.dataFabric?.tenant || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'tenant', e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="API URL"
                    value={settings.credentials?.dataFabric?.apiUrl || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'apiUrl', e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="https://mingle-ionapi.inforcloudsuite.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SSO URL"
                    value={settings.credentials?.dataFabric?.ssoUrl || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'ssoUrl', e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="https://mingle-sso.inforcloudsuite.com"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Client ID"
                    value={settings.credentials?.dataFabric?.clientId || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'clientId', e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Client Secret"
                    type={showPasswords.clientSecret ? 'text' : 'password'}
                    value={settings.credentials?.dataFabric?.clientSecret || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'clientSecret', e.target.value)}
                    fullWidth
                    margin="normal"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => togglePasswordVisibility('clientSecret')}
                            edge="end"
                          >
                            {showPasswords.clientSecret ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SAAK"
                    value={settings.credentials?.dataFabric?.saak || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'saak', e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SASK"
                    type={showPasswords.sask ? 'text' : 'password'}
                    value={settings.credentials?.dataFabric?.sask || ''}
                    onChange={(e) => handleSettingChange('credentials', 'dataFabric', 'sask', e.target.value)}
                    fullWidth
                    margin="normal"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => togglePasswordVisibility('sask')}
                            edge="end"
                          >
                            {showPasswords.sask ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
        
        {/* MongoDB Atlas Settings Tab */}
        <TabPanel value={tabValue} index={1}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="MongoDB Atlas Credentials" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="MongoDB URI"
                    value={settings.credentials?.mongodb?.uri || ''}
                    onChange={(e) => handleSettingChange('credentials', 'mongodb', 'uri', e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
                    helperText="Full connection string including username and password"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Database Name"
                    value={settings.credentials?.mongodb?.database || ''}
                    onChange={(e) => handleSettingChange('credentials', 'mongodb', 'database', e.target.value)}
                    fullWidth
                    margin="normal"
                    placeholder="datalake_sync"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Username"
                    value={settings.credentials?.mongodb?.username || ''}
                    onChange={(e) => handleSettingChange('credentials', 'mongodb', 'username', e.target.value)}
                    fullWidth
                    margin="normal"
                    helperText="Optional if included in URI"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Password"
                    type={showPasswords.mongoPassword ? 'text' : 'password'}
                    value={settings.credentials?.mongodb?.password || ''}
                    onChange={(e) => handleSettingChange('credentials', 'mongodb', 'password', e.target.value)}
                    fullWidth
                    margin="normal"
                    helperText="Optional if included in URI"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={() => togglePasswordVisibility('mongoPassword')}
                            edge="end"
                          >
                            {showPasswords.mongoPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
        
        {/* Options Tab */}
        <TabPanel value={tabValue} index={2}>
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="API Options" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Batch Size"
                    type="number"
                    value={settings.options?.batchSize || 50}
                    onChange={(e) => handleSettingChange('options', null, 'batchSize', parseInt(e.target.value) || 50)}
                    fullWidth
                    margin="normal"
                    InputProps={{ inputProps: { min: 1, max: 1000 } }}
                    helperText="Number of records to process in each batch"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Timeout (ms)"
                    type="number"
                    value={settings.options?.timeout || 30000}
                    onChange={(e) => handleSettingChange('options', null, 'timeout', parseInt(e.target.value) || 30000)}
                    fullWidth
                    margin="normal"
                    InputProps={{ inputProps: { min: 1000, max: 120000 } }}
                    helperText="API request timeout in milliseconds"
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Retry Attempts"
                    type="number"
                    value={settings.options?.retryAttempts || 3}
                    onChange={(e) => handleSettingChange('options', null, 'retryAttempts', parseInt(e.target.value) || 3)}
                    fullWidth
                    margin="normal"
                    InputProps={{ inputProps: { min: 0, max: 10 } }}
                    helperText="Number of retry attempts for failed requests"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Card variant="outlined">
            <CardHeader title="Default Settings" />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Default Warehouse ID"
                    value={settings.defaultWhseid || 'wmwhse1'}
                    onChange={(e) => handleSettingChange('defaultWhseid', null, null, e.target.value)}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableScheduledSync || false}
                        onChange={(e) => handleSettingChange('enableScheduledSync', null, null, e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Enable Scheduled Sync"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </TabPanel>
      </Paper>
      
      {/* Notification Snackbar */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default SettingsPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Typography,
  CircularProgress,
  Divider,
  Paper,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Sync as SyncIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { green, red, orange, blue } from '@mui/material/colors';

// Import API service
import { getSyncHistory, getTaskdetailStats } from '../utils/api';

// Status icon mapping
const statusIcons = {
  completed: <CheckCircleIcon sx={{ color: green[500] }} />,
  failed: <ErrorIcon sx={{ color: red[500] }} />,
  in_progress: <CircularProgress size={20} sx={{ color: blue[500] }} />,
  pending: <PendingIcon sx={{ color: orange[500] }} />,
};

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncHistory, setSyncHistory] = useState([]);
  const [stats, setStats] = useState({
    totalRecords: 0,
    lastSyncDate: null,
    syncStatus: 'unknown',
  });

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get sync history
        const historyResponse = await getSyncHistory({ limit: 5 });
        setSyncHistory(historyResponse.jobs || []);
        
        // Get taskdetail stats
        const statsResponse = await getTaskdetailStats();
        setStats(statsResponse);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Handle new sync button click
  const handleNewSync = () => {
    navigate('/sync');
  };

  // Handle view history button click
  const handleViewHistory = () => {
    navigate('/history');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Paper sx={{ p: 3, bgcolor: red[50] }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Quick Actions" />
              <CardContent>
                <Button
                  variant="contained"
                  startIcon={<SyncIcon />}
                  fullWidth
                  sx={{ mb: 2 }}
                  onClick={handleNewSync}
                >
                  New Sync
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  fullWidth
                  onClick={handleViewHistory}
                >
                  View Sync History
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Sync Stats */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Taskdetail Sync Status" />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Total Records
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalRecords.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Last Sync
                    </Typography>
                    <Typography variant="h6">
                      {stats.lastSyncDate
                        ? new Date(stats.lastSyncDate).toLocaleString()
                        : 'Never'}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Status
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {statusIcons[stats.syncStatus] || statusIcons.pending}
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        {stats.syncStatus.charAt(0).toUpperCase() + stats.syncStatus.slice(1)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Recent Sync Jobs */}
          <Grid item xs={12}>
            <Card>
              <CardHeader 
                title="Recent Sync Jobs" 
                action={
                  <Button 
                    size="small" 
                    onClick={handleViewHistory}
                  >
                    View All
                  </Button>
                }
              />
              <Divider />
              <List>
                {syncHistory.length > 0 ? (
                  syncHistory.map((job) => (
                    <React.Fragment key={job._id}>
                      <ListItem>
                        <ListItemText
                          primary={`${job.jobType} Sync`}
                          secondary={`Created: ${new Date(job.createdAt).toLocaleString()}`}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {statusIcons[job.status]}
                          <Typography variant="body2" sx={{ ml: 1 }}>
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </Typography>
                        </Box>
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText primary="No sync jobs found" />
                  </ListItem>
                )}
              </List>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;

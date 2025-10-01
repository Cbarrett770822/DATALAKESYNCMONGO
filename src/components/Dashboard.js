import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader, 
  Button, Chip, CircularProgress, Alert, IconButton, Paper
} from '@mui/material';
import {
  SyncAlt as SyncIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Assignment as TaskIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as OrdersIcon,
  Storage as DatabaseIcon,
  PlayArrow as StartIcon
} from '@mui/icons-material';

// Mock data for sync tables
const syncTables = [
  { 
    id: 'taskdetail', 
    name: 'Task Detail', 
    table: 'CSWMS_wmwhse_TASKDETAIL',
    icon: <TaskIcon />,
    description: 'Warehouse task details'
  },
  { 
    id: 'receipt', 
    name: 'Receipt', 
    table: 'CSWMS_wmwhse_RECEIPT',
    icon: <ReceiptIcon />,
    description: 'Warehouse receipts'
  },
  { 
    id: 'receiptdetail', 
    name: 'Receipt Detail', 
    table: 'CSWMS_wmwhse_RECEIPTDETAIL',
    icon: <ReceiptIcon />,
    description: 'Receipt line items'
  },
  { 
    id: 'orders', 
    name: 'Orders', 
    table: 'CSWMS_wmwhse_ORDERS',
    icon: <OrdersIcon />,
    description: 'Customer orders'
  },
  { 
    id: 'orderdetail', 
    name: 'Order Detail', 
    table: 'CSWMS_wmwhse_ORDERDETAIL',
    icon: <OrdersIcon />,
    description: 'Order line items'
  }
];

// Status chip component
const StatusChip = ({ status }) => {
  const statusMap = {
    completed: { color: 'success', icon: <CheckCircleIcon fontSize="small" /> },
    failed: { color: 'error', icon: <ErrorIcon fontSize="small" /> },
    in_progress: { color: 'primary', icon: <CircularProgress size={16} /> },
    pending: { color: 'warning', icon: <PendingIcon fontSize="small" /> }
  };
  
  const statusInfo = statusMap[status] || statusMap.pending;
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  
  return (
    <Chip 
      icon={statusInfo.icon} 
      label={label} 
      color={statusInfo.color} 
      size="small" 
    />
  );
};

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncConfigs, setSyncConfigs] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Fetch data on component mount and when refresh is triggered
  useEffect(() => {
    fetchSyncStatus();
  }, [lastRefresh]);

  // Mock function to fetch sync status
  const fetchSyncStatus = async () => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      const mockConfigs = syncTables.map(table => ({
        tableId: table.id,
        tableName: table.name,
        enabled: Math.random() > 0.5,
        syncFrequency: 60,
        lastSyncDate: Math.random() > 0.3 ? new Date().toISOString() : null,
        nextSyncDate: Math.random() > 0.5 ? new Date(Date.now() + 3600000).toISOString() : null,
        recordCount: Math.floor(Math.random() * 10000),
        syncStatus: ['completed', 'pending', 'failed', 'in_progress'][Math.floor(Math.random() * 4)]
      }));
      
      setSyncConfigs(mockConfigs);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching sync status:', err);
      setError('Failed to load sync status. Please try again later.');
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    setLastRefresh(new Date());
  };

  // Handle navigate to sync config
  const handleGoToSync = () => {
    navigate('/sync');
  };
  
  // Handle start sync
  const handleStartSync = (tableId) => {
    navigate(`/sync?table=${tableId}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Dashboard
        </Typography>
        <Box>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            startIcon={<SyncIcon />} 
            onClick={handleGoToSync}
            sx={{ ml: 1 }}
          >
            Configure Sync
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={3}>
          {/* MongoDB Status */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
              <DatabaseIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" sx={{ mr: 2 }}>
                MongoDB Atlas
              </Typography>
              <Chip label="Connected" color="success" size="small" />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Paper>
          </Grid>
          
          {/* Sync Status Cards */}
          {syncConfigs.map((config) => {
            const tableInfo = syncTables.find(t => t.id === config.tableId);
            return (
              <Grid item xs={12} md={6} lg={4} key={config.tableId}>
                <Card>
                  <CardHeader
                    avatar={tableInfo?.icon}
                    title={config.tableName}
                    subheader={tableInfo?.description}
                    action={
                      <IconButton 
                        color="primary" 
                        onClick={() => handleStartSync(config.tableId)}
                        disabled={config.syncStatus === 'in_progress'}
                      >
                        <StartIcon />
                      </IconButton>
                    }
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Status
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <StatusChip status={config.syncStatus} />
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Enabled
                        </Typography>
                        <Typography variant="body1">
                          {config.enabled ? 'Yes' : 'No'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Last Sync
                        </Typography>
                        <Typography variant="body1">
                          {config.lastSyncDate ? new Date(config.lastSyncDate).toLocaleString() : 'Never'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          Records
                        </Typography>
                        <Typography variant="body1">
                          {config.recordCount?.toLocaleString() || 0}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

export default Dashboard;

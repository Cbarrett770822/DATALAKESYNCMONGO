import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardContent,
  Button, Chip, CircularProgress, Alert, 
  Table, TableContainer, TableHead, TableBody, TableRow, TableCell,
  Paper, Switch, IconButton
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  PlayArrow as StartIcon
} from '@mui/icons-material';

// Minimal mock data
const syncTables = [
  { id: 'taskdetail', name: 'Task Detail', description: 'Warehouse tasks' },
  { id: 'receipt', name: 'Receipt', description: 'Warehouse receipts' },
  { id: 'orders', name: 'Orders', description: 'Customer orders' }
];

function SyncConfig() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [syncConfigs, setSyncConfigs] = useState([]);
  
  // Load mock data on mount
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      const mockConfigs = syncTables.map(table => ({
        tableId: table.id,
        tableName: table.name,
        enabled: true,
        lastSyncDate: Math.random() > 0.5 ? new Date().toISOString() : null,
        syncStatus: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)]
      }));
      setSyncConfigs(mockConfigs);
      setLoading(false);
    }, 1000);
  }, []);
  
  // Toggle sync enabled
  const toggleSyncEnabled = (tableId) => {
    setSyncConfigs(syncConfigs.map(config => 
      config.tableId === tableId ? {...config, enabled: !config.enabled} : config
    ));
  };
  
  // Start sync
  const handleStartSync = (tableId) => {
    setSyncConfigs(syncConfigs.map(config => 
      config.tableId === tableId ? {...config, syncStatus: 'in_progress'} : config
    ));
    
    setTimeout(() => {
      setSyncConfigs(syncConfigs.map(config => 
        config.tableId === tableId ? {
          ...config, 
          syncStatus: 'completed',
          lastSyncDate: new Date().toISOString()
        } : config
      ));
      setSuccess(`Sync completed for ${syncConfigs.find(c => c.tableId === tableId)?.tableName}`);
    }, 2000);
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>Data Sync Configuration</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Table</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Sync</TableCell>
                <TableCell>Enabled</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {syncConfigs.map((config) => (
                <TableRow key={config.tableId}>
                  <TableCell>{config.tableName}</TableCell>
                  <TableCell>
                    <Chip 
                      label={config.syncStatus}
                      color={
                        config.syncStatus === 'completed' ? 'success' :
                        config.syncStatus === 'in_progress' ? 'primary' : 'default'
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {config.lastSyncDate ? new Date(config.lastSyncDate).toLocaleString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={config.enabled}
                      onChange={() => toggleSyncEnabled(config.tableId)}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      color="primary" 
                      onClick={() => handleStartSync(config.tableId)}
                    >
                      <StartIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default SyncConfig;

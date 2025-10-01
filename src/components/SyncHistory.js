import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Alert,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { green, red, orange, blue } from '@mui/material/colors';

// Import API service
import { getSyncHistory } from '../utils/api';

// Status chip mapping
const statusChips = {
  completed: <Chip icon={<CheckCircleIcon />} label="Completed" color="success" size="small" />,
  failed: <Chip icon={<ErrorIcon />} label="Failed" color="error" size="small" />,
  in_progress: <Chip icon={<SyncIcon />} label="In Progress" color="primary" size="small" />,
  pending: <Chip icon={<PendingIcon />} label="Pending" color="warning" size="small" />,
};

function SyncHistory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncJobs, setSyncJobs] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    pages: 1,
  });
  
  // Filters
  const [filters, setFilters] = useState({
    jobType: '',
    status: '',
  });
  
  // Fetch data on component mount and when filters change
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get sync history with filters
        const response = await getSyncHistory({
          jobType: filters.jobType,
          status: filters.status,
          page: pagination.page,
          limit: pagination.limit,
        });
        
        setSyncJobs(response.jobs || []);
        setPagination(response.pagination || pagination);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching sync history:', err);
        setError('Failed to load sync history. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [filters, pagination.page, pagination.limit]);
  
  // Handle filter changes
  const handleFilterChange = (field) => (event) => {
    setFilters({
      ...filters,
      [field]: event.target.value,
    });
    
    // Reset to first page when filters change
    setPagination({
      ...pagination,
      page: 1,
    });
  };
  
  // Handle page change
  const handlePageChange = (event, newPage) => {
    setPagination({
      ...pagination,
      page: newPage + 1, // MUI uses 0-based indexing
    });
  };
  
  // Handle rows per page change
  const handleRowsPerPageChange = (event) => {
    setPagination({
      ...pagination,
      limit: parseInt(event.target.value, 10),
      page: 1,
    });
  };
  
  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    
    if (seconds < 60) {
      return `${seconds.toFixed(1)} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Sync History
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Filters" />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Job Type</InputLabel>
                <Select
                  value={filters.jobType}
                  label="Job Type"
                  onChange={handleFilterChange('jobType')}
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="taskdetail">Taskdetail</MenuItem>
                  <MenuItem value="inventory">Inventory</MenuItem>
                  <MenuItem value="order">Order</MenuItem>
                  <MenuItem value="receipt">Receipt</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={handleFilterChange('status')}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in_progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader title="Sync Jobs" />
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : syncJobs.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1" color="textSecondary">
              No sync jobs found matching the selected filters.
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Job Type</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Records</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Created By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {syncJobs.map((job) => (
                    <TableRow key={job._id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {job.jobType.charAt(0).toUpperCase() + job.jobType.slice(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(job.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {statusChips[job.status] || statusChips.pending}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {job.stats?.processedRecords?.toLocaleString() || 0} / 
                          {job.stats?.totalRecords?.toLocaleString() || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDuration(job.stats?.duration)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {job.createdBy || 'System'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={pagination.total}
              page={pagination.page - 1} // MUI uses 0-based indexing
              rowsPerPage={pagination.limit}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Card>
    </Box>
  );
}

export default SyncHistory;

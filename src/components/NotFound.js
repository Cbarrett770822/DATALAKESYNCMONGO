import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import { Home as HomeIcon } from '@mui/icons-material';

function NotFound() {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 5,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: 500,
        }}
      >
        <Typography variant="h1" color="primary" sx={{ mb: 2, fontSize: '6rem' }}>
          404
        </Typography>
        
        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>
        
        <Typography variant="body1" color="textSecondary" align="center" sx={{ mb: 4 }}>
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </Typography>
        
        <Button
          variant="contained"
          component={RouterLink}
          to="/"
          startIcon={<HomeIcon />}
        >
          Back to Dashboard
        </Button>
      </Paper>
    </Box>
  );
}

export default NotFound;

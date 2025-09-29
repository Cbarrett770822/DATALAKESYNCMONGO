import React, { useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Divider,
  useMediaQuery,
  useTheme,
  Avatar,
  Tooltip,
  Badge,
  Paper,
  Container,
  Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  SyncAlt as SyncIcon,
  Storage as DatabaseIcon,
  Api as ApiIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
} from '@mui/icons-material';

// Drawer width
const drawerWidth = 260;

// Navigation items
const navItems = [
  { text: 'Dashboard', path: '/', icon: <DashboardIcon />, description: 'Overview of sync status' },
  { text: 'Data Sync', path: '/sync', icon: <SyncIcon />, description: 'Configure and manage data synchronization' },
  { text: 'TaskDetail Sync', path: '/taskdetail', icon: <DatabaseIcon />, description: 'TaskDetail synchronization' },
  { text: 'API Tester', path: '/api-tester', icon: <ApiIcon />, description: 'Test DataFabric API queries' },
  { text: 'Settings', path: '/settings', icon: <SettingsIcon />, description: 'Application settings' },
];

function Layout({ children }) {
  const theme = useTheme();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // State for dark mode toggle (can be expanded later)
  const [darkMode, setDarkMode] = useState(false);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Drawer content
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box
          component="img"
          src="/logo.png"
          alt="DataSync Logo"
          sx={{ 
            height: 40, 
            mr: 1,
            display: { xs: 'none', sm: 'block' }
          }}
        />
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
          DataFabric Sync
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ px: 2, py: 1 }}>
        <Chip 
          label="MongoDB Connected" 
          color="success" 
          size="small" 
          icon={<DatabaseIcon />} 
          sx={{ width: '100%', justifyContent: 'flex-start' }}
        />
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={RouterLink}
              to={item.path}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                secondary={item.description}
                secondaryTypographyProps={{ 
                  sx: { 
                    display: { xs: 'none', lg: 'block' },
                    color: location.pathname === item.path ? 'rgba(255,255,255,0.7)' : 'inherit'
                  } 
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          DataFabric Sync v1.0.0
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Tooltip title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton onClick={toggleDarkMode} size="small">
              {darkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh Data">
            <IconButton size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        elevation={1}
        color="default"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navItems.find((item) => item.path === location.pathname)?.text || 'DataFabric Sync'}
          </Typography>
          
          <Tooltip title="Notifications">
            <IconButton color="inherit">
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Settings">
            <IconButton 
              color="inherit" 
              component={RouterLink}
              to="/settings"
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="navigation"
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.05)'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // AppBar height
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 2,
              bgcolor: 'background.paper',
              minHeight: 'calc(100vh - 64px - 48px)'
            }}
          >
            {children}
          </Paper>
        </Container>
      </Box>
    </Box>
  );
}

export default Layout;

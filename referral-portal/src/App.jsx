import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, Drawer, List,
  ListItemButton, ListItemIcon, ListItemText, Typography, Divider, Avatar } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClientForm from './pages/ClientForm/ClientForm';
import StaffLogin from './pages/StaffLogin/StaffLogin';
import QueueBoard from './pages/QueueBoard/QueueBoard';
import StaffManagement from './pages/StaffManagement/StaffManagement';
import AssignmentAccept from './pages/AssignmentAccept/AssignmentAccept';

const SIDEBAR_WIDTH = 220;

const theme = createTheme({
  palette: {
    primary: { main: '#00838f' },
    secondary: { main: '#7b1fa2' },
    background: { default: '#f5f5f5' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 500 } } },
  },
});

const NAV_ITEMS = [
  { label: 'Booking Queue', icon: <DashboardIcon />, to: '/staff/queue' },
  { label: 'People', icon: <PeopleIcon />, to: '/staff/people' },
];

function StaffSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/staff/login'); };

  return (
    <Drawer variant="permanent" sx={{
      width: SIDEBAR_WIDTH, flexShrink: 0,
      '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, boxSizing: 'border-box',
        bgcolor: '#1a2332', color: 'white', borderRight: 'none' },
    }}>
      <Box sx={{ p: 2.5, pb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ color: '#00bcd4', fontWeight: 700, letterSpacing: 1, fontSize: '0.7rem', textTransform: 'uppercase' }}>
          Dress for Success
        </Typography>
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700, lineHeight: 1.2, mt: 0.5 }}>
          Staff Portal
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />

      <List sx={{ px: 1, mt: 1, flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton key={item.to} component={NavLink} to={item.to}
            sx={{
              borderRadius: 2, mb: 0.5, color: 'rgba(255,255,255,0.7)',
              '&.active': { bgcolor: 'rgba(0,188,212,0.15)', color: '#00bcd4' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: 'white' },
            }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mx: 2 }} />
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: '0.8rem' }}>
          {(user?.displayName || user?.username || '?')[0].toUpperCase()}
        </Avatar>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: 'white', fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user?.displayName || user?.username}
          </Typography>
        </Box>
        <ListItemIcon onClick={handleLogout} sx={{ minWidth: 0, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', '&:hover': { color: 'white' } }}>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
      </Box>
    </Drawer>
  );
}

function StaffLayout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <StaffSidebar />
      <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </Box>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<ClientForm />} />
              <Route path="/staff/login" element={<StaffLogin />} />
              <Route path="/assignment/:token" element={<AssignmentAccept />} />
              <Route path="/staff/queue" element={
                <ProtectedRoute>
                  <StaffLayout><QueueBoard /></StaffLayout>
                </ProtectedRoute>
              } />
              <Route path="/staff/people" element={
                <ProtectedRoute>
                  <StaffLayout><StaffManagement /></StaffLayout>
                </ProtectedRoute>
              } />
              <Route path="/staff/dashboard" element={<Navigate to="/staff/queue" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}


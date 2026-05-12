import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClientForm from './pages/ClientForm/ClientForm';
import StaffLogin from './pages/StaffLogin/StaffLogin';
import Dashboard from './pages/Dashboard/Dashboard';
import ReferralDetail from './pages/ReferralDetail/ReferralDetail';

const theme = createTheme({
  palette: {
    primary: { main: '#00838f' },       // Teal
    secondary: { main: '#7b1fa2' },     // Purple
    background: { default: '#fafafa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<ClientForm />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/staff/referrals/:id" element={
              <ProtectedRoute><ReferralDetail /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

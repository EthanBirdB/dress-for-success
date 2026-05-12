import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, TextField, MenuItem, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton,
  TablePagination, CircularProgress, AppBar, Toolbar, Button, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getReferrals } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const STATUS_COLORS = {
  PENDING: 'warning',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

const REASON_LABELS = {
  INTERVIEW: 'Job Interview',
  WEDDING: 'Wedding',
  COURT_APPEARANCE: 'Court Appearance',
  JOB_START: 'New Job',
  OTHER: 'Other',
};

export default function Dashboard() {
  const [referrals, setReferrals] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: rowsPerPage, sortBy: 'createdAt', sortDir: 'desc' };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await getReferrals(params);
      setReferrals(data.content);
      setTotalElements(data.totalElements);
    } catch (err) {
      console.error('Failed to fetch referrals', err);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setSearch(searchInput);
  };

  const handleLogout = () => { logout(); navigate('/staff/login'); };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }} fontWeight={600}>
            Dress for Success — Staff Portal
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.displayName || user?.username}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField select size="small" label="Status" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              sx={{ minWidth: 160 }}>
              {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, flexGrow: 1 }}>
              <TextField size="small" placeholder="Search by name or phone..."
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                sx={{ flexGrow: 1, maxWidth: 400 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                }} />
              <Button type="submit" variant="outlined" size="small">Search</Button>
            </Box>
            <IconButton onClick={fetchData} title="Refresh"><RefreshIcon /></IconButton>
          </Box>
        </Paper>

        <TableContainer component={Paper}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                    <TableCell>Name</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Submitted</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {referrals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">No referrals found</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    referrals.map((r) => (
                      <TableRow key={r.id} hover sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/staff/referrals/${r.id}`)}>
                        <TableCell>{r.firstName} {r.lastName}</TableCell>
                        <TableCell>{r.phoneNumber}</TableCell>
                        <TableCell>
                          {REASON_LABELS[r.referralReason] || r.referralReason}
                          {r.referralReason === 'OTHER' && r.referralReasonOther
                            ? ` (${r.referralReasonOther})` : ''}
                        </TableCell>
                        <TableCell>
                          <Chip label={r.source} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Chip label={r.status.replace('_', ' ')}
                            color={STATUS_COLORS[r.status]} size="small" />
                        </TableCell>
                        <TableCell>
                          {new Date(r.createdAt).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                component="div" count={totalElements} page={page}
                onPageChange={(_, p) => setPage(p)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[10, 20, 50]}
              />
            </>
          )}
        </TableContainer>
      </Container>
    </Box>
  );
}

import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Chip, Paper, CircularProgress, TextField, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Drawer, Divider, Avatar, Button, InputAdornment, Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import AssignmentIcon from '@mui/icons-material/Assignment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { getBookings, getAllStaff, updateBookingStatus } from '../../services/api';

const LOCATIONS = ['Illawarra', 'Newcastle Hunter', 'Tasmania', 'Melbourne'];

const STATUS_COLORS = {
  QUEUED: 'warning', ASSIGNED: 'info', ACCEPTED: 'success',
  IN_PROGRESS: 'primary', COMPLETED: 'success', CANCELLED: 'error',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'ASSIGNED', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function StatCard({ icon, label, value, color }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 2, flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: '50%', bgcolor: `${color}.50`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: `${color}.main` }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
      </Box>
    </Paper>
  );
}

export default function Dashboard() {
  const [bookings, setBookings] = useState([]);
  const [staffMap, setStaffMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const handleStatusChange = async (newStatus) => {
    if (!selected) return;
    setStatusUpdating(true);
    try {
      await updateBookingStatus(selected.id, newStatus);
      const updated = { ...selected, status: newStatus };
      setSelected(updated);
      setBookings(prev => prev.map(b => b.id === selected.id ? updated : b));
    } catch (e) { console.error(e); }
    finally { setStatusUpdating(false); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (locationFilter) params.location = locationFilter;
      if (search) params.search = search;
      const [bookRes, staffRes] = await Promise.all([getBookings(params), getAllStaff()]);
      setBookings(bookRes.data.content);
      const map = {};
      for (const s of staffRes.data) map[s.id] = s;
      setStaffMap(map);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [statusFilter, locationFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const stats = {
    total: bookings.length,
    queued: bookings.filter(b => b.status === 'QUEUED').length,
    assigned: bookings.filter(b => ['ASSIGNED', 'ACCEPTED'].includes(b.status)).length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
  };

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">Overview of all bookings and their assignment status</Typography>
      </Box>

      {/* Stats row */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <StatCard icon={<AssignmentIcon />} label="Total Bookings" value={stats.total} color="primary" />
        <StatCard icon={<HourglassEmptyIcon />} label="Queued" value={stats.queued} color="warning" />
        <StatCard icon={<PersonIcon />} label="Assigned / Accepted" value={stats.assigned} color="info" />
        <StatCard icon={<CheckCircleIcon />} label="Completed" value={stats.completed} color="success" />
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center">
          <TextField select size="small" label="Status" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)} sx={{ minWidth: 150 }}>
            {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Location" value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)} sx={{ minWidth: 160 }}>
            <MenuItem value="">All Locations</MenuItem>
            {LOCATIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
          <Box component="form" onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} sx={{ flex: 1, minWidth: 200 }}>
            <TextField size="small" fullWidth placeholder="Search by name or phone..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          </Box>
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Client</TableCell>
                <TableCell>Date / Time</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Traits</TableCell>
                <TableCell>Assigned To</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bookings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No bookings found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {bookings.map(b => {
                const assignedStaff = b.assignedStaffId ? staffMap[b.assignedStaffId] : null;
                return (
                  <TableRow key={b.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => setSelected(b)}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 34, height: 34, fontSize: '0.85rem', fontWeight: 700,
                          bgcolor: 'primary.main' }}>
                          {b.firstName[0]}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{b.firstName} {b.lastName}</Typography>
                          <Typography variant="caption" color="text.secondary">{b.phoneNumber}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {b.scheduledDate ? (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <CalendarTodayIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                            <Typography variant="caption">
                              {new Date(b.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </Typography>
                          </Box>
                          {b.scheduledTime && <Typography variant="caption" color="text.secondary">{b.scheduledTime}</Typography>}
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">-</Typography>}
                    </TableCell>
                    <TableCell>
                      {b.location ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                          <LocationOnIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
                          <Typography variant="caption">{b.location}</Typography>
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">-</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip label={b.status === 'ASSIGNED' ? 'Pending' : b.status.replace('_', ' ')} size="small"
                        color={STATUS_COLORS[b.status]} sx={{ fontSize: '0.65rem' }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
                        {(b.characteristics || []).slice(0, 2).map(t => (
                          <Chip key={t} label={t} size="small" variant="outlined"
                            sx={{ fontSize: '0.6rem', height: 18, borderColor: 'primary.light', color: 'primary.dark' }} />
                        ))}
                        {(b.characteristics || []).length > 2 && (
                          <Chip label={`+${b.characteristics.length - 2}`} size="small"
                            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'grey.100' }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {assignedStaff ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <PersonIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          <Typography variant="caption" color="success.main" fontWeight={600}>
                            {assignedStaff.name}
                          </Typography>
                        </Box>
                      ) : <Typography variant="caption" color="text.disabled">Unassigned</Typography>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* Detail Drawer */}
      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: 420, p: 3 } }}>
        {selected && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar sx={{ width: 52, height: 52, fontSize: '1.1rem', fontWeight: 700, bgcolor: 'primary.main' }}>
                {selected.firstName[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{selected.firstName} {selected.lastName}</Typography>
                <Chip
                  label={selected.status === 'ASSIGNED' ? 'Pending' : selected.status.replace('_', ' ')}
                  size="small"
                  color={STATUS_COLORS[selected.status]}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.5}>
              {selected.phoneNumber && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Phone</Typography>
                  <Typography variant="body2">{selected.phoneNumber}</Typography>
                </Box>
              )}
              {selected.email && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Email</Typography>
                  <Typography variant="body2">{selected.email}</Typography>
                </Box>
              )}
              {selected.scheduledDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Appointment</Typography>
                  <Typography variant="body2">
                    {new Date(selected.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    {selected.scheduledTime && ` at ${selected.scheduledTime}`}
                  </Typography>
                </Box>
              )}
              {selected.location && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Location</Typography>
                  <Typography variant="body2">{selected.location}</Typography>
                </Box>
              )}
              {(selected.characteristics || []).length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600} gutterBottom>Traits Requested</Typography>
                  <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                    {selected.characteristics.map(t => (
                      <Chip key={t} label={t} size="small" color="primary" variant="outlined"
                        sx={{ fontSize: '0.65rem' }} />
                    ))}
                  </Stack>
                </Box>
              )}
              {selected.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Description</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic', color: 'text.secondary', fontSize: '0.875rem' }}>
                    "{selected.description}"
                  </Typography>
                </Box>
              )}
              {(selected.dressSize || selected.topSize || selected.bottomSize || selected.shoeSize) && (
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>Sizing</Typography>
                  <Stack direction="row" gap={1} sx={{ mt: 0.5 }}>
                    {selected.dressSize && <Chip label={`Dress: ${selected.dressSize}`} size="small" />}
                    {selected.topSize && <Chip label={`Top: ${selected.topSize}`} size="small" />}
                    {selected.bottomSize && <Chip label={`Bottom: ${selected.bottomSize}`} size="small" />}
                    {selected.shoeSize && <Chip label={`Shoe: ${selected.shoeSize}`} size="small" />}
                  </Stack>
                </Box>
              )}
              {selected.assignedStaffId && staffMap[selected.assignedStaffId] && (
                <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
                  Assigned to: <strong>{staffMap[selected.assignedStaffId].name}</strong>
                </Alert>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>Actions</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" color="primary"
                disabled={statusUpdating || selected.status === 'ASSIGNED'}
                onClick={() => handleStatusChange('ASSIGNED')}>
                Reassign (Pending)
              </Button>
              <Button size="small" variant="outlined" color="error"
                disabled={statusUpdating || selected.status === 'CANCELLED'}
                onClick={() => handleStatusChange('CANCELLED')}>
                Cancel Booking
              </Button>
            </Stack>

            <Button sx={{ mt: 3 }} fullWidth variant="outlined" onClick={() => setSelected(null)}>Close</Button>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}

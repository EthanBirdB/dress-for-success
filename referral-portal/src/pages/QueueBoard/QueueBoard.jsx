import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Chip, Paper, CircularProgress, InputAdornment,
  TextField, MenuItem, IconButton, Stack, Tooltip, Badge,
  Switch, FormControlLabel, Snackbar, Alert, Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBookings, autoAssignBooking, bulkAutoAssign, sendAllAssignments } from '../../services/api';
import CandidateCloud from '../../components/CandidateCloud/CandidateCloud';

const LOCATIONS = ['Illawarra', 'Newcastle Hunter', 'Tasmania', 'Melbourne'];

const STATUS_COLORS = {
  QUEUED: 'warning', ASSIGNED: 'info', ACCEPTED: 'success',
  IN_PROGRESS: 'primary', COMPLETED: 'success', CANCELLED: 'error',
};

const STATUS_LABELS = {
  QUEUED: 'Queued', ASSIGNED: 'Pending', ACCEPTED: 'Accepted',
  IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'ASSIGNED', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

function BookingCard({ booking, isSelected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: booking.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <Paper ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={onClick} elevation={isSelected ? 3 : 1}
      sx={{
        p: 2, mb: 1.5, cursor: 'grab', borderRadius: 2,
        border: isSelected ? '2px solid' : '2px solid transparent',
        borderColor: isSelected ? 'primary.main' : 'transparent',
        bgcolor: isSelected ? 'primary.50' : 'white',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        '&:hover': { boxShadow: 3 },
        userSelect: 'none',
      }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
          {booking.firstName} {booking.lastName}
        </Typography>
        <Chip label={STATUS_LABELS[booking.status] || booking.status.replace('_', ' ')} color={STATUS_COLORS[booking.status] || 'default'}
          size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ mb: 1, color: 'text.secondary' }}>
        {booking.scheduledDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <CalendarTodayIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption">{new Date(booking.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</Typography>
          </Box>
        )}
        {booking.scheduledTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <AccessTimeIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption">{booking.scheduledTime}</Typography>
          </Box>
        )}
        {booking.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <LocationOnIcon sx={{ fontSize: 12 }} />
            <Typography variant="caption">{booking.location}</Typography>
          </Box>
        )}
      </Stack>

      <Stack direction="row" flexWrap="wrap" gap={0.5}>
        {(booking.characteristics || []).slice(0, 3).map(tag => (
          <Chip key={tag} label={tag} size="small" variant="outlined"
            sx={{ fontSize: '0.6rem', height: 18, borderColor: 'primary.light', color: 'primary.dark' }} />
        ))}
        {(booking.characteristics || []).length > 3 && (
          <Chip label={`+${booking.characteristics.length - 3}`} size="small"
            sx={{ fontSize: '0.6rem', height: 18, bgcolor: 'grey.100' }} />
        )}
      </Stack>

      {booking.assignedStaffId && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
          <PersonIcon sx={{ fontSize: 12, color: 'success.main' }} />
          <Typography variant="caption" color="success.main" fontWeight={600}>Assigned</Typography>
        </Box>
      )}
    </Paper>
  );
}

export default function QueueBoard() {
  const [bookings, setBookings] = useState([]);
  const [orderedIds, setOrderedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [autoAssign, setAutoAssign] = useState(false);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [sendAllRunning, setSendAllRunning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (locationFilter) params.location = locationFilter;
      if (search) params.search = search;
      const { data } = await getBookings(params);
      setBookings(data.content);
      setOrderedIds(data.content.map(b => b.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, locationFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  useEffect(() => {
    if (selectedBooking) {
      const fresh = bookings.find(b => b.id === selectedBooking.id);
      if (fresh) setSelectedBooking(fresh);
    }
  }, [bookings]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds(ids => {
        const oldIdx = ids.indexOf(active.id);
        const newIdx = ids.indexOf(over.id);
        return arrayMove(ids, oldIdx, newIdx);
      });
    }
  };

  const handleCardClick = async (booking) => {
    if (autoAssign) {
      setAutoAssigning(true);
      setSelectedBooking(booking);
      try {
        const { data } = await autoAssignBooking(booking.id);
        setBookings(prev => prev.map(b => b.id === booking.id
          ? { ...b, assignedStaffId: data.candidate.staffId, status: 'ASSIGNED' } : b));
        setSelectedBooking(prev => ({ ...prev, assignedStaffId: data.candidate.staffId, status: 'ASSIGNED' }));
        setSnackbar({ open: true, message: data.message, severity: 'success' });
      } catch (e) {
        setSnackbar({ open: true, message: e.response?.data?.error || 'Auto-assign failed', severity: 'error' });
      } finally {
        setAutoAssigning(false);
      }
    } else {
      setSelectedBooking(booking);
    }
  };

  const orderedBookings = orderedIds
    .map(id => bookings.find(b => b.id === id))
    .filter(Boolean);

  const handleAssigned = (bookingId, staffId) => {
    setBookings(prev => prev.map(b => b.id === bookingId
      ? { ...b, assignedStaffId: staffId, status: 'ASSIGNED' } : b));
    if (selectedBooking?.id === bookingId)
      setSelectedBooking(prev => ({ ...prev, assignedStaffId: staffId, status: 'ASSIGNED' }));
  };

  const handleSendAll = async () => {
    setSendAllRunning(true);
    try {
      const { data } = await sendAllAssignments();
      const sent = data.results.filter(r => r.status === 'sent').length;
      setSnackbar({ open: true, severity: 'success', message: `Sent ${sent} assignment requests (best-first-served)` });
      fetchBookings();
    } catch (e) {
      setSnackbar({ open: true, severity: 'error', message: 'Send all failed' });
    } finally { setSendAllRunning(false); }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'grey.100' }}>
      {/* ── Left: Queue panel ── */}
      <Box sx={{ width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>

        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" fontWeight={700}>Booking Queue</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Badge badgeContent={bookings.length} color="primary" max={99}>
                <Box />
              </Badge>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchBookings}><RefreshIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            <TextField select size="small" fullWidth label="Status" value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setSelectedBooking(null); }}>
              {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" fullWidth label="Location" value={locationFilter}
              onChange={e => { setLocationFilter(e.target.value); setSelectedBooking(null); }}>
              <MenuItem value="">All Locations</MenuItem>
              {LOCATIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
            </TextField>
          </Stack>

          <Box component="form" onSubmit={e => { e.preventDefault(); setSearch(searchInput); }} sx={{ mb: 1 }}>
            <TextField size="small" fullWidth placeholder="Search by name or phone..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            bgcolor: autoAssign ? 'error.50' : 'grey.50', borderRadius: 1.5, px: 1.5, py: 0.5,
            border: '1px solid', borderColor: autoAssign ? 'error.200' : 'grey.200', mb: 1 }}>
            <Box>
              <Typography variant="caption" fontWeight={700} color={autoAssign ? 'error.main' : 'text.secondary'}>
                Auto-assign mode
              </Typography>
              <Typography variant="caption" display="block" color="text.disabled" sx={{ fontSize: '0.6rem' }}>
                {autoAssign ? 'Click a booking to instantly assign top match' : 'Off — shows candidate list'}
              </Typography>
            </Box>
            <Switch size="small" checked={autoAssign} onChange={e => setAutoAssign(e.target.checked)}
              color="error" />
          </Box>

          <Tooltip title="Auto-assign ALL queued bookings in one click">
            <Box>
              <Button fullWidth size="small" variant="outlined" color="warning"
                disabled={bulkRunning || sendAllRunning}
                onClick={async () => {
                  setBulkRunning(true);
                  try {
                    const { data } = await bulkAutoAssign();
                    const assigned = data.results.filter(r => r.status === 'assigned').length;
                    const noMatch = data.results.filter(r => r.status === 'no_candidates').length;
                    setSnackbar({ open: true, severity: 'success', message: `Actioned ${data.processed} bookings: ${assigned} assigned, ${noMatch} unmatched` });
                    fetchBookings();
                  } catch (e) {
                    setSnackbar({ open: true, severity: 'error', message: 'Bulk assign failed' });
                  } finally { setBulkRunning(false); }
                }}>
                {bulkRunning ? <CircularProgress size={14} /> : 'Action All'}
              </Button>
            </Box>
          </Tooltip>
        </Box>

        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}><CircularProgress /></Box>
          ) : orderedBookings.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', pt: 4 }}>No bookings found</Typography>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                {orderedBookings.map(booking => (
                  <BookingCard key={booking.id} booking={booking}
                    isSelected={selectedBooking?.id === booking.id}
                    onClick={() => handleCardClick(booking)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Box>
      </Box>

      {/* ── Right: Candidate cloud panel ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {autoAssigning && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.85)', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress color="primary" />
            <Typography variant="body1" fontWeight={600}>Finding best match with AI…</Typography>
          </Box>
        )}
        {selectedBooking ? (
          <CandidateCloud
            booking={selectedBooking}
            onAssigned={handleAssigned}
            onRefresh={fetchBookings}
            onSendAll={handleSendAll}
            sendAllRunning={sendAllRunning}
          />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
            <Box sx={{ fontSize: 80, mb: 2 }}>👗</Box>
            <Typography variant="h5" fontWeight={600} color="text.secondary">Select a Booking</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              {autoAssign
                ? 'Click a booking to instantly assign the best-matched candidate'
                : 'Click a booking in the queue to view matched candidates'}
            </Typography>
          </Box>
        )}
      </Box>

      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}


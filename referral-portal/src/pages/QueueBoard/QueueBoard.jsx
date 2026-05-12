import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box, Typography, Chip, Paper, CircularProgress, InputAdornment,
  TextField, MenuItem, IconButton, Stack, Tooltip, Badge
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getBookings } from '../../services/api';
import CandidateCloud from '../../components/CandidateCloud/CandidateCloud';

const STATUS_COLORS = {
  QUEUED: 'warning', ASSIGNED: 'info', ACCEPTED: 'success',
  IN_PROGRESS: 'primary', COMPLETED: 'success', CANCELLED: 'error',
};

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
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
        <Chip label={booking.status.replace('_', ' ')} color={STATUS_COLORS[booking.status]}
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
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await getBookings(params);
      setBookings(data.content);
      setOrderedIds(data.content.map(b => b.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  // Keep selectedBooking fresh after re-fetch
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

  const orderedBookings = orderedIds
    .map(id => bookings.find(b => b.id === id))
    .filter(Boolean);

  const handleAssigned = (bookingId, staffId) => {
    setBookings(prev => prev.map(b => b.id === bookingId
      ? { ...b, assignedStaffId: staffId, status: 'ASSIGNED' } : b));
    if (selectedBooking?.id === bookingId)
      setSelectedBooking(prev => ({ ...prev, assignedStaffId: staffId, status: 'ASSIGNED' }));
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

          <TextField select size="small" fullWidth value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedBooking(null); }}
            sx={{ mb: 1 }}>
            {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </TextField>

          <Box component="form" onSubmit={e => { e.preventDefault(); setSearch(searchInput); }}>
            <TextField size="small" fullWidth placeholder="Search by name or phone..."
              value={searchInput} onChange={e => setSearchInput(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
          </Box>
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
                    onClick={() => setSelectedBooking(booking)} />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </Box>
      </Box>

      {/* ── Right: Candidate cloud panel ── */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {selectedBooking ? (
          <CandidateCloud booking={selectedBooking} onAssigned={handleAssigned} onRefresh={fetchBookings} />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '100%', color: 'text.disabled' }}>
            <Box sx={{ fontSize: 80, mb: 2 }}>👗</Box>
            <Typography variant="h5" fontWeight={600} color="text.secondary">Select a Booking</Typography>
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              Click a booking in the queue to view matched candidates
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

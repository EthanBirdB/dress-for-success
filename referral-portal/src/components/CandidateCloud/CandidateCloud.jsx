import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Divider,
  Button, Stack, Avatar, LinearProgress, Alert, Snackbar,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  TextField, MenuItem, Collapse,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SendIcon from '@mui/icons-material/Send';
import { getCandidates, assignStaff, getAllStaff } from '../../services/api';

function photoIndex(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 70;
}
function profilePhotoUrl(name) {
  return `https://randomuser.me/api/portraits/women/${photoIndex(name)}.jpg`;
}

function MatchBar({ score }) {
  const pct = Math.round(score * 100);
  return (
    <Box sx={{ minWidth: 80 }}>
      <Typography variant="caption" fontWeight={700}
        color={pct > 70 ? 'success.main' : pct > 40 ? 'warning.main' : 'text.secondary'}>
        {pct}%
      </Typography>
      <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.3, height: 4, borderRadius: 2,
        '& .MuiLinearProgress-bar': { bgcolor: pct > 70 ? 'success.main' : pct > 40 ? 'warning.main' : 'grey.400' } }} />
    </Box>
  );
}

function StaffRow({ c, isMatched, isSelected, bookingChars, onClick }) {
  return (
    <TableRow hover selected={isSelected} onClick={onClick}
      sx={{ cursor: 'pointer', bgcolor: isSelected ? 'primary.50' : undefined, opacity: isMatched ? 1 : 0.7 }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={profilePhotoUrl(c.name)}
            sx={{ width: 38, height: 38, bgcolor: c.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>
            {c.name[0]}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
            <Chip label={c.type} size="small" sx={{ height: 16, fontSize: '0.6rem' }}
              color={c.type === 'STAFF' ? 'primary' : 'secondary'} variant="outlined" />
          </Box>
        </Box>
      </TableCell>
      <TableCell sx={{ minWidth: 90 }}>
        {isMatched && c.finalScore > 0
          ? <MatchBar score={c.finalScore} />
          : <Typography variant="caption" color="text.disabled">—</Typography>}
      </TableCell>
      <TableCell>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {(c.traits || []).slice(0, 3).map(t => (
            <Chip key={t} label={t} size="small" sx={{ fontSize: '0.6rem', height: 18 }}
              color={isMatched && (bookingChars || []).includes(t) ? 'primary' : 'default'}
              variant={isMatched && (bookingChars || []).includes(t) ? 'filled' : 'outlined'} />
          ))}
          {(c.traits || []).length > 3 && (
            <Chip label={`+${c.traits.length - 3}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
          )}
        </Stack>
      </TableCell>
      <TableCell align="right">
        <Button size="small" variant={isSelected ? 'contained' : 'outlined'}
          onClick={e => { e.stopPropagation(); onClick(); }}>Select</Button>
      </TableCell>
    </TableRow>
  );
}

function SectionRow({ label, color }) {
  return (
    <TableRow>
      <TableCell colSpan={4} sx={{ py: 0.75, bgcolor: color + '.50', borderBottom: '1px solid', borderColor: color + '.200' }}>
        <Typography variant="caption" fontWeight={700} color={color + '.dark'}>{label}</Typography>
      </TableCell>
    </TableRow>
  );
}

function ProfileExpandRow({ c, booking, staffById, assigning, assignedLink, onAssign, onClose }) {
  const av = c.availability;
  const avStr = !av ? '' : typeof av === 'string' ? av
    : `${Array.isArray(av.days) ? av.days.join(', ') : (av.days || '')}${av.startTime ? ' ' + av.startTime : ''}${av.endTime ? '\u2013' + av.endTime : ''}`;
  const locs = (staffById[c.staffId]?.locations) || c.locations || [];
  return (
    <TableRow sx={{ bgcolor: 'primary.50' }}>
      <TableCell colSpan={4} sx={{ p: 0, borderBottom: '2px solid', borderColor: 'primary.200' }}>
        <Collapse in unmountOnExit>
          <Box sx={{ p: 2 }}>
              {avStr.trim() && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Availability: {avStr}
                </Typography>
              )}
              {locs.length > 0 && (
                <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  {locs.map(l => (
                    <Chip key={l} label={l} size="small" variant="outlined"
                      sx={{ height: 16, fontSize: '0.6rem' }} />
                  ))}
                </Stack>
              )}
              {c.bio && (
                <Typography variant="caption" color="text.secondary"
                  sx={{ fontStyle: 'italic', display: 'block', mt: 0.75 }}>
                  "{c.bio}"
                </Typography>
              )}
              {(c.traits || []).length > 0 && (
                <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
                  {c.traits.map(t => (
                    <Chip key={t} label={t} size="small"
                      color={(booking.characteristics || []).includes(t) ? 'primary' : 'default'}
                      variant={(booking.characteristics || []).includes(t) ? 'filled' : 'outlined'}
                      sx={{ fontSize: '0.6rem', height: 18 }} />
                  ))}
                </Stack>
              )}
              <Divider sx={{ my: 1 }} />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={onAssign}
                  disabled={assigning || !!assignedLink}
                  startIcon={assignedLink ? <CheckCircleIcon /> : null}>
                  {assigning
                    ? <CircularProgress size={14} color="inherit" />
                    : assignedLink ? 'Assigned \u2713' : `Assign ${c.name.split(' ')[0]}`}
                </Button>
                <Button size="small" variant="outlined" onClick={onClose}>Close</Button>
              </Stack>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

export default function CandidateCloud({ booking, onAssigned, onRefresh, onSendAll, sendAllRunning }) {
  const [candidates, setCandidates] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignedLink, setAssignedLink] = useState(null);
  const [snackbar, setSnackbar] = useState('');
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setCandidates([]);
    setAllStaff([]);
    setSelected(null);
    setAssignedLink(null);
    setUnmatchedOpen(false);
    Promise.all([getCandidates(booking.id), getAllStaff()])
      .then(([cRes, sRes]) => {
        setCandidates(cRes.data);
        setAllStaff(sRes.data.filter(s => s.isActive !== false));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [booking?.id]);

  const matchedIds = new Set(candidates.map(c => c.staffId));
  const staffById = Object.fromEntries(allStaff.map(s => [s.id, s]));
  const unmatched = allStaff
    .filter(s => !matchedIds.has(s.id))
    .map(s => ({
      staffId: s.id, name: s.name, type: s.type, traits: s.traits || [],
      bio: s.bio || '', availability: s.availability, locations: s.locations || [],
      matchingTraits: [], tagScore: 0, aiScore: null, finalScore: 0,
    }));

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const { data } = await assignStaff(booking.id, selected.staffId);
      setAssignedLink(data.acceptLink);
      setSnackbar(`Request sent to ${selected.name}!`);
      onAssigned(booking.id, selected.staffId);
      if (onRefresh) onRefresh();
    } catch (e) {
      setSnackbar('Failed to assign. Please try again.');
    } finally { setAssigning(false); }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Booking header ── */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ flex: 1, mr: 2 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 0.75 }}>
              {booking.firstName} {booking.lastName}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {booking.scheduledDate && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(booking.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    {booking.scheduledTime ? ` · ${booking.scheduledTime}` : ''}
                  </Typography>
                </Box>
              )}
              {booking.location && (
                <Typography variant="caption" color="text.secondary">· {booking.location}</Typography>
              )}
            </Stack>
          </Box>
          {onSendAll && (
            <Button size="small" variant="outlined" color="secondary"
              disabled={sendAllRunning}
              startIcon={sendAllRunning ? <CircularProgress size={13} /> : <SendIcon sx={{ fontSize: 14 }} />}
              onClick={onSendAll}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              Send All Requests
            </Button>
          )}
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {(booking.characteristics || []).map(tag => (
            <Chip key={tag} label={tag} size="small" color="primary" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
      </Box>

      {/* ── Staff list ── */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: 8, gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Finding best matches...</Typography>
          </Box>
        )}

        {!loading && (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Person</TableCell>
                  <TableCell>Match</TableCell>
                  <TableCell>Traits</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidates.length > 0 && (
                  <SectionRow label={`✓  ${candidates.length} matched staff`} color="success" />
                )}
                {[...candidates].sort((a, b) => b.finalScore - a.finalScore).map(c => (
                  <React.Fragment key={c.staffId}>
                    <StaffRow c={c} isMatched={true}
                      isSelected={selected?.staffId === c.staffId}
                      bookingChars={booking.characteristics}
                      onClick={() => setSelected(s => s?.staffId === c.staffId ? null : c)} />
                    {selected?.staffId === c.staffId && (
                      <ProfileExpandRow c={c} booking={booking}
                        staffById={staffById} assigning={assigning} assignedLink={assignedLink}
                        onAssign={handleAssign} onClose={() => setSelected(null)} />
                    )}
                  </React.Fragment>
                ))}

                {unmatched.length > 0 && (
                  <TableRow onClick={() => setUnmatchedOpen(o => !o)}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}>
                    <TableCell colSpan={4} sx={{ py: 0.75, bgcolor: 'grey.100',
                      borderBottom: '1px solid', borderColor: 'grey.300' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                          {candidates.length > 0 ? `↓  Other staff (${unmatched.length})` : `All staff (${unmatched.length})`}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {unmatchedOpen ? '▲ Collapse' : '▼ Expand'}
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
                {unmatchedOpen && unmatched.map(c => (
                  <React.Fragment key={c.staffId}>
                    <StaffRow c={c} isMatched={false}
                      isSelected={selected?.staffId === c.staffId}
                      bookingChars={booking.characteristics}
                      onClick={() => setSelected(s => s?.staffId === c.staffId ? null : c)} />
                    {selected?.staffId === c.staffId && (
                      <ProfileExpandRow c={c} booking={booking}
                        staffById={staffById} assigning={assigning} assignedLink={assignedLink}
                        onAssign={handleAssign} onClose={() => setSelected(null)} />
                    )}
                  </React.Fragment>
                ))}

                {candidates.length === 0 && unmatched.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No active staff members found</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      </Box>

      <Snackbar open={!!snackbar} autoHideDuration={8000} onClose={() => setSnackbar('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setSnackbar('')} severity="success" variant="filled"
          sx={{ width: '100%', alignItems: 'flex-start' }}>
          <Typography variant="body2" fontWeight={600}>{snackbar}</Typography>
          {assignedLink && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" display="block">Accept link:</Typography>
              <Box component="a" href={assignedLink} target="_blank"
                sx={{ fontSize: '0.7rem', color: 'inherit', wordBreak: 'break-all',
                  textDecoration: 'underline', opacity: 0.9, display: 'block' }}>
                {assignedLink}
              </Box>
            </Box>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
}

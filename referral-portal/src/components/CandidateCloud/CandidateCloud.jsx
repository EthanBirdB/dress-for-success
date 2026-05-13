import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Divider,
  Button, Stack, Avatar, LinearProgress, Alert, Snackbar,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  TextField, MenuItem, Collapse, Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { getCandidates, assignStaff, getAllStaff, getBookingAssignments, sendBookingRequests } from '../../services/api';

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

function StaffRow({ c, isMatched, isSelected, isAssigned, assignmentStatus, bookingChars, onClick }) {
  const isDenied = assignmentStatus === 'DENIED';
  const isAccepted = assignmentStatus === 'ACCEPTED';
  const clickable = !isAssigned && !isDenied;
  return (
    <TableRow hover={clickable} selected={isSelected && clickable} onClick={clickable ? onClick : undefined}
      sx={{ cursor: clickable ? 'pointer' : 'default',
        bgcolor: isDenied ? 'error.50' : isAccepted ? 'success.50' : isSelected ? 'primary.50' : undefined,
        opacity: isDenied ? 0.6 : isMatched ? 1 : 0.7 }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar src={profilePhotoUrl(c.name)}
            sx={{ width: 38, height: 38, bgcolor: c.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>
            {c.name[0]}
          </Avatar>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
              {c.aiScore !== null && c.aiScore !== undefined && (
                <Tooltip title={c.aiReason || 'AI-enhanced score'} arrow>
                  <AutoAwesomeIcon sx={{ fontSize: 12, color: 'secondary.main', cursor: 'help' }} />
                </Tooltip>
              )}
            </Box>
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
        {isAccepted && <Chip label="Accepted" size="small" color="success" sx={{ fontSize: '0.6rem', height: 20 }} />}
        {isDenied && <Chip label="Declined" size="small" color="error" sx={{ fontSize: '0.6rem', height: 20 }} />}
        {isAssigned && !isAccepted && !isDenied && <Chip label="Request sent" size="small" color="info" sx={{ fontSize: '0.6rem', height: 20 }} />}
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

function ProfileExpandRow({ c, booking, staffById, assigning, justAssigned, onAssign, onClose }) {
  const av = c.availability;
  const avStr = !av ? '' : typeof av === 'string' ? av
    : `${Array.isArray(av.days) ? av.days.join(', ') : (av.days || '')}${av.startTime ? ' ' + av.startTime : ''}${av.endTime ? '\u2013' + av.endTime : ''}`;
  const locs = (staffById[c.staffId]?.locations) || c.locations || [];
  return (
    <TableRow sx={{ bgcolor: 'primary.50' }}>
      <TableCell colSpan={4} sx={{ p: 0, borderBottom: '2px solid', borderColor: 'primary.200' }}>
        <Collapse in unmountOnExit>
          <Box sx={{ p: 2 }}>
              {c.aiReason && (
                <Alert severity="info" icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />}
                  sx={{ mb: 1.5, py: 0.5, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                  <em>"{c.aiReason}"</em>
                </Alert>
              )}
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
                <Button variant="contained" size="small" onClick={() => onAssign()}
                    disabled={assigning || justAssigned}
                    startIcon={justAssigned ? <CheckCircleIcon /> : null}>
                    {assigning
                      ? <CircularProgress size={14} color="inherit" />
                      : justAssigned ? 'Sent \u2713' : `Assign ${c.name.split(' ')[0]}`}
                </Button>
                <Button size="small" variant="outlined" onClick={onClose}>Close</Button>
              </Stack>
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}

export default function CandidateCloud({ booking, onAssigned, onRefresh }) {
  const [candidates, setCandidates] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [sendAllLoading, setSendAllLoading] = useState(false);
  const [assignedStaffId, setAssignedStaffId] = useState(null);
  const [sentStaffIds, setSentStaffIds] = useState(new Set());
  const [assignmentStatusMap, setAssignmentStatusMap] = useState({});
  const [snackbar, setSnackbar] = useState('');
  const [snackbarLink, setSnackbarLink] = useState(null);
  const [unmatchedOpen, setUnmatchedOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopCandidate, setAiTopCandidate] = useState(null);
  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setCandidates([]);
    setAllStaff([]);
    setSelected(null);
    setAssignedStaffId(null);
    setSentStaffIds(booking.assignedStaffId ? new Set([booking.assignedStaffId]) : new Set());
    setAssignmentStatusMap({});
    setUnmatchedOpen(false);
    setAiDialogOpen(false);
    setAiTopCandidate(null);
    Promise.all([getCandidates(booking.id), getAllStaff(), getBookingAssignments(booking.id)])
      .then(([cRes, sRes, aRes]) => {
        setCandidates(cRes.data);
        setAllStaff(sRes.data.filter(s => s.isActive !== false));
        const statusMap = {};
        const sent = new Set();
        // Only show assignment badges if the booking has actually been assigned/accepted
        // A QUEUED booking should never show stale "Request sent" chips
        if (booking.status !== 'QUEUED') {
          for (const a of aRes.data) {
            statusMap[a.staffId] = a.status;
            if (a.status !== 'DENIED') sent.add(a.staffId);
          }
        }
        setAssignmentStatusMap(statusMap);
        setSentStaffIds(sent);
        // Show AI insight dialog for top candidate (with or without AI reason)
        const sorted = [...cRes.data].sort((a, b) => b.finalScore - a.finalScore);
        const top = sorted[0];
        if (top && !statusMap[top.staffId]) {
          setAiTopCandidate(top);
          setAiDialogOpen(true);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [booking?.id]);

  // When booking is reset to QUEUED, clear all sent/assignment state immediately
  useEffect(() => {
    if (booking?.status === 'QUEUED') {
      setSentStaffIds(new Set());
      setAssignmentStatusMap({});
      setAssignedStaffId(null);
    }
  }, [booking?.status]);

  // Poll assignment statuses every 8 seconds so the list reflects accepts/declines in real time
  useEffect(() => {
    if (!booking?.id) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await getBookingAssignments(booking.id);
        setAssignmentStatusMap(prev => {
          const next = {};
          let changed = false;
          for (const a of data) {
            next[a.staffId] = a.status;
            if (prev[a.staffId] !== a.status) changed = true;
          }
          if (changed) {
            // Refresh the queue card status when something changed
            if (onRefresh) onRefresh();
            return next;
          }
          return prev;
        });
        setSentStaffIds(() => {
          const next = new Set();
          for (const a of data) {
            if (a.status !== 'DENIED') next.add(a.staffId);
          }
          return next;
        });
      } catch (e) { /* ignore poll errors silently */ }
    }, 8000);
    return () => clearInterval(interval);
  }, [booking?.id, onRefresh]);

  const matchedIds = new Set(candidates.map(c => c.staffId));
  const staffById = Object.fromEntries(allStaff.map(s => [s.id, s]));
  const unmatched = allStaff
    .filter(s => !matchedIds.has(s.id))
    .map(s => ({
      staffId: s.id, name: s.name, type: s.type, traits: s.traits || [],
      bio: s.bio || '', availability: s.availability, locations: s.locations || [],
      matchingTraits: [], tagScore: 0, aiScore: null, finalScore: 0,
    }));

  const handleSendAllRequests = async () => {
    setSendAllLoading(true);
    try {
      const { data } = await sendBookingRequests(booking.id);
      // Update local state with all newly sent requests
      const newSent = new Set(sentStaffIds);
      const newMap = { ...assignmentStatusMap };
      for (const r of data.results) {
        newSent.add(r.staffId);
        newMap[r.staffId] = 'PENDING';
      }
      setSentStaffIds(newSent);
      setAssignmentStatusMap(newMap);
      setSnackbar(`Sent ${data.sent} request${data.sent !== 1 ? 's' : ''} for this booking`);
      setSnackbarLink(null);
      if (onRefresh) onRefresh();
    } catch (e) {
      setSnackbar('Failed to send requests. Please try again.');
    } finally {
      setSendAllLoading(false);
    }
  };

  const handleAssign = async (candidateOverride) => {
    const target = candidateOverride || selected;
    if (!target) return;
    setAssigning(true);
    try {
      const { data } = await assignStaff(booking.id, target.staffId);
      setAssignedStaffId(target.staffId);
      setSentStaffIds(prev => new Set([...prev, target.staffId]));
      setAssignmentStatusMap(prev => ({ ...prev, [target.staffId]: 'PENDING' }));
      setSnackbar(`Request sent to ${target.name}!`);
      setSnackbarLink(data.acceptLink || null);
      onAssigned(booking.id, target.staffId);
      if (onRefresh) onRefresh();
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Unknown error';
      console.error('Assign failed:', msg, e);
      setSnackbar(`Failed to assign: ${msg}`);
      setSnackbarLink(null);
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
          <Button size="small" variant="outlined" color="secondary"
              disabled={sendAllLoading}
              startIcon={sendAllLoading ? <CircularProgress size={13} /> : <SendIcon sx={{ fontSize: 14 }} />}
              onClick={handleSendAllRequests}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              Send All Requests
            </Button>
        </Box>
        <Stack direction="row" flexWrap="wrap" gap={0.5}>
          {(booking.characteristics || []).map(tag => (
            <Chip key={tag} label={tag} size="small" color="primary" variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }} />
          ))}
        </Stack>
        {booking.description && (
          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', mt: 1, fontStyle: 'italic', lineHeight: 1.5 }}>
            {booking.description}
          </Typography>
        )}
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
                      isAssigned={sentStaffIds.has(c.staffId)}
                      assignmentStatus={assignmentStatusMap[c.staffId]}
                      bookingChars={booking.characteristics}
                      onClick={() => setSelected(s => s?.staffId === c.staffId ? null : c)} />
                    {selected?.staffId === c.staffId && (
                      <ProfileExpandRow c={c} booking={booking}
                        staffById={staffById} assigning={assigning}
                        justAssigned={assignedStaffId === c.staffId}
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
                      isAssigned={sentStaffIds.has(c.staffId)}
                      assignmentStatus={assignmentStatusMap[c.staffId]}
                      bookingChars={booking.characteristics}
                      onClick={() => setSelected(s => s?.staffId === c.staffId ? null : c)} />
                    {selected?.staffId === c.staffId && (
                      <ProfileExpandRow c={c} booking={booking}
                        staffById={staffById} assigning={assigning}
                        justAssigned={assignedStaffId === c.staffId}
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

      {/* ── AI Top Match Toast ── */}
      <Snackbar
        open={aiDialogOpen}
        onClose={() => setAiDialogOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ maxWidth: 380 }}
      >
        <Paper elevation={6} sx={{ width: 360, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'secondary.200' }}>
          <Box sx={{ bgcolor: 'secondary.main', px: 2, py: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoAwesomeIcon sx={{ color: 'white', fontSize: 16 }} />
              <Typography variant="subtitle2" fontWeight={700} color="white">AI Top Match</Typography>
            </Box>
            <Button size="small" onClick={() => setAiDialogOpen(false)}
              sx={{ color: 'white', minWidth: 0, p: 0.5, opacity: 0.8, '&:hover': { opacity: 1 } }}>✕</Button>
          </Box>
          {aiTopCandidate && (
            <Box sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Avatar src={profilePhotoUrl(aiTopCandidate.name)} sx={{ width: 44, height: 44 }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={700}>{aiTopCandidate.name}</Typography>
                  <Box sx={{ maxWidth: 120 }}><MatchBar score={aiTopCandidate.finalScore} /></Box>
                </Box>
                {aiTopCandidate.matchingTraits?.slice(0, 2).map(t => (
                  <Chip key={t} label={t} size="small" color="primary" sx={{ fontSize: '0.6rem', height: 18 }} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block', mb: 1.5, lineHeight: 1.5 }}>
                {aiTopCandidate.aiReason
                  ? `"${aiTopCandidate.aiReason}"`
                  : `Best match based on ${aiTopCandidate.matchingTraits?.length > 0 ? 'shared skills: ' + aiTopCandidate.matchingTraits.join(', ') : 'availability and location'}.`}
              </Typography>
              <Stack direction="row" spacing={1} justifyContent="flex-end">
                <Button size="small" onClick={() => setAiDialogOpen(false)} color="inherit">Dismiss</Button>
                <Button size="small" variant="contained" disabled={assigning}
                  startIcon={assigning ? <CircularProgress size={12} color="inherit" /> : <SendIcon sx={{ fontSize: 14 }} />}
                  onClick={() => { setAiDialogOpen(false); handleAssign(aiTopCandidate); }}>
                  Send Request
                </Button>
              </Stack>
            </Box>
          )}
        </Paper>
      </Snackbar>

      <Snackbar open={!!snackbar} autoHideDuration={10000} onClose={() => { setSnackbar(''); setSnackbarLink(null); }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => { setSnackbar(''); setSnackbarLink(null); }} severity="success" variant="filled"
          sx={{ width: '100%', alignItems: 'flex-start' }}>
          <Typography variant="body2" fontWeight={600}>{snackbar}</Typography>
          {snackbarLink && (
            <Box sx={{ mt: 0.5 }}>
              <Typography variant="caption" display="block" sx={{ opacity: 0.85 }}>Accept link:</Typography>
              <Box component="a" href={snackbarLink} target="_blank"
                sx={{ fontSize: '0.7rem', color: 'inherit', wordBreak: 'break-all',
                  textDecoration: 'underline', opacity: 0.9, display: 'block' }}>
                {snackbarLink}
              </Box>
            </Box>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
}

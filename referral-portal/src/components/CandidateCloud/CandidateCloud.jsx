import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Chip, CircularProgress, Drawer, Divider,
  Button, Stack, Avatar, LinearProgress, Tooltip, Alert, Snackbar,
  ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, Paper,
} from '@mui/material';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import ListIcon from '@mui/icons-material/List';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PeopleIcon from '@mui/icons-material/People';
import { getCandidates, assignStaff, getAllStaff } from '../../services/api';

function photoIndex(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 70;
}
function profilePhotoUrl(name) {
  return `https://randomuser.me/api/portraits/women/${photoIndex(name)}.jpg`;
}

function seededRandom(seed) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function layoutBubbles(candidates, width, height) {
  const rand = seededRandom(42);
  const padding = 20;
  const positions = [];
  const maxAttempts = 80;
  return candidates.map((c, i) => {
    const r = 30 + c.finalScore * 38;
    let x, y, attempts = 0;
    do {
      x = padding + r + rand() * (width - 2 * (padding + r));
      y = padding + r + rand() * (height - 2 * (padding + r));
      attempts++;
    } while (attempts < maxAttempts && positions.some(p => Math.hypot(p.x - x, p.y - y) < p.r + r + 8));
    positions.push({ x, y, r });
    return { ...c, x, y, r, diameter: r * 2 };
  });
}

function ScoreBar({ label, value, color }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
        <Typography variant="caption" color="text.secondary">{label}</Typography>
        <Typography variant="caption" fontWeight={700}>{value !== null ? `${Math.round(value * 100)}%` : 'N/A'}</Typography>
      </Box>
      <LinearProgress variant="determinate" value={value !== null ? value * 100 : 0}
        sx={{ height: 6, borderRadius: 3, bgcolor: 'grey.200', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}

export default function CandidateCloud({ booking, onAssigned, onRefresh }) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignedLink, setAssignedLink] = useState(null);
  const [snackbar, setSnackbar] = useState('');
  const [view, setView] = useState('cloud');
  const [showingAll, setShowingAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDims({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!booking) return;
    setLoading(true);
    setCandidates([]);
    setSelected(null);
    setAssignedLink(null);
    setShowingAll(false);
    getCandidates(booking.id)
      .then(r => setCandidates(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [booking?.id]);

  const handleLoadAll = async () => {
    setLoadingAll(true);
    try {
      const { data } = await getAllStaff();
      const allAsCandidates = data
        .filter(s => s.isActive !== false)
        .map(s => ({
          staffId: s.id,
          name: s.name,
          type: s.type,
          traits: s.traits || [],
          bio: s.bio || '',
          availability: s.availability,
          matchingTraits: [],
          tagScore: 0,
          aiScore: null,
          finalScore: 0.01, // small value so bubbles show
        }));
      setCandidates(allAsCandidates);
      setShowingAll(true);
    } catch (e) { console.error(e); }
    finally { setLoadingAll(false); }
  };

  const handleAssign = async () => {
    if (!selected) return;
    setAssigning(true);
    try {
      const { data } = await assignStaff(booking.id, selected.staffId);
      setAssignedLink(data.acceptLink);
      setSnackbar(`Assignment sent to ${selected.name}!`);
      onAssigned(booking.id, selected.staffId);
      if (onRefresh) onRefresh();
    } catch (e) {
      setSnackbar('Failed to assign. Please try again.');
    } finally { setAssigning(false); }
  };

  const noMatchFallback = (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Typography variant="h6" color="text.secondary">No matching staff found</Typography>
      <Typography variant="body2" color="text.disabled">No staff matched this booking's location and traits.</Typography>
      <Button variant="outlined" startIcon={loadingAll ? <CircularProgress size={16} /> : <PeopleIcon />}
        disabled={loadingAll} onClick={handleLoadAll}>
        View All Available Staff
      </Button>
    </Box>
  );

  const bookingHeader = (
    <Box sx={{ p: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="h6" fontWeight={700}>{booking.firstName} {booking.lastName}</Typography>
        <ToggleButtonGroup size="small" value={view} exclusive onChange={(_, v) => { if (v) setView(v); }}>
          <ToggleButton value="cloud" sx={{ px: 1.5, py: 0.5 }}>
            <BubbleChartIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="caption" fontWeight={600}>Cloud</Typography>
          </ToggleButton>
          <ToggleButton value="list" sx={{ px: 1.5, py: 0.5 }}>
            <ListIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="caption" fontWeight={600}>List</Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 0.5 }}>
        {(booking.characteristics || []).map(tag => (
          <Chip key={tag} label={tag} size="small" color="primary" variant="outlined"
            sx={{ fontSize: '0.65rem', height: 20 }} />
        ))}
      </Stack>
      {booking.scheduledDate && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
          <Typography variant="caption" color="text.secondary">
            {new Date(booking.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
            {booking.scheduledTime ? ` at ${booking.scheduledTime}` : ''}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // LIST VIEW
  if (view === 'list') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {bookingHeader}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pt: 8, gap: 2 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary">Finding best matches with AI...</Typography>
            </Box>
          )}
          {!loading && candidates.length === 0 && (
            <Box sx={{ pt: 8 }}>{noMatchFallback}</Box>
          )}
          {!loading && candidates.length > 0 && (
            <>
              {showingAll && (
                <Alert severity="info" sx={{ mb: 2, fontSize: '0.8rem' }}>
                  Showing all active staff. Match scores unavailable for unfiltered view.
                </Alert>
              )}
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
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
                    {[...candidates].sort((a, b) => b.finalScore - a.finalScore).map(c => {
                      const isSelected = selected?.staffId === c.staffId;
                      const pct = Math.round(c.finalScore * 100);
                      return (
                        <TableRow key={c.staffId} hover selected={isSelected}
                          onClick={() => setSelected(c)} sx={{ cursor: 'pointer', bgcolor: isSelected ? 'primary.50' : undefined }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar src={profilePhotoUrl(c.name)} sx={{ width: 40, height: 40,
                                bgcolor: c.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>
                                {c.name[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                                <Chip label={c.type} size="small" sx={{ height: 16, fontSize: '0.6rem' }}
                                  color={c.type === 'STAFF' ? 'primary' : 'secondary'} variant="outlined" />
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ minWidth: 100 }}>
                            {pct > 1 ? (
                              <Box>
                                <Typography variant="caption" fontWeight={700}
                                  color={pct > 70 ? 'success.main' : pct > 40 ? 'warning.main' : 'text.secondary'}>
                                  {pct}%
                                </Typography>
                                <LinearProgress variant="determinate" value={pct}
                                  sx={{ mt: 0.3, height: 4, borderRadius: 2,
                                    '& .MuiLinearProgress-bar': { bgcolor: pct > 70 ? 'success.main' : pct > 40 ? 'warning.main' : 'grey.400' } }} />
                              </Box>
                            ) : <Typography variant="caption" color="text.disabled">--</Typography>}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" flexWrap="wrap" gap={0.5}>
                              {(c.traits || []).slice(0, 3).map(t => (
                                <Chip key={t} label={t} size="small" sx={{ fontSize: '0.6rem', height: 18 }}
                                  color={(booking.characteristics || []).includes(t) ? 'primary' : 'default'}
                                  variant={(booking.characteristics || []).includes(t) ? 'filled' : 'outlined'} />
                              ))}
                              {(c.traits || []).length > 3 && (
                                <Chip label={`+${c.traits.length - 3}`} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" variant={isSelected ? 'contained' : 'outlined'}
                              onClick={e => { e.stopPropagation(); setSelected(c); }}>Select</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              {selected && (
                <Box sx={{ mt: 2, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar src={profilePhotoUrl(selected.name)} sx={{ width: 48, height: 48,
                      bgcolor: selected.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>{selected.name[0]}</Avatar>
                    <Typography variant="subtitle2" fontWeight={700}>Assign {selected.name}?</Typography>
                  </Box>
                  {selected.bio && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontStyle: 'italic', fontSize: '0.8rem' }}>
                      "{selected.bio}"
                    </Typography>
                  )}
                  {assignedLink && (
                    <Alert severity="success" sx={{ mb: 1, fontSize: '0.75rem' }}>
                      Sent! Accept link: <Box component="a" href={assignedLink} target="_blank" sx={{ wordBreak: 'break-all', fontSize: '0.7rem' }}>{assignedLink}</Box>
                    </Alert>
                  )}
                  <Button variant="contained" onClick={handleAssign} disabled={assigning || !!assignedLink}
                    startIcon={assignedLink ? <CheckCircleIcon /> : null}>
                    {assigning ? <CircularProgress size={18} color="inherit" />
                      : assignedLink ? 'Assigned' : `Assign ${selected.name.split(' ')[0]}`}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
        <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')}
          message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
      </Box>
    );
  }

  // CLOUD VIEW
  const laid = layoutBubbles(candidates, dims.width - 20, dims.height - 20);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {bookingHeader}
      <Box ref={containerRef} sx={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Finding best matches with AI...</Typography>
          </Box>
        )}
        {!loading && candidates.length === 0 && (
          <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            {noMatchFallback}
          </Box>
        )}
        {!loading && laid.map((c, i) => {
          const isStaff = c.type === 'STAFF';
          const color = isStaff ? '#00838f' : '#7b1fa2';
          const lightColor = isStaff ? '#e0f7fa' : '#f3e5f5';
          const pct = Math.round(c.finalScore * 100);
          const isSelected = selected?.staffId === c.staffId;
          return (
            <Tooltip key={c.staffId} arrow placement="top"
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="body2" fontWeight={700}>{c.name}</Typography>
                  <Typography variant="caption">{c.type}{pct > 1 ? ` - ${pct}% match` : ''}</Typography>
                  {c.matchingTraits?.length > 0 && (
                    <Typography variant="caption" display="block">matches: {c.matchingTraits.join(', ')}</Typography>
                  )}
                </Box>
              }>
              <Box onClick={() => setSelected(c)}
                sx={{
                  position: 'absolute', left: c.x - c.r, top: c.y - c.r,
                  width: c.diameter, height: c.diameter, borderRadius: '50%',
                  bgcolor: lightColor, border: `3px solid ${isSelected ? '#ff9800' : color}`,
                  boxShadow: isSelected ? '0 0 0 4px rgba(255,152,0,0.3), 0 4px 20px rgba(0,0,0,0.15)' : '0 4px 12px rgba(0,0,0,0.12)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                  animation: `floatIn 0.4s ease-out ${i * 0.06}s both`,
                  '@keyframes floatIn': {
                    from: { opacity: 0, transform: 'scale(0.3) translateY(20px)' },
                    to: { opacity: 1, transform: 'scale(1) translateY(0)' },
                  },
                  '&:hover': { transform: isSelected ? 'scale(1.12)' : 'scale(1.06)', boxShadow: '0 6px 20px rgba(0,0,0,0.18)' },
                }}>
                <Typography variant="caption" fontWeight={700} color={color}
                  sx={{ fontSize: c.r > 45 ? '0.7rem' : '0.55rem', textAlign: 'center',
                    px: 0.5, lineHeight: 1.2, maxWidth: c.diameter - 8, overflow: 'hidden',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {c.name.split(' ')[0]}
                </Typography>
                {c.r > 40 && pct > 1 && (
                  <Typography variant="caption" sx={{ fontSize: '0.6rem', color, fontWeight: 600, mt: 0.2 }}>{pct}%</Typography>
                )}
              </Box>
            </Tooltip>
          );
        })}
        {!loading && candidates.length > 0 && (
          <Box sx={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 1 }}>
            <Chip icon={<PersonIcon />} label="Staff" size="small" sx={{ bgcolor: '#e0f7fa', color: '#00838f', fontSize: '0.65rem' }} />
            <Chip icon={<VolunteerActivismIcon />} label="Volunteer" size="small" sx={{ bgcolor: '#f3e5f5', color: '#7b1fa2', fontSize: '0.65rem' }} />
            <Chip label="Bubble size = match score" size="small" sx={{ bgcolor: 'white', fontSize: '0.65rem' }} />
          </Box>
        )}
      </Box>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}
        PaperProps={{ sx: { width: 360, p: 3 } }}>
        {selected && (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Avatar src={profilePhotoUrl(selected.name)} sx={{ width: 64, height: 64,
                bgcolor: selected.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>
                {selected.name[0]}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight={700}>{selected.name}</Typography>
                <Chip label={selected.type} size="small"
                  color={selected.type === 'STAFF' ? 'primary' : 'secondary'}
                  icon={selected.type === 'STAFF' ? <PersonIcon /> : <VolunteerActivismIcon />} />
              </Box>
            </Box>
            {selected.bio && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                "{selected.bio}"
              </Typography>
            )}
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Traits</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
              {(selected.traits || []).map(t => (
                <Chip key={t} label={t} size="small"
                  color={(booking.characteristics || []).includes(t) ? 'primary' : 'default'}
                  variant={(booking.characteristics || []).includes(t) ? 'filled' : 'outlined'}
                  sx={{ fontSize: '0.65rem' }} />
              ))}
              {(selected.traits || []).length === 0 && <Typography variant="body2" color="text.secondary">No traits listed</Typography>}
            </Stack>
            <Typography variant="subtitle2" gutterBottom>Availability</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {(selected.availability?.days || []).join(', ') || 'Any day'}
              {selected.availability?.startTime && ` - ${selected.availability.startTime} to ${selected.availability.endTime}`}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom>Match Score</Typography>
            <ScoreBar label="Tag overlap" value={selected.tagScore} color="#00838f" />
            <ScoreBar label="AI semantic match" value={selected.aiScore} color="#7b1fa2" />
            <ScoreBar label="Overall" value={selected.finalScore > 0.01 ? selected.finalScore : null} color="#ff9800" />
            {selected.matchingTraits?.length > 0 && (
              <Box sx={{ mt: 1, mb: 2 }}>
                <Typography variant="caption" color="text.secondary">Matching tags: </Typography>
                <Typography variant="caption" fontWeight={600} color="primary.main">
                  {selected.matchingTraits.join(', ')}
                </Typography>
              </Box>
            )}
            <Box sx={{ flexGrow: 1 }} />
            {assignedLink && (
              <Alert severity="success" sx={{ mb: 2, fontSize: '0.75rem' }}>
                Notification sent! Mock link:<br />
                <Box component="a" href={assignedLink} target="_blank"
                  sx={{ wordBreak: 'break-all', color: 'success.dark', fontSize: '0.7rem' }}>
                  {assignedLink}
                </Box>
              </Alert>
            )}
            <Button fullWidth variant="contained" size="large" onClick={handleAssign}
              disabled={assigning || !!assignedLink}
              startIcon={assignedLink ? <CheckCircleIcon /> : null}>
              {assigning ? <CircularProgress size={20} color="inherit" />
                : assignedLink ? 'Assigned' : `Assign ${selected.name.split(' ')[0]}`}
            </Button>
            <Button fullWidth variant="text" sx={{ mt: 1 }} onClick={() => setSelected(null)}>Close</Button>
          </Box>
        )}
      </Drawer>

      <Snackbar open={!!snackbar} autoHideDuration={4000} onClose={() => setSnackbar('')}
        message={snackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

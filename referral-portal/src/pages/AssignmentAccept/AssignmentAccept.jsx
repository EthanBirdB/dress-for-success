import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Chip, Button, CircularProgress,
  Alert, Stack, Divider, Fade, LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { getAssignment, respondToAssignment as apiRespond } from '../../services/api';

export default function AssignmentAccept() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [responding, setResponding] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getAssignment(token)
      .then(r => setData(r.data))
      .catch(() => setError('This assignment link is invalid or has expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRespond = async (response) => {
    setResponding(true);
    try {
      const { data: res } = await apiRespond(token, response);
      setResult({ response, message: res.message, nextLink: res.nextAcceptLink });
    } catch (e) {
      if (e.response?.status === 409) {
        setResult({ response: null, message: 'This assignment has already been responded to.' });
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setResponding(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
      </Container>
    );
  }

  // Already responded
  if (data?.assignment?.status !== 'PENDING' && !result) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Already Responded
          </Typography>
          <Typography color="text.secondary">
            This assignment has already been {data.assignment.status.toLowerCase()}.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (result) {
    const accepted = result.response === 'ACCEPT';
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Fade in>
          <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 3 }}>
            {accepted ? (
              <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
            ) : (
              <CancelIcon sx={{ fontSize: 72, color: 'text.disabled', mb: 2 }} />
            )}
            <Typography variant="h4" fontWeight={700} gutterBottom>
              {accepted ? "You're Confirmed!" : "No problem!"}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              {result.message}
            </Typography>
            {accepted && (
              <Alert severity="success" sx={{ textAlign: 'left', borderRadius: 2 }}>
                We'll be in touch with more details shortly. Thank you for helping make a difference!
              </Alert>
            )}
          </Paper>
        </Fade>
      </Container>
    );
  }

  const { booking, staff, assignment } = data;
  const pctMatch = Math.round(((booking.characteristics || []).filter(c => (staff.traits || []).includes(c)).length / Math.max((booking.characteristics || []).length, 1)) * 100);

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Fade in>
        <Box>
          <Paper elevation={3} sx={{ p: 4, borderRadius: 3, mb: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="overline" color="primary" fontWeight={700} letterSpacing={2}>
                Dress for Success
              </Typography>
              <Typography variant="h4" fontWeight={700} gutterBottom sx={{ mt: 0.5 }}>
                You've been matched!
              </Typography>
              <Typography color="text.secondary">
                Hi <strong>{staff.name.split(' ')[0]}</strong> — we think you'd be a great fit for this appointment.
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>APPOINTMENT DETAILS</Typography>

            <Stack spacing={1.5} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body1">
                  {booking.scheduledDate
                    ? new Date(booking.scheduledDate + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Date TBD'}
                </Typography>
              </Box>
              {booking.scheduledTime && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <AccessTimeIcon fontSize="small" color="action" />
                  <Typography variant="body1">{booking.scheduledTime}</Typography>
                </Box>
              )}
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>CLIENT NEEDS</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
              {(booking.characteristics || []).map(tag => (
                <Chip key={tag} label={tag} size="small"
                  color={(staff.traits || []).includes(tag) ? 'primary' : 'default'}
                  variant={(staff.traits || []).includes(tag) ? 'filled' : 'outlined'} />
              ))}
            </Stack>

            {booking.description && (
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontSize: '0.875rem' }}>
                <strong>Client note:</strong> {booking.description}
              </Alert>
            )}

            {/* Sizing */}
            {(booking.dressSize || booking.topSize || booking.bottomSize || booking.shoeSize) && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>SIZING</Typography>
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  {booking.dressSize && <Box><Typography variant="caption" color="text.secondary">Dress</Typography><Typography variant="body2" fontWeight={600}>{booking.dressSize}</Typography></Box>}
                  {booking.topSize && <Box><Typography variant="caption" color="text.secondary">Top</Typography><Typography variant="body2" fontWeight={600}>{booking.topSize}</Typography></Box>}
                  {booking.bottomSize && <Box><Typography variant="caption" color="text.secondary">Bottom</Typography><Typography variant="body2" fontWeight={600}>{booking.bottomSize}</Typography></Box>}
                  {booking.shoeSize && <Box><Typography variant="caption" color="text.secondary">Shoe</Typography><Typography variant="body2" fontWeight={600}>{booking.shoeSize}</Typography></Box>}
                </Stack>
              </>
            )}

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>YOUR MATCH SCORE</Typography>
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">Based on your traits & expertise</Typography>
                <Typography variant="body2" fontWeight={700} color="primary">{pctMatch}%</Typography>
              </Box>
              <LinearProgress variant="determinate" value={pctMatch}
                sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }} />
            </Box>
            {(booking.characteristics || []).filter(c => (staff.traits || []).includes(c)).length > 0 && (
              <Typography variant="caption" color="text.secondary">
                Matching specialisations: {(booking.characteristics || []).filter(c => (staff.traits || []).includes(c)).join(', ')}
              </Typography>
            )}
          </Paper>

          <Stack spacing={1.5}>
            <Button fullWidth variant="contained" size="large" color="success"
              disabled={responding} onClick={() => handleRespond('ACCEPT')}
              startIcon={responding ? null : <CheckCircleIcon />}
              sx={{ py: 1.8, fontSize: '1.1rem', borderRadius: 2 }}>
              {responding ? <CircularProgress size={24} color="inherit" /> : 'Accept — I can do this!'}
            </Button>
            <Button fullWidth variant="outlined" size="large" color="inherit"
              disabled={responding} onClick={() => handleRespond('DENY')}
              startIcon={<CancelIcon />}
              sx={{ py: 1.5, borderRadius: 2, color: 'text.secondary' }}>
              Decline — find someone else
            </Button>
          </Stack>

          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', mt: 2 }}>
            If you decline, our system will automatically notify the next best-matched person.
          </Typography>
        </Box>
      </Fade>
    </Container>
  );
}

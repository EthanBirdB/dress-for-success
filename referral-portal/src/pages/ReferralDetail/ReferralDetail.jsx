import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Container, Typography, Paper, Grid, Chip, Button, TextField,
  CircularProgress, Divider, List, ListItem, ListItemText, MenuItem,
  AppBar, Toolbar, IconButton, Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import { getReferralById, updateReferralStatus, addNote } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const STATUS_COLORS = {
  PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success', CANCELLED: 'error',
};
const REASON_LABELS = {
  INTERVIEW: 'Job Interview', WEDDING: 'Wedding', COURT_APPEARANCE: 'Court Appearance',
  JOB_START: 'New Job', OTHER: 'Other',
};

export default function ReferralDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [referral, setReferral] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [error, setError] = useState('');

  const fetchReferral = useCallback(async () => {
    try {
      const { data } = await getReferralById(id);
      setReferral(data);
    } catch (err) {
      setError('Failed to load referral');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReferral(); }, [fetchReferral]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    setUpdatingStatus(true);
    try {
      const { data } = await updateReferralStatus(id, newStatus);
      setReferral(data);
    } catch (err) {
      setError('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    try {
      await addNote(id, noteText);
      setNoteText('');
      await fetchReferral();
    } catch (err) {
      setError('Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/staff/login'); };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!referral) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Referral not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton color="inherit" onClick={() => navigate('/staff/dashboard')} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }} fontWeight={600}>
            Referral Detail
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.displayName || user?.username}
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} title="Logout">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={3}>
          {/* Left column - Referral info */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" fontWeight={600}>
                  {referral.firstName} {referral.lastName}
                </Typography>
                <Chip label={referral.status.replace('_', ' ')}
                  color={STATUS_COLORS[referral.status]} />
              </Box>

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Personal Information
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Phone</Typography>
                  <Typography variant="body1">{referral.phoneNumber}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Email</Typography>
                  <Typography variant="body1">{referral.email || '—'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Source</Typography>
                  <Chip label={referral.source} size="small" variant="outlined" />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Submitted</Typography>
                  <Typography variant="body1">
                    {new Date(referral.createdAt).toLocaleString('en-US')}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Sizing
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Dress</Typography>
                  <Typography variant="body1">{referral.dressSize || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Top</Typography>
                  <Typography variant="body1">{referral.topSize || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Bottom</Typography>
                  <Typography variant="body1">{referral.bottomSize || '—'}</Typography>
                </Grid>
                <Grid item xs={3}>
                  <Typography variant="body2" color="text.secondary">Shoe</Typography>
                  <Typography variant="body1">{referral.shoeSize || '—'}</Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Referral Reason
              </Typography>
              <Typography variant="body1">
                {REASON_LABELS[referral.referralReason] || referral.referralReason}
                {referral.referralReason === 'OTHER' && referral.referralReasonOther
                  ? `: ${referral.referralReasonOther}` : ''}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Update Status
              </Typography>
              <TextField select size="small" value={referral.status}
                onChange={handleStatusChange} disabled={updatingStatus}
                sx={{ minWidth: 200 }}>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
                ))}
              </TextField>
            </Paper>
          </Grid>

          {/* Right column - Notes */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Notes ({referral.notes?.length || 0})
              </Typography>

              {referral.notes && referral.notes.length > 0 ? (
                <List dense sx={{ maxHeight: 400, overflow: 'auto', mb: 2 }}>
                  {referral.notes.map((note) => (
                    <ListItem key={note.id} sx={{ flexDirection: 'column', alignItems: 'flex-start',
                      bgcolor: 'grey.50', borderRadius: 1, mb: 1, py: 1.5 }}>
                      <ListItemText
                        primary={note.noteText}
                        secondary={`${note.createdBy} — ${new Date(note.createdAt).toLocaleString('en-US')}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No notes yet
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Box component="form" onSubmit={handleAddNote}>
                <TextField fullWidth multiline rows={3} placeholder="Add a note..."
                  value={noteText} onChange={(e) => setNoteText(e.target.value)}
                  sx={{ mb: 1 }} />
                <Button type="submit" variant="contained" size="small"
                  disabled={submittingNote || !noteText.trim()}>
                  {submittingNote ? <CircularProgress size={20} /> : 'Add Note'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}

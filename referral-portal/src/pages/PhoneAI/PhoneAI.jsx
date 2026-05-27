import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Switch, FormControlLabel, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Tooltip, Alert, CircularProgress, Stack, Collapse, List, ListItem,
  ListItemText, ListItemSecondaryAction, Divider,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import StarIcon from '@mui/icons-material/Star';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import {
  getPhoneSettings, updatePhoneSettings, getPhoneCalls,
  getBookings, approveReview, updateBooking, deleteBooking,
} from '../../services/api';
import { useSnackbar } from 'notistack';

// â”€â”€â”€ Status chip for call log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatusChip({ status }) {
  const map = {
    processing: { label: 'Processing', color: 'warning' },
    processed: { label: 'Transcribed', color: 'success' },
    failed: { label: 'Failed', color: 'error' },
  };
  const { label, color } = map[status] || { label: status, color: 'default' };
  return <Chip label={label} color={color} size="small" />;
}

// â”€â”€â”€ Expandable call log row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CallRow({ call, onViewBooking }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>{new Date(call.createdAt).toLocaleString()}</TableCell>
        <TableCell>{call.callerNumber || '—'}</TableCell>
        <TableCell>{call.duration ? `${call.duration}s` : '—'}</TableCell>
        <TableCell><StatusChip status={call.status} /></TableCell>
        <TableCell>
          {call.bookingId && (
            <Button size="small" variant="outlined" onClick={() => onViewBooking(call.bookingId)}>
              View Booking
            </Button>
          )}
          {call.errorMessage && (
            <Tooltip title={call.errorMessage}><Chip label="Error" color="error" size="small" /></Tooltip>
          )}
        </TableCell>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(o => !o)}>
            {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, bgcolor: 'grey.50' }}>
          <Collapse in={open}>
            <Box sx={{ p: 2 }}>
              {call.transcript ? (
                <>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>RECORDED ANSWERS</Typography>
                  <Box component="pre" sx={{ mt: 0.5, fontSize: '0.75rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto' }}>
                    {call.transcript}
                  </Box>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No answers recorded.</Typography>
              )}
              {call.extractedData && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>EXTRACTED BOOKING FIELDS</Typography>
                  <Box component="pre" sx={{ mt: 0.5, fontSize: '0.75rem', bgcolor: 'grey.100', p: 1, borderRadius: 1, overflow: 'auto' }}>
                    {JSON.stringify(call.extractedData, null, 2)}
                  </Box>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// â”€â”€â”€ Review booking dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ReviewBookingDialog({ bookingId, open, onClose, onApproved, onDeleted }) {
  const [booking, setBooking] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    if (!open || !bookingId) return;
    getBookings({ page: 0, size: 200 }).then(({ data }) => {
      const found = data.content.find(b => b.id === bookingId);
      if (found) { setBooking(found); setForm(found); }
    });
  }, [open, bookingId]);

  const handleApprove = async () => {
    setSaving(true);
    try {
      if (editing) await updateBooking(bookingId, form);
      await approveReview(bookingId);
      enqueueSnackbar('Booking approved and added to queue', { variant: 'success' });
      onApproved();
    } catch {
      enqueueSnackbar('Failed to approve booking', { variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteBooking(bookingId);
      enqueueSnackbar('Booking discarded', { variant: 'info' });
      onDeleted();
    } catch {
      enqueueSnackbar('Failed to delete booking', { variant: 'error' });
    } finally { setSaving(false); }
  };

  if (!booking) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Review Phone AI Booking</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          This booking was created by the Phone AI interview. Review the extracted fields before approving into the queue.
        </Alert>
        {editing ? (
          <Stack spacing={2}>
            <Stack direction="row" spacing={2}>
              <TextField label="First Name" value={form.firstName || ''} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} fullWidth size="small" />
              <TextField label="Last Name" value={form.lastName || ''} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} fullWidth size="small" />
            </Stack>
            <TextField label="Phone" value={form.phoneNumber || ''} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))} size="small" />
            <TextField label="Email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} size="small" />
            <Stack direction="row" spacing={2}>
              <TextField label="Date" type="date" value={form.scheduledDate || ''} onChange={e => setForm(p => ({ ...p, scheduledDate: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Time" type="time" value={form.scheduledTime || ''} onChange={e => setForm(p => ({ ...p, scheduledTime: e.target.value }))} size="small" InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
            <TextField label="Location" value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} size="small" />
            <TextField label="Description" value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} multiline rows={3} size="small" />
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {[
              ['Name', `${booking.firstName} ${booking.lastName}`],
              ['Phone', booking.phoneNumber],
              ['Email', booking.email || '—'],
              ['Date', booking.scheduledDate || '—'],
              ['Time', booking.scheduledTime || '—'],
              ['Location', booking.location || '—'],
              ['Characteristics', (booking.characteristics || []).join(', ') || '—'],
              ['Description', booking.description || '—'],
            ].map(([label, val]) => (
              <Box key={label}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{label.toUpperCase()}</Typography>
                <Typography variant="body2">{val}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between', px: 3 }}>
        <Stack direction="row" spacing={1}>
          <Button color="error" startIcon={<DeleteIcon />} onClick={handleDelete} disabled={saving}>Discard</Button>
          <Button startIcon={<EditIcon />} onClick={() => setEditing(e => !e)}>{editing ? 'Preview' : 'Edit'}</Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="contained" startIcon={<CheckCircleIcon />} onClick={handleApprove} disabled={saving}>
            {saving ? 'Saving…' : 'Approve & Queue'}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

// â”€â”€â”€ Add / Edit question dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function QuestionDialog({ open, initial, onSave, onClose }) {
  const blank = { label: '', question: '', field: '', required: false, type: 'text' };
  const [form, setForm] = useState(blank);
  useEffect(() => { setForm(initial ? { ...initial } : blank); }, [open, initial]);

  const valid = form.label.trim() && form.question.trim();
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Question' : 'Add Question'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Label (internal name)" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} size="small" required helperText="Used in the call log and review UI" />
          <TextField label="Question (read aloud to caller)" value={form.question} onChange={e => setForm(p => ({ ...p, question: e.target.value }))} size="small" required multiline rows={2} helperText="Exactly what the AI voice will say" />
          <TextField label="Booking field (optional)" value={form.field || ''} onChange={e => setForm(p => ({ ...p, field: e.target.value }))} size="small" helperText="Maps answer to this booking field, e.g. firstName, shoeSize. Leave blank for a notes-only question." />
          <FormControlLabel
            control={<Switch checked={form.required} onChange={e => setForm(p => ({ ...p, required: e.target.checked }))} />}
            label="Required — mark as needed for a complete booking"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid} onClick={() => onSave({ ...form, id: form.id || `q_custom_${Date.now()}` })}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

// â”€â”€â”€ Main PhoneAI page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function PhoneAI() {
  const [settings, setSettings] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsDirty, setQuestionsDirty] = useState(false);
  const [calls, setCalls] = useState([]);
  const [reviewBookingId, setReviewBookingId] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const ttsSupported = 'speechSynthesis' in window;
  const { enqueueSnackbar } = useSnackbar();

  const handlePlayQuestion = useCallback((questionId, questionText) => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    if (speakingId === questionId) {
      setSpeakingId(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(questionText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);
    setSpeakingId(questionId);
    window.speechSynthesis.speak(utterance);
  }, [speakingId, ttsSupported]);

  const loadSettings = useCallback(() => {
    setLoadingSettings(true);
    getPhoneSettings()
      .then(({ data }) => { setSettings(data); setQuestions(data.questions || []); })
      .finally(() => setLoadingSettings(false));
  }, []);

  const loadCalls = useCallback(() => {
    setLoadingCalls(true);
    getPhoneCalls().then(({ data }) => setCalls(data)).finally(() => setLoadingCalls(false));
  }, []);

  useEffect(() => { loadSettings(); loadCalls(); }, [loadSettings, loadCalls]);

  const handleToggle = async (enabled) => {
    setSettings(prev => ({ ...prev, enabled }));
    setSavingSettings(true);
    try {
      const { data } = await updatePhoneSettings({ enabled });
      setSettings(data);
      enqueueSnackbar(`Phone intake ${enabled ? 'enabled' : 'disabled'}`, { variant: enabled ? 'success' : 'warning' });
    } catch {
      setSettings(prev => ({ ...prev, enabled: !enabled }));
      enqueueSnackbar('Failed to update settings', { variant: 'error' });
    } finally { setSavingSettings(false); }
  };

  const handleSaveQuestions = async () => {
    setSavingSettings(true);
    try {
      const { data } = await updatePhoneSettings({ questions });
      setSettings(data);
      setQuestions(data.questions || []);
      setQuestionsDirty(false);
      enqueueSnackbar('Interview questions saved', { variant: 'success' });
    } catch { enqueueSnackbar('Failed to save questions', { variant: 'error' }); }
    finally { setSavingSettings(false); }
  };

  const handleAddOrEdit = (q) => {
    setQuestions(prev => {
      const idx = prev.findIndex(x => x.id === q.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = q; return next; }
      return [...prev, q];
    });
    setQuestionsDirty(true);
    setQuestionDialogOpen(false);
    setEditingQuestion(null);
  };

  const handleRemove = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    setQuestionsDirty(true);
  };

  const handleMoveUp = (idx) => {
    if (idx === 0) return;
    setQuestions(prev => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; });
    setQuestionsDirty(true);
  };

  const handleMoveDown = (idx) => {
    setQuestions(prev => {
      if (idx >= prev.length - 1) return prev;
      const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a;
    });
    setQuestionsDirty(true);
  };


  const openReview = (bookingId) => { setReviewBookingId(bookingId); setReviewOpen(true); };

  const handleCopy = () => {
    if (settings?.phoneNumber) navigator.clipboard.writeText(settings.phoneNumber);
    enqueueSnackbar('Phone number copied', { variant: 'info' });
  };

  if (loadingSettings) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3, maxWidth: 900 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>Phone AI Intake</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        When a client calls, the AI walks them through a step-by-step interview, asking each question and extracting their answer before moving to the next.
      </Typography>

      {/* Phone number */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Intake Phone Number</Typography>
        {settings?.phoneNumber ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
            <PhoneIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>{settings.phoneNumber}</Typography>
            <Tooltip title="Copy number">
              <IconButton size="small" onClick={handleCopy}><ContentCopyIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Chip label="Twilio" size="small" variant="outlined" sx={{ ml: 1 }} />
          </Box>
        ) : (
          <Alert severity="warning" sx={{ mt: 1 }}>
            No phone number configured. Set <code>TWILIO_PHONE_NUMBER</code> in your <code>.env</code> file.
          </Alert>
        )}
      </Paper>

      {/* Enable / Disable */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Intake Status</Typography>
        <FormControlLabel
          control={
            <Switch checked={settings?.enabled ?? true} onChange={(e) => handleToggle(e.target.checked)}
              disabled={savingSettings} color="success" />
          }
          label={settings?.enabled
            ? 'Intake is enabled — callers will be guided through the interview'
            : 'Intake is disabled — callers hear a sorry message'}
        />
      </Paper>

      {/* â”€â”€ Interview questions editor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>Interview Questions</Typography>
            <Typography variant="body2" color="text.secondary">
              The AI asks these questions one by one in order. Answers are extracted and mapped to booking fields.
            </Typography>
          </Box>
          <Button startIcon={<AddIcon />} variant="outlined" size="small"
            onClick={() => { setEditingQuestion(null); setQuestionDialogOpen(true); }}>
            Add Question
          </Button>
        </Box>

        {questions.length === 0 ? (
          <Alert severity="warning" sx={{ mt: 2 }}>No questions configured. Add at least one question.</Alert>
        ) : (
          <List dense disablePadding sx={{ mt: 1 }}>
            {questions.map((q, idx) => (
              <Box key={q.id}>
                {idx > 0 && <Divider />}
                <ListItem
                  sx={{ px: 1, py: 1, borderRadius: 1, '&:hover': { bgcolor: 'grey.50' } }}
                  disableGutters
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mr: 1, color: 'text.disabled' }}>
                    <DragIndicatorIcon fontSize="small" />
                    <Typography variant="caption" sx={{ ml: 0.5, minWidth: 18, textAlign: 'center' }}>{idx + 1}</Typography>
                  </Box>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight={600}>{q.label}</Typography>
                        {q.required && <Chip icon={<StarIcon sx={{ fontSize: '0.7rem !important' }} />} label="required" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />}
                        {q.field && <Chip label={q.field} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.65rem' }} />}
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        "{q.question}"
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title={!ttsSupported ? 'Text-to-speech not supported' : speakingId === q.id ? 'Stop' : 'Play question'}>
                      <span>
                      <IconButton size="small" color={speakingId === q.id ? 'error' : 'primary'}
                        disabled={!ttsSupported}
                        onClick={() => handlePlayQuestion(q.id, q.question)}>
                        {speakingId === q.id ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
                      </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Move up"><span>
                      <IconButton size="small" disabled={idx === 0} onClick={() => handleMoveUp(idx)}>↑</IconButton>
                    </span></Tooltip>
                    <Tooltip title="Move down"><span>
                      <IconButton size="small" disabled={idx === questions.length - 1} onClick={() => handleMoveDown(idx)}>↓</IconButton>
                    </span></Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditingQuestion(q); setQuestionDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove">
                      <IconButton size="small" color="error" onClick={() => handleRemove(q.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItemSecondaryAction>
                </ListItem>
              </Box>
            ))}
          </List>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" onClick={handleSaveQuestions} disabled={!questionsDirty || savingSettings}>
            Save Interview
          </Button>
        </Box>
      </Paper>

      {/* Call log */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Call Log ({calls.length})</Typography>
          <IconButton size="small" onClick={loadCalls} disabled={loadingCalls}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
        {loadingCalls ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}><CircularProgress size={28} /></Box>
        ) : calls.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
            No calls yet. Calls will appear here after a client calls the intake number.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Caller</TableCell>
                  <TableCell>Duration</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Booking</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {calls.map(call => (
                  <CallRow key={call.id} call={call} onViewBooking={openReview} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <ReviewBookingDialog
        bookingId={reviewBookingId} open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onApproved={() => { setReviewOpen(false); loadCalls(); }}
        onDeleted={() => { setReviewOpen(false); loadCalls(); }}
      />

      <QuestionDialog
        open={questionDialogOpen}
        initial={editingQuestion}
        onSave={handleAddOrEdit}
        onClose={() => { setQuestionDialogOpen(false); setEditingQuestion(null); }}
      />
    </Box>
  );
}


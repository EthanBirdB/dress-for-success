import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Stack, FormGroup, FormControlLabel,
  Checkbox, Avatar, Tooltip, CircularProgress, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PersonIcon from '@mui/icons-material/Person';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { getAllStaff, createStaff, updateStaff, deleteStaff } from '../../services/api';

const CHARACTERISTICS = [
  'Wedding Styling', 'Interview Prep', 'Court Appearance', 'Custom Fitting',
  'Alterations', 'Plus Size Fitting', 'Business Casual', 'Confidence Coaching',
  'Maternity Wear', 'Formal Wear',
];
const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const emptyForm = {
  name: '', email: '', phone: '', type: 'STAFF', bio: '',
  traits: [],
  availability: { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], startTime: '09:00', endTime: '17:00' },
};

function StaffForm({ open, initial, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) setForm(initial ? { ...emptyForm, ...initial } : emptyForm);
    setError('');
  }, [open, initial]);

  const set = (field, val) => setForm(p => ({ ...p, [field]: val }));
  const setAvail = (field, val) => setForm(p => ({ ...p, availability: { ...p.availability, [field]: val } }));

  const toggleTrait = (t) => set('traits', form.traits.includes(t)
    ? form.traits.filter(x => x !== t) : [...form.traits, t]);
  const toggleDay = (d) => setAvail('days', form.availability.days.includes(d)
    ? form.availability.days.filter(x => x !== d) : [...form.availability.days, d]);

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.email.trim()) { setError('Email is required'); return; }
    setSaving(true);
    try {
      const saved = initial?.id
        ? await updateStaff(initial.id, form)
        : await createStaff(form);
      onSaved(saved.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle fontWeight={700}>{initial ? 'Edit Person' : 'Add Person'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField fullWidth required label="Full Name" value={form.name}
              onChange={e => set('name', e.target.value)} />
            <TextField select label="Type" value={form.type} onChange={e => set('type', e.target.value)}
              sx={{ minWidth: 130 }}>
              <MenuItem value="STAFF">Staff</MenuItem>
              <MenuItem value="VOLUNTEER">Volunteer</MenuItem>
            </TextField>
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField fullWidth required label="Email" type="email" value={form.email}
              onChange={e => set('email', e.target.value)} />
            <TextField fullWidth label="Phone" value={form.phone}
              onChange={e => set('phone', e.target.value)} />
          </Stack>

          <TextField fullWidth multiline rows={3} label="Bio / Expertise"
            placeholder="Describe this person's expertise — used by AI to match them with bookings"
            value={form.bio} onChange={e => set('bio', e.target.value)} />

          <Box>
            <Typography variant="subtitle2" gutterBottom>Traits & Specialisations</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {CHARACTERISTICS.map(t => (
                <Chip key={t} label={t} clickable size="small"
                  color={form.traits.includes(t) ? 'primary' : 'default'}
                  variant={form.traits.includes(t) ? 'filled' : 'outlined'}
                  onClick={() => toggleTrait(t)} />
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>Availability — Days</Typography>
            <FormGroup row>
              {ALL_DAYS.map(d => (
                <FormControlLabel key={d} control={
                  <Checkbox checked={form.availability.days.includes(d)} onChange={() => toggleDay(d)} size="small" />
                } label={<Typography variant="caption">{d.slice(0, 3)}</Typography>} />
              ))}
            </FormGroup>
          </Box>

          <Stack direction="row" spacing={2}>
            <TextField label="Start Time" type="time" value={form.availability.startTime}
              onChange={e => setAvail('startTime', e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="End Time" type="time" value={form.availability.endTime}
              onChange={e => setAvail('endTime', e.target.value)}
              InputLabelProps={{ shrink: true }} fullWidth />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : initial ? 'Save Changes' : 'Add Person'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try { const { data } = await getAllStaff(); setStaff(data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleSaved = () => { setFormOpen(false); setEditing(null); fetch(); };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this person? They will no longer appear in candidate matching.')) return;
    try { await deleteStaff(id); fetch(); } catch (e) { console.error(e); }
  };

  const activeStaff = staff.filter(s => s.isActive !== false);
  const inactiveStaff = staff.filter(s => s.isActive === false);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>People</Typography>
          <Typography variant="body2" color="text.secondary">
            {activeStaff.length} active · {inactiveStaff.length} inactive
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setFormOpen(true); }}>
          Add Person
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                <TableCell>Person</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Traits</TableCell>
                <TableCell>Availability</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {staff.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No staff members yet</Typography>
                  </TableCell>
                </TableRow>
              )}
              {staff.map(s => (
                <TableRow key={s.id} hover sx={{ opacity: s.isActive === false ? 0.5 : 1 }}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, fontSize: '0.9rem', fontWeight: 700,
                        bgcolor: s.type === 'STAFF' ? 'primary.main' : 'secondary.main' }}>
                        {s.name[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>{s.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.email}</Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.type} size="small"
                      icon={s.type === 'STAFF' ? <PersonIcon /> : <VolunteerActivismIcon />}
                      color={s.type === 'STAFF' ? 'primary' : 'secondary'} variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {(s.traits || []).slice(0, 4).map(t => (
                        <Chip key={t} label={t} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
                      ))}
                      {(s.traits || []).length > 4 && (
                        <Chip label={`+${s.traits.length - 4}`} size="small" sx={{ height: 18, bgcolor: 'grey.100' }} />
                      )}
                      {(s.traits || []).length === 0 && <Typography variant="caption" color="text.disabled">None</Typography>}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {(s.availability?.days || []).map(d => d.slice(0, 3)).join(', ') || 'Any'}
                    </Typography>
                    {s.availability?.startTime && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {s.availability.startTime} – {s.availability.endTime}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={s.isActive === false ? 'Inactive' : 'Active'} size="small"
                      color={s.isActive === false ? 'default' : 'success'} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditing(s); setFormOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {s.isActive !== false && (
                      <Tooltip title="Deactivate">
                        <IconButton size="small" color="error" onClick={() => handleDeactivate(s.id)}>
                          <PersonOffIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      <StaffForm open={formOpen} initial={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSaved={handleSaved} />
    </Box>
  );
}

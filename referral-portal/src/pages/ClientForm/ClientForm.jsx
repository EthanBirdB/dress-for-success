import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, TextField, Button, MenuItem, Alert,
  Paper, Grid, CircularProgress, Fade, Chip, Stack,
} from '@mui/material';
import PhoneIcon from '@mui/icons-material/Phone';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import { submitBooking, getPublicPhoneInfo } from '../../services/api';

const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BOTTOM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DRESS_SIZES = ['2','4','6','8','10','12','14','16','18','20','22','24'];
const SHOE_SIZES = ['5','5.5','6','6.5','7','7.5','8','8.5','9','9.5','10','10.5','11','12'];
const CHARACTERISTICS = [
  'Wedding Styling', 'Interview Prep', 'Court Appearance', 'Custom Fitting',
  'Alterations', 'Plus Size Fitting', 'Business Casual', 'Confidence Coaching',
  'Maternity Wear', 'Formal Wear',
];
const LOCATIONS = ['Illawarra', 'Newcastle Hunter', 'Tasmania', 'Melbourne'];

const initialForm = {
  firstName: '', lastName: '', phoneNumber: '', email: '',
  location: '',
  scheduledDate: null, scheduledTime: null,
  characteristics: [],
  description: '',
  dressSize: '', shoeSize: '', topSize: '', bottomSize: '',
};

export default function ClientForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');
  const [phoneInfo, setPhoneInfo] = useState(null);

  useEffect(() => {
    getPublicPhoneInfo().then(({ data }) => setPhoneInfo(data)).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const toggleCharacteristic = (tag) => {
    setForm(prev => ({
      ...prev,
      characteristics: prev.characteristics.includes(tag)
        ? prev.characteristics.filter(c => c !== tag)
        : [...prev.characteristics, tag],
    }));
    if (errors.characteristics) setErrors(prev => ({ ...prev, characteristics: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    else if (!/^[+]?[0-9\s\-()\\.]{7,20}$/.test(form.phoneNumber.trim()))
      errs.phoneNumber = 'Invalid phone number';
    if (!form.location) errs.location = 'Please select a location';
    if (!form.scheduledDate) errs.scheduledDate = 'Appointment date is required';
    if (!form.scheduledTime) errs.scheduledTime = 'Appointment time is required';
    if (form.characteristics.length === 0) errs.characteristics = 'Please select at least one';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    setServerError('');
    try {
      await submitBooking({
        ...form,
        scheduledDate: form.scheduledDate ? dayjs(form.scheduledDate).format('YYYY-MM-DD') : null,
        scheduledTime: form.scheduledTime ? dayjs(form.scheduledTime).format('HH:mm') : null,
        source: 'WEB',
      });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.data?.fields) setErrors(err.response.data.fields);
      setServerError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Fade in>
          <Paper elevation={3} sx={{ p: 5, textAlign: 'center' }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>Thank You!</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Your appointment request has been submitted. A member of our team will be in touch with you soon.
            </Typography>
            <Button variant="contained" onClick={() => { setSubmitted(false); setForm(initialForm); }}>
              Make Another Booking
            </Button>
          </Paper>
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 3, md: 5 } }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            component="img"
            src="/background-removed.png"
            alt="Dress for Success"
            sx={{ height: 64, mb: 1, objectFit: 'contain' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
          <Typography variant="h3" fontWeight={700} color="primary" gutterBottom>Dress for Success</Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>Book an Appointment</Typography>
          <Typography variant="body1" color="text.secondary">
            Fill in your details below and our team will find the perfect stylist for you.
          </Typography>
        </Box>

        {/* ── Book by phone button ── */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <Button
            component="a"
            href={phoneInfo?.phoneNumber ? `tel:${phoneInfo.phoneNumber.replace(/\s/g, '')}` : undefined}
            variant="outlined"
            size="large"
            startIcon={<PhoneIcon />}
            sx={{ borderRadius: 3, px: 4, py: 1.5, fontWeight: 700, fontSize: '1rem' }}
          >
            Make a phone booking via AI
            {phoneInfo?.phoneNumber && <>&nbsp;·&nbsp;{phoneInfo.phoneNumber}</>}
          </Button>
        </Box>

        {serverError && <Alert severity="error" sx={{ mb: 3 }}>{serverError}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>

          {/* Personal Info */}
          <Typography variant="h6" sx={{ mb: 2 }}>Personal Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="First Name" name="firstName"
                value={form.firstName} onChange={handleChange}
                error={!!errors.firstName} helperText={errors.firstName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Last Name" name="lastName"
                value={form.lastName} onChange={handleChange}
                error={!!errors.lastName} helperText={errors.lastName} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required label="Phone Number" name="phoneNumber"
                value={form.phoneNumber} onChange={handleChange}
                error={!!errors.phoneNumber} helperText={errors.phoneNumber}
                placeholder="e.g. 0412 345 678" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email (optional)" name="email" type="email"
                value={form.email} onChange={handleChange} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required select label="Location" name="location"
                value={form.location} onChange={handleChange}
                error={!!errors.location} helperText={errors.location || 'Select the Dress for Success location nearest to you'}>
                <MenuItem value="">— Select location —</MenuItem>
                {LOCATIONS.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          {/* Appointment */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Appointment</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DatePicker label="Preferred Date *" value={form.scheduledDate}
                onChange={(val) => { setForm(p => ({ ...p, scheduledDate: val })); setErrors(p => ({ ...p, scheduledDate: '' })); }}
                disablePast slotProps={{
                  textField: { fullWidth: true, error: !!errors.scheduledDate, helperText: errors.scheduledDate }
                }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TimePicker label="Preferred Time *" value={form.scheduledTime}
                onChange={(val) => { setForm(p => ({ ...p, scheduledTime: val })); setErrors(p => ({ ...p, scheduledTime: '' })); }}
                slotProps={{
                  textField: { fullWidth: true, error: !!errors.scheduledTime, helperText: errors.scheduledTime }
                }} />
            </Grid>
          </Grid>

          {/* What brings you in */}
          <Typography variant="h6" sx={{ mb: 1, mt: 4 }}>What brings you in?</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Select all that apply — this helps us match you with the right person.
          </Typography>
          {errors.characteristics && <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>{errors.characteristics}</Typography>}
          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
            {CHARACTERISTICS.map(tag => (
              <Chip key={tag} label={tag} clickable
                color={form.characteristics.includes(tag) ? 'primary' : 'default'}
                variant={form.characteristics.includes(tag) ? 'filled' : 'outlined'}
                onClick={() => toggleCharacteristic(tag)} />
            ))}
          </Stack>
          <TextField fullWidth multiline rows={3} label="Tell us more (optional)" name="description"
            placeholder="Any additional details about your needs — this helps us find the most suitable stylist for you."
            value={form.description} onChange={handleChange} />

          {/* Sizing */}
          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Sizing (optional)</Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Dress Size" name="dressSize"
                value={form.dressSize} onChange={handleChange}>
                <MenuItem value="">—</MenuItem>
                {DRESS_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Top Size" name="topSize"
                value={form.topSize} onChange={handleChange}>
                <MenuItem value="">—</MenuItem>
                {TOP_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Bottom Size" name="bottomSize"
                value={form.bottomSize} onChange={handleChange}>
                <MenuItem value="">—</MenuItem>
                {BOTTOM_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField fullWidth select label="Shoe Size" name="shoeSize"
                value={form.shoeSize} onChange={handleChange}>
                <MenuItem value="">—</MenuItem>
                {SHOE_SIZES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={submitting}
              sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Request Appointment'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}


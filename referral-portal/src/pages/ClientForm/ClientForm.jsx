import { useState } from 'react';
import {
  Box, Container, Typography, TextField, Button, MenuItem, Alert,
  Paper, Grid, CircularProgress, Fade
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { submitReferral } from '../../services/api';

const REFERRAL_REASONS = [
  { value: 'INTERVIEW', label: 'Job Interview' },
  { value: 'WEDDING', label: 'Wedding' },
  { value: 'COURT_APPEARANCE', label: 'Court Appearance' },
  { value: 'JOB_START', label: 'Starting a New Job' },
  { value: 'OTHER', label: 'Other' },
];

const TOP_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const BOTTOM_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const DRESS_SIZES = ['2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24'];
const SHOE_SIZES = ['5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '12'];

const initialForm = {
  firstName: '', lastName: '', phoneNumber: '', email: '',
  dressSize: '', shoeSize: '', topSize: '', bottomSize: '',
  referralReason: '', referralReasonOther: '',
};

export default function ClientForm() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    if (!form.phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    else if (!/^[+]?[0-9\s\-()]{7,20}$/.test(form.phoneNumber.trim()))
      errs.phoneNumber = 'Invalid phone number';
    if (!form.referralReason) errs.referralReason = 'Please select a reason';
    if (form.referralReason === 'OTHER' && !form.referralReasonOther.trim())
      errs.referralReasonOther = 'Please specify the reason';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError('');
    try {
      await submitReferral({ ...form, source: 'WEB' });
      setSubmitted(true);
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.fields
        ? 'Please check the form fields.'
        : 'Something went wrong. Please try again.';
      setServerError(msg);
      if (err.response?.data?.fields) setErrors(err.response.data.fields);
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
            <Typography variant="h4" gutterBottom fontWeight={600}>
              Thank You!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your referral has been submitted successfully. A member of our team will
              be in touch with you soon.
            </Typography>
            <Button variant="contained" onClick={() => { setSubmitted(false); setForm(initialForm); }}>
              Submit Another Referral
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
          <Typography variant="h3" fontWeight={700} color="primary" gutterBottom>
            Dress for Success
          </Typography>
          <Typography variant="h5" color="text.secondary" gutterBottom>
            Referral Registration
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please fill in your details below and we'll help you find the perfect outfit.
          </Typography>
        </Box>

        {serverError && <Alert severity="error" sx={{ mb: 3 }}>{serverError}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="h6" sx={{ mb: 2, mt: 1 }}>Personal Information</Typography>
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
                placeholder="e.g. (555) 123-4567" />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Email (optional)" name="email" type="email"
                value={form.email} onChange={handleChange} />
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Sizing Information</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Dress Size" name="dressSize"
                value={form.dressSize} onChange={handleChange}>
                <MenuItem value="">— Select —</MenuItem>
                {DRESS_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Shoe Size" name="shoeSize"
                value={form.shoeSize} onChange={handleChange}>
                <MenuItem value="">— Select —</MenuItem>
                {SHOE_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Top Size" name="topSize"
                value={form.topSize} onChange={handleChange}>
                <MenuItem value="">— Select —</MenuItem>
                {TOP_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth select label="Bottom Size" name="bottomSize"
                value={form.bottomSize} onChange={handleChange}>
                <MenuItem value="">— Select —</MenuItem>
                {BOTTOM_SIZES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          <Typography variant="h6" sx={{ mb: 2, mt: 4 }}>Reason for Referral</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth select required label="Referral Reason" name="referralReason"
                value={form.referralReason} onChange={handleChange}
                error={!!errors.referralReason} helperText={errors.referralReason}>
                <MenuItem value="">— Select —</MenuItem>
                {REFERRAL_REASONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            {form.referralReason === 'OTHER' && (
              <Grid item xs={12}>
                <TextField fullWidth required label="Please specify" name="referralReasonOther"
                  value={form.referralReasonOther} onChange={handleChange}
                  error={!!errors.referralReasonOther} helperText={errors.referralReasonOther} />
              </Grid>
            )}
          </Grid>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button type="submit" variant="contained" size="large" disabled={submitting}
              sx={{ px: 6, py: 1.5, fontSize: '1.1rem' }}>
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Submit Referral'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}

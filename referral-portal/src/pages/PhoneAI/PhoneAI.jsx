import { useState, useRef, useCallback } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemText,
  IconButton, Chip, Stack, Divider, Tooltip, Alert,
} from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';

const INTERVIEW_QUESTIONS = [
  { category: 'Opening', questions: [
    'Tell me about yourself.',
    'Why are you interested in this position?',
    'What do you know about our company?',
  ]},
  { category: 'Behavioural', questions: [
    'Describe a time when you had to work under pressure.',
    'Give an example of a goal you set and how you achieved it.',
    'Tell me about a time you had a conflict with a coworker and how you resolved it.',
    'Describe a situation where you had to learn something new quickly.',
  ]},
  { category: 'Skills & Experience', questions: [
    'What are your greatest strengths?',
    'What is your biggest weakness and how are you working on it?',
    'Describe your experience with teamwork.',
    'What skills make you a good fit for this role?',
  ]},
  { category: 'Closing', questions: [
    'Where do you see yourself in five years?',
    'Why should we hire you?',
    'Do you have any questions for us?',
  ]},
];

export default function PhoneAI() {
  const [speaking, setSpeaking] = useState(null); // key of currently speaking question
  const utteranceRef = useRef(null);
  const [ttsSupported] = useState(() => 'speechSynthesis' in window);

  const handlePlay = useCallback((text, key) => {
    // Stop any current speech
    window.speechSynthesis.cancel();

    if (speaking === key) {
      // Toggle off if already playing this question
      setSpeaking(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setSpeaking(null);
    utterance.onerror = () => setSpeaking(null);
    utteranceRef.current = utterance;

    setSpeaking(key);
    window.speechSynthesis.speak(utterance);
  }, [speaking]);

  const handleStop = useCallback(() => {
    window.speechSynthesis.cancel();
    setSpeaking(null);
  }, []);

  return (
    <Box sx={{ p: 3, height: '100vh', overflow: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Phone Interview Practice</Typography>
        <Typography variant="body2" color="text.secondary">
          Practice common interview questions with text-to-speech. Press the speaker button to hear each question read aloud.
        </Typography>
      </Box>

      {!ttsSupported && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Your browser does not support the Web Speech API. Please use a modern browser like Chrome, Firefox, or Edge.
        </Alert>
      )}

      <Stack spacing={3}>
        {INTERVIEW_QUESTIONS.map((section) => (
          <Paper key={section.category} sx={{ p: 3, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip label={section.category} color="primary" size="small" />
              <Typography variant="subtitle2" color="text.secondary">
                {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Divider sx={{ mb: 1 }} />
            <List disablePadding>
              {section.questions.map((question, qIdx) => {
                const key = `${section.category}-${qIdx}`;
                const isPlaying = speaking === key;

                return (
                  <ListItem
                    key={key}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: isPlaying ? 'primary.50' : 'transparent',
                      border: isPlaying ? '1px solid' : '1px solid transparent',
                      borderColor: isPlaying ? 'primary.light' : 'transparent',
                      transition: 'all 0.2s',
                    }}
                    secondaryAction={
                      ttsSupported && (
                        <Tooltip title={isPlaying ? 'Stop' : 'Play question'}>
                          <IconButton
                            edge="end"
                            color={isPlaying ? 'error' : 'primary'}
                            onClick={() => isPlaying ? handleStop() : handlePlay(question, key)}
                            size="small"
                          >
                            {isPlaying ? <StopIcon /> : <VolumeUpIcon />}
                          </IconButton>
                        </Tooltip>
                      )
                    }
                  >
                    <ListItemText
                      primary={question}
                      primaryTypographyProps={{
                        fontWeight: isPlaying ? 600 : 400,
                        color: isPlaying ? 'primary.main' : 'text.primary',
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}

require('dotenv').config();
const express = require('express');
const { Twilio } = require('twilio');
const { Deepgram } = require('@deepgram/sdk');
const gptService = require('./gpt-service');
const expressWs = require('express-ws');

const app = express();
expressWs(app);

const PORT = 3000;

// Twilio Client
const twilio = new Twilio(
  'AC1e7c70bd435650dbe660a24340cb2017', // Twilio Account SID
  '9f9a7c8a3920b26d5b3a5c03e4ff136c'  // Twilio Auth Token
);

// Deepgram Client
const deepgram = new Deepgram('295efbb41818dd2dfedae678c7aa87f656fd21e1'); // Deepgram API Key

app.use(express.json());

// Twilio webhook for incoming calls
app.post('/incoming', async (req, res) => {
  const response = new twilio.twiml.VoiceResponse();
  response.stream({
    url: `wss://${req.headers.host}/media`, // WebSocket endpoint
  });
  res.type('text/xml').send(response.toString());
});

// WebSocket endpoint for audio streaming
app.ws('/media', async (ws) => {
  ws.on('message', async (data) => {
    try {
      // Transcribe the audio using Deepgram
      const audio = await deepgram.transcription.live({ buffer: data });
      const transcription = audio?.results?.channels[0]?.alternatives[0]?.transcript;

      if (transcription) {
        console.log('User said:', transcription);

        // Get GPT response
        const reply = await gptService.respond(transcription);
        console.log('GPT reply:', reply);

        // Convert reply to audio (text-to-speech not shown; integration needed)
        ws.send(JSON.stringify({ text: reply }));
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error.message);
    }
  });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mock storage for demo purposes
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API Endpoints
app.post('/api/upload-image', (req, res) => {
  console.log('Received image upload request');
  // Mock S3 URI
  res.json({
    success: true,
    s3_uri: 's3://mock-bucket/uploads/document_mock.jpg',
    filename: 'document_mock.jpg'
  });
});

app.post('/api/transcribe-audio', upload.single('audio'), (req, res) => {
  console.log('Received audio transcription request');
  res.json({
    success: true,
    transcribed_text: "यह एक नमूना दस्तावेज़ है। कृपया इसे सरल भाषा में समझाएं।"
  });
});

app.post('/api/generater-storybook', (req, res) => {
  console.log('Received storyboard generation request');
  res.json({
    success: true,
    storyboard: {
      panel_1: {
        title: "प्रस्तावना",
        caption: "यह दस्तावेज़ आपके कृषि ऋण के बारे में जानकारी देता है।"
      },
      panel_2: {
        title: "मुख्य जानकारी",
        caption: "आपको अगले महीने तक अपनी किश्त जमा करनी होगी।"
      },
      panel_3: {
        title: "अगला कदम",
        caption: "कृपया अपनी नजदीकी बैंक शाखा में संपर्क करें।"
      },
      summary: "यह दस्तावेज़ आपके कृषि ऋण की जानकारी और बैंक जाने की आवश्यकता के बारे में है।"
    }
  });
});

app.post('/api/generate-audio', (req, res) => {
  console.log('Received audio generation request');
  // Send a dummy audio response (base64 or file)
  // For demo, we just send a success status
  res.status(200).send('Audio generation triggered');
});

app.listen(port, () => {
  console.log(`Mock server running at http://localhost:${port}`);
});

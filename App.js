import React, { useState, useRef } from 'react';
import { Camera, Mic, Square, Volume2, RefreshCw } from 'lucide-react';
import { Amplify } from 'aws-amplify';
import axios from 'axios';

Amplify.configure({
  API: {
    REST: {
      'vani-chitra-api': {
        endpoint: process.env.REACT_APP_API_GATEWAY_URL || 'https://your-api-gateway-url.amazonaws.com/prod',
        region: process.env.REACT_APP_AWS_REGION || 'us-east-1'
      }
    }
  }
});

function App() {
  const [capturedImage, setCapturedImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [storyboard, setStoryboard] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('hi');
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);

  const languages = [
    { code: 'hi', name: 'हिंदी', flag: '🇮🇳' },
    { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
    { code: 'bn', name: 'বাংলা', flag: '🇮🇳' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      setError('कैमरा एक्सेस नहीं हो सका / Camera access denied');
    }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (canvas && video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      
      canvas.toBlob((blob) => {
        setImageFile(blob);
      }, 'image/jpeg', 0.9);
      
      const stream = video.srcObject;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('माइक्रोफोन एक्सेस नहीं हो सका / Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadImageToS3 = async (imageBlob) => {
    const formData = new FormData();
    formData.append('image', imageBlob, 'document.jpg');
    
    const response = await axios.post(
      `${process.env.REACT_APP_API_GATEWAY_URL}/upload-image`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.s3_uri;
  };

  const transcribeAudio = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('language', currentLanguage);
    
    const response = await axios.post(
      `${process.env.REACT_APP_API_GATEWAY_URL}/transcribe-audio`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.transcribed_text;
  };

  const generateStoryboard = async () => {
    if (!imageFile || !audioBlob) {
      setError('कृपया फोटो और आवाज दोनों दें / Please provide both photo and voice');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const imageS3Uri = await uploadImageToS3(imageFile);
      const transcribed = await transcribeAudio(audioBlob);
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_GATEWAY_URL}/generate-storyboard`,
        {
          image_s3_uri: imageS3Uri,
          transcribed_text: transcribed,
          target_language: currentLanguage
        }
      );
      
      setStoryboard(response.data.storyboard);
      await generateAudioGuidance(response.data.storyboard);
    } catch (err) {
      setError('कुछ गलत हो गया / Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAudioGuidance = async (storyboardData) => {
    try {
      const guidanceText = `
        ${storyboardData.panel_1.caption}
        ${storyboardData.panel_2.caption}
        ${storyboardData.panel_3.caption}
        ${storyboardData.summary}
      `;
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_GATEWAY_URL}/generate-audio`,
        { text: guidanceText, language: currentLanguage },
        { responseType: 'blob' }
      );
      
      setAudioUrl(URL.createObjectURL(response.data));
    } catch (err) {
      console.error('Error generating audio:', err);
    }
  };

  const playAudioGuidance = () => {
    if (audioPlayerRef.current && audioUrl) {
      audioPlayerRef.current.play();
    }
  };

  const resetApp = () => {
    setCapturedImage(null);
    setImageFile(null);
    setAudioBlob(null);
    setStoryboard(null);
    setAudioUrl(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800">
      <header className="bg-white/95 shadow-lg p-6 text-center">
        <h1 className="text-5xl font-bold text-purple-600 mb-2">वाणी-चित्र</h1>
        <p className="text-2xl text-indigo-600 font-semibold">Vani-Chitra</p>
      </header>

      <div className="flex flex-wrap justify-center gap-3 p-4 bg-white/90">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setCurrentLanguage(lang.code)}
            className={`flex items-center gap-2 px-6 py-3 rounded-full border-2 transition-all ${
              currentLanguage === lang.code
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-purple-600 border-purple-600 hover:bg-purple-50'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <span className="text-lg font-semibold">{lang.name}</span>
          </button>
        ))}
      </div>

      <main className="max-w-7xl mx-auto p-8">
        {!storyboard ? (
          <>
            <div className="grid md:grid-cols-2 gap-12 my-12">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => {
                    if (!capturedImage) {
                      startCamera();
                      setTimeout(capturePhoto, 100);
                    } else {
                      fileInputRef.current.click();
                    }
                  }}
                  disabled={isProcessing}
                  className="relative w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-2xl hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Camera className="w-24 h-24 text-white" />
                  {capturedImage && (
                    <div className="absolute -top-2 -right-2 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
                      ✓
                    </div>
                  )}
                </button>
                <p className="mt-6 text-3xl font-bold text-white drop-shadow-lg">चित्र / Photo</p>
              </div>

              <div className="flex flex-col items-center">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing}
                  className={`relative w-48 h-48 rounded-full shadow-2xl hover:scale-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                    isRecording
                      ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse'
                      : 'bg-gradient-to-br from-pink-500 to-rose-600'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-24 h-24 text-white" />
                  ) : (
                    <Mic className="w-24 h-24 text-white" />
                  )}
                  {audioBlob && (
                    <div className="absolute -top-2 -right-2 w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg">
                      ✓
                    </div>
                  )}
                </button>
                <p className="mt-6 text-3xl font-bold text-white drop-shadow-lg">वाणी / Voice</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            <video ref={videoRef} autoPlay playsInline className="hidden" />
            <canvas ref={canvasRef} className="hidden" />

            {(capturedImage || audioBlob) && (
              <div className="bg-white/95 rounded-3xl p-8 shadow-2xl my-8">
                {capturedImage && (
                  <div className="mb-6">
                    <img src={capturedImage} alt="Captured" className="max-w-full max-h-96 mx-auto rounded-2xl shadow-lg" />
                  </div>
                )}
                {audioBlob && (
                  <div className="flex items-center justify-center gap-4 p-6 bg-pink-500 text-white rounded-2xl text-2xl font-bold">
                    <Mic className="w-8 h-8" />
                    आवाज रिकॉर्ड हो गई / Voice Recorded
                  </div>
                )}
              </div>
            )}

            {capturedImage && audioBlob && (
              <button
                onClick={generateStoryboard}
                disabled={isProcessing}
                className="w-full max-w-md mx-auto flex items-center justify-center gap-4 px-12 py-6 text-3xl font-bold text-white bg-gradient-to-r from-green-500 to-green-600 rounded-full shadow-2xl hover:scale-105 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>प्रोसेस हो रहा है... / Processing...</span>
                  </>
                ) : (
                  <span>कहानी बनाएं / Create Story</span>
                )}
              </button>
            )}

            {error && (
              <div className="bg-red-500 text-white p-6 rounded-2xl text-center text-2xl font-bold my-8 shadow-lg">
                {error}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white/95 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-4xl font-bold text-purple-600 text-center mb-8">आपकी कहानी / Your Story</h2>
            
            <button
              onClick={playAudioGuidance}
              disabled={!audioUrl}
              className="flex items-center justify-center gap-4 w-full max-w-sm mx-auto px-8 py-6 text-2xl font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 rounded-full shadow-xl hover:scale-105 transition-transform mb-8 disabled:opacity-50"
            >
              <Volume2 className="w-8 h-8" />
              <span>सुनें / Listen</span>
            </button>

            <div className="grid md:grid-cols-3 gap-8 my-8">
              {[storyboard.panel_1, storyboard.panel_2, storyboard.panel_3].map((panel, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-xl border-4 border-purple-600 hover:scale-105 transition-transform">
                  <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-3xl font-bold mb-4">
                    {idx + 1}
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-600 mb-4">{panel.title}</h3>
                  <div className="bg-gray-100 p-6 rounded-xl mb-4 min-h-32 flex items-center justify-center text-center italic text-gray-600">
                    {panel.visual_elements}
                  </div>
                  <p className="text-xl leading-relaxed text-gray-800 font-medium">{panel.caption}</p>
                </div>
              ))}
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-8 rounded-2xl my-8">
              <h3 className="text-3xl font-bold mb-4">सारांश / Summary</h3>
              <p className="text-xl leading-relaxed">{storyboard.summary}</p>
            </div>

            <button
              onClick={resetApp}
              className="flex items-center justify-center gap-4 w-full max-w-sm mx-auto px-8 py-5 text-2xl font-bold text-purple-600 bg-white border-4 border-purple-600 rounded-full shadow-xl hover:bg-purple-600 hover:text-white transition-all"
            >
              <RefreshCw className="w-8 h-8" />
              <span>नया दस्तावेज़ / New Document</span>
            </button>
          </div>
        )}
      </main>

      <audio ref={audioPlayerRef} src={audioUrl} className="hidden" />

      <footer className="bg-white/95 p-6 text-center text-indigo-600 font-semibold text-lg">
        <p>Team Royal Beast • AI for Bharat 2026</p>
      </footer>
    </div>
  );
}

export default App;

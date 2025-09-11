# 🧪 AVI_LAB - Voice Analysis Laboratory

**Independent testing environment for AVI voice analysis with OpenAI Whisper integration.**

## 🚀 Features

- **🎤 Voice Recording** - Record audio directly from browser
- **📁 File Upload** - Test with pre-recorded audio files  
- **🤖 OpenAI Whisper** - Real speech-to-text transcription
- **🧠 AVI Analysis** - Full voice analysis pipeline via BFF
- **📊 Benchmark Dashboard** - Compare multiple test results
- **💾 Export Results** - JSON export of analysis data
- **📱 Responsive UI** - Works on desktop and mobile

## 🏗️ Architecture

```
AVI_LAB (Frontend)
    ↓
OpenAI Whisper API (Transcription)  
    ↓
NestJS BFF (Voice Analysis)
    ↓
AVI Engine (Scoring)
```

## ⚡ Quick Start

### 1. Install Dependencies
```bash
cd avi-lab
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Configure OpenAI API Key
- Open http://localhost:8080
- Enter your OpenAI API key when prompted
- Key is stored in localStorage

### 4. Start BFF (Required)
```bash
# From project root
cd ../bff
npm run start:dev
```

## 🎯 Usage

### Recording Voice
1. Click **🎙️ Record** 
2. Speak clearly into microphone
3. Click **⏹️ Stop** when done
4. Audio is ready for analysis

### Uploading Files
1. Click **📁 Upload Audio**
2. Select audio file (WAV, MP3, M4A, etc.)
3. File is loaded and ready

### Running Analysis
1. Select test question from dropdown
2. Click **🧠 Analyze with AVI + Whisper**
3. Wait for processing (Whisper + AVI analysis)
4. View results in dashboard

### Results Dashboard
- **🗣️ Transcription** - Whisper speech-to-text
- **🎯 AVI Score** - 0-1000 scale with GO/REVIEW/NO-GO
- **📈 Voice Metrics** - Latency, pitch, energy, honesty
- **🚩 Analysis Flags** - Detected issues

### Export & Benchmark
- **💾 Export JSON** - Save results to file
- **📊 Add to Benchmark** - Compare multiple tests
- **🔄 Reset** - Clear current analysis

## 🔧 Configuration

### OpenAI Whisper API
- Requires OpenAI API key with Whisper access
- Configured via browser prompt
- Stored in localStorage: `avilab_openai_key`

### BFF Connection  
- Default: `http://localhost:3000`
- Health check: `/health/voice`
- Analysis endpoint: `/v1/voice/evaluate`

### Audio Settings
- **Format**: WebM/Opus (recording), any format (upload)
- **Max Duration**: 5 minutes
- **Sample Rate**: 44.1 kHz
- **Channels**: Mono

## 📊 Voice Analysis Pipeline

### 1. Audio Input
- Browser recording via MediaRecorder API
- File upload with validation
- Audio preprocessing and validation

### 2. Whisper Transcription  
```javascript
POST https://api.openai.com/v1/audio/transcriptions
Content-Type: multipart/form-data

file: audio.webm
model: whisper-1  
language: es
```

### 3. AVI Analysis
```javascript
POST http://localhost:3000/v1/voice/evaluate
Content-Type: multipart/form-data

audio: audio.webm
questionId: ingresos_promedio_diarios
contextId: avilab_timestamp
```

### 4. Results Processing
- Combine Whisper + AVI results
- Calculate derived metrics
- Apply decision logic
- Format for UI display

## 🎨 UI Components

### Header
- Lab branding and status
- Connection indicators

### Voice Controls  
- Record/Stop/Play buttons
- File upload interface
- Audio information display

### Question Selection
- Dropdown with AVI questions
- Pre-configured test scenarios

### Analysis Section
- Large analyze button
- Loading states with progress

### Results Dashboard
- 4-card layout with key metrics
- Color-coded decisions
- Detailed metric breakdown

### Actions
- Export, benchmark, reset controls
- Persistent data management

## 🔍 Testing Questions

Pre-configured AVI questions for testing:

1. **ingresos_promedio_diarios** - "¿Cuáles son sus ingresos promedio diarios?"
2. **gasto_diario_gasolina** - "¿Cuánto gasta al día en gasolina?"  
3. **gastos_mordidas_cuotas** - "¿Cuánto paga de cuotas o apoyos a la semana?"
4. **margen_disponible_credito** - "¿Cuánto le queda libre mensual?"
5. **seasonal_vulnerability** - "¿En qué época del año se te complica más trabajar?"

## 📈 Benchmark Features

### Data Storage
- LocalStorage persistence
- JSON format for portability
- Automatic cleanup options

### Metrics Tracking
- Average scores across tests
- Decision distribution (GO/REVIEW/NO-GO)
- Performance trends
- Question-specific analytics

### Export Options
- Individual result JSON export
- Benchmark data export
- CSV format for analysis

## 🚨 Troubleshooting

### Microphone Issues
- Check browser permissions
- Ensure HTTPS or localhost
- Test with different browsers

### BFF Connection
- Verify BFF is running on port 3000
- Check CORS configuration
- Monitor browser console for errors

### Whisper API Issues  
- Validate API key is correct
- Check OpenAI account credits
- Monitor rate limits

### Audio Upload
- Supported formats: WAV, MP3, M4A, WebM
- Max file size: 25MB (OpenAI limit)
- Check file corruption

## 🛠️ Development

### File Structure
```
avi-lab/
├── index.html          # Main UI layout
├── app.js              # Core application logic  
├── style.css           # Styling and themes
├── package.json        # Dependencies and scripts
└── README.md           # This documentation
```

### Key Classes
- `AVILab` - Main application controller
- Audio recording management
- OpenAI Whisper integration
- BFF communication layer
- Results processing and display

### Dependencies
- **axios** - HTTP requests
- **http-server** - Development server
- **live-server** - Live reload development

## 📝 Scripts

```bash
npm start        # Production server (port 8080)
npm run dev      # Development with live reload  
npm test         # Run validation checks
```

## 🔒 Security Notes

- OpenAI API key stored in localStorage only
- No server-side key storage
- HTTPS recommended for production
- Audio data not persisted on server

## 🎯 Use Cases

### Development Testing
- Test new AVI algorithms
- Validate voice analysis pipeline
- Debug transcription accuracy

### Demo Scenarios  
- Client presentations
- Proof of concept demos
- Training sessions

### Research & Analysis
- Collect voice samples
- Benchmark different approaches  
- A/B test algorithm changes

---

**🚀 Ready to test your voice analysis system independently!**
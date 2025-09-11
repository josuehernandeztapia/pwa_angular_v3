/**
 * 🧪 AVI_LAB - Voice Analysis Laboratory
 * Integrates OpenAI Whisper + BFF AVI Analysis
 */

class AVILab {
    constructor() {
        // Configuration
        this.config = {
            bffUrl: 'http://localhost:3000',
            openaiApiKey: '', // Will be set from user input or env
            maxRecordingTime: 300000, // 5 minutes
            audioFormat: 'audio/wav'
        };

        // State
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.currentAudio = null;
        this.isRecording = false;
        this.benchmarkData = JSON.parse(localStorage.getItem('avilab_benchmark') || '[]');

        // DOM Elements
        this.elements = {
            status: document.getElementById('status'),
            recordBtn: document.getElementById('recordBtn'),
            stopBtn: document.getElementById('stopBtn'),
            playBtn: document.getElementById('playBtn'),
            uploadBtn: document.getElementById('uploadBtn'),
            fileInput: document.getElementById('fileInput'),
            analyzeBtn: document.getElementById('analyzeBtn'),
            loading: document.getElementById('loading'),
            questionSelect: document.getElementById('questionSelect'),
            audioInfo: document.getElementById('audioInfo'),
            resultsSection: document.getElementById('resultsSection'),
            benchmarkSection: document.getElementById('benchmarkSection'),
            bffStatus: document.getElementById('bffStatus')
        };

        this.init();
    }

    async init() {
        console.log('🧪 Initializing AVI_LAB...');
        
        // Check browser support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showError('Voice recording not supported in this browser');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();

        // Check BFF connection
        await this.checkBFFStatus();

        // Prompt for OpenAI API key if not set
        this.promptForApiKey();

        this.updateStatus('Ready to test voice analysis! 🎤');
        console.log('✅ AVI_LAB initialized successfully');
    }

    setupEventListeners() {
        // Recording controls
        this.elements.recordBtn.addEventListener('click', () => this.startRecording());
        this.elements.stopBtn.addEventListener('click', () => this.stopRecording());
        this.elements.playBtn.addEventListener('click', () => this.playAudio());
        
        // File upload
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Analysis
        this.elements.analyzeBtn.addEventListener('click', () => this.analyzeAudio());
        
        // Results actions
        document.getElementById('exportBtn')?.addEventListener('click', () => this.exportResults());
        document.getElementById('benchmarkBtn')?.addEventListener('click', () => this.addToBenchmark());
        document.getElementById('resetBtn')?.addEventListener('click', () => this.resetAnalysis());
    }

    async checkBFFStatus() {
        try {
            const response = await fetch(`${this.config.bffUrl}/health/voice`);
            if (response.ok) {
                const data = await response.json();
                this.elements.bffStatus.textContent = '✅ Connected';
                this.elements.bffStatus.style.color = 'var(--success-color)';
                console.log('✅ BFF connected:', data);
            } else {
                throw new Error('BFF not responding');
            }
        } catch (error) {
            this.elements.bffStatus.textContent = '❌ Disconnected';
            this.elements.bffStatus.style.color = 'var(--danger-color)';
            console.warn('⚠️ BFF not available:', error.message);
        }
    }

    promptForApiKey() {
        if (!this.config.openaiApiKey) {
            const apiKey = prompt('Enter your OpenAI API Key for Whisper integration:');
            if (apiKey) {
                this.config.openaiApiKey = apiKey;
                localStorage.setItem('avilab_openai_key', apiKey);
            } else {
                this.showError('OpenAI API key required for Whisper transcription');
            }
        }
    }

    async startRecording() {
        try {
            console.log('🎙️ Starting recording...');
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                } 
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.mediaRecorder.start(1000); // Collect data every second

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecording();
                stream.getTracks().forEach(track => track.stop());
            };

            this.isRecording = true;
            this.updateRecordingUI(true);
            this.updateStatus('🔴 Recording... Speak clearly!', 'recording');

            // Auto-stop after max time
            setTimeout(() => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            }, this.config.maxRecordingTime);

        } catch (error) {
            console.error('❌ Recording failed:', error);
            this.showError('Could not access microphone. Check permissions.');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('⏹️ Stopping recording...');
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateRecordingUI(false);
            this.updateStatus('Processing audio...', 'connected');
        }
    }

    processRecording() {
        if (this.audioChunks.length === 0) {
            this.showError('No audio recorded');
            return;
        }

        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.setCurrentAudio(audioBlob);
        console.log('✅ Audio processed:', {
            size: audioBlob.size,
            type: audioBlob.type
        });
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (file && file.type.startsWith('audio/')) {
            console.log('📁 File uploaded:', file.name);
            this.setCurrentAudio(file);
        } else {
            this.showError('Please select a valid audio file');
        }
    }

    setCurrentAudio(audioBlob) {
        this.currentAudio = audioBlob;
        
        // Update UI
        this.showAudioInfo(audioBlob);
        this.elements.playBtn.disabled = false;
        this.elements.analyzeBtn.disabled = false;
        
        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        document.getElementById('audioPlayer').src = audioUrl;
        
        this.updateStatus('✅ Audio ready for analysis');
    }

    showAudioInfo(audioBlob) {
        const sizeKB = (audioBlob.size / 1024).toFixed(1);
        
        document.getElementById('audioSize').textContent = sizeKB;
        document.getElementById('audioDuration').textContent = 'Calculating...';
        this.elements.audioInfo.style.display = 'block';

        // Get actual duration when audio loads
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.onloadedmetadata = () => {
            document.getElementById('audioDuration').textContent = audio.duration.toFixed(1);
        };
    }

    playAudio() {
        const audioPlayer = document.getElementById('audioPlayer');
        audioPlayer.style.display = 'block';
        audioPlayer.play();
    }

    async analyzeAudio() {
        if (!this.currentAudio) {
            this.showError('No audio to analyze');
            return;
        }

        console.log('🧠 Starting analysis...');
        this.showLoading(true);
        this.updateStatus('🤖 Analyzing with OpenAI Whisper + AVI...');

        try {
            // Step 1: Transcribe with OpenAI Whisper
            const transcription = await this.transcribeWithWhisper(this.currentAudio);
            console.log('✅ Whisper transcription:', transcription);

            // Step 2: Analyze with BFF AVI Engine
            const aviResults = await this.analyzeWithBFF(this.currentAudio, transcription);
            console.log('✅ AVI analysis:', aviResults);

            // Step 3: Display results
            this.displayResults({
                transcription,
                ...aviResults
            });

            this.updateStatus('✅ Analysis complete!', 'connected');

        } catch (error) {
            console.error('❌ Analysis failed:', error);
            this.showError(`Analysis failed: ${error.message}`);
        } finally {
            this.showLoading(false);
        }
    }

    async transcribeWithWhisper(audioBlob) {
        if (!this.config.openaiApiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'es');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.openaiApiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Whisper API error: ${error}`);
        }

        const result = await response.json();
        return {
            text: result.text,
            confidence: 0.95 // OpenAI doesn't provide confidence, so we estimate
        };
    }

    async analyzeWithBFF(audioBlob, transcription) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        formData.append('questionId', this.elements.questionSelect.value);
        formData.append('contextId', `avilab_${Date.now()}`);

        const response = await fetch(`${this.config.bffUrl}/v1/voice/evaluate`, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Request-Id': `avilab_${Date.now()}`
            }
        });

        if (!response.ok) {
            throw new Error(`BFF analysis failed: ${response.status}`);
        }

        return await response.json();
    }

    displayResults(results) {
        console.log('📊 Displaying results:', results);

        // Show results section
        this.elements.resultsSection.style.display = 'block';

        // Transcription
        document.getElementById('transcription').textContent = results.transcription.text || results.transcript || 'No transcription available';
        document.getElementById('whisperConfidence').textContent = Math.round((results.transcription.confidence || 0.95) * 100);

        // AVI Score
        const score = Math.round(results.voiceScore * 1000) || results.totalScore || 0;
        document.getElementById('aviScore').textContent = score;
        
        const decision = results.decision || (score >= 750 ? 'GO' : score >= 550 ? 'REVIEW' : 'NO-GO');
        const decisionElement = document.getElementById('decision');
        decisionElement.textContent = decision;
        decisionElement.className = `decision ${decision}`;

        // Voice Metrics
        document.getElementById('latencyIndex').textContent = (results.latencyIndex || 0).toFixed(3);
        document.getElementById('pitchVar').textContent = (results.pitchVar || 0).toFixed(3);
        document.getElementById('energyStability').textContent = (results.energyStability || 0).toFixed(3);
        document.getElementById('honestyLexicon').textContent = (results.honestyLexicon || 0).toFixed(3);

        // Flags
        const flagsContainer = document.getElementById('analysisFlags');
        if (results.flags && results.flags.length > 0) {
            flagsContainer.innerHTML = results.flags.map(flag => 
                `<span class="flag">${flag}</span>`
            ).join('');
        } else {
            flagsContainer.textContent = 'No flags detected';
        }

        // Store current results for export
        this.currentResults = {
            timestamp: new Date().toISOString(),
            questionId: this.elements.questionSelect.value,
            questionText: this.elements.questionSelect.options[this.elements.questionSelect.selectedIndex].text,
            ...results
        };
    }

    exportResults() {
        if (!this.currentResults) {
            this.showError('No results to export');
            return;
        }

        const dataStr = JSON.stringify(this.currentResults, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `avi_lab_results_${Date.now()}.json`;
        link.click();
        
        console.log('💾 Results exported');
    }

    addToBenchmark() {
        if (!this.currentResults) {
            this.showError('No results to add to benchmark');
            return;
        }

        this.benchmarkData.push(this.currentResults);
        localStorage.setItem('avilab_benchmark', JSON.stringify(this.benchmarkData));
        
        this.showBenchmarkData();
        console.log('📊 Added to benchmark:', this.benchmarkData.length, 'entries');
    }

    showBenchmarkData() {
        this.elements.benchmarkSection.style.display = 'block';
        
        const container = document.getElementById('benchmarkData');
        if (this.benchmarkData.length === 0) {
            container.innerHTML = '<p>No benchmark data yet. Analyze some audio files to see comparisons!</p>';
            return;
        }

        const avgScore = this.benchmarkData.reduce((sum, item) => 
            sum + (Math.round(item.voiceScore * 1000) || item.totalScore || 0), 0
        ) / this.benchmarkData.length;

        const decisions = this.benchmarkData.reduce((acc, item) => {
            const decision = item.decision || 'UNKNOWN';
            acc[decision] = (acc[decision] || 0) + 1;
            return acc;
        }, {});

        container.innerHTML = `
            <div class="benchmark-summary">
                <h3>📈 Benchmark Summary</h3>
                <p><strong>Total Tests:</strong> ${this.benchmarkData.length}</p>
                <p><strong>Average Score:</strong> ${Math.round(avgScore)}/1000</p>
                <p><strong>Decisions:</strong> ${Object.entries(decisions).map(([k,v]) => `${k}: ${v}`).join(', ')}</p>
            </div>
            <div class="benchmark-items">
                ${this.benchmarkData.slice(-5).map((item, index) => `
                    <div class="benchmark-item">
                        <span>${item.questionText || item.questionId}</span>
                        <span>${Math.round(item.voiceScore * 1000) || item.totalScore || 0}/1000</span>
                        <span class="decision ${item.decision}">${item.decision}</span>
                    </div>
                `).join('')}
            </div>
            <button onclick="aviLab.clearBenchmark()" class="btn secondary">🗑️ Clear Benchmark</button>
        `;
    }

    clearBenchmark() {
        this.benchmarkData = [];
        localStorage.removeItem('avilab_benchmark');
        this.showBenchmarkData();
        console.log('🗑️ Benchmark cleared');
    }

    resetAnalysis() {
        this.currentAudio = null;
        this.currentResults = null;
        
        this.elements.resultsSection.style.display = 'none';
        this.elements.audioInfo.style.display = 'none';
        this.elements.playBtn.disabled = true;
        this.elements.analyzeBtn.disabled = true;
        
        document.getElementById('audioPlayer').style.display = 'none';
        this.elements.fileInput.value = '';
        
        this.updateStatus('Ready for new analysis! 🎤');
        console.log('🔄 Analysis reset');
    }

    updateRecordingUI(recording) {
        this.elements.recordBtn.disabled = recording;
        this.elements.stopBtn.disabled = !recording;
        this.elements.uploadBtn.disabled = recording;
    }

    showLoading(show) {
        this.elements.loading.style.display = show ? 'block' : 'none';
        this.elements.analyzeBtn.disabled = show;
    }

    updateStatus(message, type = '') {
        this.elements.status.textContent = message;
        this.elements.status.className = `status ${type}`;
        console.log(`📱 Status: ${message}`);
    }

    showError(message) {
        this.updateStatus(`❌ ${message}`, 'error');
        console.error('❌ AVI_LAB Error:', message);
        alert(`AVI_LAB Error: ${message}`);
    }
}

// Initialize AVI_LAB when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.aviLab = new AVILab();
});

// Add global error handling
window.addEventListener('error', (event) => {
    console.error('🚨 Global error:', event.error);
});

console.log('🧪 AVI_LAB script loaded successfully');
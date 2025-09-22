import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OpenAIWhisperService {
  
  private readonly API_URL = `${environment.apiUrl}/ai/transcriptions`;
  private isRecording$ = new BehaviorSubject<boolean>(false);
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  
  constructor(private http: HttpClient) {}

  /**
   * Transcribir archivo de audio usando OpenAI Whisper API
   */
  transcribeAudio(audioBlob: Blob, options?: WhisperTranscriptionOptions): Observable<WhisperResponse> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', options?.model || 'gpt-4o-transcribe');
    
    if (options?.language) {
      formData.append('language', options.language);
    }
    
    if (options?.prompt) {
      formData.append('prompt', options.prompt);
    }
    
    if (options?.temperature !== undefined) {
      formData.append('temperature', options.temperature.toString());
    }
    
    if (options?.responseFormat) {
      formData.append('response_format', options.responseFormat);
    }
    
    if (options?.timestampGranularities) {
      options.timestampGranularities.forEach(granularity => {
        formData.append('timestamp_granularities[]', granularity);
      });
    }
    
    if (options?.includeLogProbs) {
      formData.append('include[]', 'logprobs');
    }
    
    // Configurar chunking strategy para mejor análisis de voz
    if (options?.chunkingStrategy) {
      if (typeof options.chunkingStrategy === 'string') {
        formData.append('chunking_strategy', options.chunkingStrategy);
      } else {
        formData.append('chunking_strategy', JSON.stringify(options.chunkingStrategy));
      }
    } else {
      // Por defecto usar auto chunking para análisis de voz AVI
      formData.append('chunking_strategy', 'auto');
    }

    return this.http.post<WhisperResponse>(this.API_URL, formData)
      .pipe(
        map(response => {
          // Procesar respuesta para extraer métricas de voz
          return this.enhanceResponseWithVoiceMetrics(response, audioBlob);
        }),
        catchError(error => {
// removed by clean-audit
          throw new Error(`Whisper API Error: ${error.message}`);
        })
      );
  }

  /**
   * Iniciar grabación de audio para AVI
   */
  startRecording(): Observable<boolean> {
    return from(navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000, // Optimal para Whisper
        channelCount: 1,   // Mono
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })).pipe(
      map(stream => {
        this.audioChunks = [];
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus'
        });
        
        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };
        
        this.mediaRecorder.start(1000); // Chunks de 1 segundo para análisis real-time
        this.isRecording$.next(true);
        
        return true;
      }),
      catchError(error => {
// removed by clean-audit
        throw new Error('No se pudo acceder al micrófono');
      })
    );
  }

  /**
   * Detener grabación y obtener audio
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No hay grabación activa'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.audioChunks = [];
        this.isRecording$.next(false);
        
        // Detener tracks del stream
        this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
        
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Grabar y transcribir en tiempo real para una pregunta AVI
   */
  recordAndTranscribeQuestion(
    questionId: string,
    expectedDuration: number,
    options?: WhisperTranscriptionOptions
  ): Observable<AVIVoiceResponse> {
    return new Observable(observer => {
      const startTime = Date.now();
      let transcriptionStarted = false;
      
      this.startRecording().subscribe({
        next: (success) => {
          if (success) {
// removed by clean-audit
            
            // Auto-detener después del tiempo esperado + buffer
            const autoStopTimer = setTimeout(async () => {
              if (this.isRecording$.value && !transcriptionStarted) {
                transcriptionStarted = true;
                try {
                  const audioBlob = await this.stopRecording();
                  const responseTime = Date.now() - startTime;
                  
                  this.transcribeWithAVIAnalysis(audioBlob, questionId, responseTime, options)
                    .subscribe(observer);
                } catch (error) {
                  observer.error(error);
                }
              }
            }, expectedDuration * 1.5); // 50% buffer
            
            // Permitir detención manual
            observer.next({
              status: 'recording',
              questionId,
              startTime: new Date(startTime),
              stopRecording: async () => {
                clearTimeout(autoStopTimer);
                if (!transcriptionStarted) {
                  transcriptionStarted = true;
                  const audioBlob = await this.stopRecording();
                  const responseTime = Date.now() - startTime;
                  
                  this.transcribeWithAVIAnalysis(audioBlob, questionId, responseTime, options)
                    .subscribe(observer);
                }
              }
            } as any);
          }
        },
        error: (error) => observer.error(error)
      });
    });
  }

  /**
   * Transcribir con análisis específico para AVI
   */
  private transcribeWithAVIAnalysis(
    audioBlob: Blob,
    questionId: string,
    responseTime: number,
    options?: WhisperTranscriptionOptions
  ): Observable<AVIVoiceResponse> {
    
    // Configurar opciones optimizadas para AVI
    const aviOptions: WhisperTranscriptionOptions = {
      model: 'gpt-4o-transcribe', // Mejor modelo para análisis detallado
      language: 'es', // Español
      responseFormat: 'verbose_json', // Necesario para timestamps
      timestampGranularities: ['word', 'segment'],
      includeLogProbs: true, // Para confidence scoring
      temperature: 0.1, // Baja temperatura para consistencia
      prompt: 'Transcripción de entrevista financiera en español mexicano. Incluir pausas, tartamudeos y expresiones de duda.',
      chunkingStrategy: 'auto',
      ...options
    };

    return this.transcribeAudio(audioBlob, aviOptions).pipe(
      map(whisperResponse => {
        // Analizar métricas de voz específicas para AVI
        const voiceMetrics = this.analyzeVoiceForAVI(whisperResponse, audioBlob, responseTime);
        const stressIndicators = this.detectStressIndicators(whisperResponse, voiceMetrics);
        
        return {
          status: 'completed',
          questionId,
          transcription: whisperResponse.text,
          responseTime,
          voiceAnalysis: voiceMetrics,
          stressIndicators,
          whisperResponse,
          confidence: this.calculateOverallConfidence(whisperResponse),
          detectedLanguage: 'es',
          audioAnalysis: {
            duration: this.estimateAudioDuration(audioBlob),
            fileSize: audioBlob.size,
            pauseCount: this.countPausesFromTimestamps(whisperResponse),
            speechRate: this.calculateSpeechRate(whisperResponse, audioBlob)
          }
        };
      })
    );
  }

  /**
   * Analizar métricas de voz específicas para AVI
   */
  private analyzeVoiceForAVI(response: WhisperResponse, audioBlob: Blob, responseTime: number) {
    const duration = this.estimateAudioDuration(audioBlob);
    const wordCount = response.text.split(' ').length;
    const speechRate = wordCount / (duration / 1000); // palabras por segundo

    // Calcular métricas basadas en timestamps de palabras
    let pitchVariance = 0.5; // Default
    let pauseFrequency = 0;
    let voiceTremor = 0.3; // Default

    if (response.words) {
      // Analizar patrones de timing entre palabras
      const wordTimings = response.words.map((word, index) => {
        if (index === 0) return 0;
        return word.start - response.words[index - 1].end;
      }).filter(timing => timing > 0);

      // Calcular frecuencia de pausas
      const longPauses = wordTimings.filter(timing => timing > 0.5).length;
      pauseFrequency = longPauses / wordTimings.length;

      // Estimar variación de pitch basado en confianza de palabras
      if (response.words.every(w => w.confidence)) {
        const confidences = response.words.map(w => w.confidence!);
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        const variance = confidences.reduce((acc, conf) => acc + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
        pitchVariance = Math.min(1, variance * 5); // Escalar a 0-1
      }

      // Estimar tremor basado en inconsistencias de timing
      const timingVariance = this.calculateVariance(wordTimings);
      voiceTremor = Math.min(1, timingVariance / 0.1);
    }

    return {
      pitch_variance: pitchVariance,
      speech_rate_change: Math.abs(speechRate - 2) / 3, // Normalizado vs 2 palabras/seg promedio
      pause_frequency: pauseFrequency,
      voice_tremor: voiceTremor,
      confidence_level: this.calculateOverallConfidence(response)
    };
  }

  /**
   * Detectar indicadores de estrés basados en transcripción y voz
   */
  private detectStressIndicators(response: WhisperResponse, voiceMetrics: any): string[] {
    const indicators: string[] = [];
    const text = response.text.toLowerCase();

    // Indicadores lexicales
    if (text.includes('eh...') || text.includes('pues...') || text.includes('este...')) {
      indicators.push('muletillas');
    }

    if (text.includes('...') || text.match(/\.{3,}/)) {
      indicators.push('pausas_largas');
    }

    if (text.includes('aproximadamente') || text.includes('más o menos') || text.includes('como que')) {
      indicators.push('lenguaje_evasivo');
    }

    if (text.match(/(\w)\1{2,}/)) { // Letras repetidas (tartamudeo)
      indicators.push('tartamudeo');
    }

    // Indicadores de voz
    if (voiceMetrics.pause_frequency > 0.3) {
      indicators.push('pausas_frecuentes');
    }

    if (voiceMetrics.pitch_variance > 0.6) {
      indicators.push('variacion_pitch_alta');
    }

    if (voiceMetrics.voice_tremor > 0.5) {
      indicators.push('voz_temblorosa');
    }

    if (voiceMetrics.speech_rate_change > 0.4) {
      indicators.push('cambio_velocidad_habla');
    }

    if (voiceMetrics.confidence_level < 0.7) {
      indicators.push('baja_claridad');
    }

    return indicators;
  }

  // Helper methods
  private enhanceResponseWithVoiceMetrics(response: WhisperResponse, audioBlob: Blob): WhisperResponse {
    // Agregar métricas adicionales a la respuesta
    return {
      ...response,
      audioMetrics: {
        fileSize: audioBlob.size,
        estimatedDuration: this.estimateAudioDuration(audioBlob),
        processingTime: Date.now()
      }
    };
  }

  private calculateOverallConfidence(response: WhisperResponse): number {
    if (response.words && response.words.every(w => w.confidence !== undefined)) {
      const confidences = response.words.map(w => w.confidence!);
      return confidences.reduce((a, b) => a + b, 0) / confidences.length;
    }
    return 0.8; // Default confidence
  }

  private estimateAudioDuration(audioBlob: Blob): number {
    // Estimación basada en tamaño (aproximado)
    // En producción usar Web Audio API para duración exacta
    return (audioBlob.size / 16000) * 1000; // Aproximado en ms
  }

  private countPausesFromTimestamps(response: WhisperResponse): number {
    if (!response.words) return 0;
    
    let pauseCount = 0;
    for (let i = 1; i < response.words.length; i++) {
      const gap = response.words[i].start - response.words[i-1].end;
      if (gap > 0.5) pauseCount++; // Pausa > 500ms
    }
    return pauseCount;
  }

  private calculateSpeechRate(response: WhisperResponse, audioBlob: Blob): number {
    const wordCount = response.text.split(' ').length;
    const duration = this.estimateAudioDuration(audioBlob) / 1000; // en segundos
    return wordCount / duration;
  }

  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
    return numbers.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / numbers.length;
  }

  // Getters para estado
  get isRecording(): Observable<boolean> {
    return this.isRecording$.asObservable();
  }
}

// Interfaces para Whisper API
export interface WhisperTranscriptionOptions {
  model?: 'gpt-4o-transcribe' | 'gpt-4o-mini-transcribe' | 'whisper-1';
  language?: string;
  prompt?: string;
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number;
  timestampGranularities?: ('word' | 'segment')[];
  includeLogProbs?: boolean;
  chunkingStrategy?: 'auto' | ChunkingStrategyConfig;
}

export interface ChunkingStrategyConfig {
  type: 'server_vad';
  server_vad?: {
    threshold?: number;
    prefix_padding_ms?: number;
    suffix_padding_ms?: number;
  };
}

export interface WhisperResponse {
  text: string;
  usage?: {
    type: 'tokens';
    input_tokens: number;
    input_token_details: {
      text_tokens: number;
      audio_tokens: number;
    };
    output_tokens: number;
    total_tokens: number;
  };
  words?: WhisperWord[];
  segments?: WhisperSegment[];
  audioMetrics?: {
    fileSize: number;
    estimatedDuration: number;
    processingTime: number;
  };
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
  logprobs?: number[];
}

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export interface AVIVoiceResponse {
  status: 'recording' | 'processing' | 'completed' | 'error';
  questionId: string;
  transcription?: string;
  responseTime?: number;
  voiceAnalysis?: {
    pitch_variance: number;
    speech_rate_change: number;
    pause_frequency: number;
    voice_tremor: number;
    confidence_level: number;
  };
  stressIndicators?: string[];
  whisperResponse?: WhisperResponse;
  confidence?: number;
  detectedLanguage?: string;
  audioAnalysis?: {
    duration: number;
    fileSize: number;
    pauseCount: number;
    speechRate: number;
  };
  startTime?: Date;
  stopRecording?: () => Promise<void>;
  error?: string;
}
// removed by clean-audit
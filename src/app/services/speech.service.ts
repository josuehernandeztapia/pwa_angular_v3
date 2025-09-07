import { Injectable } from '@angular/core';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  constructor(private toast: ToastService) {}

  speak(text: string, options?: { auto?: boolean; rate?: number; lang?: string }): void {
    // SSR safety
    if (typeof window === 'undefined') return;

    // Respect user/system preferences for automatic speech (only when auto-initiated)
    if (options?.auto && typeof window.matchMedia !== 'undefined') {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;
    }

    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      // Cancel any ongoing speech before speaking new content
      this.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options?.lang || 'es-MX';
      utterance.rate = options?.rate ?? 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      this.toast.info('Tu navegador no soporta síntesis de voz');
    }
  }

  cancel(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}


import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SpeechService {
  speak(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      speechSynthesis.speak(utterance);
    }
  }

  cancel(): void {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
}


import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class FocusTrapService {
  private previouslyFocused: HTMLElement | null = null;

  remember(): void {
    this.previouslyFocused = (document.activeElement as HTMLElement) ?? null;
  }

  restore(): void {
    try {
      this.previouslyFocused?.focus();
    } catch { /* no-op */ }
    this.previouslyFocused = null;
  }

  trap(container: HTMLElement): () => void {
    const focusableSelectors = [
      'a[href]', 'area[href]', 'input:not([disabled])', 'select:not([disabled])', 'textarea:not([disabled])',
      'button:not([disabled])', 'iframe', 'object', 'embed', '[contenteditable]', '[tabindex]:not([tabindex="-1"])'
    ].join(',');

    const getFocusable = (): HTMLElement[] => Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));

    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          last.focus();
          event.preventDefault();
        }
      } else {
        if (active === last) {
          first.focus();
          event.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', keydown);
    return () => container.removeEventListener('keydown', keydown);
  }
}


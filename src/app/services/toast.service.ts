import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  // Optional action support for interactive toasts
  actionLabel?: string;
  action?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();
  
  private toasts: Toast[] = [];

  constructor() { }

  success(message: string, duration: number = 3000): void {
    this.show('success', message, duration);
  }

  error(message: string, duration: number = 5000): void {
    this.show('error', message, duration);
  }

  warning(message: string, duration: number = 4000): void {
    this.show('warning', message, duration);
  }

  info(message: string, duration: number = 3000): void {
    this.show('info', message, duration);
  }

  // New: show a toast with an action button (if UI supports it)
  action(
    type: Toast['type'],
    message: string,
    actionLabel: string,
    action: () => void,
    duration: number = 5000
  ): void {
    this.show(type, message, duration, actionLabel, action);
  }

  // Aliases for backwards-compat with specs
  showSuccess(message: string, duration: number = 3000): void {
    this.success(message, duration);
  }

  showError(message: string, duration: number = 5000): void {
    this.error(message, duration);
  }

  private show(
    type: Toast['type'],
    message: string,
    duration: number,
    actionLabel?: string,
    action?: () => void
  ): void {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      message,
      duration,
      actionLabel,
      action
    };

    this.toasts.push(toast);
    this.toastSubject.next(toast);

    // Auto remove after duration
    setTimeout(() => {
      this.remove(toast.id);
    }, duration);
  }

  remove(id: string): void {
    this.toasts = this.toasts.filter(toast => toast.id !== id);
  }

  getToasts(): Toast[] {
    return this.toasts;
  }
}
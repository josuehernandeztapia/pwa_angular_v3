import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
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

  private show(type: Toast['type'], message: string, duration: number): void {
    const toast: Toast = {
      id: Date.now().toString(),
      type,
      message,
      duration
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
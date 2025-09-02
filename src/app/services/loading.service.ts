import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingQueue: string[] = [];

  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  /**
   * Show global loading indicator
   */
  show(identifier?: string): void {
    if (identifier) {
      if (!this.loadingQueue.includes(identifier)) {
        this.loadingQueue.push(identifier);
      }
    }
    
    if (!this.loadingSubject.value) {
      this.loadingSubject.next(true);
    }
  }

  /**
   * Hide global loading indicator
   */
  hide(identifier?: string): void {
    if (identifier) {
      const index = this.loadingQueue.indexOf(identifier);
      if (index > -1) {
        this.loadingQueue.splice(index, 1);
      }
      
      // Only hide if no more items in queue
      if (this.loadingQueue.length > 0) {
        return;
      }
    }
    
    if (this.loadingSubject.value) {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Get current loading state
   */
  isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Force hide loading (emergency stop)
   */
  forceHide(): void {
    this.loadingQueue = [];
    this.loadingSubject.next(false);
  }

  /**
   * Show loading for a specific duration
   */
  showForDuration(duration: number, identifier?: string): void {
    this.show(identifier);
    setTimeout(() => {
      this.hide(identifier);
    }, duration);
  }

  /**
   * Alias method for compatibility with http-client.service
   */
  setLoading(loading: boolean, identifier?: string): void {
    if (loading) {
      this.show(identifier);
    } else {
      this.hide(identifier);
    }
  }
}
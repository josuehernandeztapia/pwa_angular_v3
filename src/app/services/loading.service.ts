import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private loadingQueue: string[] = [];
  private globalLoading = false;

  public loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {}

  /**
   * Show global loading indicator
   */
  show(identifier?: string): void {
    if (identifier !== undefined && identifier !== null) {
      if (!this.loadingQueue.includes(identifier)) {
        this.loadingQueue.push(identifier);
      }
    } else {
      this.globalLoading = true;
    }
    
    this.updateLoadingState();
  }

  /**
   * Hide global loading indicator
   */
  hide(identifier?: string): void {
    if (identifier !== undefined && identifier !== null) {
      const index = this.loadingQueue.indexOf(identifier);
      if (index > -1) {
        this.loadingQueue.splice(index, 1);
      }
    } else {
      this.globalLoading = false;
    }
    
    this.updateLoadingState();
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
    this.globalLoading = false;
    this.loadingSubject.next(false);
  }

  /**
   * Update loading state based on global loading and queue
   */
  private updateLoadingState(): void {
    const shouldBeLoading = this.globalLoading || this.loadingQueue.length > 0;
    if (this.loadingSubject.value !== shouldBeLoading) {
      this.loadingSubject.next(shouldBeLoading);
    }
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
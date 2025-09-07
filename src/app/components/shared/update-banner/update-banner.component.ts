import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SwUpdateService } from '../../../services/sw-update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="update-banner" *ngIf="show">
      <div class="banner-content">
        <span class="banner-text">Nueva versión disponible</span>
        <button class="banner-btn" (click)="updateNow()">Actualizar ahora</button>
      </div>
    </div>
  `,
  styles: [`
    .update-banner {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #0ea5e9;
      color: white;
      padding: 10px 14px;
      border-radius: 9999px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.15);
      z-index: 1100;
    }
    .banner-content { display: flex; align-items: center; gap: 12px; }
    .banner-btn {
      background: white;
      color: #0ea5e9;
      border: none;
      border-radius: 9999px;
      padding: 6px 10px;
      font-weight: 700;
      cursor: pointer;
    }
  `]
})
export class UpdateBannerComponent implements OnInit, OnDestroy {
  show = false;
  private sub?: Subscription;

  constructor(private sw: SwUpdateService) {}

  ngOnInit(): void {
    this.sub = this.sw.updateAvailable$.subscribe((flag: boolean) => this.show = flag);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  updateNow(): void {
    this.sw.updateNow();
  }
}


import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TandaMilestone } from '../../models/tanda';

@Component({
  selector: 'app-tanda-timeline',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tanda-timeline">
      <div *ngFor="let milestone of milestones; let i = index" class="timeline-item">
        <div class="timeline-marker">
          <div 
            class="marker-circle"
            [class.marker-completed]="milestone.completed"
            [class.marker-current]="milestone.current"
            [class.marker-pending]="!milestone.completed && !milestone.current"
          >
            <span class="marker-emoji">{{ milestone.emoji }}</span>
          </div>
          <div 
            *ngIf="i < milestones.length - 1" 
            class="timeline-line"
            [class.line-completed]="milestone.completed"
          ></div>
        </div>
        
        <div class="timeline-content">
          <div class="milestone-header">
            <h3 class="milestone-title">{{ milestone.title }}</h3>
            <span class="milestone-month">Mes {{ milestone.month }}</span>
          </div>
          
          <p class="milestone-description">{{ milestone.description }}</p>
          
          <div *ngIf="milestone.details" class="milestone-details">
            <div *ngFor="let detail of milestone.details" class="detail-item">
              {{ detail }}
            </div>
          </div>
          
          <div *ngIf="milestone.amount" class="milestone-amount">
            <span class="amount-label">Monto:</span>
            <span class="amount-value">{{ formatCurrency(milestone.amount) }}</span>
          </div>
          
          <div *ngIf="milestone.memberName" class="milestone-member">
            <span class="member-label">Beneficiario:</span>
            <span class="member-name">{{ milestone.memberName }}</span>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div *ngIf="milestones.length === 0" class="timeline-empty">
        <div class="empty-icon">📅</div>
        <p>No hay hitos programados</p>
      </div>
    </div>
  `,
  styles: [`
    .tanda-timeline {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      position: relative;
    }

    .timeline-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      flex-shrink: 0;
    }

    .marker-circle {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: bold;
      transition: all 0.3s ease;
      z-index: 1;
    }

    .marker-completed {
      background: #10b981; /* emerald-500 */
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .marker-current {
      background: #f59e0b; /* amber-500 */
      color: white;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      animation: pulse 2s infinite;
    }

    .marker-pending {
      background: #6b7280; /* gray-500 */
      color: white;
    }

    .marker-emoji {
      font-size: 20px;
    }

    .timeline-line {
      width: 2px;
      height: 32px;
      background: #d1d5db; /* gray-300 */
      margin-top: 8px;
    }

    .line-completed {
      background: #10b981; /* emerald-500 */
    }

    .timeline-content {
      flex: 1;
      background: white;
      border-radius: 8px;
      border: 1px solid #e5e7eb; /* gray-200 */
      padding: 16px;
      transition: all 0.2s ease;
    }

    .timeline-content:hover {
      border-color: #d1d5db; /* gray-300 */
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }

    .milestone-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .milestone-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937; /* gray-800 */
    }

    .milestone-month {
      background: #e0f2fe; /* cyan-50 */
      color: #0891b2; /* cyan-600 */
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }

    .milestone-description {
      margin: 0 0 12px 0;
      color: #6b7280; /* gray-500 */
      line-height: 1.5;
    }

    .milestone-details {
      background: #f9fafb; /* gray-50 */
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .detail-item {
      font-size: 14px;
      color: #4b5563; /* gray-600 */
      margin-bottom: 4px;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .milestone-amount {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #ecfdf5; /* emerald-50 */
      border-radius: 6px;
    }

    .amount-label {
      font-size: 14px;
      color: #065f46; /* emerald-800 */
      font-weight: 500;
    }

    .amount-value {
      font-size: 16px;
      font-weight: 700;
      color: #059669; /* emerald-600 */
      font-family: monospace;
    }

    .milestone-member {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #eff6ff; /* blue-50 */
      border-radius: 6px;
    }

    .member-label {
      font-size: 14px;
      color: #1e40af; /* blue-800 */
      font-weight: 500;
    }

    .member-name {
      font-size: 14px;
      font-weight: 600;
      color: #2563eb; /* blue-600 */
    }

    .timeline-empty {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280; /* gray-500 */
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .timeline-empty p {
      margin: 0;
      font-size: 16px;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    @media (max-width: 768px) {
      .timeline-item {
        gap: 12px;
      }

      .marker-circle {
        width: 40px;
        height: 40px;
        font-size: 16px;
      }

      .marker-emoji {
        font-size: 16px;
      }

      .timeline-content {
        padding: 12px;
      }

      .milestone-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .milestone-title {
        font-size: 16px;
      }

      .milestone-amount,
      .milestone-member {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
    }
  `]
})
export class TandaTimelineComponent {
  @Input() milestones: TandaMilestone[] = [];

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }
}

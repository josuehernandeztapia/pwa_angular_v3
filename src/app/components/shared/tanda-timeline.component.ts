import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TandaMilestone } from '../../models/tanda';
import { IconComponent } from './icon/icon.component';
import { IconName } from './icon/icon-definitions';

@Component({
  selector: 'app-tanda-timeline',
  standalone: true,
  imports: [CommonModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./tanda-timeline.component.scss'],
  templateUrl: './tanda-timeline.component.html',
})
export class TandaTimelineComponent {
  @Input() milestones: TandaMilestone[] = [];

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN' 
    }).format(amount);
  }

  getMarkerCircleClasses(milestone: TandaMilestone): Record<string, boolean> {
    return {
      'tanda-timeline__marker-circle': true,
      'tanda-timeline__marker-circle--completed': !!milestone.completed,
      'tanda-timeline__marker-circle--current': !!milestone.current,
      'tanda-timeline__marker-circle--pending': !milestone.completed && !milestone.current,
    };
  }

  getMarkerLineClasses(milestone: TandaMilestone): Record<string, boolean> {
    return {
      'tanda-timeline__marker-line': true,
      'tanda-timeline__marker-line--completed': !!milestone.completed,
    };
  }

  getMilestoneIcon(milestone: TandaMilestone): IconName {
    if (milestone.icon) {
      return milestone.icon;
    }

    return milestone.type === 'entrega' ? 'truck' : 'currency-dollar';
  }
}

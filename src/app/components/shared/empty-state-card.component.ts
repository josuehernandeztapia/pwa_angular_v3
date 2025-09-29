import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from './icon/icon.component';
import { IconName } from './icon/icon-definitions';

@Component({
  selector: 'app-empty-state-card',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './empty-state-card.component.html',
  styleUrls: ['./empty-state-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateCardComponent {
  @Input() iconName: IconName | null = 'collection';
  @Input() title: string = 'Sin resultados';
  @Input() subtitle: string = 'Ajusta filtros o intenta otra búsqueda.';
  @Input() primaryCtaLabel?: string;
  @Input() secondaryCtaLabel?: string;

  @Output() primary = new EventEmitter<void>();
  @Output() secondary = new EventEmitter<void>();
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton-card.component.html',
  styleUrls: ['./skeleton-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonCardComponent {
  @Input() titleWidth: number = 60;
  @Input() subtitleWidth: number = 80;
  @Input() buttonWidth: number = 40;
  @Input() ariaLabel: string = 'Cargando contenido';
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { ICON_DEFAULTS, IconName, IconRegistryService } from './icon-definitions';

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IconComponent {
  @HostBinding('class') hostClass = 'app-icon';
  protected readonly defaults = ICON_DEFAULTS;

  /** Icon identifier defined in the icon registry */
  @Input({ required: true }) name!: IconName;

  /** Icon size in pixels. Defaults to 20px to align with OpenAI tokens. */
  @Input() size: number = ICON_DEFAULTS.size;

  /** CSS color value for the icon stroke/fill. */
  @Input() color: string = ICON_DEFAULTS.color;

  /** Optional override for stroke width. */
  @Input() strokeWidth: string = ICON_DEFAULTS.strokeWidth;

  /** Optional accessible label. Omit for decorative icons. */
  @Input() ariaLabel?: string;

  get icon() {
    if (!this.registry.has(this.name)) {
      return null;
    }
    return this.registry.get(this.name);
  }

  constructor(private registry: IconRegistryService) {}
}

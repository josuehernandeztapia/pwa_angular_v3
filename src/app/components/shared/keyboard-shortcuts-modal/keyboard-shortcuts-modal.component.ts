import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { Observable } from 'rxjs';

import { KeyboardShortcutsService, KeyboardShortcut } from '../../../services/keyboard-shortcuts.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-keyboard-shortcuts-modal',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './keyboard-shortcuts-modal.component.html',
  styleUrls: ['./keyboard-shortcuts-modal.component.scss']
})
export class KeyboardShortcutsModalComponent {
  readonly isOpen$: Observable<boolean> = this.shortcutsService.isOpen$;
  readonly shortcuts$: Observable<KeyboardShortcut[]> = this.shortcutsService.shortcuts$;

  constructor(private readonly shortcutsService: KeyboardShortcutsService) {}

  @HostListener('window:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.shortcutsService.isOpen()) {
      event.preventDefault();
      this.shortcutsService.close();
    }
  }

  close(): void {
    this.shortcutsService.close();
  }

  trackByCombo(_: number, shortcut: KeyboardShortcut): string {
    return shortcut.combo;
  }
}

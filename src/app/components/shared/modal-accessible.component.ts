import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, OnChanges } from '@angular/core';
import { FocusTrapService } from '../../services/focus-trap.service';

@Component({
  selector: 'app-modal-accessible',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="overlay"
      *ngIf="open"
      (click)="onBackdrop($event)"
      [attr.aria-hidden]="!open"
    >
      <div
        class="dialog premium-card"
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="ariaLabelledby || null"
        [attr.aria-describedby]="ariaDescribedby || null"
        (click)="$event.stopPropagation()"
        #dialog
      >
        <header class="section-header">
          <h2 class="section-title" [id]="ariaLabelledby || null">{{ title }}</h2>
          <button type="button" class="btn-secondary btn-sm" aria-label="Cerrar" (click)="close()">✕</button>
        </header>
        <div class="content">
          <ng-content></ng-content>
        </div>
        <footer class="footer">
          <ng-content select="[modal-actions]"></ng-content>
        </footer>
      </div>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: grid; place-items: center; z-index: 1000; }
      .dialog { width: min(720px, calc(100vw - 32px)); max-height: calc(100vh - 64px); overflow: auto; }
      .content { margin-top: var(--space-8); }
      .footer { margin-top: var(--space-16); display: flex; justify-content: flex-end; gap: var(--space-12); }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModalAccessibleComponent implements OnInit, OnDestroy, OnChanges {
  @Input() open: boolean = false;
  @Input() title: string = '';
  @Input() ariaLabelledby?: string;
  @Input() ariaDescribedby?: string;
  @Output() closed = new EventEmitter<void>();
  @ViewChild('dialog', { static: false }) dialogRef?: ElementRef<HTMLElement>;

  private removeTrap?: () => void;

  constructor(private readonly focusTrap: FocusTrapService) {}

  ngOnInit(): void {
    if (this.open) {
      this.afterOpen();
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  ngOnChanges(): void {
    if (this.open) {
      this.afterOpen();
    } else {
      this.cleanup();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  onBackdrop(_: MouseEvent): void {
    this.close();
  }

  close(): void {
    this.open = false;
    this.cleanup();
    this.closed.emit();
  }

  private afterOpen(): void {
    this.focusTrap.remember();
    queueMicrotask(() => {
      const dialogEl = this.dialogRef?.nativeElement;
      if (!dialogEl) return;
      this.removeTrap = this.focusTrap.trap(dialogEl);
      const firstFocusable = dialogEl.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      firstFocusable?.focus();
    });
  }

  private cleanup(): void {
    try { this.removeTrap?.(); } catch {}
    this.focusTrap.restore();
    this.removeTrap = undefined;
  }
}


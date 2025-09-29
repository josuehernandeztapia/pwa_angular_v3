import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild, OnChanges } from '@angular/core';
import { FocusTrapService } from '../../services/focus-trap.service';

@Component({
  selector: 'app-modal-accessible',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-accessible.component.html',
  styleUrls: ['./modal-accessible.component.scss'],
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

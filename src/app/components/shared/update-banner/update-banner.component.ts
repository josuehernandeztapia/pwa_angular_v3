import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SwUpdateService } from '../../../services/sw-update.service';

@Component({
  selector: 'app-update-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './update-banner.component.html',
  styleUrls: ['./update-banner.component.scss'],
})
export class UpdateBannerComponent implements OnInit, OnDestroy {
  show = false;
  private sub?: Subscription;

  constructor(private sw: SwUpdateService) {}

  getBannerStateClasses(): Record<string, boolean> {
    return {
      'update-banner--visible': this.show,
      'update-banner--hidden': !this.show,
    };
  }

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

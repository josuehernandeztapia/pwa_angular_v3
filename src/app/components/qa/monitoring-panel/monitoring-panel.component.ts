import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { MonitoringEvent, MonitoringService } from '../../../services/monitoring.service';

@Component({
  selector: 'app-monitoring-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monitoring-panel.component.html',
  styleUrls: ['./monitoring-panel.component.scss']
})
export class MonitoringPanelComponent implements OnInit, OnDestroy {
  private readonly eventsSignal = signal<MonitoringEvent[]>([]);
  readonly events = computed(() => this.eventsSignal());
  private readonly subscription = new Subscription();

  constructor(private readonly monitoring: MonitoringService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.monitoring.events$.subscribe(events => {
        this.eventsSignal.set(events.slice(0, 50));
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  trackByEvent(_index: number, event: MonitoringEvent): string {
    return event.id;
  }
}

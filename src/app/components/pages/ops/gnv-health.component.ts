import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GnvHealthService, StationHealthRow } from '../../../services/gnv-health.service';

@Component({
  selector: 'app-gnv-health',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gnv-health.component.html',
  styles: []
})
export class GnvHealthComponent implements OnInit {
  private svc = inject(GnvHealthService);
  rows = signal<StationHealthRow[]>([]);
  isLoading = signal(true);
  selectedFile: File | null = null;
  uploadStatus: 'idle' | 'processing' | 'success' | 'error' = 'idle';

  ngOnInit(): void {
    this.svc.getYesterdayHealth().subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  trackByStation(_: number, r: StationHealthRow) {
    return r.stationId;
  }

  getTotalStations(): number {
    return this.rows().length;
  }

  getHealthyStations(): number {
    return this.rows().filter(r => r.status === 'green').length;
  }

  getWarningStations(): number {
    return this.rows().filter(r => r.status === 'yellow').length;
  }

  getCriticalStations(): number {
    return this.rows().filter(r => r.status === 'red').length;
  }

  getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      'green': 'Saludable',
      'yellow': 'Advertencia',
      'red': 'Crítico'
    };
    return statusMap[status] || 'Desconocido';
  }

  getUploadStatusText(): string {
    const statusMap: Record<string, string> = {
      'idle': 'Listo para cargar',
      'processing': 'Procesando archivo',
      'success': 'Carga exitosa',
      'error': 'Error en carga'
    };
    return statusMap[this.uploadStatus] || 'Estado desconocido';
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      this.selectedFile = file;
      this.uploadStatus = 'idle';
    } else {
      this.selectedFile = null;
    }
  }

  uploadCSV(): void {
    if (!this.selectedFile) return;

    this.uploadStatus = 'processing';

    // Simular procesamiento de CSV
    setTimeout(() => {
      this.uploadStatus = 'success';

      // Reset después de 3 segundos
      setTimeout(() => {
        this.uploadStatus = 'idle';
        this.selectedFile = null;
        // Reset file input
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }, 3000);
    }, 2000);
  }
}


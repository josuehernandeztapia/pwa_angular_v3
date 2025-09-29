import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-expedientes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, IconComponent],
  templateUrl: './expedientes.component.html',
  styleUrls: ['./expedientes.component.scss']
})
export class ExpedientesComponent implements OnInit {
  searchTerm = '';
  statusFilter = '';
  
  expedientes = [
    {
      id: 'EXP-001',
      clientName: 'Juan Pérez García',
      status: 'completo',
      totalDocuments: 8,
      completedDocuments: 8,
      pendingDocuments: 0,
      completionPercentage: 100
    },
    {
      id: 'EXP-002',  
      clientName: 'María González López',
      status: 'pendiente',
      totalDocuments: 6,
      completedDocuments: 4,
      pendingDocuments: 2,
      completionPercentage: 67
    }
  ];

  filteredExpedientes = [...this.expedientes];

  ngOnInit(): void {
    // Component initialization
  }

  onSearch(): void {
    this.filterExpedientes();
  }

  onFilterChange(): void {
    this.filterExpedientes();
  }

  private filterExpedientes(): void {
    this.filteredExpedientes = this.expedientes.filter(expediente => {
      const matchesSearch = !this.searchTerm || 
        expediente.clientName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        expediente.id.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.statusFilter || expediente.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'completo': 'Completo',
      'pendiente': 'Pendiente', 
      'revision': 'En Revisión'
    };
    return statusMap[status] || status;
  }

  getStatusClasses(status: string): Record<string, boolean> {
    const normalized = status.toLowerCase();
    return {
      'expedientes__status--completo': normalized === 'completo',
      'expedientes__status--pendiente': normalized === 'pendiente',
      'expedientes__status--revision': normalized === 'revision'
    };
  }

  newExpediente(): void {
  }

  viewExpediente(id: string): void {
  }

  uploadDocument(expedienteId: string): void {
  }
}

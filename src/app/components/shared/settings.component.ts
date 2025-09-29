import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './icon/icon.component';

type SettingsTab = 'profile' | 'integrations';

interface Integration {
  name: string;
  role: string;
  priority: string;
  priorityColor: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  activeTab: SettingsTab = 'profile';

  ngOnInit(): void {
    // Component initialized
  }

  setActiveTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  getTabClasses(tab: SettingsTab): Record<string, boolean> {
    return {
      'settings__tab-button--active': this.activeTab === tab
    };
  }
}

@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-settings.component.html',
  styleUrls: ['./profile-settings.component.scss']
})
export class ProfileSettingsComponent {
  editProfile(): void {
  }

  logout(): void {
  }
}

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss']
})
export class IntegrationsComponent implements OnInit {
  // Port exacto de integrations desde React líneas 4-41
  integrations: Integration[] = [
    {
      name: "Odoo",
      role: "CRM, Contabilidad y Fuente de Verdad para datos de clientes.",
      priority: "P1 - Crítico",
      priorityColor: "priority-critical"
    },
    {
      name: "API de GNV",
      role: "Habilita el ahorro y pago por recaudación en consumo de combustible.",
      priority: "P1 - Crítico",
      priorityColor: "priority-critical"
    },
    {
      name: "Conekta / SPEI",
      role: "Procesa todas las aportaciones voluntarias de los clientes.",
      priority: "P1 - Crítico",
      priorityColor: "priority-critical"
    },
    {
      name: "Metamap",
      role: "Provee la verificación de identidad biométrica (KYC).",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "priority-key"
    },
    {
      name: "Mifiel",
      role: "Gestiona la firma electrónica de todos los contratos.",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "priority-key"
    },
    {
      name: "KIBAN / HASE",
      role: "Realiza el análisis de riesgo crediticio.",
      priority: "P2 - Funcionalidad Clave",
      priorityColor: "priority-key"
    }
  ];

  ngOnInit(): void {
    // Component initialized
  }

  getCardClasses(integration: Integration): Record<string, boolean> {
    return {
      'integrations__card': true,
      'integrations__card--critical': integration.priorityColor === 'priority-critical',
      'integrations__card--key': integration.priorityColor === 'priority-key'
    };
  }

  getPriorityBadgeClasses(integration: Integration): Record<string, boolean> {
    return {
      'integrations__priority-badge': true,
      'integrations__priority-badge--critical': integration.priorityColor === 'priority-critical',
      'integrations__priority-badge--key': integration.priorityColor === 'priority-key'
    };
  }
}

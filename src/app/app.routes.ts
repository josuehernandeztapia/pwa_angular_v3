import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { environment } from '../environments/environment';

// Rutas comunes (antes del wildcard)
const commonBeforeWildcard: Routes = [
  // Redirect root to dashboard
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },

  // Authentication routes (no guard needed)
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login.component').then(c => c.LoginComponent),
    title: 'Iniciar Sesión - Conductores PWA'
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register.component').then(c => c.RegisterComponent),
    title: 'Registro de Asesor - Conductores PWA'
  },
  {
    path: 'verify-email',
    loadComponent: () => import('./components/auth/verify-email/verify-email.component').then(c => c.VerifyEmailComponent),
    title: 'Verificar Email - Conductores PWA'
  },

  // Protected routes (require authentication)
  {
    path: 'dashboard',
    loadComponent: () => import('./components/pages/dashboard/dashboard.component').then(c => c.DashboardComponent),
    canActivate: [AuthGuard],
    title: 'Dashboard - Conductores PWA'
  },

  {
    path: 'onboarding',
    loadComponent: () => import('./components/pages/onboarding/onboarding-main.component').then(c => c.OnboardingMainComponent),
    canActivate: [AuthGuard],
    title: 'Onboarding - Conductores PWA'
  },

  {
    path: 'nueva-oportunidad',
    loadComponent: () => import('./components/pages/nueva-oportunidad/nueva-oportunidad.component').then(c => c.NuevaOportunidadComponent),
    canActivate: [AuthGuard],
    title: 'Nueva Oportunidad - Conductores PWA'
  },

  // Step-by-step flow routes
  /*
  {
    path: 'quotation',
    loadComponent: () => import('./components/shared/quotation-flow.component').then(c => c.QuotationFlowComponent),
    canActivate: [AuthGuard],
    title: 'Generación de Cotización - Conductores PWA'
  },
  */

  {
    path: 'document-upload',
    loadComponent: () => import('./components/shared/document-upload-flow.component').then(c => c.DocumentUploadFlowComponent),
    canActivate: [AuthGuard],
    title: 'Carga de Documentos - Conductores PWA'
  },

  /*
  {
    path: 'kyc-verification',
    loadComponent: () => import('./components/shared/kyc-verification.component').then(c => c.KycVerificationComponent),
    canActivate: [AuthGuard],
    title: 'Verificación KYC - Conductores PWA'
  },
  */

  // Cotizador routes
  {
    path: 'cotizador',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/pages/cotizador/cotizador-main.component').then(c => c.CotizadorMainComponent),
        title: 'Cotizador - Conductores PWA'
      },
      {
        path: 'ags-individual',
        loadComponent: () => import('./components/pages/cotizador/ags-individual/ags-individual.component').then(c => c.AgsIndividualComponent),
        title: 'Cotizador AGS Individual - Conductores PWA'
      },
      {
        path: 'edomex-colectivo',
        loadComponent: () => import('./components/pages/cotizador/edomex-colectivo/edomex-colectivo.component').then(c => c.EdomexColectivoComponent),
        title: 'Cotizador EdoMex Colectivo - Conductores PWA'
      }
    ]
  },

  // Simulador routes
  {
    path: 'simulador',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/pages/simulador/simulador-main.component').then(c => c.SimuladorMainComponent),
        title: 'Simulador - Conductores PWA'
      },
      {
        path: 'ags-ahorro',
        loadComponent: () => import('./components/pages/simulador/ags-ahorro/ags-ahorro.component').then(c => c.AgsAhorroComponent),
        title: 'Simulador AGS Ahorro - Conductores PWA'
      },
      {
        path: 'edomex-individual',
        loadComponent: () => import('./components/pages/simulador/edomex-individual/edomex-individual.component').then(c => c.EdomexIndividualComponent),
        title: 'Simulador EdoMex Individual - Conductores PWA'
      },
      {
        path: 'tanda-colectiva',
        loadComponent: () => import('./components/pages/simulador/tanda-colectiva/tanda-colectiva.component').then(c => c.TandaColectivaComponent),
        title: 'Simulador Tanda Colectiva - Conductores PWA'
      }
    ]
  },

  // Client management routes
  {
    path: 'clientes',
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./components/pages/clientes/clientes-list.component').then(c => c.ClientesListComponent),
        title: 'Clientes - Conductores PWA'
      },
      {
        path: 'nuevo',
        loadComponent: () => import('./components/pages/clientes/cliente-form.component').then(c => c.ClienteFormComponent),
        title: 'Nuevo Cliente - Conductores PWA'
      },
      {
        path: ':id',
        loadComponent: () => import('./components/pages/clientes/cliente-detail.component').then(c => c.ClienteDetailComponent),
        title: 'Detalle Cliente - Conductores PWA'
      },
      {
        path: ':id/edit',
        loadComponent: () => import('./components/pages/clientes/cliente-form.component').then(c => c.ClienteFormComponent),
        title: 'Editar Cliente - Conductores PWA'
      }
    ]
  },

  // Delivery Tracking System - Phase 1B Universal 77-day tracking
  {
    path: 'ops',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'deliveries',
        loadComponent: () => import('./components/pages/ops/ops-deliveries.component').then(c => c.OpsDeliveriesComponent),
        title: 'Centro de Operaciones - Entregas'
      },
      {
        path: 'import-tracker',
        loadComponent: () => import('./components/pages/ops/ops-import-tracker.component').then(c => c.OpsImportTrackerComponent),
        title: 'Import Tracker - Operaciones'
      },
      {
        path: 'deliveries/:id',
        loadComponent: () => import('./components/pages/ops/delivery-detail.component').then(c => c.DeliveryDetailComponent),
        title: 'Detalle de Entrega - Operaciones'
      },
      {
        path: 'triggers',
        loadComponent: () => import('./components/pages/ops/triggers-monitor.component').then(c => c.TriggersMonitorComponent),
        title: 'Monitor de Triggers Automáticos - Operaciones'
      }
    ]
  },

  // Client Tracking (simplified view without operational details)
  {
    path: 'tracking',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'client/:clientId',
        loadComponent: () => import('./components/pages/client/client-tracking.component').then(c => c.ClientTrackingComponent),
        title: 'Seguimiento de tu Vagoneta'
      }
    ]
  },

  // Other protected routes
  {
    path: 'expedientes',
    loadComponent: () => import('./components/pages/expedientes/expedientes.component').then(c => c.ExpedientesComponent),
    canActivate: [AuthGuard],
    title: 'Expedientes - Conductores PWA'
  },

  {
    path: 'proteccion',
    loadComponent: () => import('./components/pages/proteccion/proteccion.component').then(c => c.ProteccionComponent),
    canActivate: [AuthGuard],
    title: 'Protección - Conductores PWA'
  },

  // Opportunities pipeline
  {
    path: 'oportunidades',
    loadComponent: () => import('./components/pages/opportunities/opportunities-pipeline.component').then(c => c.OpportunitiesPipelineComponent),
    canActivate: [AuthGuard],
    title: 'Pipeline de Oportunidades - Conductores PWA'
  },

  {
    path: 'reportes',
    loadComponent: () => import('./components/pages/reportes/reportes.component').then(c => c.ReportesComponent),
    canActivate: [AuthGuard],
    title: 'Reportes - Conductores PWA'
  },

  // Products catalog
  {
    path: 'productos',
    loadComponent: () => import('./components/pages/productos/productos-catalog.component').then(c => c.ProductosCatalogComponent),
    canActivate: [AuthGuard],
    title: 'Catálogo de Productos - Conductores PWA'
  },

  // (LAB se inserta condicionalmente más abajo)

  // Settings and profile
  {
    path: 'configuracion',
    loadComponent: () => import('./components/pages/configuracion/configuracion.component').then(c => c.ConfiguracionComponent),
    canActivate: [AuthGuard],
    title: 'Configuración - Conductores PWA'
  },

  // Flow Builder direct route (optional entry point)
  {
    path: 'flow-builder',
    loadComponent: () => import('./components/pages/configuracion/flow-builder/flow-builder.component').then(c => c.FlowBuilderComponent),
    canActivate: [AuthGuard],
    title: 'Flow Builder - Conductores PWA'
  },

  {
    path: 'perfil',
    loadComponent: () => import('./components/pages/perfil/perfil.component').then(c => c.PerfilComponent),
    canActivate: [AuthGuard],
    title: 'Mi Perfil - Conductores PWA'
  },

  // Error routes
  {
    path: 'offline',
    loadComponent: () => import('./components/shared/offline/offline.component').then(c => c.OfflineComponent),
    title: 'Sin conexión'
  },
  {
    path: '404',
    loadComponent: () => import('./components/shared/not-found/not-found.component').then(c => c.NotFoundComponent),
    title: 'Página no encontrada - Conductores PWA'
  },

  {
    path: 'unauthorized',
    loadComponent: () => import('./components/shared/unauthorized/unauthorized.component').then(c => c.UnauthorizedComponent),
    title: 'No autorizado - Conductores PWA'
  }
];

// Rutas LAB / Backoffice (solo si feature flag activo)
const labRoutes: Routes = [
  {
    path: 'lab/tanda-enhanced',
    loadComponent: () => import('./components/pages/lab/tanda-enhanced-panel.component').then(c => c.TandaEnhancedPanelComponent),
    canActivate: [AuthGuard],
    title: 'LAB – Tanda Enhanced Panel'
  },
  {
    path: 'lab/tanda-consensus',
    loadComponent: () => import('./components/pages/lab/tanda-consensus-panel.component').then(c => c.TandaConsensusPanelComponent),
    canActivate: [AuthGuard],
    title: 'LAB – Tanda Consensus Panel'
  }
];

// Cola (wildcard) - siempre al final
const tailRoutes: Routes = [
  {
    path: '**',
    redirectTo: '/404'
  }
];

export const routes: Routes = environment.features.enableTandaLab
  ? [...commonBeforeWildcard, ...labRoutes, ...tailRoutes]
  : [...commonBeforeWildcard, ...tailRoutes];

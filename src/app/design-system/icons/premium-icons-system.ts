/**
 * 🎨 Premium Icons System - Conductores PWA
 * Quirúrgico end-to-end UX/UI con microinteracciones
 */

export interface IconState {
  style: 'outline' | 'filled' | 'duotone';
  stroke: string;
  animation?: string;
  duration?: string;
  details?: string;
}

export interface PremiumIcon {
  name: string;
  concept: string;
  phosphorName: string;
  states: {
    default: IconState;
    hover?: IconState;
    active?: IconState;
    error?: IconState;
  };
}

// 🎯 ICONOGRAFÍA PREMIUM CONDUCTORES
export const PREMIUM_ICONS_SYSTEM: PremiumIcon[] = [
  {
    name: 'cotizador',
    concept: 'calculadora con engrane',
    phosphorName: 'ph-calculator',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'rotate-gear',
        duration: '150ms'
      }
    }
  },
  {
    name: 'simulador',
    concept: 'reloj + gráfico de progreso',
    phosphorName: 'ph-clock',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'progress-radial',
        duration: '1s'
      },
      active: {
        style: 'duotone',
        stroke: 'var(--acc)',
        animation: 'radial-fill',
        duration: '1s'
      }
    }
  },
  {
    name: 'tanda',
    concept: 'círculo de manos unidas',
    phosphorName: 'ph-users-four',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'sequential-illuminate',
        duration: '1.2s',
        details: 'cada mano se ilumina secuencialmente - te toca en mes X'
      }
    }
  },
  {
    name: 'proteccion',
    concept: 'escudo con check dinámico',
    phosphorName: 'ph-shield-check',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'shield-ring-fill',
        duration: '1s',
        details: 'anillo se rellena según elegibilidad'
      },
      active: {
        style: 'duotone',
        stroke: 'var(--ok)',
        animation: 'shield-glow'
      },
      error: {
        style: 'outline',
        stroke: 'var(--bad)',
        animation: 'pulse-red',
        duration: '0.5s'
      }
    }
  },
  {
    name: 'postventa',
    concept: 'caja de herramientas + chat bubble',
    phosphorName: 'ph-toolbox',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'toolbox-open',
        duration: '800ms',
        details: 'caja se abre mostrando mini refacciones (tuerca, aceite, filtro)'
      }
    }
  },
  {
    name: 'entregas',
    concept: 'camión en movimiento + timeline',
    phosphorName: 'ph-truck',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'truck-move-forward',
        duration: '800ms'
      },
      error: {
        style: 'outline',
        stroke: 'var(--bad)',
        animation: 'truck-delay-shake',
        details: 'delay - nuevo compromiso en rojo'
      }
    }
  },
  {
    name: 'gnv',
    concept: 'bomba de gas con símbolo de hoja',
    phosphorName: 'ph-gas-pump',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--ok)',
        animation: 'leaf-glow',
        duration: '1s'
      }
    }
  },
  {
    name: 'avi',
    concept: 'micrófono con ondas',
    phosphorName: 'ph-microphone',
    states: {
      default: { style: 'outline', stroke: 'var(--muted)' },
      hover: {
        style: 'outline',
        stroke: 'var(--acc)',
        animation: 'wave-pulse',
        duration: '1.5s'
      },
      active: {
        style: 'duotone',
        stroke: 'var(--acc)',
        animation: 'wave-pulse-infinite'
      }
    }
  }
];

// 🎨 CSS ANIMATIONS PARA MICROINTERACCIONES
export const PREMIUM_ICON_ANIMATIONS = `
  /* Tokens Conductores - Fuente de verdad */
  :root {
    --bg: #0B1220;
    --ink: #E6ECFF;
    --muted: #A8B3CF;
    --card: #101826;
    --line: #1F2937;
    --acc: #3AA6FF;
    --ok: #22C55E;
    --warn: #F59E0B;
    --bad: #EF4444;
    --radius: 16px;
    --shadow: 0 6px 24px rgba(0,0,0,.25);
    --icon-stroke: 2.5px;
  }

  /* Animaciones Premium */
  @keyframes rotate-gear {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(20deg); }
  }

  @keyframes progress-radial {
    0% { stroke-dasharray: 0 100; }
    100% { stroke-dasharray: 75 100; }
  }

  @keyframes radial-fill {
    0% { stroke-dasharray: 0 100; }
    100% { stroke-dasharray: 100 100; }
  }

  @keyframes sequential-illuminate {
    0% { stroke: var(--muted); }
    25% { stroke: var(--acc); }
    50% { stroke: var(--acc); }
    75% { stroke: var(--acc); }
    100% { stroke: var(--acc); }
  }

  @keyframes shield-ring-fill {
    0% {
      stroke: var(--muted);
      stroke-dasharray: 0 100;
    }
    100% {
      stroke: var(--acc);
      stroke-dasharray: 100 100;
    }
  }

  @keyframes shield-glow {
    0%, 100% {
      filter: drop-shadow(0 0 5px var(--ok));
      stroke: var(--ok);
    }
    50% {
      filter: drop-shadow(0 0 10px var(--ok));
      stroke: var(--ok);
    }
  }

  @keyframes pulse-red {
    0%, 100% {
      stroke: var(--bad);
      transform: scale(1);
    }
    50% {
      stroke: var(--bad);
      transform: scale(1.1);
      filter: drop-shadow(0 0 8px var(--bad));
    }
  }

  @keyframes toolbox-open {
    0% { transform: rotateX(0deg); }
    50% { transform: rotateX(20deg); }
    100% { transform: rotateX(0deg); }
  }

  @keyframes truck-move-forward {
    0% { transform: translateX(0px); }
    50% { transform: translateX(10px); }
    100% { transform: translateX(0px); }
  }

  @keyframes truck-delay-shake {
    0%, 100% { transform: translateX(0px); }
    25% { transform: translateX(-3px); }
    75% { transform: translateX(3px); }
  }

  @keyframes leaf-glow {
    0% {
      stroke: var(--muted);
      filter: none;
    }
    100% {
      stroke: var(--ok);
      filter: drop-shadow(0 0 8px var(--ok));
    }
  }

  @keyframes wave-pulse {
    0%, 100% {
      stroke: var(--acc);
      stroke-width: var(--icon-stroke);
    }
    50% {
      stroke: var(--acc);
      stroke-width: calc(var(--icon-stroke) * 1.5);
      filter: drop-shadow(0 0 6px var(--acc));
    }
  }

  /* Classes para aplicar animaciones */
  .icon-hover-cotizador:hover { animation: rotate-gear 150ms ease-in-out; }
  .icon-hover-simulador:hover { animation: progress-radial 1s ease-in-out; }
  .icon-hover-tanda:hover { animation: sequential-illuminate 1.2s ease-in-out; }
  .icon-hover-proteccion:hover { animation: shield-ring-fill 1s ease-in-out; }
  .icon-hover-proteccion.error { animation: pulse-red 0.5s infinite; }
  .icon-hover-postventa:hover { animation: toolbox-open 800ms ease-in-out; }
  .icon-hover-entregas:hover { animation: truck-move-forward 800ms ease-in-out; }
  .icon-hover-entregas.error { animation: truck-delay-shake 500ms ease-in-out; }
  .icon-hover-gnv:hover { animation: leaf-glow 1s ease-in-out; }
  .icon-hover-avi:hover { animation: wave-pulse 1.5s ease-in-out; }

  /* Estados base */
  .premium-icon {
    stroke-width: var(--icon-stroke);
    transition: all 150ms ease-in-out;
    cursor: pointer;
  }

  .premium-icon--default { stroke: var(--muted); }
  .premium-icon--hover { stroke: var(--acc); }
  .premium-icon--active { stroke: var(--acc); }
  .premium-icon--error { stroke: var(--bad); }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .premium-icon,
    .premium-icon * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;

// 🧪 QA CHECKLIST VISUAL
export const ICON_QA_CHECKLIST = [
  'Todos los iconos usan grosor de línea 2.5px (var(--icon-stroke))',
  'Animaciones hover/active ≤200ms, ease-in-out',
  'Colores siempre desde tokens (--acc, --ok, --bad, --muted)',
  'Protección/Tanda/Postventa tienen microinteracciones activas',
// removed by clean-audit
  'Accesibilidad: prefers-reduced-motion respetado',
  'Estados error visibles (pulse-red, truck-delay-shake)',
  'Consistencia: todos outline por defecto, duotone en activo'
];
// removed by clean-audit
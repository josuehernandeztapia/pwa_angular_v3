import { Injectable } from '@angular/core';

export type IconName =
  | 'chat'
  | 'chat-bubble'
  | 'microphone'
  | 'image'
  | 'assistants'
  | 'usage'
  | 'calculator'
  | 'simulator'
  | 'document'
  | 'truck'
  | 'shield'
  | 'moon'
  | 'sun'
  | 'home'
  | 'target'
  | 'users'
  | 'more'
  | 'camera'
  | 'plus'
  | 'handshake'
  | 'cube'
  | 'edit'
  | 'factory'
  | 'ship'
  | 'customs'
  | 'check'
  | 'check-circle'
  | 'clock'
  | 'calendar'
  | 'collection'
  | 'badge-check'
  | 'eye'
  | 'scale'
  | 'star'
  | 'sparkles'
  | 'search'
  | 'shield-alert'
  | 'lightbulb'
  | 'bank'
  | 'snow'
  | 'clipboard'
  | 'chart'
  | 'settings'
  | 'adjustments'
  | 'link'
  | 'user'
  | 'help'
  | 'support'
  | 'logout'
  | 'bell'
  | 'lock'
  | 'cloud-upload'
  | 'download'
  | 'download-tray'
  | 'arrow-left'
  | 'trash'
  | 'device-mobile'
  | 'close'
  | 'stop'
  | 'phone'
  | 'chevron-down'
  | 'arrow-right'
  | 'wifi'
  | 'chevrons-vertical'
  | 'menu'
  | 'spinner'
  | 'refresh'
  | 'offline'
  | 'academic-cap'
  | 'currency-dollar'
  | 'device-laptop'
  | 'document-text'
  | 'dot'
  | 'heart'
  | 'information-circle'
  | 'inbox'
  | 'link-connected'
  | 'monitor'
  | 'user-network'
  | 'badge-check-solid'
  | 'eye-off'
  | 'mail'
  | 'phone-classic'
  | 'building-office'
  | 'document-report'
  | 'alert-triangle'
  | 'x-circle'
  | 'grid'
  | 'beaker'
  | 'check-circle-solid'
  | 'volume-up'
  | 'volume-off'
  | 'exclamation-triangle'
  | 'device-laptop'
  | 'lightning-bolt'
  | 'target-arrow'
  | 'exclamation-circle'
  | 'location-marker'
  | 'book'
  | 'globe'

type IconShape =
  | {
      type: 'path';
      d: string;
      strokeLinecap?: 'round' | 'square' | 'butt';
      strokeLinejoin?: 'round' | 'bevel' | 'miter';
      strokeWidth?: string;
      fill?: string;
    }
  | {
      type: 'circle';
      cx: string;
      cy: string;
      r: string;
      fill?: string;
    }
  | {
      type: 'line';
      x1: string;
      y1: string;
      x2: string;
      y2: string;
      strokeLinecap?: 'round' | 'square' | 'butt';
      strokeLinejoin?: 'round' | 'bevel' | 'miter';
      strokeWidth?: string;
    }
  | {
      type: 'polyline';
      points: string;
      strokeLinecap?: 'round' | 'square' | 'butt';
      strokeLinejoin?: 'round' | 'bevel' | 'miter';
      strokeWidth?: string;
    }
  | {
      type: 'polygon';
      points: string;
    }
  | {
      type: 'rect';
      x: string;
      y: string;
      width: string;
      height: string;
      rx?: string;
      ry?: string;
    };

export interface IconDefinition {
  viewBox: string;
  shapes: IconShape[];
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
}

const DEFAULT_STROKE_WIDTH = '2';

const ICON_LIBRARY: Record<IconName, IconDefinition> = {
  chat: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'path', d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '17', r: '1' }
    ]
  },
  'chat-bubble': {
    viewBox: '0 0 24 24',
    shapes: [
      {
        type: 'path',
        d: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: '2'
      }
    ]
  },
  microphone: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z' },
      { type: 'path', d: 'M19 10v2a7 7 0 0 1-14 0v-2' },
      { type: 'line', x1: '12', y1: '19', x2: '12', y2: '23' },
      { type: 'line', x1: '8', y1: '23', x2: '16', y2: '23' }
    ]
  },
  image: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'polyline', points: '22,12 18,12 15,21 9,3 6,12 2,12', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  assistants: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '3' },
      { type: 'path', d: 'M12 1v6m0 6v6m11-7h-6m-6 0H1m8-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  usage: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '12', y1: '20', x2: '12', y2: '10' },
      { type: 'line', x1: '18', y1: '20', x2: '18', y2: '4' },
      { type: 'line', x1: '6', y1: '20', x2: '6', y2: '16' }
    ]
  },
  calculator: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '4', y: '2', width: '16', height: '20', rx: '2' },
      { type: 'line', x1: '8', y1: '6', x2: '16', y2: '6' },
      { type: 'line', x1: '16', y1: '10', x2: '8', y2: '10' },
      { type: 'line', x1: '8', y1: '14', x2: '8', y2: '14' },
      { type: 'line', x1: '12', y1: '14', x2: '12', y2: '14' },
      { type: 'line', x1: '16', y1: '14', x2: '16', y2: '14' },
      { type: 'line', x1: '8', y1: '18', x2: '8', y2: '18' },
      { type: 'line', x1: '12', y1: '18', x2: '12', y2: '18' },
      { type: 'line', x1: '16', y1: '18', x2: '16', y2: '18' }
    ]
  },
  simulator: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 3v18h18' },
      { type: 'path', d: 'M18.7 8l-5.1 5.2-2.8-2.7L7 14.3', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  document: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '14,2 14,8 20,8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '13', x2: '8', y2: '13' },
      { type: 'line', x1: '16', y1: '17', x2: '8', y2: '17' },
      { type: 'polyline', points: '10,9 9,9 8,9', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  truck: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '1', y: '3', width: '15', height: '13' },
      { type: 'polygon', points: '16,8 20,8 23,11 23,16 16,16 16,8' },
      { type: 'circle', cx: '5.5', cy: '18.5', r: '2.5' },
      { type: 'circle', cx: '18.5', cy: '18.5', r: '2.5' }
    ]
  },
  shield: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  moon: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  sun: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  home: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'm3 12 2-2m0 0 7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11 2 2m-2-2v10a1 1 0 0 1-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1m-6 0h6', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  target: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'polyline', points: '10,17 5,12 6.41,10.59 10,14.17 17.59,6.59 19,8' }
    ]
  },
  users: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  more: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '5.25', r: '0.75' },
      { type: 'circle', cx: '12', cy: '11.25', r: '0.75' },
      { type: 'circle', cx: '12', cy: '17.25', r: '0.75' }
    ],
    strokeWidth: '1.5'
  },
  camera: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5' }]
  },
  plus: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 4v16m8-8H4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  handshake: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5 13l4 4L19 7', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  lightbulb: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  bank: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  snow: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 1v6l3-3m-3 3L9 4m3 3v6l3-3m-3 3L9 10m3 3h6l-3-3m3 3-3 3m-3-3h6l-3-3m3 3v6l3-3m-3 3L9 16', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  clipboard: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M8 7v8a2 2 0 0 0 2 2h6M8 7V5a2 2 0 0 1 2-2h4.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V15a2 2 0 0 1-2 2h-2M8 7H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  chart: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 3v18h18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M9 9l4 4 4-4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  settings: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  adjustments: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2' }]
  },
  link: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M13.828 10.172a4 4 0 015.656 5.656l-3.536 3.536a4 4 0 01-5.656-5.656m2.828-2.828a4 4 0 00-5.656-5.656L4.172 9.344a4 4 0 005.656 5.656', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  user: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5.121 17.804A4 4 0 019 15h6a4 4 0 013.879 2.804M15 7a3 3 0 11-6 0 3 3 0 016 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  help: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  support: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '1.5' }]
  },
  logout: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  bell: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  lock: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'cloud-upload': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M15 13l-3-3m0 0l-3 3m3-3v12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  download: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm16 12-4 4m0 0-4-4m4 4V4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'download-tray': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2' }]
  },
  stop: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'rect', x: '6', y: '6', width: '12', height: '12', rx: '2' }]
  },
  phone: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.86 19.86 0 01-3.07-8.63A2 2 0 014.11 2h3a2 2 0 012 1.72 12.54 12.54 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.54 12.54 0 002.81.7 2 2 0 011.72 2.03z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'polyline', points: '6 9 12 15 18 9', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'arrow-right': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5 12h14M13 5l7 7-7 7', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  wifi: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M2.88 7.62a15.91 15.91 0 0118.24 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M5.68 11.39a11.95 11.95 0 0112.64 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M8.47 15.17a8 8 0 018.09 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '19', r: '1' }
    ]
  },
  'chevrons-vertical': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '8 17 12 21 16 17', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '8 7 12 3 16 7', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  menu: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '4', y1: '6', x2: '20', y2: '6' },
      { type: 'line', x1: '4', y1: '12', x2: '20', y2: '12' },
      { type: 'line', x1: '4', y1: '18', x2: '20', y2: '18' }
    ]
  },
  spinner: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 2v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 20v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M4.93 4.93l1.42 1.42', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M17.66 17.66l1.41 1.41', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M2 12h2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M20 12h2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6.34 17.66l-1.41 1.41', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M19.07 4.93l-1.41 1.41', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ],
    strokeWidth: '2'
  },
  'arrow-left': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M10 19l-7-7m0 0 7-7m-7 7h18', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  trash: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'device-mobile': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 18h.01', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  close: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M6 18L18 6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6 6l12 12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  cube: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  edit: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  factory: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  ship: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  customs: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'check-circle': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  check: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5 13l4 4L19 7', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '3' }]
  },
  clock: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  calendar: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  collection: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2 2 2 0 01-2 2H8.5A2.5 2.5 0 016 16.5v-11A2 2 0 018 3h2', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'badge-check': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  eye: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.066 7-9.542 7s-8.268-2.943-9.542-7z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  scale: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M3 6l3 1m0 0-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2 3-1m-3 1-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9-6-2m0-2v2m0 16V5m0 16H9m3 0h3', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  star: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z', fill: 'currentColor' }]
  },
  sparkles: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2' }]
  },
  search: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'shield-alert': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  refresh: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  offline: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M18.364 5.636 5.636 18.364m12.728 0L5.636 5.636M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'academic-cap': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'currency-dollar': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'device-laptop': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'document-text': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  dot: {
    viewBox: '0 0 20 20',
    shapes: [{ type: 'circle', cx: '10', cy: '10', r: '8', fill: 'currentColor' }]
  },
  heart: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'information-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M13 16h-1v-4h-1m1-4h.01', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  inbox: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'link-connected': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  monitor: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 8h12a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v10a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'user-network': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'badge-check-solid': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M9 12l2 2 4-4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'eye-off': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M9.878 9.878l4.242 4.242', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M9.878 9.878L3 3m6.878 6.878L21 21', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  mail: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M3 8l7.89 7.89a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'phone-classic': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'building-office': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'document-report': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'alert-triangle': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'x-circle': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  grid: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z', fill: 'currentColor' }]
  },
  beaker: {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'check-circle-solid': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z', fill: 'currentColor' }]
  },
  'volume-up': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'volume-off': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'exclamation-triangle': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'lightning-bolt': {
    viewBox: '0 0 24 24',
    shapes: [{ type: 'path', d: 'M13 10V3L4 14h7v7l9-11h-7z', strokeLinecap: 'round', strokeLinejoin: 'round' }]
  },
  'target-arrow': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '9' },
      { type: 'circle', cx: '12', cy: '12', r: '4' },
      { type: 'line', x1: '12', y1: '3', x2: '12', y2: '7', strokeLinecap: 'round' },
      { type: 'line', x1: '12', y1: '17', x2: '12', y2: '21', strokeLinecap: 'round' },
      { type: 'line', x1: '3', y1: '12', x2: '7', y2: '12', strokeLinecap: 'round' },
      { type: 'line', x1: '17', y1: '12', x2: '21', y2: '12', strokeLinecap: 'round' }
    ]
  },
  'exclamation-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 8v4m0 4h.01', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'location-marker': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M15 11a3 3 0 11-6 0 3 3 0 016 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'book': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'globe': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  }
};

@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  get(name: IconName): IconDefinition | null {
    return ICON_LIBRARY[name] ?? null;
  }

  has(name: string): name is IconName {
    return name in ICON_LIBRARY;
  }

  toSvg(name: IconName, options: IconRenderOptions = {}): string {
    const definition = this.get(name);
    if (!definition) {
      return '';
    }

    const size = options.size ?? ICON_DEFAULTS.size;
    const strokeWidth = options.strokeWidth ?? definition.strokeWidth ?? ICON_DEFAULTS.strokeWidth;
    const color = options.color ?? ICON_DEFAULTS.color;
    const classAttr = options.className ? ` class="${options.className}"` : '';
    const extraAttrs = options.attributes
      ? Object.entries(options.attributes)
          .map(([key, value]) => ` ${key}="${value}"`)
          .join('')
      : '';

    const shapeString = definition.shapes
      .map(shape => renderShape(shape, strokeWidth))
      .join('');

    return `<svg${classAttr}${extraAttrs} style="color: ${color};" fill="${definition.fill ?? ICON_DEFAULTS.fill}" stroke="${definition.stroke ?? ICON_DEFAULTS.stroke}" stroke-width="${strokeWidth}" viewBox="${definition.viewBox}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">${shapeString}</svg>`;
  }
}

export const ICON_DEFAULTS = {
  strokeWidth: DEFAULT_STROKE_WIDTH,
  stroke: 'currentColor',
  fill: 'none',
  size: 20,
  color: 'var(--icon-color, var(--color-text-tertiary))'
} as const;

export interface IconRenderOptions {
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: string;
  attributes?: Record<string, string>;
}

function renderShape(shape: IconShape, strokeWidth: string | undefined): string {
  switch (shape.type) {
    case 'path':
      return `<path d="${shape.d}"${shape.strokeLinecap ? ` stroke-linecap="${shape.strokeLinecap}"` : ''}${shape.strokeLinejoin ? ` stroke-linejoin="${shape.strokeLinejoin}"` : ''}${shape.strokeWidth ? ` stroke-width="${shape.strokeWidth}"` : strokeWidth ? ` stroke-width="${strokeWidth}"` : ''}${shape.fill ? ` fill="${shape.fill}"` : ''}></path>`;
    case 'circle':
      return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"${shape.fill ? ` fill="${shape.fill}"` : ''}></circle>`;
    case 'line':
      return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}"${shape.strokeLinecap ? ` stroke-linecap="${shape.strokeLinecap}"` : ''}${shape.strokeLinejoin ? ` stroke-linejoin="${shape.strokeLinejoin}"` : ''}${shape.strokeWidth ? ` stroke-width="${shape.strokeWidth}"` : strokeWidth ? ` stroke-width="${strokeWidth}"` : ''}></line>`;
    case 'polyline':
      return `<polyline points="${shape.points}"${shape.strokeLinecap ? ` stroke-linecap="${shape.strokeLinecap}"` : ''}${shape.strokeLinejoin ? ` stroke-linejoin="${shape.strokeLinejoin}"` : ''}${shape.strokeWidth ? ` stroke-width="${shape.strokeWidth}"` : strokeWidth ? ` stroke-width="${strokeWidth}"` : ''}></polyline>`;
    case 'polygon':
      return `<polygon points="${shape.points}"></polygon>`;
    case 'rect':
      return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${shape.rx ? ` rx="${shape.rx}"` : ''}${shape.ry ? ` ry="${shape.ry}"` : ''}></rect>`;
    default:
      return '';
  }
}

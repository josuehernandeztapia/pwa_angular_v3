import { Injectable } from '@angular/core';

export type IconName =
  | 'home'
  | 'users'
  | 'user'
  | 'settings'
  | 'search'
  | 'document'
  | 'package'
  | 'calendar'
  | 'check'
  | 'factory'
  | 'ship'
  | 'store'
  | 'celebration'
  | 'building-construction'
  | 'building-office'
  | 'document-text'
  | 'document-report'
  | 'lock-open'
  | 'lock'
  | 'trending-up'
  | 'trending-down'
  | 'badge-check-solid'
  | 'badge-check'
  | 'eye-off'
  | 'eye'
  | 'check-circle'
  | 'check-circle-solid'
  | 'mail'
  | 'spinner'
  | 'phone-classic'
  | 'phone'
  | 'information-circle'
  | 'alert-triangle'
  | 'x-circle'
  | 'cube'
  | 'chat'
  | 'chat-bubble'
  | 'microphone'
  | 'arrow-right'
  | 'arrow-left'
  | 'user-network'
  | 'calculator'
  | 'collection'
  | 'camera'
  | 'bank'
  | 'currency-dollar'
  | 'plus'
  | 'minus'
  | 'chart'
  | 'trash'
  | 'external-link'
  | 'chevrons-left'
  | 'chevrons-right'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-up'
  | 'sparkles'
  | 'target'
  | 'close'
  | 'link-connected'
  | 'download-tray'
  | 'download'
  | 'truck'
  | 'volume-2'
  | 'file-text'
  | 'piggy-bank'
  | 'clipboard-list'
  | 'clipboard'
  | 'menu'
  | 'grid'
  | 'cloud-upload'
  | 'folder'
  | 'adjustments'
  | 'beaker'
  | 'lightning-bolt'
  | 'globe'
  | 'location-marker'
  | 'exclamation-triangle'
  | 'exclamation-circle'
  | 'clock'
  | 'handshake'
  | 'dot'
  | 'fuel'
  | 'refresh'
  | 'map'
  | 'customs'
  | 'star'
  | 'shield'
  | 'shield-check'
  | 'shield-alert'
  | 'alert-circle'
  | 'umbrella'
  | 'info'
  | 'activity'
  | 'support'
  | 'heart'
  | 'more'
  | 'wifi'
  | 'offline'
  | 'chevrons-vertical'
  | 'bell'
  | 'help'
  | 'logout'
  | 'lightbulb'
  | 'snow'
  | 'link'
  | 'inbox'
  | 'device-mobile'
  | 'stop'
  | 'book'
  | 'sun'
  | 'waves'
  | 'moon'
  | 'edit'
  | 'keyboard'
  | 'x'
  | 'user-plus'
  | 'dollar-sign'
  | 'credit-card';

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
  home: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '9,22 9,12 15,12 15,22', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  users: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '7', r: '4' }
    ]
  },
  settings: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '3' },
      { type: 'path', d: 'M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  search: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '11', cy: '11', r: '8' },
      { type: 'path', d: 'm21 21-4.35-4.35', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  document: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  package: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '16.5', y1: '9.4', x2: '7.5', y2: '4.21', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '3.27 6.96 12 12.01 20.73 6.96', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '22.08', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  calendar: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  check: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M5 13l4 4L19 7', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '3' }
    ]
  },
  factory: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  ship: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  store: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 9a2 2 0 002 2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 8h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 11H19a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v2z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M5 11v8a2 2 0 002 2h10a2 2 0 002-2v-8', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  celebration: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '8', r: '3' },
      { type: 'path', d: 'M8 14l-2 4h12l-2-4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 11v3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6 2l1.5 1.5M18 2l-1.5 1.5M2 6l1.5 1.5M22 6l-1.5 1.5', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'building-construction': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 21V7l9-4 9 4v14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M9 21V11h6v10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M7 9h2m4 0h2', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'document-text': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '14,2 14,8 20,8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '13', x2: '8', y2: '13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '17', x2: '8', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '10,9 9,9 8,9', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'lock-open': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '3', y: '11', width: '18', height: '10', rx: '2', ry: '2' },
      { type: 'path', d: 'M7 11V7a5 5 0 0 1 9.9-1', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'trending-up': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '23 6 13.5 15.5 8.5 10.5 1 18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '17 6 23 6 23 12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'trending-down': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '23 18 13.5 8.5 8.5 13.5 1 6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '17 18 23 18 23 12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  user: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '7', r: '4' }
    ]
  },
  'badge-check-solid': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'currentColor' }
    ]
  },
  'badge-check': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'eye-off': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '1', y1: '1', x2: '23', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  eye: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '12', r: '3' }
    ]
  },
  'check-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '22,4 12,14.01 9,11.01', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'check-circle-solid': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 11.08V12a10 10 0 1 1-5.93-9.14', strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'currentColor' },
      { type: 'polyline', points: '22,4 12,14.01 9,11.01', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  mail: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '22,6 12,13 2,6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  spinner: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 12a9 9 0 11-6.219-8.56', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'phone-classic': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  phone: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'information-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'path', d: 'M12 16v-4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 8h.01', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'alert-triangle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '9', x2: '12', y2: '13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '17', x2: '12.01', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'x-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'line', x1: '15', y1: '9', x2: '9', y2: '15', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '9', y1: '9', x2: '15', y2: '15', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  cube: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '7.5,4.21 12,6.81 16.5,4.21', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '7.5,19.79 7.5,14.6 3,12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '21,12 16.5,14.6 16.5,19.79', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '12,22.08 12,17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  chat: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chat-bubble': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  microphone: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M19 10v2a7 7 0 0 1-14 0v-2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '19', x2: '12', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '23', x2: '16', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'arrow-right': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '5', y1: '12', x2: '19', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '12,5 19,12 12,19', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'arrow-left': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '19', y1: '12', x2: '5', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '12,19 5,12 12,5', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'user-network': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '9', cy: '7', r: '4' },
      { type: 'path', d: 'M22 21v-2a4 4 0 0 0-3-3.87', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M16 3.13a4 4 0 0 1 0 7.75', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  calculator: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '4', y: '2', width: '16', height: '20', rx: '2' },
      { type: 'line', x1: '8', y1: '6', x2: '16', y2: '6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '10', x2: '16', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '10', x2: '12', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '10', x2: '8', y2: '10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '14', x2: '8', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '18', x2: '16', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '18', x2: '8', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  collection: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '7', y: '3', width: '14', height: '14', rx: '2', ry: '2' },
      { type: 'path', d: 'm3 8 2-2v10l-2 2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm3 16 2 2h10l2-2', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  camera: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '13', r: '4' }
    ]
  },
  bank: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '3', y1: '21', x2: '21', y2: '21', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '5', y1: '21', x2: '5', y2: '7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '19', y1: '21', x2: '19', y2: '7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '9', y1: '21', x2: '9', y2: '7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '15', y1: '21', x2: '15', y2: '7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M2 7l10-4 10 4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'currency-dollar': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '12', y1: '1', x2: '12', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  plus: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '12', y1: '5', x2: '12', y2: '19', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '5', y1: '12', x2: '19', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  minus: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '5', y1: '12', x2: '19', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  chart: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '18', y1: '20', x2: '18', y2: '10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '20', x2: '12', y2: '4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '6', y1: '20', x2: '6', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  trash: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '3,6 5,6 21,6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '10', y1: '11', x2: '10', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '14', y1: '11', x2: '14', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'external-link': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '15,3 21,3 21,9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '10', y1: '14', x2: '21', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevrons-left': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '11,17 6,12 11,7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '18,17 13,12 18,7', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevrons-right': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '13,17 18,12 13,7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '6,17 11,12 6,7', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevron-left': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '15,18 9,12 15,6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevron-right': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '9,18 15,12 9,6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevron-down': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '6,9 12,15 18,9', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevron-up': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '18,15 12,9 6,15', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  sparkles: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M5 3v4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M19 17v4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M3 5h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M17 19h4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  target: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'circle', cx: '12', cy: '12', r: '6' },
      { type: 'circle', cx: '12', cy: '12', r: '2' }
    ]
  },
  close: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '18', y1: '6', x2: '6', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '6', y1: '6', x2: '18', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'link-connected': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'download-tray': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '7,10 12,15 17,10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '15', x2: '12', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  download: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '7,10 12,15 17,10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '15', x2: '12', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' }
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
  'volume-2': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polygon', points: '11,5 6,9 2,9 2,15 6,15 11,19 11,5' },
      { type: 'path', d: 'M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'file-text': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '14,2 14,8 20,8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '13', x2: '8', y2: '13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '17', x2: '8', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '10,9 9,9 8,9', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'piggy-bank': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M19 5c-1.5 0-2.8 1.4-3 2.8l-1.2-0.4c-2.4-0.8-4.8-0.8-7.2 0L6.4 7.8C6.2 6.4 4.9 5 3.4 5 1.5 5 0 6.5 0 8.4s1.5 3.4 3.4 3.4c1.5 0 2.8-1.4 3-2.8l1.2 0.4c2.4 0.8 4.8 0.8 7.2 0l1.2-0.4c0.2 1.4 1.5 2.8 3 2.8 1.9 0 3.4-1.5 3.4-3.4S20.9 5 19 5z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'clipboard-list': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' },
      { type: 'path', d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '11', x2: '12', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '6', x2: '12', y2: '6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  clipboard: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' },
      { type: 'path', d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  menu: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '3', y1: '6', x2: '21', y2: '6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '3', y1: '12', x2: '21', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '3', y1: '18', x2: '21', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  grid: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '3', y: '3', width: '7', height: '7' },
      { type: 'rect', x: '14', y: '3', width: '7', height: '7' },
      { type: 'rect', x: '14', y: '14', width: '7', height: '7' },
      { type: 'rect', x: '3', y: '14', width: '7', height: '7' }
    ]
  },
  'cloud-upload': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '16,16 12,12 8,16', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '12', x2: '12', y2: '21', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  folder: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  adjustments: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '4', y1: '21', x2: '4', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '4', y1: '10', x2: '4', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '21', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '8', x2: '12', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '20', y1: '21', x2: '20', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '20', y1: '12', x2: '20', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '1', y1: '14', x2: '7', y2: '14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '9', y1: '8', x2: '15', y2: '8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '17', y1: '16', x2: '23', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  beaker: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm9 2 3 13 3-13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm19 22a3 3 0 0 1-3-3 3 3 0 0 1 3-3 3 3 0 0 1 3 3 3 3 0 0 1-3 3Z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L14 17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'lightning-bolt': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polygon', points: '13,2 3,14 12,14 11,22 21,10 12,10 13,2' }
    ]
  },
  globe: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'line', x1: '2', y1: '12', x2: '22', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'location-marker': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '12', cy: '10', r: '3' }
    ]
  },
  'exclamation-triangle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '9', x2: '12', y2: '13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '17', x2: '12.01', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'exclamation-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'line', x1: '12', y1: '8', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '16', x2: '12.01', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  clock: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'polyline', points: '12,6 12,12 16,14', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  handshake: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm11 17 2 2a1 1 0 1 0 3-3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm21 3 1 11h-2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M3 4h8', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  dot: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '2', fill: 'currentColor' }
    ]
  },
  fuel: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '3', y1: '22', x2: '15', y2: '22', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '4', y1: '9', x2: '14', y2: '9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  refresh: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '23,4 23,10 17,10', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '1,20 1,14 7,14', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  map: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polygon', points: '1,6 1,22 8,18 16,22 23,18 23,2 16,6 8,2 1,6' },
      { type: 'line', x1: '8', y1: '2', x2: '8', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '16', y1: '6', x2: '16', y2: '22', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  customs: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M3 3v18h18', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M18.7 8a4 4 0 0 0-7.4 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '15', cy: '8', r: '1' },
      { type: 'path', d: 'm8.5 21 7-4 7 4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  star: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polygon', points: '12,2 15.09,8.26 22,9 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9 8.91,8.26 12,2' }
    ]
  },
  shield: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'shield-check': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm9 12 2 2 4-4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'shield-alert': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '8', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '16', x2: '12.01', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'alert-circle': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'line', x1: '12', y1: '8', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '16', x2: '12.01', y2: '16', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  umbrella: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  info: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'line', x1: '12', y1: '16', x2: '12', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '8', x2: '12.01', y2: '8', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  activity: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '22,12 18,12 15,21 9,3 6,12 2,12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  support: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'circle', cx: '12', cy: '12', r: '6' },
      { type: 'circle', cx: '12', cy: '12', r: '2' }
    ]
  },
  heart: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  more: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '1' },
      { type: 'circle', cx: '19', cy: '12', r: '1' },
      { type: 'circle', cx: '5', cy: '12', r: '1' }
    ]
  },
  wifi: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'm1 9 4 4 4-4a6.5 6.5 0 0 1 9.2 0L22 13l-4 4-4-4a2.3 2.3 0 0 0-3.2 0L6 17l4 4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  offline: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '1', y1: '1', x2: '23', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10.71 5.05A16 16 0 0 1 22.58 9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M8.53 16.11a6 6 0 0 1 6.95 0', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '20', x2: '12.01', y2: '20', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'chevrons-vertical': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '7,11 12,6 17,11', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '7,13 12,18 17,13', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  bell: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  help: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '10' },
      { type: 'path', d: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '17', x2: '12.01', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  logout: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '16,17 21,12 16,7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '21', y1: '12', x2: '9', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  lightbulb: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M9 21h6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 17c1.38 0 2.5-.56 2.5-1.25S13.38 14.5 12 14.5s-2.5.56-2.5 1.25S10.62 17 12 17z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M12 3a6 6 0 0 0-6 6c0 3 2 5 2 5h8s2-2 2-5a6 6 0 0 0-6-6z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  snow: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '12', y1: '2', x2: '12', y2: '22', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm20.2 7.8-1.8-1.8-1.8 1.8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm6.8 17.2 1.8 1.8 1.8-1.8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm20.2 16.2-1.8 1.8-1.8-1.8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'm6.8 6.8 1.8-1.8 1.8 1.8', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  link: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  inbox: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'polyline', points: '22,12 18,12 16,20 8,20 6,12 2,12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'device-mobile': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '5', y: '2', width: '14', height: '20', rx: '2', ry: '2' },
      { type: 'line', x1: '12', y1: '18', x2: '12.01', y2: '18', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  stop: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '6', y: '6', width: '12', height: '12', rx: '2' }
    ]
  },
  'building-office': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10 6h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10 10h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10 14h4', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M10 18h4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'document-report': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'polyline', points: '14,2 14,8 20,8', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '13', x2: '16', y2: '13', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '8', y1: '17', x2: '12', y2: '17', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  lock: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '3', y: '11', width: '18', height: '11', rx: '2', ry: '2' },
      { type: 'circle', cx: '12', cy: '16', r: '1' },
      { type: 'path', d: 'm7 11V7a5 5 0 0 1 10 0v4', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  book: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  sun: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'circle', cx: '12', cy: '12', r: '5' },
      { type: 'line', x1: '12', y1: '1', x2: '12', y2: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '12', y1: '21', x2: '12', y2: '23', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '4.22', y1: '4.22', x2: '5.64', y2: '5.64', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '18.36', y1: '18.36', x2: '19.78', y2: '19.78', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '1', y1: '12', x2: '3', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '21', y1: '12', x2: '23', y2: '12', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '4.22', y1: '19.78', x2: '5.64', y2: '18.36', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'line', x1: '18.36', y1: '5.64', x2: '19.78', y2: '4.22', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  waves: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  moon: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  edit: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'path', d: 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  keyboard: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '2', y: '6', width: '20', height: '12', rx: '2' },
      { type: 'path', d: 'M6 10h0M10 10h0M14 10h0M18 10h0M6 14h0M10 14h0M14 14h0M18 14h0', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  x: {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M18 6L6 18M6 6l12 12', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'user-plus': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'path', d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', strokeLinecap: 'round', strokeLinejoin: 'round' },
      { type: 'circle', cx: '9', cy: '7', r: '4' },
      { type: 'line', x1: '19', y1: '8', x2: '19', y2: '14' },
      { type: 'line', x1: '22', y1: '11', x2: '16', y2: '11' }
    ]
  },
  'dollar-sign': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'line', x1: '12', y1: '1', x2: '12', y2: '23' },
      { type: 'path', d: 'M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', strokeLinecap: 'round', strokeLinejoin: 'round' }
    ]
  },
  'credit-card': {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: '1', y: '4', width: '22', height: '16', rx: '2', ry: '2' },
      { type: 'line', x1: '1', y1: '10', x2: '23', y2: '10' }
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
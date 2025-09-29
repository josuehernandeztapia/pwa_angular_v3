// SSOT - Single Source of Truth for Notifications
// Eliminates 7 different duplicate definitions across the codebase

export interface NotificationBase {
  id: string;
  type:
    | 'payment_due'
    | 'gnv_overage'
    | 'document_pending'
    | 'contract_approved'
    | 'system_alert'
    | 'general'
    | string;
  title: string;
  message: string;
  timestamp: Date | string;
  priority?: 'high' | 'medium' | 'low';
  clientId?: string;
  isRead?: boolean;
  clicked?: boolean;
  data?: any;
}

// UI extension for components that need presentational data
export interface NotificationUI extends NotificationBase {
  icon?: string;
  formattedTime?: string;
  color?: string;
  actionText?: string;
  route?: string;
}

// For push/webhook payloads
export interface NotificationPayload extends NotificationBase {
  body?: string; // legacy field mapping to 'message'
  icon?: string;
  badge?: string | number;
  tag?: string;
  sound?: string;
  category?: string;
  vibrate?: number[];
  actions?: { action: string; title: string; icon?: string }[];
  requireInteraction?: boolean;
  silent?: boolean;
}

// Legacy compatibility types for migration
export type NotificationHistory = NotificationBase & {
  userId: string;
  user_id?: string; // legacy field
  body?: string; // legacy field mapping to 'message'
  sent_at?: string; // legacy field mapping to 'timestamp'
  delivered?: boolean;
  clicked?: boolean;
};

export type NotificationResult = NotificationBase & {
  source: 'whatsapp' | 'push' | 'email' | 'system';
  deliveryStatus?: 'sent' | 'delivered' | 'failed';
  // Legacy WhatsApp-specific fields
  messageId?: string;
  success?: boolean;
  errorMessage?: string;
  sentAt?: Date;
};

// WhatsApp-specific notification result for import service (simplified for quick compatibility)
export interface WhatsAppNotificationResult {
  // WhatsApp specific fields (all required fields are here)
  phoneNumber: string;
  milestone: string;
  notificationType: 'milestone_start' | 'milestone_completed' | 'milestone_delayed' | 'delivery_update';
  templateUsed: string;

  // Optional WhatsApp fields
  messageId?: string;
  success?: boolean;
  errorMessage?: string;
  sentAt?: Date;
  clientId?: string;
  whatsappResponse?: any;

  // Optional notification base fields for compatibility
  id?: string;
  type?: string;
  title?: string;
  message?: string;
  timestamp?: Date | string;
}

// Notification type descriptions for UI
export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<string, {
  title: string;
  iconType: string;
  color: string;
  priority: 'high' | 'medium' | 'low';
}> = {
  payment_due: {
    title: 'Pago Pendiente',
    iconType: 'credit-card',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'high'
  },
  gnv_overage: {
    title: 'Exceso de GNV',
    iconType: 'fuel',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'high'
  },
  document_pending: {
    title: 'Documento Pendiente',
    iconType: 'document-text',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'medium'
  },
  contract_approved: {
    title: 'Contrato Aprobado',
    iconType: 'check-circle',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'low'
  },
  system_alert: {
    title: 'Alerta del Sistema',
    iconType: 'bell',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'medium'
  },
  general: {
    title: 'Notificación General',
    iconType: 'announcement',
    color: 'var(--color-text-secondary, #737373) /* OpenAI neutral */',
    priority: 'low'
  }
};
export type NotificationType = 'contact' | 'lead';

export interface NotificationPayload {
  type: NotificationType;
  id: string;
  senderName: string;
  senderEmail: string;
  title: string;
  body: string;
  company?: string;
  projectType?: string;
  budgetRange?: string;
  deadline?: string;
  aiScore?: number;
  aiSummary?: string;
  priority?: string;
  createdAt: string;
  dynamicFields?: { label: string; value: string }[];
}

export interface NotificationResult {
  provider: 'email' | 'telegram' | 'whatsapp';
  success: boolean;
  messageId?: string;
  error?: string;
  skippedReason?: string;
}

export interface NotificationProvider {
  name: 'email' | 'telegram' | 'whatsapp';
  send(payload: NotificationPayload): Promise<NotificationResult>;
}

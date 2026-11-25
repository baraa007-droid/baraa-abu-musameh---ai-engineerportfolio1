import { getRedisClient } from '../redis';
import { ContactMessage, ProjectLead } from '../../src/types';
import { EmailNotificationProvider } from './email';
import { TelegramNotificationProvider } from './telegram';
import { WhatsAppNotificationProvider } from './whatsapp';
import { NotificationPayload, NotificationProvider, NotificationResult } from './types';
import { errorText } from '../lib/http';

const sentNotificationIds = new Set<string>();

export class NotificationManager {
  private providers: NotificationProvider[];

  constructor() {
    this.providers = [
      new EmailNotificationProvider(),
      new TelegramNotificationProvider(),
      new WhatsAppNotificationProvider()
    ];
  }

  private async isDuplicate(id: string, type: string): Promise<boolean> {
    const key = `notif:sent:${type}:${id}`;

    try {
      const redis = getRedisClient();
      if (redis) {
        // Set key with 24-hour expiration if not exists
        const res = await redis.set(key, '1', 'EX', 86400, 'NX');
        if (res === null) {
          // Key already exists in Redis -> Duplicate!
          return true;
        }
        return false;
      }
    } catch {
      // Fallback to in-memory set if Redis is unreachable
    }

    if (sentNotificationIds.has(key)) {
      return true;
    }
    sentNotificationIds.add(key);

    // Memory cleanup: limit set size to 1000 items
    if (sentNotificationIds.size > 1000) {
      const first = sentNotificationIds.values().next().value;
      if (first) sentNotificationIds.delete(first);
    }

    return false;
  }

  async dispatchContact(msg: ContactMessage): Promise<NotificationResult[]> {
    const isDup = await this.isDuplicate(msg.id, 'contact');
    if (isDup) {
      console.log(`[Notification Manager] Skipping duplicate contact notification for ID=${msg.id}`);
      return [];
    }

    const dynamicFields: { label: string; value: string }[] = [];
    if (msg.custom_fields && typeof msg.custom_fields === 'object') {
      for (const [k, v] of Object.entries(msg.custom_fields)) {
        if (v !== undefined && v !== null && v !== '') {
          dynamicFields.push({
            label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            value: Array.isArray(v) ? v.join(', ') : String(v)
          });
        }
      }
    }

    const payload: NotificationPayload = {
      type: 'contact',
      id: msg.id,
      senderName: msg.name,
      senderEmail: msg.email,
      title: msg.subject || 'General Inquiry',
      body: msg.message,
      createdAt: msg.created_at || new Date().toISOString(),
      dynamicFields: dynamicFields.length > 0 ? dynamicFields : undefined
    };

    return this.dispatchAll(payload);
  }

  async dispatchLead(lead: ProjectLead): Promise<NotificationResult[]> {
    const isDup = await this.isDuplicate(lead.id, 'lead');
    if (isDup) {
      console.log(`[Notification Manager] Skipping duplicate lead notification for ID=${lead.id}`);
      return [];
    }

    const dynamicFields: { label: string; value: string }[] = [];
    if (lead.custom_fields && typeof lead.custom_fields === 'object') {
      for (const [k, v] of Object.entries(lead.custom_fields)) {
        if (v !== undefined && v !== null && v !== '') {
          dynamicFields.push({
            label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            value: Array.isArray(v) ? v.join(', ') : String(v)
          });
        }
      }
    }

    const payload: NotificationPayload = {
      type: 'lead',
      id: lead.id,
      senderName: lead.name,
      senderEmail: lead.email,
      company: lead.company,
      projectType: lead.project_type,
      budgetRange: lead.budget_range,
      deadline: lead.deadline,
      title: `Project Intake: ${lead.project_type}`,
      body: lead.description,
      aiScore: lead.ai_score,
      aiSummary: lead.ai_summary,
      priority: lead.priority,
      createdAt: lead.created_at || new Date().toISOString(),
      dynamicFields: dynamicFields.length > 0 ? dynamicFields : undefined
    };

    return this.dispatchAll(payload);
  }

  private async dispatchAll(payload: NotificationPayload): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    const promises = this.providers.map(async (provider) => {
      try {
        const res = await provider.send(payload);
        return res;
      } catch (err) {
        const sanitizedMsg = (errorText(err) || 'Unknown notification error').replace(/(?:token|pass|secret)=[\w-]+/gi, 'token=[REDACTED]');
        console.error(`[Notification Engine Error] Provider ${provider.name} failed for payload [${payload.id}]:`, sanitizedMsg);
        return {
          provider: provider.name,
          success: false,
          error: sanitizedMsg
        };
      }
    });

    const settled = await Promise.allSettled(promises);
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.push(item.value);
      }
    }

    return results;
  }
}

export const notificationManager = new NotificationManager();

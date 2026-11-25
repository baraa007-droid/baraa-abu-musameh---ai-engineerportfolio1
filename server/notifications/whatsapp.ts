import { config } from '../config';
import { db } from '../db';
import { NotificationPayload, NotificationProvider, NotificationResult } from './types';

/**
 * WhatsApp Notification Provider Interface & Architecture Readiness.
 * Prepared for Meta Cloud API / Twilio WhatsApp integration in Phase 2.
 */
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly name = 'whatsapp' as const;

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const settings = db.getSettings();

    // 1. Check feature switch in Admin SiteSettings
    if (settings.enable_whatsapp_notifications !== true && !config.whatsappEnabled) {
      return {
        provider: 'whatsapp',
        success: false,
        skippedReason: 'Disabled via Admin Settings / Config (Phase 2 readiness)'
      };
    }

    console.log(`[WhatsApp Notification Stub] Provider interface ready for payload [${payload.id}] (Phase 2 Activation Pending)`);
    return {
      provider: 'whatsapp',
      success: true,
      messageId: `stub-wa-${payload.id}`,
      skippedReason: 'WhatsApp provider ready (Phase 2 API credentials pending)'
    };
  }
}

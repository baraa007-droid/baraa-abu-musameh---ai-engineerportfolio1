import { config } from '../config';
import { db } from '../db';
import { NotificationPayload, NotificationProvider, NotificationResult } from './types';
import { errorText } from '../lib/http';

function escapeTelegramHtml(text: string): string {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export class TelegramNotificationProvider implements NotificationProvider {
  readonly name = 'telegram' as const;

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const settings = db.getSettings();

    // 1. Check feature switch in Admin SiteSettings
    if (settings.enable_telegram_notifications === false) {
      return {
        provider: 'telegram',
        success: false,
        skippedReason: 'Disabled via Admin Settings (enable_telegram_notifications = false)'
      };
    }

    // 2. Check general notification master switch
    if (!config.notificationsEnabled) {
      return {
        provider: 'telegram',
        success: false,
        skippedReason: 'Disabled via server configuration (NOTIFICATIONS_ENABLED = false)'
      };
    }

    const botToken = config.telegramBotToken;
    const chatId = settings.telegram_chat_id || config.telegramChatId;

    const isTelegramConfigured = Boolean(botToken && chatId);

    // Build Telegram HTML Message
    let messageText = '';
    const dynamicSection = (payload.dynamicFields && payload.dynamicFields.length > 0)
      ? ['\n📋 <b>Additional Fields:</b>', ...payload.dynamicFields.map(f => `• <b>${escapeTelegramHtml(f.label)}:</b> ${escapeTelegramHtml(f.value)}`)].join('\n')
      : '';

    if (payload.type === 'lead') {
      messageText = [
        `<b>🚀 New Project Intake Submitted</b>`,
        ``,
        `👤 <b>Name:</b> ${escapeTelegramHtml(payload.senderName)}`,
        `📧 <b>Email:</b> ${escapeTelegramHtml(payload.senderEmail)}`,
        payload.company ? `🏢 <b>Company:</b> ${escapeTelegramHtml(payload.company)}` : null,
        `🛠 <b>Project:</b> ${escapeTelegramHtml(payload.projectType || 'N/A')}`,
        `💰 <b>Budget:</b> ${escapeTelegramHtml(payload.budgetRange || 'Flexible')}`,
        `⏱ <b>Deadline:</b> ${escapeTelegramHtml(payload.deadline || 'Flexible')}`,
        payload.aiSummary ? `\n🤖 <b>AI Score:</b> ${payload.aiScore ?? 50}/100\n<i>${escapeTelegramHtml(payload.aiSummary)}</i>` : null,
        dynamicSection ? `\n${dynamicSection}` : null,
        ``,
        `📝 <b>Scope Brief:</b>`,
        `<code>${escapeTelegramHtml(payload.body.substring(0, 500))}</code>`
      ].filter(Boolean).join('\n');
    } else {
      messageText = [
        `<b>📩 New Portfolio Contact Message</b>`,
        ``,
        `👤 <b>Name:</b> ${escapeTelegramHtml(payload.senderName)}`,
        `📧 <b>Email:</b> ${escapeTelegramHtml(payload.senderEmail)}`,
        `📌 <b>Subject:</b> ${escapeTelegramHtml(payload.title)}`,
        dynamicSection ? `\n${dynamicSection}` : null,
        ``,
        `💬 <b>Message:</b>`,
        `<code>${escapeTelegramHtml(payload.body.substring(0, 500))}</code>`
      ].filter(Boolean).join('\n');
    }

    if (!isTelegramConfigured) {
      // Simulated delivery in dev/test mode
      console.log(`[Telegram Notification] Bot token or Chat ID not set. Simulated Telegram alert for [${payload.id}]`);
      return {
        provider: 'telegram',
        success: true,
        messageId: `simulated-tg-${payload.id}`
      };
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        }),
        signal: AbortSignal.timeout(10000)
      });

      const data = await response.json() as any;

      if (!response.ok || !data.ok) {
        const errorMsg = data.description || `Telegram API HTTP ${response.status}`;
        console.error(`[Telegram Notification Failure] Payload ID: ${payload.id} | Error: ${errorMsg}`);
        return {
          provider: 'telegram',
          success: false,
          error: errorMsg
        };
      }

      console.log(`[Telegram Notification] ✅ Real message delivered for [${payload.id}] | Telegram message_id=${data.result?.message_id}`);
      return {
        provider: 'telegram',
        success: true,
        messageId: String(data.result?.message_id || `tg-${payload.id}`)
      };
    } catch (err) {
      const sanitizedError = (errorText(err) || 'Telegram HTTP request failed').replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED_TOKEN]');
      console.error(`[Telegram Notification Failure] Payload ID: ${payload.id} | Error: ${sanitizedError}`);
      return {
        provider: 'telegram',
        success: false,
        error: sanitizedError
      };
    }
  }
}

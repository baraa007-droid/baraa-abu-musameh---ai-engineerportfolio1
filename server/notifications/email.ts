import nodemailer from 'nodemailer';
import { config } from '../config';
import { db } from '../db';
import { checkRateLimit } from '../redis';
import { hashKey } from '../lib/http';
import { NotificationPayload, NotificationProvider, NotificationResult } from './types';

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com';
  const [local, domain] = email.trim().split('@');
  const maskedLocal = local.length <= 2 ? `${local}***` : `${local.substring(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

function isArabicText(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text || '');
}

export class EmailNotificationProvider implements NotificationProvider {
  readonly name = 'email' as const;

  private createTransporter() {
    return nodemailer.createTransport({
      host: config.smtpHost || 'smtp.gmail.com',
      port: config.smtpPort || 587,
      secure: config.smtpSecure || false,
      auth: {
        user: config.smtpUser,
        pass: config.smtpPass
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    });
  }

  async send(payload: NotificationPayload): Promise<NotificationResult> {
    const settings = db.getSettings();

    // 1. Check feature flag switch in SiteSettings
    if (settings.enable_email_notifications === false) {
      console.log(`[Email] Notification skipped: Disabled via Admin Settings (enable_email_notifications = false)`);
      return {
        provider: 'email',
        success: false,
        skippedReason: 'Disabled via Admin Settings (enable_email_notifications = false)'
      };
    }

    // 2. Check general notification master switch and the configured provider
    if (config.emailProvider === 'none') {
      return { provider: 'email', success: false, skippedReason: 'EMAIL_PROVIDER is none' };
    }
    if (!config.notificationsEnabled) {
      console.log(`[Email] Notification skipped: Disabled via server configuration (NOTIFICATIONS_ENABLED = false)`);
      return {
        provider: 'email',
        success: false,
        skippedReason: 'Disabled via server configuration (NOTIFICATIONS_ENABLED = false)'
      };
    }

    const rawVisitorEmail = (payload.senderEmail || '').trim();
    const recipientEmail = (settings.notification_email_to || config.notificationEmailTo || config.smtpUser || '').trim();
    const authenticatedUser = (config.smtpUser || '').trim();

    // Gmail SMTP requirement: 'From' header MUST contain the authenticated Gmail address to avoid 553/550 sender address rejection when sending to external recipients
    const senderFrom = `"Baraa Abu Musameh Portfolio" <${authenticatedUser}>`;

    // 3. Inspect Gmail SMTP credentials
    const isSmtpConfigured = Boolean(config.smtpUser && config.smtpUser.trim().length > 0 && config.smtpPass && config.smtpPass.trim().length > 0);

    if (!isSmtpConfigured || !recipientEmail) {
      console.warn(`[Email] Provider not configured: SMTP_USER or SMTP_PASS missing. Skipping Gmail SMTP dispatch for [${payload.id}].`);
      return {
        provider: 'email',
        success: false,
        skippedReason: 'Gmail SMTP provider not configured (SMTP_USER or SMTP_PASS missing in environment)'
      };
    }

    const isVisitorEmailValid = isValidEmail(rawVisitorEmail);

    // Visitor acknowledgements go to an address typed into a public form, so they are
    // opt-in (enable_visitor_confirmation), limited to one per address per day, and use
    // fixed wording that never echoes visitor-supplied text (prevents spam relaying).
    let sendVisitorConfirmation = false;
    if (settings.enable_visitor_confirmation === true && isVisitorEmailValid) {
      const throttle = await checkRateLimit(`visitor-confirm:${hashKey(rawVisitorEmail)}`, 1, 24 * 60 * 60 * 1000);
      sendVisitorConfirmation = throttle.allowed;
      if (!throttle.allowed) console.log(`[Email] Visitor confirmation skipped for ${maskEmail(rawVisitorEmail)}: already sent in the last 24h`);
    }

    // Build Owner Notification Content
    const ownerSubject = payload.type === 'lead'
      ? `🚀 [New Project Intake] ${payload.senderName} (${payload.projectType || 'Custom Project'})`
      : `📩 [New Portfolio Message] ${payload.senderName}: ${payload.title}`;

    const dynamicHtml = (payload.dynamicFields && payload.dynamicFields.length > 0)
      ? `
        <div style="margin: 16px 0; padding: 12px 16px; background: #f4f4f5; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #18181b;">Additional Custom Fields:</h4>
          ${payload.dynamicFields.map(f => `<p style="margin: 4px 0;"><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.value)}</p>`).join('')}
        </div>
      `
      : '';

    const ownerHtmlBody = payload.type === 'lead'
      ? `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; background: #ffffff;">
          <h2 style="color: #09090b; margin-top: 0;">🚀 New Project Intake Received</h2>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Client Name:</strong> ${escapeHtml(payload.senderName)}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(rawVisitorEmail)}">${escapeHtml(rawVisitorEmail)}</a></p>
            ${payload.company ? `<p style="margin: 4px 0;"><strong>Company:</strong> ${escapeHtml(payload.company)}</p>` : ''}
            <p style="margin: 4px 0;"><strong>Project Type:</strong> ${escapeHtml(payload.projectType || 'N/A')}</p>
            <p style="margin: 4px 0;"><strong>Budget:</strong> ${escapeHtml(payload.budgetRange || 'Flexible')}</p>
            <p style="margin: 4px 0;"><strong>Deadline:</strong> ${escapeHtml(payload.deadline || 'Flexible')}</p>
          </div>
          ${payload.aiSummary ? `
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 8px;">
              <p style="margin: 0; color: #92400e; font-weight: bold;">AI Qualification (Score: ${payload.aiScore ?? 50}/100)</p>
              <p style="margin: 4px 0 0 0; color: #78350f;">${escapeHtml(payload.aiSummary)}</p>
            </div>
          ` : ''}
          ${dynamicHtml}
          <h3 style="color: #27272a; margin-bottom: 8px;">Project Scope & Description:</h3>
          <p style="background: #fafafa; border: 1px solid #f4f4f5; padding: 16px; border-radius: 8px; color: #3f3f46; white-space: pre-wrap; margin-top: 0;">${escapeHtml(payload.body)}</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #71717a;">
            Submitted on ${escapeHtml(payload.createdAt)} | Lead ID: <code>${escapeHtml(payload.id)}</code>
          </div>
        </div>
      `
      : `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; background: #ffffff;">
          <h2 style="color: #09090b; margin-top: 0;">📩 New Contact Message Received</h2>
          <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 4px 0;"><strong>Sender Name:</strong> ${escapeHtml(payload.senderName)}</p>
            <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${escapeHtml(rawVisitorEmail)}">${escapeHtml(rawVisitorEmail)}</a></p>
            <p style="margin: 4px 0;"><strong>Subject:</strong> ${escapeHtml(payload.title)}</p>
          </div>
          ${dynamicHtml}
          <h3 style="color: #27272a; margin-bottom: 8px;">Message Content:</h3>
          <p style="background: #fafafa; border: 1px solid #f4f4f5; padding: 16px; border-radius: 8px; color: #3f3f46; white-space: pre-wrap; margin-top: 0;">${escapeHtml(payload.body)}</p>
          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f4f4f5; font-size: 12px; color: #71717a;">
            Submitted on ${escapeHtml(payload.createdAt)} | Message ID: <code>${escapeHtml(payload.id)}</code>
          </div>
        </div>
      `;

    // Fixed acknowledgement wording. Nothing typed by the visitor (name, subject, message)
    // is echoed back, so the form cannot be used to send arbitrary content to third parties.
    const isArabic = isArabicText(payload.body) || isArabicText(payload.title) || isArabicText(payload.senderName);
    const reference = escapeHtml(payload.id);
    let visitorSubject: string;
    let visitorText: string;
    let visitorHtmlBody: string;

    if (isArabic) {
      visitorSubject = payload.type === 'lead' ? 'تم استلام طلب مشروعك' : 'تم استلام رسالتك';
      visitorText = (payload.type === 'lead'
        ? 'مرحباً،\n\nتم استلام تفاصيل مشروعك بنجاح، وسنراجعها ونرد عليك في أقرب وقت ممكن.'
        : 'مرحباً،\n\nتم استلام رسالتك بنجاح، وسنرد عليك في أقرب وقت ممكن.') +
        '\n\nإذا لم تكن أنت من أرسل هذا الطلب، يمكنك تجاهل هذه الرسالة.\n\nمع أطيب التحيات،\nبراء أبو مسامح' +
        `\n\nرقم المرجع: ${payload.id}`;
      visitorHtmlBody = `
        <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; background: #ffffff; text-align: right;">
          <h2 style="color: #09090b; margin-top: 0;">${escapeHtml(visitorSubject)}</h2>
          <p style="color: #3f3f46; font-size: 15px; line-height: 1.8; white-space: pre-wrap;">${escapeHtml(visitorText)}</p>
          <p style="color: #71717a; font-size: 12px;">رقم المرجع: <code>${reference}</code></p>
        </div>
      `;
    } else {
      visitorSubject = payload.type === 'lead' ? 'We received your project inquiry' : 'We received your message';
      visitorText = (payload.type === 'lead'
        ? 'Hello,\n\nYour project inquiry was received. We will review it and get back to you as soon as possible.'
        : 'Hello,\n\nYour message was received. We will get back to you as soon as possible.') +
        '\n\nIf you did not submit this request, you can ignore this email.\n\nBest regards,\nBaraa Abu Musameh' +
        `\n\nReference: ${payload.id}`;
      visitorHtmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; background: #ffffff;">
          <h2 style="color: #09090b; margin-top: 0;">${escapeHtml(visitorSubject)}</h2>
          <p style="color: #3f3f46; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(visitorText)}</p>
          <p style="color: #71717a; font-size: 12px;">Reference: <code>${reference}</code></p>
        </div>
      `;
    }

    const sanitizeError = (raw: string) => raw
      .replace(/pass(?:word)?=[\w-]+/gi, 'pass=[REDACTED]')
      .replace(/[\w.-]+@[\w.-]+/g, '[REDACTED_EMAIL]');

    // Independent transporters avoid socket collisions during dual dispatch.
    const ownerPromise = this.createTransporter().sendMail({
      from: senderFrom,
      to: recipientEmail,
      replyTo: isVisitorEmailValid ? rawVisitorEmail : undefined,
      subject: ownerSubject,
      html: ownerHtmlBody,
      text: `${ownerSubject}\n\nSender: ${payload.senderName} (${rawVisitorEmail})\n\n${payload.body}`
    });

    const visitorPromise = sendVisitorConfirmation
      ? this.createTransporter().sendMail({
          from: senderFrom,
          to: rawVisitorEmail,
          subject: visitorSubject,
          html: visitorHtmlBody,
          text: visitorText
        })
      : Promise.resolve(null);

    const [ownerResult, visitorResult] = await Promise.allSettled([ownerPromise, visitorPromise]);

    let ownerMessageId = `smtp-owner-${Date.now()}`;
    let isOwnerSuccess = false;

    if (ownerResult.status === 'fulfilled') {
      ownerMessageId = ownerResult.value?.messageId || ownerMessageId;
      isOwnerSuccess = true;
      console.log(`[Email] Owner notification delivered (ID: ${ownerMessageId})`);
    } else {
      console.error(`[Email] Owner notification failed: ${sanitizeError(ownerResult.reason?.message || 'unknown error')}`);
    }

    if (sendVisitorConfirmation) {
      if (visitorResult.status === 'fulfilled' && visitorResult.value) {
        console.log(`[Email] Visitor confirmation delivered to ${maskEmail(rawVisitorEmail)}`);
      } else if (visitorResult.status === 'rejected') {
        console.error(`[Email] Visitor confirmation failed: ${sanitizeError(visitorResult.reason?.message || 'unknown error')}`);
      }
    }

    return {
      provider: 'email',
      success: isOwnerSuccess,
      messageId: ownerMessageId
    };
  }
}





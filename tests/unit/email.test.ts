import './setup';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';

// Fake SMTP configuration (never real credentials). The transport is replaced by a recorder,
// and scripts/test-guard.cjs would block any connection that slipped through anyway.
process.env.EMAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = 'smtp.invalid';
process.env.SMTP_USER = 'owner@example.invalid';
process.env.SMTP_PASS = 'not-a-real-password';
process.env.NOTIFICATIONS_ENABLED = 'true';

const sent: any[] = [];
(nodemailer as any).createTransport = () => ({
  sendMail: async (mail: any) => {
    sent.push(mail);
    return { messageId: `fake-${sent.length}` };
  }
});

const { EmailNotificationProvider } = await import('../../server/notifications/email');
const { db } = await import('../../server/db');

const provider = new EmailNotificationProvider();
const payload = (email: string) => ({
  type: 'contact' as const,
  id: `msg-test-${Math.random().toString(36).slice(2)}`,
  senderName: 'Buy cheap pills at spam.example',
  senderEmail: email,
  title: 'CLICK http://spam.example NOW',
  body: 'spam body http://spam.example',
  createdAt: new Date().toISOString()
});

beforeEach(() => {
  sent.length = 0;
});

test('visitor confirmation is off by default: only the owner is emailed', async () => {
  db.updateSettings({ enable_visitor_confirmation: false, enable_email_notifications: true } as any);
  const r = await provider.send(payload('victim1@example.com'));
  assert.equal(r.success, true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'owner@example.invalid');
});

test('when enabled, the visitor email never echoes visitor-supplied text', async () => {
  db.updateSettings({ enable_visitor_confirmation: true } as any);
  await provider.send(payload('victim2@example.com'));
  const visitorMail = sent.find((m) => m.to === 'victim2@example.com');
  assert.ok(visitorMail, 'visitor confirmation sent');
  const all = `${visitorMail.subject} ${visitorMail.text} ${visitorMail.html}`;
  assert.doesNotMatch(all, /spam\.example|cheap pills|CLICK/i);
});

test('visitor confirmation is throttled to one per address per day', async () => {
  db.updateSettings({ enable_visitor_confirmation: true } as any);
  await provider.send(payload('victim3@example.com'));
  await provider.send(payload('victim3@example.com'));
  assert.equal(sent.filter((m) => m.to === 'victim3@example.com').length, 1);
  assert.equal(sent.filter((m) => m.to === 'owner@example.invalid').length, 2, 'owner still notified each time');
});

test('admin switch disables email entirely', async () => {
  db.updateSettings({ enable_email_notifications: false } as any);
  const r = await provider.send(payload('victim4@example.com'));
  assert.equal(r.success, false);
  assert.equal(sent.length, 0);
  db.updateSettings({ enable_email_notifications: true } as any);
});

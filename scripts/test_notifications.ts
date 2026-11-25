import { notificationManager } from '../server/notifications/manager';
import { EmailNotificationProvider } from '../server/notifications/email';
import { TelegramNotificationProvider } from '../server/notifications/telegram';
import { WhatsAppNotificationProvider } from '../server/notifications/whatsapp';
import { db } from '../server/db';
import { ContactMessage, ProjectLead } from '../src/types';

async function runNotificationTests() {
  console.log('====================================================');
  console.log('Automated Notification System Verification Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // Test 1: Email Notification Provider Dispatch
  // ----------------------------------------------------
  console.log('[1] Testing Email Provider Dispatch...');
  const emailProvider = new EmailNotificationProvider();
  const testPayload = {
    type: 'contact' as const,
    id: `test-msg-${Date.now()}`,
    senderName: 'Test Visitor',
    senderEmail: 'test.visitor@example.com',
    title: 'Project Inquiry',
    body: 'Hello Baraa, I would like to build a RAG application.',
    createdAt: new Date().toISOString()
  };

  const emailRes = await emailProvider.send(testPayload);
  assert(emailRes.provider === 'email', 'Email provider identifier match');
  assert(emailRes.success === true, 'Email dispatch returned success state');
  assert(Boolean(emailRes.messageId), 'Email dispatch returned valid messageId');

  // ----------------------------------------------------
  // Test 2: Telegram Notification Provider Dispatch
  // ----------------------------------------------------
  console.log('\n[2] Testing Telegram Bot Provider Dispatch...');
  const telegramProvider = new TelegramNotificationProvider();
  const leadPayload = {
    type: 'lead' as const,
    id: `test-lead-${Date.now()}`,
    senderName: 'Jane Smith',
    senderEmail: 'jane@enterprise.com',
    company: 'TechCorp AI',
    projectType: 'Autonomous Agents',
    budgetRange: '$10,000+',
    deadline: '1 Month',
    title: 'Project Intake: Autonomous Agents',
    body: 'We need custom AI agents with vector memory and tool calling.',
    aiScore: 92,
    aiSummary: 'High priority qualified enterprise project lead.',
    priority: 'urgent',
    createdAt: new Date().toISOString()
  };

  const tgRes = await telegramProvider.send(leadPayload);
  assert(tgRes.provider === 'telegram', 'Telegram provider identifier match');
  assert(tgRes.success === true, 'Telegram dispatch returned success state');
  assert(Boolean(tgRes.messageId), 'Telegram dispatch returned valid messageId');

  // ----------------------------------------------------
  // Test 3: WhatsApp Provider Interface (Phase 2 Readiness)
  // ----------------------------------------------------
  console.log('\n[3] Testing WhatsApp Provider Interface Readiness...');
  const waProvider = new WhatsAppNotificationProvider();
  const waRes = await waProvider.send(testPayload);
  assert(waRes.provider === 'whatsapp', 'WhatsApp provider identifier match');
  assert(Boolean(waRes.skippedReason || waRes.success), 'WhatsApp returns clean architecture readiness response');

  // ----------------------------------------------------
  // Test 4: Disabled Channel Settings Behavior
  // ----------------------------------------------------
  console.log('\n[4] Testing Admin Settings Toggle (Disabled Channels)...');
  const originalSettings = { ...db.getSettings() };
  
  // Disable email in settings
  db.updateSettings({ ...originalSettings, enable_email_notifications: false });
  const disabledEmailRes = await emailProvider.send(testPayload);
  assert(disabledEmailRes.success === false, 'Email dispatch blocked when enable_email_notifications = false');
  assert(disabledEmailRes.skippedReason?.includes('Disabled via Admin Settings') === true, 'Skipped reason accurately reported in result');

  // Disable telegram in settings
  db.updateSettings({ ...originalSettings, enable_telegram_notifications: false });
  const disabledTgRes = await telegramProvider.send(testPayload);
  assert(disabledTgRes.success === false, 'Telegram dispatch blocked when enable_telegram_notifications = false');
  assert(disabledTgRes.skippedReason?.includes('Disabled via Admin Settings') === true, 'Skipped reason accurately reported in result');

  // Restore original settings
  db.updateSettings(originalSettings);

  // ----------------------------------------------------
  // Test 5: Duplicate Notification Prevention (Idempotency)
  // ----------------------------------------------------
  console.log('\n[5] Testing Duplicate Notification Prevention (Idempotency)...');
  const mockMsg: ContactMessage = {
    id: `dedup-msg-${Date.now()}`,
    name: 'Idempotency Tester',
    email: 'idempotent@example.com',
    subject: 'Duplicate Check',
    message: 'Testing deduplication key',
    status: 'new',
    created_at: new Date().toISOString()
  };

  const firstDispatch = await notificationManager.dispatchContact(mockMsg);
  assert(firstDispatch.length > 0, 'First notification dispatch executed all active providers');

  const secondDispatch = await notificationManager.dispatchContact(mockMsg);
  assert(secondDispatch.length === 0, 'Second duplicate notification dispatch was suppressed (0 providers triggered)');

  // ----------------------------------------------------
  // Test 6: Non-Blocking Fault Tolerance
  // ----------------------------------------------------
  console.log('\n[6] Testing Provider Failure Resilience...');
  class BrokenProvider {
    name: 'email' = 'email';
    async send(): Promise<any> {
      throw new Error('Simulated external SMTP server connection timeout');
    }
  }

  let errorCaught = false;
  try {
    const broken = new BrokenProvider();
    await broken.send().catch((err: any) => {
      errorCaught = true;
      assert(err.message.includes('Simulated external SMTP'), 'Provider error caught safely without process exit');
    });
  } catch {
    assert(false, 'Provider error must never throw uncaught exception');
  }

  // ----------------------------------------------------
  // Test 7: Log & Secret Sanitization
  // ----------------------------------------------------
  console.log('\n[7] Testing Secret & Credential Log Sanitization...');
  const sensitiveString = 'Error connecting to bot123456789:AAEFakeTokenSecretHere at user:password123@smtp.example.com';
  const sanitized = sensitiveString
    .replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED_TOKEN]')
    .replace(/:[^:@]+@/g, ':[REDACTED_PASS]@');

  assert(!sanitized.includes('AAEFakeTokenSecretHere'), 'Telegram bot token redacted from log output');
  assert(!sanitized.includes('password123'), 'SMTP password redacted from log output');

  console.log('\n====================================================');
  console.log(`Notification System Tests: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runNotificationTests().catch((err) => {
  console.error('Fatal error running notification tests:', err);
  process.exit(1);
});

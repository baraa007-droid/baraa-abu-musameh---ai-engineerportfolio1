import assert from 'assert';
import { EmailNotificationProvider } from '../server/notifications/email';
import { notificationManager } from '../server/notifications/manager';
import { db } from '../server/db';
import { config } from '../server/config';

async function runEmailTests() {
  console.log('====================================================');
  console.log('Starting Email Infrastructure & Delivery Audit Tests');
  console.log('====================================================\n');

  // Ensure email notifications enabled in settings for test
  const currentSettings = db.getSettings();
  db.updateSettings({ ...currentSettings, enable_email_notifications: true });

  // Test 1: Email Notification Provider Diagnostics
  console.log('[Test 1: Email Notification Provider Diagnostics]');
  const provider = new EmailNotificationProvider();
  assert(provider.name === 'email', 'Provider name must be email');
  console.log('  ✓ PASS: EmailNotificationProvider instantiated.');

  // Test 2: Contact Form Payload Dispatch (Owner + Visitor)
  console.log('\n[Test 2: Contact Message Notification Dispatch]');
  const contactResults = await notificationManager.dispatchContact({
    id: `test-msg-${Date.now()}`,
    name: 'Test Visitor John',
    email: 'visitor.john@example.com',
    subject: 'Website Development Inquiry',
    message: 'Hello, I would like to inquire about building a custom web application.',
    created_at: new Date().toISOString(),
    status: 'new'
  });

  const tgResult = contactResults.find(r => r.provider === 'telegram');
  const emailResult = contactResults.find(r => r.provider === 'email');

  assert(tgResult, 'Telegram notification result must be returned');
  assert(tgResult.success === true, 'Telegram notification must be working');
  console.log('  ✓ PASS: Telegram contact notification received (Success: true)');

  assert(emailResult, 'Email notification result must be returned');
  console.log('  ✓ PASS: Email provider evaluated (Success:', emailResult.success, '| SkippedReason:', emailResult.skippedReason || 'None', ')');

  // Test 3: Start Project / Lead Form Payload Dispatch (Owner + Visitor)
  console.log('\n[Test 3: Start Project Lead Notification Dispatch]');
  const leadResults = await notificationManager.dispatchLead({
    id: `test-lead-${Date.now()}`,
    name: 'Acme Corporation',
    email: 'contact@acme-corp.com',
    company: 'Acme Corp',
    project_type: 'Full-Stack AI Application',
    budget_range: '$5,000 - $10,000',
    deadline: '1 month',
    description: 'Building an enterprise portal with RAG chatbot integration and Postgres.',
    required_features: ['RAG chatbot', 'PostgreSQL'],
    communication_pref: 'email',
    ai_score: 92,
    ai_summary: 'High-intent enterprise lead with realistic budget and scope.',
    priority: 'high',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'new'
  });

  const leadTg = leadResults.find(r => r.provider === 'telegram');
  const leadEmail = leadResults.find(r => r.provider === 'email');

  assert(leadTg, 'Telegram lead notification result must be returned');
  assert(leadTg.success === true, 'Telegram lead notification must be working');
  console.log('  ✓ PASS: Telegram lead notification received (Success: true)');

  assert(leadEmail, 'Email lead notification result must be returned');
  console.log('  ✓ PASS: Email lead provider evaluated (Success:', leadEmail.success, '| SkippedReason:', leadEmail.skippedReason || 'None', ')');

  // Test 4: Invalid Email Handling Check
  console.log('\n[Test 4: Invalid Visitor Email Guard]');
  const invalidEmailResult = await provider.send({
    type: 'contact',
    id: `test-inv-${Date.now()}`,
    senderName: 'Bad Email User',
    senderEmail: 'not-an-email',
    title: 'Test',
    body: 'Test body',
    createdAt: new Date().toISOString()
  });
  console.log('  ✓ PASS: Invalid visitor email safely handled (No unhandled crashes).');

  // Test 5: Configured Gmail SMTP Provider End-to-End Delivery Simulation
  console.log('\n[Test 5: Configured Gmail SMTP Provider End-to-End Delivery Simulation]');
  const origUser = config.smtpUser;
  const origPass = config.smtpPass;
  (config as any).smtpUser = 'b.musameh2007@gmail.com';
  (config as any).smtpPass = 'mock_google_app_password_1234';

  const nodemailer = await import('nodemailer');
  const origCreateTransport = nodemailer.default.createTransport;
  const sentEmails: any[] = [];

  (nodemailer.default as any).createTransport = () => {
    return {
      sendMail: async (mailOpts: any) => {
        sentEmails.push(mailOpts);
        return { messageId: `gmail_smtp_msg_${sentEmails.length}` };
      }
    };
  };

  try {
    // English Contact Form Simulation
    const configuredResult = await provider.send({
      type: 'contact',
      id: `test-conf-${Date.now()}`,
      senderName: 'John Doe',
      senderEmail: 'john.doe@example.com',
      title: 'Project Consultation Request',
      body: 'I would like to discuss building an AI platform.',
      createdAt: new Date().toISOString()
    });

    assert(configuredResult.success === true, 'Configured email send must return success = true');
    assert(sentEmails.length === 2, 'Must send exactly 2 emails via Gmail SMTP: Owner Notification + Visitor Confirmation');
    assert(sentEmails[0].to === 'b.musameh2007@gmail.com', 'First email must be to owner inbox');
    assert(sentEmails[1].to === 'john.doe@example.com', 'Second email must be to visitor inbox');
    assert(sentEmails[1].html.includes('Thank you for contacting us'), 'Visitor email must contain English confirmation text');

    console.log('  ✓ PASS: Owner notification sent to:', sentEmails[0].to);
    console.log('  ✓ PASS: English Visitor confirmation sent to:', sentEmails[1].to);

    // Arabic Lead Form Simulation
    const arabicLeadResult = await provider.send({
      type: 'lead',
      id: `test-ar-lead-${Date.now()}`,
      senderName: 'أحمد محمود',
      senderEmail: 'ahmed@example.com',
      company: 'الشركة العربية',
      projectType: 'تطبيق ذكاء اصطناعي',
      budgetRange: '$5,000 - $10,000',
      title: 'Project Intake: تطبيق ذكاء اصطناعي',
      body: 'أريد تطوير نظام استرجاع معلومات RAG باللغة العربية.',
      createdAt: new Date().toISOString()
    });

    assert(arabicLeadResult.success === true, 'Arabic lead email send must return success = true');
    assert((sentEmails.length as number) === 4, 'Must send total 4 emails (2 per dispatch)');
    assert(sentEmails[3].to === 'ahmed@example.com', 'Arabic visitor confirmation must be sent to visitor inbox');
    assert(sentEmails[3].html.includes('شكرًا لك'), 'Arabic visitor confirmation must contain Arabic confirmation text');

    console.log('  ✓ PASS: Arabic Visitor confirmation sent to:', sentEmails[3].to);
    console.log('  ✓ PASS: Bilingual Arabic/English confirmation templates verified');
  } finally {
    (config as any).smtpUser = origUser;
    (config as any).smtpPass = origPass;
    (nodemailer.default as any).createTransport = origCreateTransport;
  }

  console.log('\n====================================================');
  console.log('EMAIL AUDIT & NOTIFICATION INTEGRATION TESTS COMPLETE');
  console.log('====================================================');
}

runEmailTests().catch((err) => {
  console.error('Email test run failed:', err);
  process.exit(1);
});

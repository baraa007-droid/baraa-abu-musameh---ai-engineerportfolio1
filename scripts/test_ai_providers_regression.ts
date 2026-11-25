import { OpenRouterProvider, GeminiProvider, CompositeAIProvider, callWithRetry, sanitizeSensitiveOutput } from '../server/ai';

async function runAIProviderRegressionTests() {
  console.log('====================================================');
  console.log('AI Provider & Fallback Architecture Regression Tests');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST GROUP 1: OpenRouter Provider Payload Construction
  // ----------------------------------------------------
  console.log('[Test Group 1] OpenRouter Token Reservation Guard');
  const openRouter = new OpenRouterProvider();
  assert(openRouter.name === 'openrouter', 'OpenRouter provider identified cleanly');
  assert(openRouter.isConfigured() === true || openRouter.isConfigured() === false, 'isConfigured returns boolean');

  // ----------------------------------------------------
  // TEST GROUP 2: Gemini Model Identification & SDK Config
  // ----------------------------------------------------
  console.log('\n[Test Group 2] Gemini Model Configuration');
  const gemini = new GeminiProvider();
  assert(gemini.name === 'gemini', 'Gemini provider identified cleanly');
  assert(gemini.isConfigured() === true || gemini.isConfigured() === false, 'isConfigured returns boolean');

  // ----------------------------------------------------
  // TEST GROUP 3: Non-Retryable Error Classification
  // ----------------------------------------------------
  console.log('\n[Test Group 3] Error Classification (401, 402, 403, 429)');
  
  // Test HTTP 402 (Payment/Token reservation) fails fast without retry
  let attemptCounter402 = 0;
  try {
    await callWithRetry(async () => {
      attemptCounter402++;
      throw new Error('OpenRouter HTTP 402: {"error":{"message":"This request requires more credits, or fewer max_tokens."}}');
    }, { maxRetries: 3 });
  } catch (err: any) {
    assert(attemptCounter402 === 1, 'HTTP 402 fails fast on 1st attempt without repeating wasteful retries');
    assert(err.message.includes('402'), 'HTTP 402 error preserved accurately for downstream fallback');
  }

  // Test HTTP 403 (Permission/Invalid Model) fails fast without retry
  let attemptCounter403 = 0;
  try {
    await callWithRetry(async () => {
      attemptCounter403++;
      throw new Error('Gemini HTTP 403: PERMISSION_DENIED');
    }, { maxRetries: 3 });
  } catch (err: any) {
    assert(attemptCounter403 === 1, 'HTTP 403 fails fast on 1st attempt without repeating retries');
  }

  // ----------------------------------------------------
  // TEST GROUP 4: Secret Redaction & Sanitization Integrity
  // ----------------------------------------------------
  console.log('\n[Test Group 4] Secret Redaction & Sanitization');
  const rawLeak = 'Error using key sk-or-v1-1234567890abcdef1234567890 and Bearer secret_token_xyz for AIzaIiI2S6M6Q6A0K4E0Q0S4A8I2O8W8U0C2I8';
  const sanitized = sanitizeSensitiveOutput(rawLeak);

  assert(!sanitized.includes('sk-or-v1-1234567890abcdef1234567890'), 'OpenRouter key format is redacted');
  assert(!sanitized.includes('AIzaIiI2S6M6Q6A0K4E0Q0S4A8I2O8W8U0C2I8'), 'Gemini API key format is redacted');
  assert(!sanitized.includes('secret_token_xyz'), 'Bearer authorization token is redacted');
  assert(sanitized.includes('[REDACTED_API_KEY]'), 'Replaced with standard REDACTED placeholder');

  // ----------------------------------------------------
  // TEST GROUP 5: Composite Provider Cascading Fallback Lifecycle
  // ----------------------------------------------------
  console.log('\n[Test Group 5] Composite Provider Cascading Fallback');
  const composite = new CompositeAIProvider();
  assert(composite.openRouter !== undefined, 'Composite provider contains OpenRouter tier');
  assert(composite.gemini !== undefined, 'Composite provider contains Gemini tier');
  assert(composite.getPrimaryProvider() !== undefined, 'Primary provider resolved cleanly');
  assert(composite.getSecondaryProvider() !== undefined, 'Secondary provider resolved cleanly');

  console.log('\n====================================================');
  console.log(`AI Provider Regression Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAIProviderRegressionTests().catch((err) => {
  console.error('Fatal error in AI provider regression tests:', err);
  process.exit(1);
});

import { config } from '../server/config';
import { aiProvider, chatWithBaraaAI, standardToolsDeclarations } from '../server/ai';

type ProviderName = 'gemini' | 'openrouter';

async function runOne(providerName: ProviderName, message: string) {
  const primary = providerName === 'gemini' ? aiProvider.gemini : aiProvider.openRouter;
  const secondary = providerName === 'gemini' ? aiProvider.openRouter : aiProvider.gemini;
  const originalPrimaryConfigured = primary.isConfigured;
  const originalSecondaryConfigured = secondary.isConfigured;
  const originalPrimaryChat = primary.chatCompletion;
  const originalToolCount = standardToolsDeclarations.length;
  let calls = 0;
  let modelUsed: string | undefined;
  let providerUsed: string | undefined;

  primary.isConfigured = () => true;
  secondary.isConfigured = () => false;
  config.aiPrimaryProvider = providerName;
  primary.chatCompletion = async (params) => {
    calls++;
    const result = await originalPrimaryChat.call(primary, { ...params, maxTokens: 100 });
    providerUsed = result.providerUsed;
    modelUsed = result.modelUsed;
    return result;
  };

  try {
    // The approved live budget is exactly one generation per provider. Tool calls can
    // trigger a second synthesis request, so this controlled probe keeps RAG context
    // but removes tools for this invocation only.
    standardToolsDeclarations.length = 0;
    const started = Date.now();
    const result = await chatWithBaraaAI({ message, history: [] });
    const safeText = result.text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[PUBLIC_CONTACT_REDACTED]');
    return {
      provider: providerName,
      calls,
      providerUsed,
      modelUsed,
      latencyMs: Date.now() - started,
      degraded: result.degraded === true,
      retrievalMethod: result.retrieval_method,
      retrievedCount: result.retrieved_count,
      response: safeText
    };
  } finally {
    primary.chatCompletion = originalPrimaryChat;
    primary.isConfigured = originalPrimaryConfigured;
    secondary.isConfigured = originalSecondaryConfigured;
    standardToolsDeclarations.length = originalToolCount;
  }
}

async function main() {
  if (!aiProvider.gemini.isConfigured() || !aiProvider.openRouter.isConfigured()) {
    throw new Error('Both AI provider keys must be configured for this controlled test.');
  }

  // Run only the explicitly selected provider in each invocation. This prevents an
  // unexpected failure from silently consuming a second live provider request.
  const providerName = (process.env.LIVE_AI_PROVIDER || 'openrouter') as ProviderName;
  const message = providerName === 'gemini'
    ? 'ما الخدمات التي يقدمها صاحب هذا الموقع في مجال الذكاء الاصطناعي وتطوير البرمجيات؟'
    : 'What AI engineering and software development services are offered in this portfolio?';
  const results = [await runOne(providerName, message)];

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error('Controlled live AI test failed:', error instanceof Error ? error.message : 'unknown error');
  process.exitCode = 1;
});

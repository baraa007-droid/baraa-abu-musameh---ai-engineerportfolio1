import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const candidatePath = path.join(root, '.data', 'preview-candidate', 'db.json');
const sourcePath = path.join(root, '.data', 'db.json');
const backupDir = path.join(root, '.data', 'backups');
const manifestPath = path.join(root, '.data', 'preview-candidate', 'REAL_PROJECTS_REVIEW_MANIFEST.json');
const legacyManifestPath = path.join(root, '.data', 'preview-candidate', 'REVIEW_MANIFEST.json');

const sha256 = (filePath: string) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

if (!fs.existsSync(candidatePath) || !fs.existsSync(sourcePath)) {
  throw new Error('Expected source and preview candidate data files were not found.');
}

const sourceHashBefore = sha256(sourcePath);
const candidate = JSON.parse(fs.readFileSync(candidatePath, 'utf8')) as Record<string, unknown>;
const existingProjects = Array.isArray(candidate.projects) ? candidate.projects : [];

const forbiddenIds = new Set(['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5']);
const forbiddenNames = /(neurodoc|omnistore|visionpulse|cloudflow|saasmetrics)/i;
if (existingProjects.some((project) => {
  const value = project as Record<string, unknown>;
  return forbiddenIds.has(String(value.id)) || forbiddenNames.test(String(value.title));
})) {
  // A local recovery copy is created before replacing candidate-only content.
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `preview-candidate-before-real-projects-${stamp}.json`);
  fs.copyFileSync(candidatePath, backupPath, fs.constants.COPYFILE_EXCL);
}

const verifiedProject = {
  id: 'proj-real-ai-portfolio',
  slug: 'ai-engineer-portfolio-platform',
  title: 'AI Engineer Portfolio Platform',
  short_description: 'Bilingual React/Vite portfolio and admin CMS with an AI assistant, RAG knowledge management, and secure contact workflows.',
  full_description: 'A full-stack portfolio platform implemented in this repository. It combines a bilingual public site with an Express and TypeScript API, an authenticated admin CMS, portfolio and service content management, contact and project-intake workflows, and an AI assistant that uses stored portfolio content with a clearly labelled data-driven fallback when a provider is unavailable.',
  problem: 'Present engineering work, services, and public contact workflows in one maintainable bilingual web application while keeping administrative operations protected.',
  solution: 'Implemented a React 19 and Vite frontend, an Express 4 and TypeScript backend, isolated admin workflows, validated public forms, configurable PostgreSQL and Redis integrations, and a guarded AI/RAG layer.',
  results: [
    'Repository includes strict TypeScript checks, unit and integration/security tests, and Playwright end-to-end coverage.',
    'Administrative writes use authenticated sessions and CSRF protection, while public forms apply validation and rate limits.',
    'AI answers can be grounded in stored portfolio data and are marked as degraded when the provider is unavailable.',
  ],
  architecture: 'React 19 + Vite SPA • Express 4 / TypeScript API • atomic JSON primary store with optional PostgreSQL mirror • optional Redis sessions and rate limits • provider-backed AI with RAG and grounded fallback',
  category: 'AI Solutions',
  technologies: ['React', 'TypeScript', 'Vite', 'Express', 'Tailwind CSS', 'PostgreSQL', 'Redis', 'Playwright', 'Gemini API', 'OpenRouter'],
  features: [
    'Bilingual public portfolio and service presentation',
    'Authenticated admin CMS for portfolio content and settings',
    'Cookie-based sessions with CSRF protection and authorization checks',
    'Contact and project-intake forms with validation and rate limiting',
    'AI assistant with portfolio retrieval, conversation handling, and labelled fallback behavior',
    'Knowledge-base administration with safe indexing controls',
  ],
  cover_image: '',
  github_url: '',
  live_url: '',
  featured: true,
  status: 'in-progress',
  tags: ['AI Engineering', 'Full-Stack', 'RAG', 'Admin CMS', 'TypeScript'],
  seo_title: 'AI Engineer Portfolio Platform',
  seo_description: 'A bilingual full-stack portfolio platform with an AI assistant, RAG knowledge management, and a secure admin CMS.',
};

candidate.projects = [verifiedProject];
if (Array.isArray(candidate.testimonials)) {
  candidate.testimonials = candidate.testimonials.filter((testimonial) => {
    const value = testimonial as Record<string, unknown>;
    return !forbiddenNames.test(String(value.project_name ?? ''));
  });
}
fs.writeFileSync(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');

const reviewManifest = {
  generated_at: new Date().toISOString(),
  source_database_unchanged: sha256(sourcePath) === sourceHashBefore,
  source_sha256: sourceHashBefore,
  candidate_project_count: 1,
  added_projects: [{ id: verifiedProject.id, slug: verifiedProject.slug, status: 'VERIFIED IMPLEMENTED', evidence: ['README.md', 'PROJECT_COMPLETION_STATUS.md', 'FINAL_VERIFIED_PROJECT_STATUS.md', 'src/', 'server/', 'tests/'] }],
  not_added_due_to_insufficient_evidence: [
    'IUG Moodle Telegram Notifier',
    'Al-Mohandex Academy',
    'University Library App — Flutter',
    'Al-Mohandex Company Website / CMS',
    'Micro Maestro',
  ],
  excluded_fictional_ids: ['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5'],
  knowledge_reindexed: false,
  embeddings_generated: false,
  candidate_activated: false,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(reviewManifest, null, 2)}\n`, 'utf8');

if (fs.existsSync(legacyManifestPath)) {
  const legacy = JSON.parse(fs.readFileSync(legacyManifestPath, 'utf8')) as Record<string, unknown>;
  legacy.retainedProjectIds = [verifiedProject.id];
  legacy.excludedProjectCount = 27;
  legacy.candidateProjectCount = 1;
  legacy.candidateKnowledgeChunks = 0;
  legacy.note = 'Candidate is inactive. Fictional project cards and related testimonials are excluded; knowledge and chunks require explicit review and later approved reindexing.';
  fs.writeFileSync(legacyManifestPath, `${JSON.stringify(legacy, null, 2)}\n`, 'utf8');
}

if (sha256(sourcePath) !== sourceHashBefore) {
  throw new Error('Source data changed unexpectedly.');
}

console.log(JSON.stringify({
  source_unchanged: true,
  candidate_projects: Array.isArray(candidate.projects) ? candidate.projects.length : 0,
  source_sha256: sourceHashBefore,
  manifest: manifestPath,
}, null, 2));

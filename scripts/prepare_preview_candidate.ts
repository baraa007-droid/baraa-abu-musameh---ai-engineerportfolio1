import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const source = path.resolve(process.cwd(), '.data', 'db.json');
const outputDir = path.resolve(process.cwd(), '.data', 'preview-candidate');
const backupDir = path.resolve(process.cwd(), '.data', 'backups');

const keepProjectIds = new Set(['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5']);
const keepServiceIds = new Set(['srv-1', 'srv-2', 'srv-3', 'srv-4', 'srv-5', 'srv-6']);

function sha256(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function main() {
  if (!fs.existsSync(source)) throw new Error(`Source JSON not found: ${source}`);
  const originalBytes = fs.readFileSync(source);
  const data = JSON.parse(originalBytes.toString('utf8')) as Record<string, any>;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Source must be a JSON object.');
  if (!Array.isArray(data.projects) || !Array.isArray(data.services) || !Array.isArray(data.knowledge)) {
    throw new Error('Source is missing required portfolio sections.');
  }
  if (data.projects.length !== 27 || data.services.length !== 33 || data.knowledge.length !== 3) {
    throw new Error('Source counts changed; refusing to classify records automatically.');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  const backup = path.join(backupDir, `db-${stamp}.json`);
  fs.writeFileSync(backup, originalBytes, { encoding: 'utf8', flag: 'wx' });

  const candidate = structuredClone(data);
  candidate.projects = data.projects.filter((row: any) => keepProjectIds.has(row.id));
  candidate.services = data.services.filter((row: any) => keepServiceIds.has(row.id));
  // Knowledge documents and chunks remain in review until approved and reindexed.
  candidate.knowledge = [];
  candidate.chunks = [];
  // Do not carry private historical submissions into a future Preview candidate.
  for (const section of ['messages', 'leads', 'conversations', 'ai_messages', 'events', 'insights']) {
    if (Array.isArray(candidate[section])) candidate[section] = [];
  }

  const candidateFile = path.join(outputDir, 'db.json');
  fs.writeFileSync(candidateFile, JSON.stringify(candidate, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceSha256: sha256(source),
    source: '.data/db.json',
    candidate: '.data/preview-candidate/db.json',
    retainedProjectIds: [...keepProjectIds],
    retainedServiceIds: [...keepServiceIds],
    excludedProjectCount: data.projects.length - candidate.projects.length,
    excludedServiceCount: data.services.length - candidate.services.length,
    reviewGroups: {
      enterpriseRagServices: data.services.filter((row: any) => row.title === 'Enterprise RAG Custom Package').map((row: any) => row.id),
      placeholderServices: data.services.filter((row: any) => String(row.title || '').trim().length < 2).map((row: any) => row.id),
      knowledgeDocuments: data.knowledge.map((row: any) => row.id)
    },
    candidateKnowledgeChunks: 0,
    note: 'Candidate is inactive. Knowledge and chunks require explicit review and later approved reindexing.'
  };
  fs.writeFileSync(path.join(outputDir, 'REVIEW_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' });

  const afterHash = sha256(source);
  if (afterHash !== manifest.sourceSha256) throw new Error('Source changed while preparing candidate.');
  console.log(JSON.stringify({ backup: path.relative(process.cwd(), backup), candidate: path.relative(process.cwd(), candidateFile), sourceSha256: manifest.sourceSha256, projects: candidate.projects.length, services: candidate.services.length, knowledge: candidate.knowledge.length, chunks: candidate.chunks.length }, null, 2));
}

main();

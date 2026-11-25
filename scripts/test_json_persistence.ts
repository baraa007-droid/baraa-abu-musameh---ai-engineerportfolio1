import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function testPersistence() {
  process.env.NODE_ENV = 'test';
  const projectDataDir = path.resolve(process.cwd(), '.data');
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-json-persistence-'));
  process.env.DATA_DIR = testDataDir;
  const { db } = await import('../server/db');
  const dbPath = path.join(testDataDir, 'db.json');
  if (path.resolve(testDataDir) === projectDataDir || path.resolve(testDataDir).startsWith(`${projectDataDir}${path.sep}`)) {
    throw new Error('Refusing to run JSON persistence checks inside the project .data directory.');
  }
  console.log('Testing Atomic JSON Persistence in an isolated temporary directory...');
  console.log(`Database File Path: ${dbPath}`);
  console.log(`File Exists? ${fs.existsSync(dbPath)}`);

  // Create test item
  const testId = `test-persist-${Date.now()}`;
  const item = db.createProject({
    slug: testId,
    title: 'Persistence Test Item',
    short_description: 'Testing JSON file sync',
    category: 'Testing',
    technologies: ['Node.js'],
    features: [],
    results: [],
    cover_image: '',
    featured: false,
    status: 'completed'
  });

  console.log(`Created Project ID: ${item.id}`);

  // Inspect db.json file contents directly from disk
  const rawData = fs.readFileSync(dbPath, 'utf-8');
  const fileContainsItem = rawData.includes(testId);
  console.log(`Project ID present in .data/db.json on disk? ${fileContainsItem}`);

  // Delete test item
  db.deleteProject(item.id);
  const rawDataPostDelete = fs.readFileSync(dbPath, 'utf-8');
  const fileContainsItemPostDelete = rawDataPostDelete.includes(testId);
  console.log(`Project ID present in .data/db.json after deletion? ${fileContainsItemPostDelete}`);

  if (fileContainsItem && !fileContainsItemPostDelete) {
    console.log('\nResult: ATOMIC JSON FILE PERSISTENCE VERIFIED.');
  } else {
    console.log('\nResult: ATOMIC JSON FILE PERSISTENCE FAILED.');
  }
  fs.rmSync(testDataDir, { recursive: true, force: true });
}

testPersistence().catch(console.error);

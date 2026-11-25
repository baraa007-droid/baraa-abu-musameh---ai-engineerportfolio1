import fs from 'fs';
import path from 'path';

function scanDirectory(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git' || file === '.data') continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      scanDirectory(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.json')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function runRealityAudit() {
  console.log('====================================================');
  console.log('Phase 11: Reality & Codebase Integrity Audit');
  console.log('====================================================\n');

  const rootDir = process.cwd();
  const allFiles = scanDirectory(rootDir);

  let todoCount = 0;
  let hardcodedSecretsCount = 0;
  let swallowedErrorsCount = 0;
  const auditLogs: string[] = [];

  const secretRegexes = [
    /AIzaSy[A-Za-z0-9_-]{33}/,
    /postgres:\/\/.*:.*@/,
    /rediss:\/\/.*:.*@/,
    /ADMIN_SESSION_SECRET\s*[:=]\s*['"][^'"]{8,}['"]/
  ];

  for (const file of allFiles) {
    // Skip test scripts and build files in audit check
    if (file.includes('scripts\\') || file.includes('scripts/')) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(rootDir, file);

    // 1. Check for hardcoded secrets
    for (const regex of secretRegexes) {
      if (regex.test(content)) {
        hardcodedSecretsCount++;
        auditLogs.push(`  [SECURITY RISK] ${relativePath}: Hardcoded secret pattern detected matching ${regex.source}`);
      }
    }

    // 2. Check for TODO / FIXME
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('TODO:') || line.includes('FIXME:')) {
        todoCount++;
        auditLogs.push(`  [TODO/FIXME] ${relativePath}:${index + 1} - ${line.trim()}`);
      }
    });

    // 3. Check for empty catch blocks (swallowed errors)
    lines.forEach((line, index) => {
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
        swallowedErrorsCount++;
        auditLogs.push(`  [SWALLOWED ERROR] ${relativePath}:${index + 1} - Empty catch block found`);
      }
    });
  }

  console.log(`- Files Audited: ${allFiles.length}`);
  console.log(`- Hardcoded Secrets Found in Production Files: ${hardcodedSecretsCount}`);
  console.log(`- TODO / FIXME Items Found: ${todoCount}`);
  console.log(`- Swallowed Error Blocks Found: ${swallowedErrorsCount}`);

  if (auditLogs.length > 0) {
    console.log('\nAudit Findings Detail:');
    auditLogs.forEach(log => console.log(log));
  } else {
    console.log('✓ Codebase clean: Zero hardcoded secrets, zero TODOs, zero swallowed error blocks in production code.');
  }

  console.log('\n====================================================');
  console.log('REALITY AUDIT COMPLETE');
  console.log('====================================================\n');
}

runRealityAudit().catch(console.error);

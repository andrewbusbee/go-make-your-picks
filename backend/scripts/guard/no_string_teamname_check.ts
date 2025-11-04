import { globSync } from 'glob';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../src');
const files = globSync('**/*.ts', { cwd: ROOT, nodir: true, ignore: ['migrations/**'] });

const forbiddenPatterns: RegExp[] = [
  /\bWHERE\b[^;\n]*\bteam_name\b/i,
  /team_name\s*=\s*\?/i,
];

let violations: Array<{ file: string; line: number; snippet: string }> = [];

for (const rel of files) {
  const file = path.join(ROOT, rel);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    forbiddenPatterns.forEach((re) => {
      if (re.test(line)) {
        violations.push({ file: file, line: idx + 1, snippet: line.trim() });
      }
    });
  });
}

if (violations.length > 0) {
  console.error('Forbidden SQL/name-based patterns detected (use IDs for correctness):');
  violations.forEach(v => {
    console.error(`- ${v.file}:${v.line} :: ${v.snippet}`);
  });
  process.exit(1);
}

console.log('OK: No forbidden string-based correctness patterns found.');



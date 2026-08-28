import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = fs.readdirSync(root, { withFileTypes: true })
  .flatMap((entry) => {
    if (entry.isFile() && entry.name.endsWith('.html')) return [entry.name];
    if (!entry.isDirectory()) return [];
    const indexPath = path.join(entry.name, 'index.html');
    return fs.existsSync(path.join(root, indexPath)) ? [indexPath] : [];
  });

const requiredText = '現在、お問い合わせの増加に伴い、清掃代行のみのご依頼は受け付けておりません。';
const requiredValue = '運営代行＋清掃代行について';
const forbiddenText = '可能です。「リゾート・クオリティ」のプロ清掃スタッフを派遣いたします。';

const failures = [];
for (const relativePath of htmlFiles) {
  const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (!html.includes('id="contact-form"')) continue;
  if (!html.includes(requiredText)) failures.push(`${relativePath}: notice missing`);
  if (!html.includes(requiredValue)) failures.push(`${relativePath}: combined inquiry option missing`);
  if (html.includes(forbiddenText)) failures.push(`${relativePath}: outdated cleaning-only FAQ remains`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Contact policy verified in ${htmlFiles.length} HTML files.`);

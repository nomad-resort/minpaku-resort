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

const requiredText = '対応可否の確認やお見積もり依頼など、ご相談内容を確認のうえ、詳しい内容をお伺いするヒアリングフォームをご案内いたします。';
const requiredPlaceholder = '対応可否の確認やお見積もり依頼など、ご相談の概要をご記入ください。';
const requiredValues = ['対応可否の確認', 'お見積もり依頼'];
const forbiddenText = '可能です。「リゾート・クオリティ」のプロ清掃スタッフを派遣いたします。';

const failures = [];
for (const relativePath of htmlFiles) {
  const html = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (!html.includes('id="contact-form"')) continue;
  if (!html.includes(requiredText)) failures.push(`${relativePath}: notice missing`);
  if (!html.includes(`placeholder="${requiredPlaceholder}"`)) failures.push(`${relativePath}: concise placeholder missing`);
  for (const value of requiredValues) {
    if (!html.includes(`value="${value}"`)) failures.push(`${relativePath}: inquiry option missing (${value})`);
  }
  if (!html.includes('type="radio"')) failures.push(`${relativePath}: inquiry options are not radio buttons`);
  if (html.includes(forbiddenText)) failures.push(`${relativePath}: outdated cleaning-only FAQ remains`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Contact policy verified in ${htmlFiles.length} HTML files.`);

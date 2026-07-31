import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const measurementId = 'G-WNH06RG1T8';
const failures = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'estimate') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

const htmlFiles = walk(root);
for (const file of htmlFiles) {
  const rel = path.relative(root, file);
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`)) {
    failures.push(`${rel}: missing GA4 gtag script`);
  }
  if (!html.includes(`gtag('config', '${measurementId}')`)) {
    failures.push(`${rel}: missing GA4 config`);
  }
  if (!html.includes('/js/analytics.js')) {
    failures.push(`${rel}: missing analytics event script`);
  }
}

const analyticsPath = path.join(root, 'js/analytics.js');
if (!fs.existsSync(analyticsPath)) {
  failures.push('js/analytics.js: missing file');
} else {
  const analytics = fs.readFileSync(analyticsPath, 'utf8');
  for (const expected of ['generate_lead', 'click_line', 'click_phone', 'click_estimate']) {
    if (!analytics.includes(expected)) failures.push(`js/analytics.js: missing ${expected}`);
  }
}

const privacy = fs.readFileSync(path.join(root, 'privacy-policy.html'), 'utf8');
if (!/Google\s+Analytics\s+4/.test(privacy) || !privacy.includes('G-WNH06RG1T8')) {
  failures.push('privacy-policy.html: missing GA4 disclosure');
}

if (failures.length) {
  console.error(`Analytics check failed with ${failures.length} issue(s):`);
  for (const failure of failures.slice(0, 40)) console.error(`- ${failure}`);
  if (failures.length > 40) console.error(`...and ${failures.length - 40} more`);
  process.exit(1);
}

console.log('Analytics check passed.');

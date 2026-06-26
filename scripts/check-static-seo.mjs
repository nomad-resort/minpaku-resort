import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cities = JSON.parse(fs.readFileSync(path.join(root, 'data/cities.json'), 'utf8'));
const origin = 'https://www.minpaku-resort.com';
const redirectsPath = path.join(root, '_redirects');
const redirects = fs.existsSync(redirectsPath) ? fs.readFileSync(redirectsPath, 'utf8') : '';

const failures = [];

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function findTag(html, pattern) {
  const match = html.match(pattern);
  return match ? match[0] : '';
}

for (const [cityKey, city] of Object.entries(cities)) {
  if (cityKey === 'japan') continue;

  const file = path.join(root, cityKey, 'index.html');
  if (!fs.existsSync(file)) {
    failures.push(`${cityKey}: missing ${cityKey}/index.html`);
    continue;
  }

  const html = fs.readFileSync(file, 'utf8');
  const expectedUrl = `${origin}/${cityKey}/`;
  const checks = [
    {
      label: 'canonical',
      actual: attr(findTag(html, /<link[^>]+rel=["']canonical["'][^>]*>/i), 'href'),
      expected: expectedUrl,
    },
    {
      label: 'og:url',
      actual: attr(findTag(html, /<meta[^>]+property=["']og:url["'][^>]*>/i), 'content'),
      expected: expectedUrl,
    },
    {
      label: 'description',
      actual: attr(findTag(html, /<meta[^>]+name=["']description["'][^>]*>/i), 'content'),
      expected: city.seoDescription,
    },
    {
      label: 'og:title',
      actual: attr(findTag(html, /<meta[^>]+property=["']og:title["'][^>]*>/i), 'content'),
      expected: city.seoTitle,
    },
    {
      label: 'og:description',
      actual: attr(findTag(html, /<meta[^>]+property=["']og:description["'][^>]*>/i), 'content'),
      expected: city.seoDescription,
    },
  ];

  for (const check of checks) {
    if (check.actual !== check.expected) {
      failures.push(`${cityKey}: ${check.label} expected "${check.expected}" but found "${check.actual}"`);
    }
  }

  const expectedRedirect = `https://${cityKey}.minpaku-resort.com/* https://www.minpaku-resort.com/${cityKey}/:splat 301!`;
  if (!redirects.includes(expectedRedirect)) {
    failures.push(`${cityKey}: missing subdomain redirect "${expectedRedirect}"`);
  }
}

if (failures.length) {
  console.error(`Static SEO check failed with ${failures.length} issue(s):`);
  for (const failure of failures.slice(0, 30)) console.error(`- ${failure}`);
  if (failures.length > 30) console.error(`...and ${failures.length - 30} more`);
  process.exit(1);
}

console.log('Static SEO check passed.');

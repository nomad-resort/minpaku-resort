/**
 * prerender.mjs — 都市ページの静的プリレンダリング
 * ────────────────────────────────────────────────────────────────
 * 目的:
 *   都市ページの本文は従来 js/regional.js がクライアント側で注入していたため、
 *   Googlebot が最初に受け取る生 HTML は全都市ほぼ同一（メタタグのみ差分）だった。
 *   → 「検出 - インデックス未登録」の主因（重複ページ扱い）。
 *
 *   本スクリプトはヘッドレス Chrome で regional.js を実際に実行し、注入後の DOM を
 *   静的 HTML として各 {slug}/index.html に焼き込む。これにより生 HTML に都市固有
 *   コンテンツが含まれ、重複ページ判定を解消する。
 *
 * 設計上の前提:
 *   - regional.js の各注入関数は冪等（innerHTML= / textContent= / remove→append）。
 *     よって data-ssg フラグは付けず、本番でも regional.js は従来どおり一度だけ実行され、
 *     同一 DOM を冪等に再生成する（挙動は現状と不変、UX 劣化なし）。
 *   - 外部リクエスト（Tailwind CDN / フォント / 地図 / 画像 / ジオコーディング）は
 *     プリレンダ中は abort する。HTML キャプチャには不要で、出力を汚さないため。
 *
 * 使い方:
 *   node scripts/prerender.mjs            # 全都市
 *   node scripts/prerender.mjs aso beppu  # 指定都市のみ（検証用）
 *   CHROME_PATH=/path/to/chrome node scripts/prerender.mjs
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_DIR = path.resolve(__dirname, '..');
const PROD_ORIGIN = 'https://www.minpaku-resort.com';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome 実行ファイルが見つかりません。CHROME_PATH を指定してください。');
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/** リポジトリルートを配信する最小静的サーバ。パストラバーサルを防止。 */
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      try {
        let urlPath = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
        if (urlPath.endsWith('/')) urlPath += 'index.html';
        const filePath = path.join(BASE_DIR, urlPath);
        // BASE_DIR の外へのアクセスを拒否
        if (!filePath.startsWith(BASE_DIR)) {
          res.writeHead(403).end('Forbidden');
          return;
        }
        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.writeHead(404).end('Not Found');
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
      } catch (e) {
        res.writeHead(500).end('Server Error');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

async function prerenderCity(browser, port, slug, cityShort) {
  const page = await browser.newPage();
  const localOrigin = `http://127.0.0.1:${port}`;

  // 外部リクエストは abort（同一オリジンのみ許可）
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const host = (() => { try { return new URL(req.url()).hostname; } catch { return ''; } })();
    if (host === '127.0.0.1') req.continue();
    else req.abort().catch(() => {});
  });
  // Tailwind CDN abort に伴う tailwind.config の ReferenceError 等は無害なので握りつぶす
  page.on('pageerror', () => {});
  page.on('console', () => {});

  await page.goto(`${localOrigin}/${slug}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // regional.js の注入完了を待機（H1・JSON-LD・note フィード・市場分析が揃うまで）
  await page.waitForFunction((cs) => {
    const h1 = document.getElementById('seo-h1');
    const ld = document.getElementById('ld-local-business');
    const feed = document.getElementById('note-feed-grid');
    const market = document.getElementById('market-analysis');
    if (!h1 || !ld || !feed || !market) return false;
    const h1ok = h1.textContent.includes(cs);
    const ldok = ld.textContent.includes('LocalBusiness') && ld.textContent.includes(cs);
    const feedok = feed.children.length > 0 && !feed.innerHTML.includes('animate-pulse');
    const marketok = market.style.display !== 'none' && market.innerHTML.includes('MARKET');
    return h1ok && ldok && feedok && marketok;
  }, { timeout: 25000 }, cityShort);

  // 最終マイクロタスクを flush
  await new Promise((r) => setTimeout(r, 300));

  // ローダーは不要（本文は既に焼き込み済み）なので除去
  await page.evaluate(() => {
    const l = document.getElementById('page-loader');
    if (l) l.remove();
  });

  let html = await page.evaluate(() => '<!DOCTYPE html>\n' + document.documentElement.outerHTML);
  await page.close();

  // localhost オリジンを本番オリジンへ置換（canonical / og:image / JSON-LD url,image）
  html = html.split(localOrigin).join(PROD_ORIGIN);

  // ── サニティチェック ──────────────────────────────────────────
  const bodyStart = html.indexOf('<body');
  const bodyHtml = bodyStart >= 0 ? html.slice(bodyStart) : html;
  const problems = [];
  if (!bodyHtml.includes(cityShort)) problems.push(`本文に「${cityShort}」が含まれない`);
  if (html.includes('127.0.0.1')) problems.push('localhost オリジンが残存');
  if (html.includes('animate-pulse')) problems.push('note フィードが未確定（skeleton 残存）');
  if (html.length < 40000) problems.push(`HTML が短すぎる (${html.length} bytes)`);
  if (!html.includes('id="ld-local-business"')) problems.push('JSON-LD 未注入');

  return { html, problems, bytes: html.length };
}

async function main() {
  const chrome = findChrome();
  const argSlugs = process.argv.slice(2);

  const cities = JSON.parse(fs.readFileSync(path.join(BASE_DIR, 'data', 'cities.json'), 'utf-8'));
  let slugs = Object.keys(cities).filter((k) => k !== 'japan');
  if (argSlugs.length) slugs = slugs.filter((s) => argSlugs.includes(s));

  console.log(`Chrome: ${chrome}`);
  console.log(`対象都市: ${slugs.length} 件\n`);

  const { server, port } = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  let ok = 0;
  let ng = 0;
  try {
    for (const slug of slugs) {
      const cityShort = cities[slug].cityShort;
      try {
        const { html, problems, bytes } = await prerenderCity(browser, port, slug, cityShort);
        if (problems.length) {
          ng++;
          console.log(`✗ ${slug.padEnd(12)} — ${problems.join(' / ')}`);
          results.push({ slug, ok: false, problems });
          continue; // 問題があるページは書き出さない
        }
        const outPath = path.join(BASE_DIR, slug, 'index.html');
        fs.writeFileSync(outPath, html, 'utf-8');
        ok++;
        console.log(`✓ ${slug.padEnd(12)} — ${(bytes / 1024).toFixed(0)}KB`);
        results.push({ slug, ok: true, bytes });
      } catch (e) {
        ng++;
        console.log(`✗ ${slug.padEnd(12)} — 例外: ${e.message}`);
        results.push({ slug, ok: false, problems: [e.message] });
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n完了: 成功 ${ok} / 失敗 ${ng}`);
  if (ng > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

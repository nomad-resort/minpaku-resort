/**
 * Netlify Function: note-feed
 *
 * note.com の RSS フィード (https://note.com/minpaku_resort/rss/) を
 * サーバーサイドで取得・パースして JSON で返す。
 *
 * エンドポイント: /.netlify/functions/note-feed
 */

const https = require('https');

const RSS_URL = 'https://note.com/minpaku_resort/rss/';
const MAX_ARTICLES = 3;

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MinpakuResort/1.0' } }, (res) => {
      // note.com が 301/302 リダイレクトを返す場合に追従
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ─── XML パーサー ─────────────────────────────────────────────────────────────

function extractCDATA(str) {
  // <![CDATA[...]]> を展開、残った HTML タグを除去
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function extractTag(xml, tag) {
  // 名前空間付きタグ (例: media:thumbnail) に対応
  const escaped = tag.replace(':', '\\:');
  const m = xml.match(new RegExp(
    `<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, 'i'
  ));
  return m ? extractCDATA(m[1]) : '';
}

function extractAttr(xml, tag, attr) {
  const escaped = tag.replace(':', '\\:');
  const m = xml.match(new RegExp(
    `<${escaped}[^>]*\\s${attr}="([^"]*)"`, 'i'
  ));
  return m ? m[1].trim() : '';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function parseRSS(xml) {
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null && articles.length < MAX_ARTICLES) {
    const item = match[1];

    const title = extractTag(item, 'title');
    const link  = extractTag(item, 'link').trim();
    const pubDate = extractTag(item, 'pubDate');
    const category = extractTag(item, 'category') || 'ノウハウ';

    // サムネイル: note.com は <media:thumbnail>URL</media:thumbnail> 形式で出力する
    // extractTag でテキストコンテンツを取得し、属性形式はフォールバックとして残す
    const img =
      extractTag(item, 'media:thumbnail') ||
      extractAttr(item, 'media:thumbnail', 'url') ||
      extractTag(item, 'media:content') ||
      extractAttr(item, 'media:content',   'url') ||
      extractAttr(item, 'enclosure',        'url') ||
      '';

    if (!title || !link) continue;

    articles.push({ title, url: link, date: formatDate(pubDate), tag: category, img });
  }

  return articles;
}

// ─── Netlify Function ハンドラー ──────────────────────────────────────────────

exports.handler = async function () {
  try {
    const xml = await fetchUrl(RSS_URL);
    const articles = parseRSS(xml);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=900, s-maxage=900',
      },
      body: JSON.stringify(articles),
    };
  } catch (err) {
    console.error('[note-feed] Error:', err.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};

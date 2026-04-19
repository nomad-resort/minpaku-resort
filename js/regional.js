/**
 * regional.js — Minpaku Resort マスターテンプレート 地域データ注入モジュール
 *
 * 動作概要:
 *   1. window.location.hostname からサブドメインを検出
 *   2. /data/prefectures.json を fetch
 *   3. 該当都道府県のデータを DOM に注入
 *   4. AIシミュレーター を初期化
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     定数
  ───────────────────────────────────────── */

  const DEFAULT_PREF = 'okinawa';

  const LINE_URL = 'https://lin.ee/RtLPqmQ';

  // 全都道府県共通で表示する固定スタッフ
  // ※ 地域スタッフを追加する場合は prefectures.json の staff[] を使用し
  //    applyStaff() 内で FIXED_STAFF.concat(d.staff.slice(0, 1)) のように結合する
  const FIXED_STAFF = [
    {
      name: 'Watanabe',
      role: 'REPRESENTATIVE',
      message: '代表として、最高品質のサービスとオーナー様の利益最大化をお約束します。',
      avatar: 'images/staff_hitoki_watanabe.png',
    },
    {
      name: 'Kobuke',
      role: 'DIRECTOR',
      message: '運営戦略とクリエイティブの両面から、物件の魅力を最大限に引き出します。',
      avatar: 'images/staff_tomohiro_kobuke.png',
    },
    {
      name: 'Sakuma',
      role: 'MANAGER',
      message: 'きめ細やかな管理とホスピタリティで、ゲストに愛される物件運営をサポートします。',
      avatar: 'images/staff_sakuma_tomoko.png',
    },
  ];

  // note 記事フィード（静的プレースホルダー）
  // ※ 本番運用では Netlify Functions 経由で note.com の RSS を取得してください
  const NOTE_ARTICLES = [
    {
      title: '民泊清掃のプロが教える！ゲスト評価4.8以上を維持する5つのコツ',
      date: '2026年4月10日',
      tag: '清掃・品質管理',
      url: 'https://note.com/',
      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
    },
    {
      title: 'ダイナミックプライシング入門｜稼働率85%超えを実現した価格戦略',
      date: '2026年3月25日',
      tag: '収益最大化',
      url: 'https://note.com/',
      img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
    },
    {
      title: '2026年版｜民泊新法・旅館業法 最新改正ポイントまとめ',
      date: '2026年3月12日',
      tag: '法務・許認可',
      url: 'https://note.com/',
      img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80',
    },
  ];

  /* ─────────────────────────────────────────
     1. サブドメイン / クエリパラメータ検出
  ───────────────────────────────────────── */

  function getSubdomain() {
    // ?pref=xxx を優先（ローカル開発・デバッグ用）
    const prefParam = new URLSearchParams(window.location.search).get('pref');
    if (prefParam) {
      console.log('[regional.js] Using prefecture from URL parameter:', prefParam);
      return prefParam;
    }

    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // localhost / IP アドレス / 単一ホスト → デフォルト
    if (parts.length < 3 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      console.log('[regional.js] Local/Direct access detected. Using default:', DEFAULT_PREF);
      return DEFAULT_PREF;
    }

    const sub = parts[0];
    if (sub === 'www') return DEFAULT_PREF;

    console.log('[regional.js] Subdomain detected:', sub);
    return sub;
  }

  /* ─────────────────────────────────────────
     2. シミュレーションID生成
  ───────────────────────────────────────── */

  function generateSimId() {
    return 'SIM' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  /* ─────────────────────────────────────────
     3. ユーティリティ
  ───────────────────────────────────────── */

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* ─────────────────────────────────────────
     4. DOM 注入: 各セクション
  ───────────────────────────────────────── */

  function applyMeta(d) {
    document.title = d.seoTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', d.seoDescription);

    // OGP タグが存在する場合のみ更新
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', d.seoTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', d.seoDescription);
  }

  function applyHero(d) {
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      heroSection.style.backgroundImage =
        `linear-gradient(rgba(15,23,42,0.7), rgba(15,23,42,0.4)), url('${d.heroImage}')`;
      heroSection.style.backgroundSize = 'cover';
      heroSection.style.backgroundPosition = 'center';
    }
    setText('seo-h1', `${d.prefShort}の民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）`);
    setText('hero-tagline', d.heroTagline);
    setText('hero-copy', d.heroCopy);
    setText('hero-subcopy', d.heroSubcopy);
  }

  function applyProblems(d) {
    const el = document.getElementById('problems-conclusion');
    if (el) {
      el.innerHTML =
        `そのお悩み、<span class="text-accent font-bold">Minpaku Resort</span>にお任せください。<br>` +
        `${d.prefShort}エリアの地域特性を熟知した私たちが、すべて解決いたします。`;
    }
  }

  function applyLocalRules(d) {
    const container = document.getElementById('local-rules-grid');
    if (!container) return;

    setText('local-rules-title', `${d.prefShort}だからこそ、気をつけたいこと`);

    container.innerHTML = d.localRules.map((r) => `
      <div class="bg-white rounded-sm shadow-sm border border-gray-100 p-7 hover:shadow-md transition duration-300">
        <div class="flex items-start mb-4">
          <div class="w-12 h-12 bg-primary/5 border border-accent/30 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
            <i class="${r.icon} text-accent text-lg"></i>
          </div>
          <div>
            <span class="text-[10px] font-bold text-accent tracking-widest uppercase">${r.highlight}</span>
            <h4 class="text-base font-bold text-primary leading-snug">${r.title}</h4>
          </div>
        </div>
        <p class="text-gray-600 text-sm leading-relaxed">${r.body}</p>
      </div>
    `).join('');
  }

  function applyStaff() {
    const container = document.getElementById('staff-grid');
    if (!container) return;

    setText('staff-title', '現場を支えるチーム');
    container.className = 'grid grid-cols-1 sm:grid-cols-3 gap-10 max-w-4xl mx-auto';

    container.innerHTML = FIXED_STAFF.map((s) => {
      const fallback =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=1e293b&color=c5a059&size=112&bold=true`;
      return `
        <div class="text-center group">
          <div class="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-accent/60 shadow-lg group-hover:border-accent transition duration-300">
            <img src="${s.avatar}" alt="${s.name}"
              class="w-full h-full object-cover"
              onerror="this.src='${fallback}'">
          </div>
          <h4 class="font-bold text-white text-lg mb-1">${s.name}</h4>
          <p class="text-[10px] text-accent font-bold mb-3 tracking-widest uppercase">${s.role}</p>
          <p class="text-sm text-gray-300 leading-relaxed max-w-[200px] mx-auto">&ldquo;${s.message}&rdquo;</p>
        </div>
      `;
    }).join('');
  }

  function applyAreas(d) {
    setText('areas-title', `${d.prefShort} 対応可能エリア`);
    setText('areas-description',
      `${d.prefName}内の主要エリアを中心にサービスを提供しております。掲載のない地域もお気軽にご相談ください。`
    );

    const listEl = document.getElementById('municipalities-list');
    if (listEl) {
      listEl.innerHTML = d.municipalities.map((m) =>
        `<li class="flex items-center text-gray-700 font-medium text-sm">
          <i class="fas fa-check text-accent text-xs mr-2 flex-shrink-0"></i>${m}
        </li>`
      ).join('');
    }

    const mapEl = document.getElementById('area-map');
    if (mapEl && d.mapEmbedUrl) mapEl.src = d.mapEmbedUrl;
  }

  function applyCleaningFocus(d) {
    const titleEl = document.getElementById('regional-cleaning-title');
    const bodyEl = document.getElementById('regional-cleaning-body');
    if (!titleEl || !bodyEl) return;

    if (d.cleaningFeature) {
      titleEl.textContent = d.cleaningFeature.title;
      bodyEl.textContent = d.cleaningFeature.body;
    } else {
      // cleaningFeature が未定義の都道府県向けフォールバック
      titleEl.textContent = `${d.prefShort}の地域特性に合わせた最適清掃`;
      bodyEl.textContent =
        `${d.prefShort}の環境・気候・ゲスト層に合わせた清掃フローを構築。` +
        `地域の清掃プロフェッショナルと連携し、高いクオリティを安定的に提供いたします。`;
    }
  }

  /* ─────────────────────────────────────────
     5. AIシミュレーター
  ───────────────────────────────────────── */

  function initSimulator(d) {
    const form = document.getElementById('sim-form');
    if (!form) return;

    const roomSelect = document.getElementById('sim-room');
    const guestSelect = document.getElementById('sim-guests');
    const nightsSelect = document.getElementById('sim-nights');

    if (roomSelect) {
      roomSelect.innerHTML = Object.entries(d.cleaningPrices).map(([label, price]) =>
        `<option value="${price}" data-label="${label}">${label}（清掃 ¥${price.toLocaleString()}〜）</option>`
      ).join('');
    }

    if (guestSelect) {
      guestSelect.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map((n) =>
        `<option value="${n}"${n === 4 ? ' selected' : ''}>${n}名</option>`
      ).join('');
    }

    if (nightsSelect) {
      nightsSelect.innerHTML = [1, 2, 3, 4, 5, 6, 7].map((n) =>
        `<option value="${n}">${n}泊</option>`
      ).join('');
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const basePrice = parseInt(roomSelect.value, 10);
      const guests = parseInt(guestSelect.value, 10);
      const nights = parseInt(nightsSelect.value, 10);
      const roomLabel = roomSelect.options[roomSelect.selectedIndex].dataset.label;

      const linen = guests * 800;
      const consumables = guests * nights * 200;
      const garbage = guests <= 4 ? 1000 : guests <= 10 ? 1500 : 2000;
      const total = basePrice + linen + consumables + garbage;
      const perPerson = Math.round(total / guests);

      const simId = generateSimId();

      const resultEl = document.getElementById('sim-result');
      if (!resultEl) return;

      resultEl.innerHTML = `
        <div class="bg-gray-50 rounded-sm border border-gray-100 p-8 sm:p-10">
          <div class="text-center mb-6">
            <p class="text-xs text-gray-400 mb-1">シミュレーションID</p>
            <p class="font-mono font-bold text-primary text-lg tracking-widest">${simId}</p>
          </div>
          <p class="text-center text-sm text-gray-500 mb-6">
            ${d.prefShort}エリア / ${roomLabel} / ${guests}名 / ${nights}泊
          </p>

          <div class="flex items-baseline justify-center mb-2">
            <span class="text-xl text-gray-400 mr-1">¥</span>
            <span class="text-6xl font-bold text-primary font-serif">${total.toLocaleString()}</span>
          </div>
          <p class="text-center text-sm text-gray-500 mb-8">¥${perPerson.toLocaleString()} / 人</p>

          <div class="bg-white border border-gray-100 rounded p-5 text-xs text-gray-500 mb-8 space-y-2">
            <div class="flex justify-between">
              <span>清掃基本代金（${roomLabel}）</span>
              <span class="font-medium text-gray-700">¥${basePrice.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>リネン代（${guests}名 × ¥800）</span>
              <span class="font-medium text-gray-700">¥${linen.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>消耗品費（${guests}名 × ${nights}泊 × ¥200）</span>
              <span class="font-medium text-gray-700">¥${consumables.toLocaleString()}</span>
            </div>
            <div class="flex justify-between">
              <span>ゴミ回収</span>
              <span class="font-medium text-gray-700">¥${garbage.toLocaleString()}</span>
            </div>
            <div class="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-800">
              <span>合計</span>
              <span>¥${total.toLocaleString()}</span>
            </div>
          </div>

          <a href="${LINE_URL}" target="_blank" rel="noopener"
            class="flex items-center justify-center w-full px-8 py-4 bg-[#06C755] hover:bg-[#05b04b] text-white font-bold rounded shadow-lg transition duration-300 text-base">
            <i class="fab fa-line text-2xl mr-3"></i>
            【${simId}】の詳細レポートをLINEで受け取る
          </a>
          <p class="text-center text-xs text-gray-400 mt-3">
            ※ 上記はあくまで目安です。物件規模や状態により変動します。
          </p>
        </div>
      `;

      resultEl.classList.remove('hidden');
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ─────────────────────────────────────────
     6. note 記事フィード
  ───────────────────────────────────────── */

  function renderNoteFeed() {
    const container = document.getElementById('note-feed-grid');
    if (!container) return;

    container.innerHTML = NOTE_ARTICLES.map((a) => `
      <a href="${a.url}" target="_blank" rel="noopener"
        class="bg-white rounded-sm shadow hover:shadow-md transition overflow-hidden group flex flex-col">
        <div class="h-44 overflow-hidden">
          <img src="${a.img}" alt="${a.title}"
            class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">
        </div>
        <div class="p-6 flex flex-col flex-grow">
          <span class="text-xs font-bold text-accent tracking-wider mb-2">${a.tag}</span>
          <h4 class="font-bold text-primary text-sm leading-snug flex-grow mb-4">${a.title}</h4>
          <div class="flex justify-between items-center text-xs text-gray-400">
            <span>${a.date}</span>
            <span class="text-accent font-medium">続きを読む →</span>
          </div>
        </div>
      </a>
    `).join('');
  }

  function applyFooter(d) {
    setText('footer-tagline', `${d.prefShort}の民泊を、リゾート・クオリティへ。`);
  }

  /* ─────────────────────────────────────────
     7. 全データ一括適用
  ───────────────────────────────────────── */

  function applyData(d) {
    applyMeta(d);
    applyHero(d);
    applyProblems(d);
    applyLocalRules(d);
    applyStaff();
    applyAreas(d);
    applyCleaningFocus(d);
    initSimulator(d);
    renderNoteFeed();
    applyFooter(d);
  }

  /* ─────────────────────────────────────────
     8. エントリーポイント
  ───────────────────────────────────────── */

  const subdomain = getSubdomain();

  fetch('data/prefectures.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((allData) => {
      const data = allData[subdomain] || allData[DEFAULT_PREF];
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => applyData(data));
      } else {
        applyData(data);
      }
    })
    .catch((err) => {
      console.error('[regional.js] Failed to load prefecture data:', err);
    });

})();

/**
 * regional.js — Minpaku Resort マスターテンプレート 地域データ注入モジュール
 *
 * 動作概要:
 *   1. window.location.pathname からサブフォルダ（都市名）を検出
 *   2. /data/cities.json を fetch
 *   3. 該当都市のデータを DOM に注入
 *   4. AIシミュレーター を初期化
 *   5. canonical URL・LocalBusiness JSON-LD を動的生成
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────
     定数
  ───────────────────────────────────────── */

  const DEFAULT_CITY = 'japan';

  /**
   * 都市サブページかどうかを判定してアセットベースパスを決定する。
   * 都市ページでは <script src="../js/regional.js"> となるため
   * src 属性の先頭が "../" かどうかで判別する。
   * file:// プロトコルおよびサブフォルダ構成の両方に対応。
   */
  const CITY_ASSETS_BASE = (function () {
    // http(s):// 環境ではルート絶対パス（'/'）を使うことでサブフォルダ深度に依存しない
    if (window.location.protocol !== 'file:') return '/';
    // file:// プロトコルのみ script src 属性で判定
    try {
      const src = document.currentScript ? document.currentScript.getAttribute('src') || '' : '';
      return src.startsWith('../') ? '../' : '';
    } catch (e) {
      return '';
    }
  })();

  const LINE_URL = 'https://lin.ee/RtLPqmQ';
  const NATIONAL_MAP_EMBED_URL = 'https://maps.google.com/maps?q=Japan&output=embed&hl=ja&z=5';

  // 全都道府県共通で表示する固定スタッフ
  // ※ 地域スタッフを追加する場合は prefectures.json の staff[] を使用し
  //    applyStaff() 内で FIXED_STAFF.concat(d.staff.slice(0, 1)) のように結合する
  const FIXED_STAFF = [
    {
      name: 'Watanabe',
      role: 'REPRESENTATIVE',
      message: '代表として、最高品質のサービスとオーナー様の利益最大化をお約束します。',
      avatar: '/images/staff_hitoki_watanabe.png',
    },
    {
      name: 'Kobuke',
      role: 'DIRECTOR',
      message: '運営戦略とクリエイティブの両面から、物件の魅力を最大限に引き出します。',
      avatar: '/images/staff_tomohiro_kobuke.png',
    },
    {
      name: 'Sakuma',
      role: 'MANAGER',
      message: 'きめ細やかな管理とホスピタリティで、ゲストに愛される物件運営をサポートします。',
      avatar: '/images/staff_sakuma_tomoko.png',
    },
  ];

  // 都道府県別 県庁所在地の中心座標（現在は未使用 — 距離計算は municipalities の1丁目1番地で行う）
  // 将来的なフォールバック用として保持
  const BASE_COORDS = {
    hokkaido: { lat: 43.0642, lng: 141.3469 },
    aomori: { lat: 40.8244, lng: 140.7400 },
    iwate: { lat: 39.7036, lng: 141.1527 },
    miyagi: { lat: 38.2688, lng: 140.8721 },
    akita: { lat: 39.7186, lng: 140.1023 },
    yamagata: { lat: 38.2404, lng: 140.3633 },
    fukushima: { lat: 37.7500, lng: 140.4677 },
    ibaraki: { lat: 36.3418, lng: 140.4468 },
    tochigi: { lat: 36.5658, lng: 139.8836 },
    gunma: { lat: 36.3912, lng: 139.0607 },
    saitama: { lat: 35.8616, lng: 139.6455 },
    chiba: { lat: 35.6073, lng: 140.1063 },
    tokyo: { lat: 35.6895, lng: 139.6917 },
    kanagawa: { lat: 35.4478, lng: 139.6425 },
    niigata: { lat: 37.9026, lng: 139.0235 },
    toyama: { lat: 36.6953, lng: 137.2113 },
    ishikawa: { lat: 36.5944, lng: 136.6256 },
    fukui: { lat: 36.0652, lng: 136.2216 },
    yamanashi: { lat: 35.6642, lng: 138.5681 },
    nagano: { lat: 36.6513, lng: 138.1810 },
    shizuoka: { lat: 34.9769, lng: 138.3831 },
    aichi: { lat: 35.1802, lng: 136.9066 },
    mie: { lat: 34.7303, lng: 136.5086 },
    shiga: { lat: 35.0045, lng: 135.8686 },
    kyoto: { lat: 35.0116, lng: 135.7681 },
    osaka: { lat: 34.6937, lng: 135.5023 },
    hyogo: { lat: 34.6913, lng: 135.1830 },
    nara: { lat: 34.6851, lng: 135.8050 },
    wakayama: { lat: 34.2261, lng: 135.1675 },
    tottori: { lat: 35.5011, lng: 134.2351 },
    shimane: { lat: 35.4722, lng: 133.0505 },
    okayama: { lat: 34.6617, lng: 133.9349 },
    hiroshima: { lat: 34.3853, lng: 132.4553 },
    yamaguchi: { lat: 34.1860, lng: 131.4705 },
    tokushima: { lat: 34.0658, lng: 134.5593 },
    kagawa: { lat: 34.3401, lng: 134.0434 },
    ehime: { lat: 33.8416, lng: 132.7657 },
    kochi: { lat: 33.5597, lng: 133.5311 },
    fukuoka: { lat: 33.5904, lng: 130.4017 },
    saga: { lat: 33.2494, lng: 130.2988 },
    nagasaki: { lat: 32.7448, lng: 129.8737 },
    kumamoto: { lat: 32.7898, lng: 130.7417 },
    oita: { lat: 33.2382, lng: 131.6126 },
    miyazaki: { lat: 31.9111, lng: 131.4239 },
    kagoshima: { lat: 31.5602, lng: 130.5581 },
    okinawa: { lat: 26.2124, lng: 127.6809 },
  };

  // note 記事フィード — フォールバック用静的データ（RSS 取得失敗時に表示）
  // Netlify Function が正常に動作している場合は RSS から取得した実際の記事が優先される
  const NOTE_ARTICLES_FALLBACK = [
    {
      title: '稼ぐ民泊オーナーは「フルパッケージ代行」を選ぶ。「手数料が安い」で選ぶと大失敗する？',
      date: '2026年5月6日',
      tag: 'ノウハウ',
      url: 'https://note.com/minpaku_resort/n/n2f21c579a9c0',
      img: 'https://assets.st-note.com/production/uploads/images/273513066/rectangle_large_type_2_31478694f24bf1f6af57c41cdf33b194.jpeg?width=800',
    },
    {
      title: 'ボロ家を人気民泊へ！古民家を人気民泊に変えた実例と5つの鉄則',
      date: '2026年5月4日',
      tag: 'ノウハウ',
      url: 'https://note.com/minpaku_resort/n/n87ba6d67aeba',
      img: 'https://assets.st-note.com/production/uploads/images/272687765/rectangle_large_type_2_bfb78585eb0b2def4c1a97c445ab7463.jpeg?width=800',
    },
    {
      title: '2026年版｜民泊新法・旅館業法 最新改正ポイントまとめ',
      date: '2026年4月28日',
      tag: 'ノウハウ',
      url: 'https://note.com/minpaku_resort/n/n7aeda67c34a3',
      img: 'https://assets.st-note.com/production/uploads/images/271118182/rectangle_large_type_2_fbcd6723cd7ac7c39682bc18ff8a7432.jpeg?width=800',
    },
    {
      title: 'ダイナミックプライシング入門｜稼働率85%超えを実現した価格戦略',
      date: '2026年4月28日',
      tag: 'ノウハウ',
      url: 'https://note.com/minpaku_resort/n/n07ee9f7efd96',
      img: 'https://assets.st-note.com/production/uploads/images/271104404/rectangle_large_type_2_c80daef54a68a38fadeb7a72cc3ad8f6.jpeg?width=800',
    },
    {
      title: '民泊清掃のプロが教える！ゲスト評価4.8以上を維持する5つのコツ',
      date: '2026年4月28日',
      tag: 'ノウハウ',
      url: 'https://note.com/minpaku_resort/n/n845a4bc829c5',
      img: 'https://assets.st-note.com/production/uploads/images/270948970/rectangle_large_type_2_65ad7b74e352bc1b2500e9ec9dd4927f.png?width=800',
    },
  ];

  // 全国ビュー用 地方区分マップ
  const REGION_MAP = {
    '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
    '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
    '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
    '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
    '中国・四国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県'],
    '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
  };

  /* ─────────────────────────────────────────
     1. サブドメイン / クエリパラメータ検出
  ───────────────────────────────────────── */

  function getCityFromPath() {
    // ?pref=xxx を優先（ローカル開発・デバッグ用）
    const prefParam = new URLSearchParams(window.location.search).get('pref');
    if (prefParam) {
      console.log('[regional.js] Using prefecture from URL parameter:', prefParam);
      return prefParam;
    }

    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);

    // root ("/" or "/index.html") へのアクセスならデフォルト
    if (parts.length === 0 || parts[0] === 'index.html') {
      console.log('[regional.js] Root path detected. Using default:', DEFAULT_CITY);
      return DEFAULT_CITY;
    }

    const city = parts[0];
    console.log('[regional.js] City detected from path:', city);
    return city;
  }

  /* ─────────────────────────────────────────
     2. ユーティリティ
  ───────────────────────────────────────── */

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /** 相対パスを絶対パスに正規化する。http(s):// や / 始まりはそのまま返す */
  function toAbsoluteUrl(path) {
    return (path.startsWith('http') || path.startsWith('/')) ? path : '/' + path;
  }

  /**
   * アセット表示用: CITY_ASSETS_BASE に対応した URL を返す。
   * file:// プロトコルおよびサブフォルダ構成でも正しく解決する。
   * OGP / canonical など絶対 URL が必要な場合は toAbsoluteUrl を使うこと。
   */
  function toAssetUrl(path) {
    if (!path || path.startsWith('http') || path.startsWith('data:')) return path;
    const rel = path.startsWith('/') ? path.slice(1) : path;
    return CITY_ASSETS_BASE + rel;
  }

  /** 都道府県名から地方名を返す。REGION_MAP に未登録の場合は 'その他' */
  function getRegion(prefName) {
    for (const [region, prefs] of Object.entries(REGION_MAP)) {
      if (prefs.includes(prefName)) return region;
    }
    return 'その他';
  }

  /** OGP / JSON-LD 用に完全 URL を生成する。http(s):// 始まりはそのまま返す */
  function toCanonicalUrl(path, origin) {
    return path.startsWith('http') ? path : origin + toAbsoluteUrl(path);
  }

  /* ─────────────────────────────────────────
     4. DOM 注入: 各セクション
  ───────────────────────────────────────── */

  function applyMeta(d) {
    if (document.body.dataset.ssg === 'true') return;
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
    if (document.body.dataset.ssg === 'true') return;
    const heroSection = document.getElementById('hero-section');
    if (heroSection) {
      const heroImageUrl = toAssetUrl(d.heroImage);
      heroSection.style.backgroundImage =
        `linear-gradient(rgba(15,23,42,0.7), rgba(15,23,42,0.4)), url('${heroImageUrl}')`;
      heroSection.style.backgroundSize = 'cover';
      heroSection.style.backgroundPosition = 'center';
    }
    setText('seo-h1', `${d.cityShort}の民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）`);
    setText('hero-tagline', d.heroTagline);
    setText('hero-copy', d.heroCopy);
    setText('hero-subcopy', d.heroSubcopy);
  }

  function applyProblems(d) {
    if (document.body.dataset.ssg === 'true') return;
    const el = document.getElementById('problems-conclusion');
    if (el) {
      el.innerHTML =
        `そのお悩み、<span class="text-accent font-bold">Minpaku Resort</span>にお任せください。<br>` +
        `${d.cityShort}エリアの地域特性を熟知した私たちが、すべて解決いたします。`;
    }
  }

  function applyLocalRules(d) {
    if (document.body.dataset.ssg === 'true') return;
    const section = document.getElementById('local-rules');
    if (d.cityKey === 'japan') {
      if (section) section.style.display = 'none';
      return;
    }
    if (section) section.style.display = '';

    const container = document.getElementById('local-rules-grid');
    if (!container) return;

    setText('local-rules-title', `${d.cityShort}の注意ポイント`);

    container.innerHTML = d.localRules.map((r) => `
      <div class="bg-white rounded-sm shadow-sm border border-gray-100 p-3 sm:p-5 md:p-7 hover:shadow-md transition duration-300">
        <div class="flex items-start mb-2 sm:mb-4">
          <div class="w-8 h-8 sm:w-12 sm:h-12 bg-primary/5 border border-accent/30 rounded-full flex items-center justify-center mr-2 sm:mr-4 flex-shrink-0">
            <i class="${r.icon} text-accent text-sm sm:text-lg"></i>
          </div>
          <div>
            <span class="text-[8px] sm:text-[10px] font-bold text-accent tracking-widest uppercase">${r.highlight}</span>
            <h4 class="text-xs sm:text-base font-bold text-primary leading-snug">${r.title}</h4>
          </div>
        </div>
        <p class="text-gray-600 text-[10px] sm:text-sm leading-relaxed">${r.body}</p>
      </div>
    `).join('');
  }

  function applyStaff() {
    const container = document.getElementById('staff-grid');
    if (!container) return;

    setText('staff-title', '現場を支えるチーム');
    // モバイルでも3列で横並び表示
    container.className = 'grid grid-cols-3 gap-4 sm:gap-10 max-w-4xl mx-auto';

    container.innerHTML = FIXED_STAFF.map((s) => {
      const fallback =
        `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=1e293b&color=c5a059&size=112&bold=true`;
      const avatarUrl = toAssetUrl(s.avatar);
      return `
        <div class="text-center group">
          <div class="w-16 h-16 sm:w-28 sm:h-28 mx-auto mb-2 sm:mb-4 rounded-full overflow-hidden border-4 border-accent/60 shadow-lg group-hover:border-accent transition duration-300">
            <img src="${avatarUrl}" alt="${s.name}"
              class="w-full h-full object-cover"
              onerror="this.src='${fallback}'">
          </div>
          <h4 class="font-bold text-white text-xs sm:text-lg mb-1">${s.name}</h4>
          <p class="text-[8px] sm:text-[10px] text-accent font-bold mb-1 sm:mb-3 tracking-widest uppercase">${s.role}</p>
          <p class="hidden sm:block text-sm text-gray-300 leading-relaxed max-w-[200px] mx-auto">&ldquo;${s.message}&rdquo;</p>
        </div>
      `;
    }).join('');
  }

  function applyAreas(d, allData) {
    if (document.body.dataset.ssg === 'true') {
      // 静的 HTML が既にレンダリング済みの場合の処理
      if (d.cityKey === 'japan') {
        const mapEl = document.getElementById('area-map');
        if (mapEl) mapEl.src = NATIONAL_MAP_EMBED_URL;

        // トップページ: エリアタブのイベントリスナーのみ設定
        const listEl = document.getElementById('municipalities-list');
        if (listEl) {
          const tabBtns = listEl.querySelectorAll('.region-tab-btn');
          const tabContents = listEl.querySelectorAll('.region-content');
          tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
              const targetRegion = btn.getAttribute('data-region');
              tabBtns.forEach(b => {
                b.classList.remove('bg-primary', 'text-white', 'shadow');
                b.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
              });
              btn.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
              btn.classList.add('bg-primary', 'text-white', 'shadow');

              tabContents.forEach(c => {
                const isTarget = c.id === `region-content-${targetRegion}`;
                c.classList.toggle('hidden', !isTarget);
                c.classList.toggle('block', isTarget);
              });
            });
          });
        }
      } else {
        // 都市ページ: Google マップ URL だけは SSG でも動的に設定が必要
        const mapEl = document.getElementById('area-map');
        if (mapEl && d.mapEmbedUrl) mapEl.src = d.mapEmbedUrl;
      }
      return;
    }

    if (d.cityKey === 'japan') {
      setText('areas-title', '全国 対応可能エリア');
      setText('areas-description',
        '北海道から沖縄まで全国47都道府県のエリアに対応しています。掲載のない地域もお気軽にご相談ください。'
      );

      const listEl = document.getElementById('municipalities-list');
      if (listEl && allData) {
        // 地方ごとにグループ化
        const groupedByRegion = {};
        Object.keys(REGION_MAP).forEach(r => { groupedByRegion[r] = {}; });

        Object.values(allData).forEach(city => {
          if (city.cityKey === 'japan') return;
          const region = getRegion(city.prefName);
          if (!groupedByRegion[region]) groupedByRegion[region] = {};
          if (!groupedByRegion[region][city.prefName]) groupedByRegion[region][city.prefName] = [];
          groupedByRegion[region][city.prefName].push(city);
        });

        // className をリセットしてブロックにする
        listEl.className = 'mt-4 text-gray-600 font-medium w-full';

        let tabsHtml = `<div class="flex flex-wrap gap-1.5 mb-5 border-b border-gray-200 pb-2">`;
        let contentHtml = `<div id="region-tab-content">`;

        let isFirst = true;
        Object.keys(groupedByRegion).forEach((region) => {
          const prefs = groupedByRegion[region];
          if (Object.keys(prefs).length === 0) return; // 該当都市がない地方はスキップ

          const isActive = isFirst;
          isFirst = false;

          const activeClass = 'bg-primary text-white shadow';
          const inactiveClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
          tabsHtml += `<button type="button" data-region="${region}" class="region-tab-btn px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded transition-colors ${isActive ? activeClass : inactiveClass}">${region}</button>`;

          contentHtml += `<div id="region-content-${region}" class="region-content ${isActive ? 'block' : 'hidden'}">
            <div class="flex flex-wrap gap-2">`;

          Object.values(prefs).forEach((cities) => {
            contentHtml += cities.map(city =>
              `<a href="/${city.cityKey}/" class="group inline-flex items-center px-3 py-1.5 bg-white hover:bg-accent hover:text-white border border-gray-200 rounded-full text-xs transition duration-300 shadow-sm">
                <i class="fas fa-map-marker-alt text-accent group-hover:text-white mr-1.5 opacity-70"></i>${city.cityName}
              </a>`
            ).join('');
          });

          contentHtml += `</div></div>`;
        });

        tabsHtml += `</div>`;
        contentHtml += `</div>`;

        listEl.innerHTML = tabsHtml + contentHtml;

        // タブ切り替えのイベントリスナー
        const tabBtns = listEl.querySelectorAll('.region-tab-btn');
        const tabContents = listEl.querySelectorAll('.region-content');

        tabBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            const targetRegion = btn.getAttribute('data-region');

            tabBtns.forEach(b => {
              b.classList.remove('bg-primary', 'text-white', 'shadow');
              b.classList.add('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            });
            btn.classList.remove('bg-gray-100', 'text-gray-600', 'hover:bg-gray-200');
            btn.classList.add('bg-primary', 'text-white', 'shadow');

            tabContents.forEach(c => {
              const isTarget = c.id === `region-content-${targetRegion}`;
              c.classList.toggle('hidden', !isTarget);
              c.classList.toggle('block', isTarget);
            });
          });
        });
      }
    } else {
      setText('areas-title', `${d.prefShort} 対応可能エリア`);
      setText('areas-description',
        `${d.cityShort}を含む${d.prefName}内の主要エリアを中心にサービスを提供しております。掲載のない地域もお気軽にご相談ください。`
      );

      const listEl = document.getElementById('municipalities-list');
      if (listEl) {
        // className を元のグリッドに戻す
        listEl.className = "grid grid-cols-2 gap-y-2 mt-4 text-gray-600 font-medium";
        listEl.innerHTML = d.municipalities.map((m) =>
          `<div class="flex items-center text-gray-700 font-medium text-sm">
            <i class="fas fa-check text-accent text-xs mr-2 flex-shrink-0"></i>${m}
          </div>`
        ).join('');
      }
    }

    const mapEl = document.getElementById('area-map');
    if (mapEl) {
      if (d.cityKey === 'japan') mapEl.src = NATIONAL_MAP_EMBED_URL;
      else if (d.mapEmbedUrl) mapEl.src = d.mapEmbedUrl;
    }
  }

  function applyCleaningFocus(d) {
    if (document.body.dataset.ssg === 'true') return;
    const titleEl = document.getElementById('regional-cleaning-title');
    const bodyEl = document.getElementById('regional-cleaning-body');
    if (!titleEl || !bodyEl) return;

    if (d.cleaningFeature) {
      titleEl.textContent = d.cleaningFeature.title;
      bodyEl.textContent = d.cleaningFeature.body;
    } else {
      // cleaningFeature が未定義の都市向けフォールバック
      titleEl.textContent = `${d.cityShort}の地域特性に合わせた最適清掃`;
      bodyEl.textContent =
        `${d.cityShort}の環境・気候・ゲスト層に合わせた清掃フローを構築。` +
        `地域の清掃プロフェッショナルと連携し、高いクオリティを安定的に提供いたします。`;
    }
  }

  function applyCaseStudies(d) {
    const container = document.getElementById('case-studies-grid');
    if (!container || !d.caseStudies) return;

    container.innerHTML = d.caseStudies.map((c, i) => {
      const isPrimary = i % 2 === 0;
      const accentClass = isPrimary ? 'accent' : 'primary';
      const borderClass = isPrimary ? 'border-accent' : 'border-primary';

      const statsHtml = c.stats.map(s => `
        <div class="flex flex-col gap-0.5">
          <span class="text-gray-600 font-medium text-[10px] sm:text-sm">${s.label}</span>
          <span class="text-lg sm:text-2xl md:text-3xl font-bold text-primary">${s.value}<span class="text-xs sm:text-lg ${s.unit.includes('%') ? '' : 'text-gray-500'}">${s.unit}</span></span>
        </div>
      `).join('');

      return `
        <div class="bg-white rounded-sm overflow-hidden shadow-lg md:shadow-2xl flex flex-col">
          <div class="h-28 sm:h-48 md:h-64 overflow-hidden relative">
            <img src="${toAssetUrl(c.image)}" alt="${c.name}" class="w-full h-full object-cover">
            <div class="absolute top-2 right-2 md:top-4 md:right-4 bg-${accentClass} text-white px-2 py-0.5 md:px-3 md:py-1 font-bold rounded-sm text-[10px] sm:text-sm">
              ${c.type}
            </div>
          </div>
          <div class="p-3 sm:p-5 md:p-8 flex-grow">
            <h4 class="text-sm sm:text-xl md:text-2xl font-serif font-bold text-primary mb-1 md:mb-2">${c.name}</h4>
            <p class="text-gray-500 text-[10px] sm:text-sm mb-3 md:mb-6 pb-2 md:pb-4 border-b border-gray-100">${c.location}</p>
            <div class="space-y-2 md:space-y-4">
              ${statsHtml}
            </div>
            <p class="hidden sm:block mt-4 md:mt-6 text-[10px] sm:text-sm text-gray-600 bg-gray-50 p-2 md:p-4 rounded border-l-2 ${borderClass}">
              ${c.review}
            </p>
          </div>
        </div>
      `;
    }).join('');
  }

  function applyVoices(d) {
    const container = document.getElementById('voices-grid');
    if (!container || !d.voices) return;

    container.innerHTML = d.voices.map(v => `
      <div class="bg-white p-3 sm:p-5 md:p-8 rounded-sm shadow relative">
        <i class="fas fa-quote-left text-2xl sm:text-4xl text-gray-200 absolute top-3 left-3 sm:top-6 sm:left-6"></i>
        <div class="relative z-10 pl-4 sm:pl-6 pt-2 sm:pt-4">
          <div class="flex items-center mb-3 sm:mb-6">
            <img src="${toAssetUrl(v.image)}" alt="${v.name}" class="w-10 h-10 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-accent shrink-0">
            <div class="ml-2 sm:ml-4">
              <h4 class="font-bold text-primary text-xs sm:text-lg leading-snug">${v.name} / ${v.title}</h4>
              <div class="text-accent text-xs sm:text-sm">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
              </div>
            </div>
          </div>
          <h5 class="text-xs sm:text-xl font-bold text-primary mb-2 sm:mb-3">${v.quote}</h5>
          <p class="text-gray-600 text-[10px] sm:text-sm leading-relaxed">${v.body}</p>
        </div>
      </div>
    `).join('');
  }

  function applyMarketAnalysis(d) {
    const section = document.getElementById('market-analysis');
    if (!section) return;

    if (d.cityKey === 'japan' || !d.marketAnalysis) {
      section.style.display = 'none';
      return;
    }

    const mp = d.marketPricing;
    const cal = d.seasonalCalendar || [];
    const body = d.marketAnalysis.body || '';

    // ── 3ハイライト ──────────────────────────────────────
    const firstSentence = body.split('。')[0] + '。';

    const hotMonths = cal
      .filter(m => m.demandLevel >= 4)
      .map(m => m.month)
      .join('・');

    let estRevenue = '';
    if (mp) {
      const avgPrice = (mp.lowSeason.avgNightly + mp.highSeason.avgNightly) / 2;
      const avgOcc   = (mp.lowSeason.occupancyPct + mp.highSeason.occupancyPct) / 2;
      const est = Math.round(avgPrice * (avgOcc / 100) * 365 / 10000) * 10000;
      estRevenue = est.toLocaleString('ja-JP');
    }

    const highlightsHtml = `
      <ul class="space-y-3 text-sm text-gray-700">
        <li class="flex gap-3 items-start">
          <span class="text-accent shrink-0 mt-0.5"><i class="fas fa-map-marker-alt w-4 text-center"></i></span>
          <span>${firstSentence}</span>
        </li>
        ${hotMonths ? `<li class="flex gap-3 items-start">
          <span class="text-accent shrink-0 mt-0.5"><i class="fas fa-fire w-4 text-center"></i></span>
          <span>繁忙月：<strong>${hotMonths}</strong>（ハイシーズン稼働率${mp ? mp.highSeason.occupancyPct : ''}%超見込み）</span>
        </li>` : ''}
        ${estRevenue ? `<li class="flex gap-3 items-start">
          <span class="text-accent shrink-0 mt-0.5"><i class="fas fa-chart-line w-4 text-center"></i></span>
          <span>1LDK 年間収益目安：<strong>¥${estRevenue}前後</strong></span>
        </li>` : ''}
      </ul>`;

    // ── アコーディオン（全文） ────────────────────────────
    const accordionHtml = `
      <details class="mt-5 border-t border-gray-100 pt-4">
        <summary class="cursor-pointer text-xs font-bold text-accent tracking-wider flex items-center gap-1.5 select-none list-none marker:hidden">
          <i class="fas fa-chevron-right text-[9px] transition-transform duration-200 details-chevron"></i>
          市場レポート全文を読む
        </summary>
        <p class="mt-3 text-gray-600 text-sm leading-relaxed">${body}</p>
      </details>`;

    // ── 価格カード ───────────────────────────────────────
    const pricingHtml = mp ? `
      <div class="mt-6 grid grid-cols-2 gap-3 sm:gap-6 border-t border-gray-100 pt-6">
        <div class="bg-gray-50 rounded-sm p-4">
          <p class="text-accent font-bold tracking-widest text-[10px] mb-1">閑散期</p>
          <p class="text-lg sm:text-2xl font-bold text-primary">¥${Number(mp.lowSeason.avgNightly).toLocaleString('ja-JP')}</p>
          <p class="text-xs text-gray-500 mt-1">稼働率目安 <span class="font-bold text-primary">${mp.lowSeason.occupancyPct}%</span></p>
        </div>
        <div class="bg-accent/10 rounded-sm p-4">
          <p class="text-accent font-bold tracking-widest text-[10px] mb-1">ハイシーズン</p>
          <p class="text-lg sm:text-2xl font-bold text-primary">¥${Number(mp.highSeason.avgNightly).toLocaleString('ja-JP')}</p>
          <p class="text-xs text-gray-500 mt-1">稼働率目安 <span class="font-bold text-primary">${mp.highSeason.occupancyPct}%</span></p>
        </div>
        <div class="col-span-2 flex flex-wrap gap-4 text-xs text-gray-600">
          <span><i class="fas fa-users text-accent mr-1"></i>${mp.guestProfile}</span>
          <span><i class="fas fa-calendar-alt text-accent mr-1"></i>ピーク：${mp.peakPeriod}</span>
        </div>
      </div>` : '';

    section.style.display = '';
    section.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="bg-white p-6 sm:p-10 rounded-sm shadow-md border-l-4 border-accent">
          <div class="mb-5 border-b border-gray-100 pb-4">
            <span class="text-accent font-bold tracking-widest text-xs mb-1 block">MARKET TREND &amp; PRICING</span>
            <h3 class="text-lg sm:text-2xl font-serif font-bold text-primary">${d.marketAnalysis.title}</h3>
          </div>
          ${highlightsHtml}
          ${accordionHtml}
          ${pricingHtml}
        </div>
      </div>
    `;

    // details open/close でシェブロン回転
    const det = section.querySelector('details');
    if (det) {
      det.addEventListener('toggle', () => {
        const chevron = det.querySelector('.details-chevron');
        if (chevron) chevron.style.transform = det.open ? 'rotate(90deg)' : '';
      });
    }
  }

  function applySeasonalCalendar(d) {
    const section = document.getElementById('seasonal-calendar');
    if (!section) return;

    if (d.cityKey === 'japan' || !d.seasonalCalendar || !d.seasonalCalendar.length) {
      section.style.display = 'none';
      return;
    }

    const levelColors = ['bg-gray-100', 'bg-blue-100', 'bg-yellow-100', 'bg-orange-300', 'bg-red-400'];
    const levelLabels = ['閃散', '低', '普通', '高', '超繁忙'];
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

    const barsHtml = d.seasonalCalendar.map((m) => {
      const lvl = Math.min(Math.max(m.demandLevel - 1, 0), 4);
      const heightMap = ['h-4','h-8','h-14','h-20','h-28'];
      return `
        <div class="flex flex-col items-center gap-1">
          <span class="text-[8px] sm:text-[10px] text-gray-500 text-center leading-tight max-w-[40px]">${m.note || ''}</span>
          <div class="w-6 sm:w-8 ${heightMap[lvl]} ${levelColors[lvl]} rounded-t-sm" title="${levelLabels[lvl]}"></div>
          <span class="text-[9px] sm:text-xs text-gray-500 font-medium">${typeof m.month === 'number' ? monthNames[m.month - 1] : m.month}</span>
        </div>`;
    }).join('');

    section.style.display = '';
    section.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-6">
          <span class="text-accent font-bold tracking-widest text-xs">SEASONAL DEMAND</span>
          <h3 class="text-lg sm:text-2xl font-serif font-bold text-primary mt-1">${d.cityShort}の繁忙期カレンダー</h3>
        </div>
        <div class="bg-white rounded-sm shadow-md p-4 sm:p-8">
          <div class="flex items-end justify-between gap-1">${barsHtml}</div>
          <div class="flex flex-wrap gap-3 mt-4 pt-3 border-t border-gray-100 justify-center">
            ${levelColors.map((c, i) => `<span class="flex items-center gap-1 text-[10px] text-gray-500"><span class="inline-block w-3 h-3 rounded-sm ${c} border border-gray-200"></span>${levelLabels[i]}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function applyLocalRegulations(d) {
    const section = document.getElementById('local-regulations');
    if (!section) return;

    if (d.cityKey === 'japan' || !d.localRegulations) {
      section.style.display = 'none';
      return;
    }

    const r = d.localRegulations;
    section.style.display = '';
    section.innerHTML = `
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-6">
          <span class="text-accent font-bold tracking-widest text-xs">REGULATIONS</span>
          <h3 class="text-lg sm:text-2xl font-serif font-bold text-primary mt-1">${d.cityShort}の民泊条例・法規情報</h3>
        </div>
        <div class="bg-white rounded-sm shadow-md border-l-4 border-accent overflow-hidden">
          <div class="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div class="p-5 sm:p-7">
              <dl class="space-y-3 text-sm">
                <div class="flex gap-3"><dt class="text-accent font-bold w-24 shrink-0">届出種別</dt><dd class="text-gray-700">${r.registrationType}</dd></div>
                <div class="flex gap-3"><dt class="text-accent font-bold w-24 shrink-0">年間上限日数</dt><dd class="text-gray-700">${r.maxAnnualDays}日</dd></div>
                <div class="flex gap-3"><dt class="text-accent font-bold w-24 shrink-0">市独自の制限</dt><dd class="text-gray-700">${r.cityRestrictions}</dd></div>
              </dl>
            </div>
            <div class="p-5 sm:p-7">
              <dl class="space-y-3 text-sm">
                <div class="flex gap-3"><dt class="text-accent font-bold w-24 shrink-0">届出先</dt><dd class="text-gray-700">${r.authority}</dd></div>
                <div class="flex gap-3"><dt class="text-accent font-bold w-24 shrink-0">注意事項</dt><dd class="text-gray-700">${r.keyNotes}</dd></div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function applyServicesCity(d) {
    if (d.cityKey === 'japan') return;

    const title = document.getElementById('services-city-title');
    if (title) title.textContent = `${d.cityShort}のワンストップ民泊運営代行`;

    const desc1 = document.getElementById('services-city-desc-1');
    if (desc1) desc1.textContent =
      `多言語対応・深夜対応含め、${d.cityShort}を訪れるゲストのすべての問い合わせを代行します。`;

    const desc2 = document.getElementById('services-city-desc-2');
    if (desc2) desc2.textContent =
      `${d.cityShort}の需要データとAIを活用したダイナミックプライシングで稼働率と単価を最適化。`;

    const desc3 = document.getElementById('services-city-desc-3');
    if (desc3) desc3.textContent =
      `${d.cityShort}エリアの近隣苦情・設備不具合・緊急トラブルまで、すべて弊社が窓口となります。`;
  }

  function applyLocalFaqs(d) {
    if (d.cityKey === 'japan') return;
    if (!d.localFaqs || !d.localFaqs.length) return;

    // 既存 FAQ セクション内の faq-local コンテナに地域固有 FAQ を注入する
    const container = document.getElementById('faq-local');
    if (!container) return;

    container.innerHTML = d.localFaqs.map(faq => `
      <div class="border border-gray-200 rounded-sm">
        <details class="group">
          <summary class="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-primary hover:bg-gray-50 transition">
            <span class="font-bold flex items-center">
              <span class="text-accent text-2xl mr-3 font-serif">Q.</span>${faq.q}
            </span>
            <span class="transition group-open:rotate-180">
              <i class="fas fa-chevron-down text-gray-400"></i>
            </span>
          </summary>
          <div class="text-gray-600 mt-0 border-t border-gray-100 p-5 bg-gray-50 text-sm leading-relaxed flex">
            <span class="text-primary text-2xl font-serif font-bold mr-3">A.</span>
            <p class="mt-1">${faq.a}</p>
          </div>
        </details>
      </div>
    `).join('');
  }

  /* ─────────────────────────────────────────
     5. 距離計算ユーティリティ
  ───────────────────────────────────────── */

  // ハーバーサイン公式（2点間の距離 km）
  function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (v) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // 距離 → 交通費ティア
  function kmToTransportFee(km) {
    if (km < 3) return 0;
    if (km <= 6) return 1000;
    if (km <= 12) return 2000;
    if (km <= 18) return 3000;
    if (km <= 25) return 4000;
    return 5000;
  }

  // 国土地理院 AddressSearch → {lat, lng} | null
  // GeoJSON 座標は [経度, 緯度] の順
  async function geocodeAddress(text) {
    try {
      const res = await fetch(
        `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(text)}`
      );
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const [lng, lat] = json[0].geometry.coordinates;
        return { lat, lng };
      }
    } catch (e) {
      console.warn('[regional.js] geocodeAddress failed:', text, e);
    }
    return null;
  }

  // 市区町村座標キャッシュ（ページ内で使い回す）
  const _municipalityCache = {};

  /* ─────────────────────────────────────────
     6. AIシミュレーター
  ───────────────────────────────────────── */

  // d: 都市データ。全国トップページでは該当する都市がないため null が渡される。
  // 全国モードでは郵便番号から都道府県を特定し、その県の拠点都市だけを交通費の候補にする。
  function initSimulator(d, allData) {
    const form = document.getElementById('sim-form');
    if (!form) return;

    const areaSelect = document.getElementById('sim-area');
    const guestSelect = document.getElementById('sim-guests');
    const zipcodeInput = document.getElementById('sim-zipcode');
    const planSelect = document.getElementById('sim-plan');
    const zipcodeStatus = document.getElementById('sim-zipcode-status');
    const zipcodeIcon = document.getElementById('sim-zipcode-icon');

    if (!areaSelect || !guestSelect || !zipcodeInput || !planSelect) return;

    // 郵便番号ルックアップで確定した交通費（状態変数）
    let transportFee = 0;
    let transportLabel = '';
    let resolvedAddress = '';
    let zipcodeTimer = null;

    // ── 計算ヘルパー ──────────────────────────────────────────
    // プラン係数は基本清掃料と人数オプションにのみ掛ける。交通費は実費のため対象外。
    // 各項目を丸めてから合算することで、モーダルの内訳と合計が必ず一致する。
    function calcBreakdown() {
      const guests = parseInt(guestSelect.value, 10);
      const qualityCoeff = parseFloat(planSelect.value);
      const basePrice = Math.round(parseInt(areaSelect.value, 10) * qualityCoeff);
      const guestSurcharge = Math.round(Math.max(0, guests - 2) * 500 * qualityCoeff);
      const totalExTax = basePrice + guestSurcharge + transportFee;
      const totalInTax = Math.round(totalExTax * 1.1);

      return {
        basePrice, guests, qualityCoeff,
        guestSurcharge, transportFee, transportLabel, resolvedAddress,
        totalExTax, totalInTax,
        areaLabel: areaSelect.options[areaSelect.selectedIndex].dataset.label,
        planLabel: planSelect.options[planSelect.selectedIndex].text.split('—')[0].trim(),
      };
    }

    // ── 拠点一覧 ──────────────────────────────────────────────
    // 都市ページは自都市のみ、全国ページは全都市を候補に持つ。
    const isNational = !d;
    const bases = (isNational ? Object.values(allData) : [d]).map((c) => ({
      prefName: c.prefName,
      municipalities: c.municipalities || [],
    }));
    const scopeLabel = isNational ? '全国' : d.cityShort;

    /**
     * 郵便番号の都道府県に一致する拠点の市区町村を [{prefName, mun}] で返す。
     * 同一県の都市は同じ市区町村を重複して持つため（例: 北海道の5都市は同一の9市区町村）、
     * ジオコーディング回数を抑えるよう重複を除去する。
     */
    function candidatesInPref(prefName) {
      const seen = new Set();
      return bases
        .filter((b) => b.prefName === prefName)
        .flatMap((b) => b.municipalities.map((mun) => ({ prefName: b.prefName, mun })))
        .filter((c) => !seen.has(c.mun) && seen.add(c.mun));
    }

    // ── 市区町村座標を取得（キャッシュ付き） ──────────────────────
    // 「都道府県名 + 市区町村名 + 1丁目1番地」で GSI ジオコーディング
    async function getMunicipalityCoords(prefName, municipality) {
      const key = `${prefName}${municipality}`;
      if (_municipalityCache[key]) return _municipalityCache[key];

      // まず「1丁目1番地」で試み、取れなければ市区町村名だけにフォールバック
      const coords =
        (await geocodeAddress(`${prefName}${municipality}1丁目1番地`)) ||
        (await geocodeAddress(`${prefName}${municipality}`));

      if (coords) _municipalityCache[key] = coords;
      return coords;
    }

    // 都市ページのみ、自都市の市区町村座標をバックグラウンドで先取りしておく
    // → ユーザーが郵便番号を入力し終える頃にはキャッシュ済みになる
    // 全国ページは対象が43都市分と多すぎるため、入力後に該当県のぶんだけ取得する
    if (!isNational) {
      Promise.all(
        bases[0].municipalities.map((m) => getMunicipalityCoords(bases[0].prefName, m))
      ).catch(() => { });
    }

    // ── 郵便番号 → 物件座標取得 → 最近傍市区町村を算出 ──────────
    async function lookupZipcode(digits7) {
      if (zipcodeStatus) {
        zipcodeStatus.textContent = '住所を検索中...';
        zipcodeStatus.className = 'text-xs mt-1.5 text-gray-400 min-h-[1.25rem]';
      }
      if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      try {
        // ① zipcloud → 日本語住所テキスト
        const zcRes = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${digits7}`);
        const zcJson = await zcRes.json();

        if (!zcJson.results || zcJson.results.length === 0) {
          if (zipcodeStatus) {
            zipcodeStatus.textContent = '該当する住所が見つかりませんでした。郵便番号をご確認ください。';
            zipcodeStatus.className = 'text-xs mt-1.5 text-red-500 min-h-[1.25rem]';
          }
          if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-times-circle text-red-400"></i>';
          return;
        }

        const r = zcJson.results[0];
        resolvedAddress = r.address1 + r.address2 + r.address3;

        // ② 対応エリア判定
        // 都道府県に拠点があり、かつ市区町村が対応リストに含まれているか
        const candidates = candidatesInPref(r.address1);
        const isPrefMatch = candidates.length > 0;
        const isMunMatch = candidates.some((c) => r.address2.includes(c.mun) || c.mun.includes(r.address2));
        const isCovered = isPrefMatch && isMunMatch;

        if (!isCovered) {
          transportFee = 0;
          const reason = !isPrefMatch ? `${r.address1}は対象外です` : `${r.address2}は現在エリア外です`;
          if (zipcodeStatus) {
            zipcodeStatus.innerHTML = `<i class="fas fa-exclamation-triangle text-orange-500 mr-1"></i>住所：${resolvedAddress}<br><span class="text-orange-600 font-bold">【エリア外】</span> ${reason}`;
            zipcodeStatus.className = 'text-xs mt-1.5 min-h-[1.25rem] leading-relaxed';
          }
          if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-exclamation-triangle text-orange-400"></i>';
          return;
        }

        // ③ GSI で物件の座標を取得
        if (zipcodeStatus) {
          zipcodeStatus.textContent = '最寄り拠点を計算中...';
        }
        const propCoords = await geocodeAddress(resolvedAddress);

        if (!propCoords) {
          transportFee = 0;
          transportLabel = '（担当者が交通費を確認します）';
          if (zipcodeStatus) {
            zipcodeStatus.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>住所：${resolvedAddress}<br><span class="text-green-600 font-bold">【エリア内】</span> 交通費は担当者が確認します`;
            zipcodeStatus.className = 'text-xs mt-1.5 min-h-[1.25rem] leading-relaxed';
          }
          if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
          return;
        }

        // ③ 該当県の拠点市区町村の「1丁目1番地」座標を取得（キャッシュ済みなら即返却）
        const munCoords = await Promise.all(
          candidates.map((c) => getMunicipalityCoords(c.prefName, c.mun))
        );

        // ④ 最も近い市区町村を特定
        let minKm = Infinity;
        let nearestMun = null;

        candidates.forEach((c, i) => {
          if (!munCoords[i]) return;
          const km = haversineKm(munCoords[i].lat, munCoords[i].lng, propCoords.lat, propCoords.lng);
          if (km < minKm) { minKm = km; nearestMun = c.mun; }
        });

        if (nearestMun === null) {
          // 市区町村の座標が全滅した場合のフォールバック
          transportFee = 0;
          transportLabel = '（担当者が交通費を確認します）';
          if (zipcodeStatus) {
            zipcodeStatus.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>住所：${resolvedAddress}<br><span class="text-green-600 font-bold">【エリア内】</span> 交通費は担当者が確認します`;
            zipcodeStatus.className = 'text-xs mt-1.5 min-h-[1.25rem] leading-relaxed';
          }
          if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';
          return;
        }

        // ⑤ 距離 → 交通費
        transportFee = kmToTransportFee(minKm);
        transportLabel = transportFee === 0
          ? `${nearestMun}拠点（交通費なし）`
          : `${nearestMun}拠点から約${Math.round(minKm)}km（交通費 ¥${transportFee.toLocaleString()}）`;

        if (zipcodeStatus) {
          zipcodeStatus.innerHTML = `<i class="fas fa-check-circle text-green-500 mr-1"></i>住所：${resolvedAddress}<br><span class="text-green-600 font-bold">【エリア内】</span> ${transportLabel}`;
          zipcodeStatus.className = 'text-xs mt-1.5 min-h-[1.25rem] leading-relaxed';
        }
        if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-check-circle text-green-500"></i>';

      } catch (err) {
        console.error('[regional.js] Zipcode lookup failed:', err);
        if (zipcodeStatus) {
          zipcodeStatus.textContent = '住所の取得に失敗しました。再度お試しください。';
          zipcodeStatus.className = 'text-xs mt-1.5 text-red-500 min-h-[1.25rem]';
        }
        if (zipcodeIcon) zipcodeIcon.innerHTML = '<i class="fas fa-exclamation-circle text-red-400"></i>';
      }
    }

    // ── 郵便番号 input ハンドラ（自動フォーマット＋デバウンス） ──
    zipcodeInput.addEventListener('input', (e) => {
      let digits = e.target.value.replace(/[^0-9]/g, '').slice(0, 7);
      e.target.value = digits.length > 3 ? `${digits.slice(0, 3)}-${digits.slice(3)}` : digits;

      // 交通費をリセット
      transportFee = 0;
      transportLabel = '';
      resolvedAddress = '';
      if (zipcodeIcon) zipcodeIcon.innerHTML = '';
      if (zipcodeStatus) {
        zipcodeStatus.textContent = '郵便番号を入力すると交通費が自動で計算されます';
        zipcodeStatus.className = 'text-xs mt-1.5 text-gray-400 min-h-[1.25rem]';
      }

      clearTimeout(zipcodeTimer);
      if (digits.length === 7) {
        zipcodeTimer = setTimeout(() => lookupZipcode(digits), 400);
      }
    });

    // ── モーダルを開く ────────────────────────────────────────
    function openSimModal() {
      const b = calcBreakdown();
      const modal = document.getElementById('sim-modal');
      const body = document.getElementById('sim-modal-body');
      if (!modal || !body) return;

      body.innerHTML = `
        <!-- 選択条件サマリー -->
        <div class="text-xs text-gray-500 text-center mb-6 space-y-0.5">
          <p>${scopeLabel}エリア ／ ${b.areaLabel} ／ 宿泊${b.guests}名 ／ ${b.planLabel}</p>
          ${b.resolvedAddress ? `<p class="text-gray-400">${b.resolvedAddress}</p>` : ''}
        </div>

        <!-- 概算金額（大きく表示） -->
        <div class="bg-primary/5 border border-primary/10 rounded-sm p-6 text-center mb-6">
          <p class="text-xs text-gray-400 tracking-widest mb-2">概算お見積もり</p>
          <p class="text-5xl font-bold text-primary font-serif leading-none mb-2">¥${b.totalExTax.toLocaleString()}</p>
          <p class="text-sm text-gray-400">税込 ¥${b.totalInTax.toLocaleString()}</p>
        </div>

        <!-- 簡易内訳（計算式は非表示） -->
        <div class="text-sm text-gray-500 mb-6 space-y-2 px-1">
          <div class="flex justify-between">
            <span>基本清掃料<span class="block text-xs text-gray-400">リネンクリーニング費を含む</span></span>
            <span class="text-gray-700">¥${b.basePrice.toLocaleString()}</span>
          </div>
          ${b.guestSurcharge > 0 ? `
          <div class="flex justify-between">
            <span>人数オプション（${b.guests}名）</span>
            <span class="text-gray-700">+¥${b.guestSurcharge.toLocaleString()}</span>
          </div>` : ''}
          ${b.transportFee > 0 ? `
          <div class="flex justify-between">
            <span>交通費</span>
            <span class="text-gray-700">+¥${b.transportFee.toLocaleString()}</span>
          </div>` : ''}
          <div class="flex justify-between font-bold text-primary border-t border-gray-200 pt-2">
            <span>合計（税抜）</span>
            <span>¥${b.totalExTax.toLocaleString()}</span>
          </div>
        </div>

        <p class="text-[10px] text-gray-400 text-center mb-6">
          ※ 上記は目安です。物件の状態・オプション追加等により変動します。
        </p>

        <!-- LINE CTA -->
        <a href="${LINE_URL}" target="_blank" rel="noopener"
          class="flex items-center justify-center w-full px-6 py-4 bg-[#06C755] hover:bg-[#05b04b] text-white font-bold rounded shadow-md transition duration-300 text-sm mb-3">
          <i class="fab fa-line text-xl mr-2.5"></i>
          LINEで詳細見積もりをする（無料）
        </a>

        <!-- フォーム CTA -->
        <a href="#contact" onclick="window.closeSimModal()"
          class="flex items-center justify-center w-full px-6 py-3 border border-primary text-primary hover:bg-primary hover:text-white font-bold rounded transition duration-300 text-sm">
          <i class="fas fa-envelope mr-2"></i>
          お問い合わせフォームで相談する
        </a>
      `;

      modal.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    }

    // ── モーダルを閉じる（グローバル公開） ──────────────────────
    window.closeSimModal = function () {
      const modal = document.getElementById('sim-modal');
      if (modal) modal.classList.add('hidden');
      document.body.style.overflow = '';
    };

    // ESC キーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.closeSimModal();
    });

    // ── フォーム送信 ──────────────────────────────────────────
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      openSimModal();
    });
  }

  /* ─────────────────────────────────────────
     8. note 記事フィード
  ───────────────────────────────────────── */

  const NOTE_INITIAL_COUNT = 6;
  const NOTE_LOAD_MORE_COUNT = 3;

  function buildArticleCard(a) {
    const imgHtml = a.img
      ? `<img src="${a.img}" alt="${a.title}" class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">`
      : `<div class="w-full h-full bg-gray-200 flex items-center justify-center"><i class="fas fa-pen-nib text-4xl text-gray-400"></i></div>`;
    return `<a href="${a.url}" target="_blank" rel="noopener" class="bg-white rounded-sm shadow hover:shadow-md transition overflow-hidden group flex flex-col"><div class="h-32 sm:h-44 overflow-hidden">${imgHtml}</div><div class="p-3 sm:p-6 flex flex-col flex-grow"><span class="text-[10px] sm:text-xs font-bold text-accent tracking-wider mb-1 sm:mb-2">${a.tag}</span><h4 class="font-bold text-primary text-xs sm:text-sm leading-snug flex-grow mb-2 sm:mb-4">${a.title}</h4><div class="flex justify-between items-center text-[10px] sm:text-xs text-gray-400"><span>${a.date}</span><span class="text-accent font-medium">続きを読む →</span></div></div></a>`;
  }

  async function renderNoteFeed() {
    const container = document.getElementById('note-feed-grid');
    const loadMoreBtn = document.getElementById('note-load-more');
    if (!container) return;

    // ローディングスケルトンを6個表示
    const skeletonItem = '<div class="bg-white rounded-sm shadow overflow-hidden flex flex-col animate-pulse"><div class="h-32 sm:h-44 bg-gray-200"></div><div class="p-3 sm:p-6 flex flex-col gap-2 sm:gap-3"><div class="h-2 sm:h-3 bg-gray-200 rounded w-1/3"></div><div class="h-3 sm:h-4 bg-gray-200 rounded w-full"></div><div class="h-3 sm:h-4 bg-gray-200 rounded w-4/5"></div></div></div>';
    container.innerHTML = skeletonItem.repeat(6);

    let allArticles = [];
    try {
      const res = await fetch('/.netlify/functions/note-feed');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      allArticles = data.length > 0 ? data : NOTE_ARTICLES_FALLBACK;
    } catch (_) {
      allArticles = NOTE_ARTICLES_FALLBACK;
    }

    let displayedCount = Math.min(NOTE_INITIAL_COUNT, allArticles.length);
    container.innerHTML = allArticles.slice(0, displayedCount).map(buildArticleCard).join('');

    if (loadMoreBtn) {
      if (allArticles.length > NOTE_INITIAL_COUNT) {
        loadMoreBtn.classList.remove('hidden');
        loadMoreBtn.addEventListener('click', function onLoadMore() {
          const next = allArticles.slice(displayedCount, displayedCount + NOTE_LOAD_MORE_COUNT);
          next.forEach((a) => container.insertAdjacentHTML('beforeend', buildArticleCard(a)));
          displayedCount += next.length;
          if (displayedCount >= allArticles.length) {
            loadMoreBtn.removeEventListener('click', onLoadMore);
            loadMoreBtn.classList.add('hidden');
          }
        });
      } else {
        loadMoreBtn.classList.add('hidden');
      }
    }
  }

  function applyFooter(d) {
    setText('footer-tagline', `${d.cityShort}の民泊を、リゾート・クオリティへ。`);
  }

  /* ─────────────────────────────────────────
     9. SEO: canonical URL + LocalBusiness JSON-LD
  ───────────────────────────────────────── */

  function applySeoTags(d, cityKey) {
    const origin = window.location.origin;

    // ── canonical URL ──────────────────────────────────────────────
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = cityKey === 'japan' ? `${origin}/` : `${origin}/${cityKey}/`;

    // ── OGP image（都市ヒーロー画像を流用） ─────────────────────────
    const heroImageUrl = toCanonicalUrl(d.heroImage, origin);
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', heroImageUrl);
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute('content', heroImageUrl);

    // ── LocalBusiness JSON-LD ──────────────────────────────────────
    const existingLd = document.getElementById('ld-local-business');
    if (existingLd) existingLd.remove();

    const areaServed = d.cityKey === 'japan'
      ? { '@type': 'Country', 'name': '日本' }
      : {
          '@type': 'City',
          'name': d.cityName,
          'containedInPlace': {
            '@type': 'AdministrativeArea',
            'name': d.prefName
          }
        };

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': d.cityKey === 'japan'
        ? 'Minpaku Resort（民泊リゾート）全国対応'
        : `Minpaku Resort（民泊リゾート）${d.cityShort}`,
      'description': d.seoDescription,
      'url': cityKey === 'japan' ? `${origin}/` : `${origin}/${cityKey}/`,
      'image': toCanonicalUrl(d.heroImage, origin),
      'areaServed': areaServed,
      'serviceType': ['民泊運営代行', '民泊清掃代行', '民泊コンサルティング'],
      'telephone': '',
      'sameAs': ['https://lin.ee/RtLPqmQ']
    };

    const script = document.createElement('script');
    script.id = 'ld-local-business';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  /* ─────────────────────────────────────────
     10. 全データ一括適用
  ───────────────────────────────────────── */

  function applyData(d, cityKey, allData) {
    applyMeta(d);
    applyHero(d);
    applyProblems(d);
    applyLocalRules(d);
    applyStaff();
    applyAreas(d, allData);
    applyCleaningFocus(d);
    applyCaseStudies(d);
    applyVoices(d);
    applyMarketAnalysis(d);
    applySeasonalCalendar(d);
    applyLocalRegulations(d);
    applyServicesCity(d);
    applyLocalFaqs(d);
    initSimulator(d, allData);
    renderNoteFeed();
    applyFooter(d);
    applySeoTags(d, cityKey);
  }

  /* ─────────────────────────────────────────
     10. ローダー制御
  ───────────────────────────────────────── */

  let loaderHidden = false;

  function hideLoader() {
    // タイムアウト・fetch成功・エラーの各パスから呼ばれるため冪等にする
    if (loaderHidden) return;
    loaderHidden = true;

    const loader = document.getElementById('page-loader');
    if (!loader) return;
    loader.classList.add('is-hidden');

    // prefers-reduced-motion 時はブラウザが transition をスキップするため
    // transitionend が発火しない → 計算済み duration を確認して即時削除にフォールバック
    const duration = parseFloat(getComputedStyle(loader).transitionDuration) * 1000 || 0;
    const scrollToHash = () => {
      const hash = window.location.hash;
      if (hash) {
        const target = document.querySelector(hash);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (duration > 0) {
      loader.addEventListener('transitionend', () => { loader.remove(); scrollToHash(); }, { once: true });
    } else {
      loader.remove();
      scrollToHash();
    }
  }

  // ヒーロー画像をプリロードする。成功・失敗・タイムアウトのいずれでも resolve する。
  function preloadHeroImage(url) {
    return new Promise((resolve) => {
      if (!url) { resolve(); return; }
      const img = new Image();
      // 安全タイムアウト: 画像が遅くてもローダーを最大 3s 以上待たせない
      const t = setTimeout(resolve, 3000);
      img.onload = img.onerror = () => { clearTimeout(t); resolve(); };
      img.src = url;
    });
  }

  const loaderTimeout = setTimeout(hideLoader, 5000);

  /* ─────────────────────────────────────────
     11. エントリーポイント
  ───────────────────────────────────────── */

  const cityPath = getCityFromPath();

  // file:// プロトコル: CITY_ASSETS_BASE による相対パス
  // http(s)://: ルート絶対パスで確実に解決（CITY_ASSETS_BASE の検出に依存しない）
  const citiesJsonUrl = window.location.protocol === 'file:'
    ? (CITY_ASSETS_BASE + 'data/cities.json')
    : '/data/cities.json';

  fetch(citiesJsonUrl)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((allData) => {
      const data = allData[cityPath];

      // 全国トップページ（cityPath が DEFAULT_CITY）や未知のパスには対応する都市データがない。
      // ページ内容は静的 HTML のままとし、シミュレーターだけ全国モードで初期化する。
      const run = !data
        ? () => {
          applyAreas({ cityKey: DEFAULT_CITY }, allData);
          initSimulator(null, allData);
          clearTimeout(loaderTimeout);
          hideLoader();
        }
        : () => {
          // ① ヒーロー画像のプリロードを開始（DOM 適用と並行して実行）
          const heroImageUrl = toAssetUrl(data.heroImage);
          const heroReady = preloadHeroImage(heroImageUrl);
          // ② データを DOM に適用（backgroundImage のセットも含む）
          applyData(data, cityPath, allData);
          // ③ ヒーロー画像の読み込みが完了してからローダーを非表示にする
          heroReady.then(() => {
            clearTimeout(loaderTimeout);
            hideLoader();
          });
        };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
      } else {
        run();
      }
    })
    .catch((err) => {
      console.error('[regional.js] Failed to load prefecture data:', err);
      clearTimeout(loaderTimeout);
      hideLoader();
    });

})();

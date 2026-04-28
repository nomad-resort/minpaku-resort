/**
 * regional.js — Minpaku Resort マスターテンプレート 地域データ注入モジュール
 *
 * 動作概要:
 *   1. window.location.hostname からサブドメインを検出
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

  const DEFAULT_CITY = 'naha';

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
      console.log('[regional.js] Local/Direct access detected. Using default:', DEFAULT_CITY);
      return DEFAULT_CITY;
    }

    const sub = parts[0];
    if (sub === 'www') return DEFAULT_CITY;

    console.log('[regional.js] Subdomain detected:', sub);
    return sub;
  }

  /* ─────────────────────────────────────────
     2. ユーティリティ
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
    setText('seo-h1', `${d.cityShort}の民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）`);
    setText('hero-tagline', d.heroTagline);
    setText('hero-copy', d.heroCopy);
    setText('hero-subcopy', d.heroSubcopy);
  }

  function applyProblems(d) {
    const el = document.getElementById('problems-conclusion');
    if (el) {
      el.innerHTML =
        `そのお悩み、<span class="text-accent font-bold">Minpaku Resort</span>にお任せください。<br>` +
        `${d.cityShort}エリアの地域特性を熟知した私たちが、すべて解決いたします。`;
    }
  }

  function applyLocalRules(d) {
    const container = document.getElementById('local-rules-grid');
    if (!container) return;

    setText('local-rules-title', `${d.cityShort}だからこそ、気をつけたいこと`);

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
      `${d.cityShort}を含む${d.prefName}内の主要エリアを中心にサービスを提供しております。掲載のない地域もお気軽にご相談ください。`
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
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-1 sm:gap-0">
          <span class="text-gray-600 font-medium">${s.label}</span>
          <span class="text-3xl font-bold text-primary">${s.value}<span class="text-lg ${s.unit.includes('%') ? '' : 'text-gray-500'}">${s.unit}</span></span>
        </div>
      `).join('');

      return `
        <div class="bg-white rounded-sm overflow-hidden shadow-2xl flex flex-col">
          <div class="h-64 overflow-hidden relative">
            <img src="${c.image}" alt="${c.name}" class="w-full h-full object-cover">
            <div class="absolute top-4 right-4 bg-${accentClass} text-white px-3 py-1 font-bold rounded-sm text-sm">
              ${c.type}
            </div>
          </div>
          <div class="p-8 flex-grow">
            <h4 class="text-2xl font-serif font-bold text-primary mb-2">${c.name}</h4>
            <p class="text-gray-500 text-sm mb-6 pb-4 border-b border-gray-100">${c.location}</p>
            <div class="space-y-4">
              ${statsHtml}
            </div>
            <p class="mt-6 text-sm text-gray-600 bg-gray-50 p-4 rounded border-l-2 ${borderClass}">
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
      <div class="bg-white p-8 rounded-sm shadow relative">
        <i class="fas fa-quote-left text-4xl text-gray-200 absolute top-6 left-6"></i>
        <div class="relative z-10 pl-6 pt-4">
          <div class="flex items-center mb-6">
            <img src="${v.image}" alt="${v.name}" class="w-16 h-16 rounded-full object-cover border-2 border-accent">
            <div class="ml-4">
              <h4 class="font-bold text-primary text-lg">${v.name} / ${v.title}</h4>
              <div class="text-accent text-sm">
                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
              </div>
            </div>
          </div>
          <h5 class="text-xl font-bold text-primary mb-3">${v.quote}</h5>
          <p class="text-gray-600 text-sm leading-relaxed">${v.body}</p>
        </div>
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

  function initSimulator(d) {
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
    function calcBreakdown() {
      const basePrice = parseInt(areaSelect.value, 10);
      const guests = parseInt(guestSelect.value, 10);
      const qualityCoeff = parseFloat(planSelect.value);
      const guestSurcharge = Math.max(0, guests - 2) * 500;
      const totalExTax = Math.round((basePrice + guestSurcharge + transportFee) * qualityCoeff);
      const totalInTax = Math.round(totalExTax * 1.1);

      return {
        basePrice, guests, qualityCoeff,
        guestSurcharge, transportFee, transportLabel, resolvedAddress,
        totalExTax, totalInTax,
        areaLabel: areaSelect.options[areaSelect.selectedIndex].dataset.label,
        planLabel: planSelect.options[planSelect.selectedIndex].text.split('—')[0].trim(),
      };
    }

    // ── 市区町村座標を取得（キャッシュ付き） ──────────────────────
    // 「都道府県名 + 市区町村名 + 1丁目1番地」で GSI ジオコーディング
    async function getMunicipalityCoords(municipality) {
      const key = `${d.prefName}${municipality}`;
      if (_municipalityCache[key]) return _municipalityCache[key];

      // まず「1丁目1番地」で試み、取れなければ市区町村名だけにフォールバック
      const coords =
        (await geocodeAddress(`${d.prefName}${municipality}1丁目1番地`)) ||
        (await geocodeAddress(`${d.prefName}${municipality}`));

      if (coords) _municipalityCache[key] = coords;
      return coords;
    }

    // ページ読み込み時に全市区町村の座標をバックグラウンドで先取りしておく
    // → ユーザーが郵便番号を入力し終える頃にはキャッシュ済みになる
    Promise.all(d.municipalities.map(getMunicipalityCoords)).catch(() => { });

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
        // 都道府県が一致し、かつ市区町村が対応リストに含まれているか
        const isPrefMatch = r.address1 === d.prefName;
        const isMunMatch = d.municipalities.some((m) => r.address2.includes(m) || m.includes(r.address2));
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

        // ③ 全市区町村の「1丁目1番地」座標を取得（キャッシュ済みなら即返却）
        const munCoords = await Promise.all(d.municipalities.map(getMunicipalityCoords));

        // ④ 最も近い市区町村を特定
        let minKm = Infinity;
        let nearestMun = null;

        d.municipalities.forEach((mun, i) => {
          if (!munCoords[i]) return;
          const km = haversineKm(munCoords[i].lat, munCoords[i].lng, propCoords.lat, propCoords.lng);
          if (km < minKm) { minKm = km; nearestMun = mun; }
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
          <p>${d.cityShort}エリア ／ ${b.areaLabel} ／ 宿泊${b.guests}名 ／ ${b.planLabel}</p>
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
            <span>基本清掃料</span>
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

  function renderArticleCards(container, articles) {
    container.innerHTML = articles.map((a) => {
      const imgHtml = a.img
        ? `<img src="${a.img}" alt="${a.title}"
              class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">`
        : `<div class="w-full h-full bg-gray-200 flex items-center justify-center">
              <i class="fas fa-pen-nib text-4xl text-gray-400"></i>
           </div>`;
      return `
        <a href="${a.url}" target="_blank" rel="noopener"
          class="bg-white rounded-sm shadow hover:shadow-md transition overflow-hidden group flex flex-col">
          <div class="h-44 overflow-hidden">
            ${imgHtml}
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
      `;
    }).join('');
  }

  async function renderNoteFeed() {
    const container = document.getElementById('note-feed-grid');
    if (!container) return;

    // ローディングスケルトンを表示
    container.innerHTML = [1, 2, 3].map(() => `
      <div class="bg-white rounded-sm shadow overflow-hidden flex flex-col animate-pulse">
        <div class="h-44 bg-gray-200"></div>
        <div class="p-6 flex flex-col gap-3">
          <div class="h-3 bg-gray-200 rounded w-1/3"></div>
          <div class="h-4 bg-gray-200 rounded w-full"></div>
          <div class="h-4 bg-gray-200 rounded w-4/5"></div>
        </div>
      </div>
    `).join('');

    try {
      const res = await fetch('/.netlify/functions/note-feed');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const articles = await res.json();

      // 記事が取得できた場合はそれを表示、空なら静的フォールバック
      renderArticleCards(container, articles.length > 0 ? articles : NOTE_ARTICLES_FALLBACK);
    } catch (_) {
      // ネットワークエラー or ローカル開発環境 → フォールバック
      renderArticleCards(container, NOTE_ARTICLES_FALLBACK);
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
    canonical.href = `${origin}/`;

    // ── OGP image（都市ヒーロー画像を流用） ─────────────────────────
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', `${origin}/${d.heroImage}`);
    const twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute('content', `${origin}/${d.heroImage}`);

    // ── LocalBusiness JSON-LD ──────────────────────────────────────
    const existingLd = document.getElementById('ld-local-business');
    if (existingLd) existingLd.remove();

    const ld = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      'name': `Minpaku Resort（民泊リゾート）${d.cityShort}`,
      'description': d.seoDescription,
      'url': `${origin}/`,
      'image': `${origin}/${d.heroImage}`,
      'areaServed': {
        '@type': 'City',
        'name': d.cityName,
        'containedInPlace': {
          '@type': 'AdministrativeArea',
          'name': d.prefName
        }
      },
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

  function applyData(d, cityKey) {
    applyMeta(d);
    applyHero(d);
    applyProblems(d);
    applyLocalRules(d);
    applyStaff();
    applyAreas(d);
    applyCleaningFocus(d);
    applyCaseStudies(d);
    applyVoices(d);
    initSimulator(d);
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
    if (duration > 0) {
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    } else {
      loader.remove();
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

  const subdomain = getSubdomain();

  fetch('data/cities.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((allData) => {
      const cityKey = allData[subdomain] ? subdomain : DEFAULT_CITY;
      const data = allData[cityKey];
      const run = () => {
        // ① ヒーロー画像のプリロードを開始（DOM 適用と並行して実行）
        const heroReady = preloadHeroImage(data.heroImage);
        // ② データを DOM に適用（backgroundImage のセットも含む）
        applyData(data, cityKey);
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

/**
 * regional.js — Minpaku Resort マスターテンプレート 地域データ注入モジュール
 *
 * 動作概要:
 *   1. window.location.hostname からサブドメインを検出
 *   2. /data/prefectures.json を fetch
 *   3. 該当都道府県のデータを DOM に注入
 *   4. ビフォーアフタースライダー / AIシミュレーター を初期化
 */

(function () {
  'use strict';

  var DEFAULT_PREF = 'okinawa';

  /* ─────────────────────────────────────────
     1. サブドメイン / クエリパラメータ検出
  ───────────────────────────────────────── */
  function getSubdomain() {
    // 1. URLパラメータ '?pref=xxx' を優先 (デバッグ用)
    var params = new URLSearchParams(window.location.search);
    var prefParam = params.get('pref');
    if (prefParam) {
      console.log('[regional.js] Using prefecture from URL parameter:', prefParam);
      return prefParam;
    }

    // 2. ホスト名からサブドメインを抽出
    var hostname = window.location.hostname; // e.g. tokyo.minpaku-resort.com
    var parts = hostname.split('.');

    // localhost / 単一ホスト / IPアドレスなどの場合はデフォルト
    if (parts.length < 3 || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      console.log('[regional.js] Local/Direct access detected. Using default:', DEFAULT_PREF);
      return DEFAULT_PREF;
    }

    var sub = parts[0];
    if (sub === 'www') return DEFAULT_PREF;

    console.log('[regional.js] Subdomain detected:', sub);
    return sub;
  }

  /* ─────────────────────────────────────────
     2. LINE URLスキーム生成
  ───────────────────────────────────────── */
  function generateSimId() {
    return 'SIM' + Date.now().toString(36).toUpperCase().slice(-6);
  }

  function buildLineUrl(lineBase, simId, prefShort) {
    // 診断結果や入力テキストを利用する場合は、公式LINE側でWebhookを利用した自動応答等で拾う形になります。
    // lin.eeの短縮URLでは "?text=" の自動入力が対応していないため、固定のリンクを返します。
    return 'https://lin.ee/RtLPqmQ';
  }

  /* ─────────────────────────────────────────
     3. ユーティリティ
  ───────────────────────────────────────── */
  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHTML(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  /* ─────────────────────────────────────────
     4. DOM 注入: 各セクション
  ───────────────────────────────────────── */

  function applyMeta(d) {
    document.title = d.seoTitle;
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', d.seoDescription);

    // OGP (あれば)
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', d.seoTitle);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', d.seoDescription);
  }

  function applyHero(d) {
    // 背景画像
    var heroSection = document.getElementById('hero-section');
    if (heroSection) {
      heroSection.style.backgroundImage =
        'linear-gradient(rgba(15,23,42,0.7), rgba(15,23,42,0.4)), url(\'' +
        d.heroImage + '\')';
      heroSection.style.backgroundSize = 'cover';
      heroSection.style.backgroundPosition = 'center';
    }
    setText('hero-tagline', d.heroTagline);
    setText('hero-copy', d.heroCopy);
    setText('hero-subcopy', d.heroSubcopy);
    setText('seo-h1', d.prefShort + 'の民泊 運営代行・清掃代行ならMinpaku Resort（民泊リゾート）');
  }

  function applyProblems(d) {
    var el = document.getElementById('problems-conclusion');
    if (el) {
      el.innerHTML =
        'そのお悩み、<span class="text-accent font-bold">Minpaku Resort</span>にお任せください。<br>' +
        d.prefShort + 'エリアの地域特性を熟知した私たちが、すべて解決いたします。';
    }
  }

  function applyLocalRules(d) {
    var container = document.getElementById('local-rules-grid');
    if (!container) return;
    setText('local-rules-title', d.prefShort + 'だからこそ、気をつけたいこと');

    container.innerHTML = d.localRules.map(function (r) {
      return (
        '<div class="bg-white rounded-sm shadow-sm border border-gray-100 p-7 hover:shadow-md transition duration-300">' +
          '<div class="flex items-start mb-4">' +
            '<div class="w-12 h-12 bg-primary/5 border border-accent/30 rounded-full flex items-center justify-center mr-4 flex-shrink-0">' +
              '<i class="' + r.icon + ' text-accent text-lg"></i>' +
            '</div>' +
            '<div>' +
              '<span class="text-[10px] font-bold text-accent tracking-widest uppercase">' + r.highlight + '</span>' +
              '<h4 class="text-base font-bold text-primary leading-snug">' + r.title + '</h4>' +
            '</div>' +
          '</div>' +
          '<p class="text-gray-600 text-sm leading-relaxed">' + r.body + '</p>' +
        '</div>'
      );
    }).join('');
  }

  var FIXED_STAFF = [
    {
      name: '運営ディレクター',
      role: 'OPERATION DIRECTOR',
      message: '全国の運営ノウハウを蓄積し、最適な運用フローを構築。収益性と品質のバランスを統括します。',
      avatar: 'images/operation_director.png'
    },
    {
      name: '品質管理マネージャー',
      role: 'QUALITY MANAGER',
      message: 'ゲストの満足度を左右する清掃・設備品質を徹底管理。独自のチェック体制で高いクオリティを維持します。',
      avatar: 'images/quality_manager.png'
    }
  ];

  function applyStaff(d) {
    var container = document.getElementById('staff-grid');
    if (!container) return;
    setText('staff-title', '現場を支えるチーム');

    // 固定2名 + 地域データから最初の2名を抽出
    var localStaff = (d.staff || []).slice(0, 2);
    var combinedStaff = FIXED_STAFF.concat(localStaff);

    container.innerHTML = combinedStaff.map(function (s) {
      var fallback = 'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(s.name) + '&background=1e293b&color=c5a059&size=112&bold=true';
      return (
        '<div class="text-center group">' +
          '<div class="w-28 h-28 mx-auto mb-4 rounded-full overflow-hidden border-4 border-accent/60 shadow-lg group-hover:border-accent transition duration-300">' +
            '<img src="' + s.avatar + '" alt="' + s.name + '" ' +
              'class="w-full h-full object-cover" ' +
              'onerror="this.src=\'' + fallback + '\'">' +
          '</div>' +
          '<h4 class="font-bold text-primary text-lg mb-1">' + s.name + '</h4>' +
          '<p class="text-xs text-accent font-bold mb-3 tracking-widest uppercase">' + s.role + '</p>' +
          '<p class="text-sm text-gray-600 leading-relaxed max-w-[200px] mx-auto">&ldquo;' + s.message + '&rdquo;</p>' +
        '</div>'
      );
    }).join('');
  }

  function applyAreas(d) {
    setText('areas-title', d.prefShort + ' 対応可能エリア');

    var listEl = document.getElementById('municipalities-list');
    if (listEl) {
      listEl.innerHTML = d.municipalities.map(function (m) {
        return (
          '<li class="flex items-center text-gray-700 font-medium text-sm">' +
            '<i class="fas fa-check text-accent text-xs mr-2 flex-shrink-0"></i>' + m +
          '</li>'
        );
      }).join('');
    }

    var mapEl = document.getElementById('area-map');
    if (mapEl && d.mapEmbedUrl) {
      mapEl.src = d.mapEmbedUrl;
    }

    // エリア説明文
    var areasDesc = document.getElementById('areas-description');
    if (areasDesc) {
      areasDesc.textContent =
        d.prefName + '内の主要エリアを中心にサービスを提供しております。掲載のない地域もお気軽にご相談ください。';
    }
  }



  function applyCleaningFocus(d) {
    var titleEl = document.getElementById('regional-cleaning-title');
    var bodyEl = document.getElementById('regional-cleaning-body');
    if (!titleEl || !bodyEl) return;

    if (d.cleaningFeature) {
      titleEl.textContent = d.cleaningFeature.title;
      bodyEl.textContent = d.cleaningFeature.body;
    } else {
      // データの無い都道府県用の汎用フォールバック
      titleEl.textContent = d.prefShort + 'の地域特性に合わせた最適清掃';
      bodyEl.textContent = d.prefShort + 'の環境、気候、メインとなるゲスト層（観光・ビジネス等）に合わせた最適な清掃フローを構築。地域の清掃プロフェッショナルと連携し、高いクオリティを安定的に提供いたします。';
    }
  }

  /* ─────────────────────────────────────────
     6. AIシミュレーター
  ───────────────────────────────────────── */

  function initSimulator(d) {
    var form = document.getElementById('sim-form');
    if (!form) return;

    var roomSelect = document.getElementById('sim-room');
    var guestSelect = document.getElementById('sim-guests');
    var nightsSelect = document.getElementById('sim-nights');

    // 間取り選択肢を都道府県の価格データで生成
    if (roomSelect) {
      roomSelect.innerHTML = Object.entries(d.cleaningPrices).map(function (entry) {
        return '<option value="' + entry[1] + '" data-label="' + entry[0] + '">' +
          entry[0] + '（清掃 ¥' + entry[1].toLocaleString() + '〜）' +
          '</option>';
      }).join('');
    }

    // 人数
    if (guestSelect) {
      guestSelect.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20].map(function (n) {
        return '<option value="' + n + '"' + (n === 4 ? ' selected' : '') + '>' + n + '名</option>';
      }).join('');
    }

    // 泊数
    if (nightsSelect) {
      nightsSelect.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(function (n) {
        return '<option value="' + n + '">' + n + '泊</option>';
      }).join('');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var basePrice = parseInt(roomSelect.value, 10);
      var guests = parseInt(guestSelect.value, 10);
      var nights = parseInt(nightsSelect.value, 10);
      var roomLabel = roomSelect.options[roomSelect.selectedIndex].dataset.label;

      var linen = guests * 800;
      var consumables = guests * nights * 200;
      var garbage = guests <= 4 ? 1000 : guests <= 10 ? 1500 : 2000;
      var total = basePrice + linen + consumables + garbage;
      var perPerson = Math.round(total / guests);

      var simId = generateSimId();
      var lineUrl = buildLineUrl(d.lineAccountUrl, simId, d.prefShort);

      var resultEl = document.getElementById('sim-result');
      if (!resultEl) return;

      resultEl.innerHTML =
        '<div class="bg-gray-50 rounded-sm border border-gray-100 p-8 sm:p-10">' +
          '<div class="text-center mb-6">' +
            '<p class="text-xs text-gray-400 mb-1">シミュレーションID</p>' +
            '<p class="font-mono font-bold text-primary text-lg tracking-widest">' + simId + '</p>' +
          '</div>' +
          '<p class="text-center text-sm text-gray-500 mb-6">' +
            d.prefShort + 'エリア / ' + roomLabel + ' / ' + guests + '名 / ' + nights + '泊' +
          '</p>' +

          '<div class="flex items-baseline justify-center mb-2">' +
            '<span class="text-xl text-gray-400 mr-1">¥</span>' +
            '<span class="text-6xl font-bold text-primary font-serif">' + total.toLocaleString() + '</span>' +
          '</div>' +
          '<p class="text-center text-sm text-gray-500 mb-8">¥' + perPerson.toLocaleString() + ' / 人</p>' +

          '<div class="bg-white border border-gray-100 rounded p-5 text-xs text-gray-500 mb-8 space-y-2">' +
            '<div class="flex justify-between"><span>清掃基本代金（' + roomLabel + '）</span><span class="font-medium text-gray-700">¥' + basePrice.toLocaleString() + '</span></div>' +
            '<div class="flex justify-between"><span>リネン代（' + guests + '名 × ¥800）</span><span class="font-medium text-gray-700">¥' + linen.toLocaleString() + '</span></div>' +
            '<div class="flex justify-between"><span>消耗品費（' + guests + '名 × ' + nights + '泊 × ¥200）</span><span class="font-medium text-gray-700">¥' + consumables.toLocaleString() + '</span></div>' +
            '<div class="flex justify-between"><span>ゴミ回収</span><span class="font-medium text-gray-700">¥' + garbage.toLocaleString() + '</span></div>' +
            '<div class="flex justify-between border-t border-gray-100 pt-2 font-bold text-gray-800"><span>合計</span><span>¥' + total.toLocaleString() + '</span></div>' +
          '</div>' +

          '<a href="' + lineUrl + '" target="_blank" rel="noopener" ' +
            'class="flex items-center justify-center w-full px-8 py-4 bg-[#06C755] hover:bg-[#05b04b] text-white font-bold rounded shadow-lg transition duration-300 text-base">' +
            '<i class="fab fa-line text-2xl mr-3"></i>' +
            '【' + simId + '】の詳細レポートをLINEで受け取る' +
          '</a>' +
          '<p class="text-center text-xs text-gray-400 mt-3">※ 上記はあくまで目安です。物件規模や状態により変動します。</p>' +
        '</div>';

      resultEl.classList.remove('hidden');
      resultEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ─────────────────────────────────────────
     7. Note記事フィード（静的プレースホルダー）
        ※ Note.comはCORS非対応のため、実運用では
          Netlify Functionsや外部プロキシ経由でRSSを取得してください
  ───────────────────────────────────────── */

  function renderNoteFeed() {
    var container = document.getElementById('note-feed-grid');
    if (!container) return;

    var articles = [
      {
        title: '民泊清掃のプロが教える！ゲスト評価4.8以上を維持する5つのコツ',
        date: '2026年4月10日',
        tag: '清掃・品質管理',
        url: 'https://note.com/',
        img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80'
      },
      {
        title: 'ダイナミックプライシング入門｜稼働率85%超えを実現した価格戦略',
        date: '2026年3月25日',
        tag: '収益最大化',
        url: 'https://note.com/',
        img: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80'
      },
      {
        title: '2026年版｜民泊新法・旅館業法 最新改正ポイントまとめ',
        date: '2026年3月12日',
        tag: '法務・許認可',
        url: 'https://note.com/',
        img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&q=80'
      }
    ];

    container.innerHTML = articles.map(function (a) {
      return (
        '<a href="' + a.url + '" target="_blank" rel="noopener" ' +
          'class="bg-white rounded-sm shadow hover:shadow-md transition overflow-hidden group flex flex-col">' +
          '<div class="h-44 overflow-hidden">' +
            '<img src="' + a.img + '" alt="' + a.title + '" ' +
              'class="w-full h-full object-cover transform group-hover:scale-105 transition duration-500">' +
          '</div>' +
          '<div class="p-6 flex flex-col flex-grow">' +
            '<span class="text-xs font-bold text-accent tracking-wider mb-2">' + a.tag + '</span>' +
            '<h4 class="font-bold text-primary text-sm leading-snug flex-grow mb-4">' + a.title + '</h4>' +
            '<div class="flex justify-between items-center text-xs text-gray-400">' +
              '<span>' + a.date + '</span>' +
              '<span class="text-accent font-medium">続きを読む →</span>' +
            '</div>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  function applyFooter(d) {
    setText('footer-tagline', d.prefShort + 'の民泊を、リゾート・クオリティへ。');
  }

  /* ─────────────────────────────────────────
     8. 全データ一括適用
  ───────────────────────────────────────── */

  function applyData(d) {
    applyMeta(d);
    applyHero(d);
    applyProblems(d);
    applyLocalRules(d);
    applyStaff(d);
    applyAreas(d);
    applyCleaningFocus(d);

    initSimulator(d);
    renderNoteFeed();
    applyFooter(d);
  }

  /* ─────────────────────────────────────────
     9. エントリーポイント
  ───────────────────────────────────────── */

  var subdomain = getSubdomain();

  fetch('data/prefectures.json')
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (allData) {
      var data = allData[subdomain] || allData[DEFAULT_PREF];
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { applyData(data); });
      } else {
        applyData(data);
      }
    })
    .catch(function (err) {
      console.error('[regional.js] Failed to load prefecture data:', err);
    });

})();

const { FORM_HEADERS } = require('./estimate-logic');
const { text } = require('./utils');

function formatYen(value) {
  return `${Number(value || 0).toLocaleString('ja-JP')}円`;
}

function customerName(name) {
  const raw = text(name);
  if (!raw) return '御中';
  if (raw.endsWith('様') || raw.endsWith('御中')) return raw;
  return `${raw}様`;
}

function todayJapanese() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function facilitySummary(row, analysis) {
  const parts = [];
  if (analysis.parsed.guests) parts.push(`収容人数${analysis.parsed.guests}名`);
  if (analysis.parsed.areaSqm) parts.push(`${analysis.parsed.areaSqm}m2`);
  if (analysis.parsed.layout) parts.push(analysis.parsed.layout);
  if (text(row[FORM_HEADERS.beds])) parts.push(text(row[FORM_HEADERS.beds]));
  if (text(row[FORM_HEADERS.specialEquipment])) parts.push(text(row[FORM_HEADERS.specialEquipment]));
  return parts.join('、');
}

function addMoneyRow(rows, label, value, prefix = '') {
  if (!value) return;
  rows.push([label, `${prefix}${formatYen(value)}`]);
}

function buildPriceRows(analysis) {
  const rows = [];
  addMoneyRow(rows, '許可取得サポート', analysis.permitSupportFeeExTax);
  rows.push(['販売開始OTA準備、初期設定', formatYen(analysis.initialSetupFeeExTax)]);
  rows.push(['管理、カスタマーサービス', '売上合計 x 15%']);
  rows.push([
    '一棟 清掃サービス 基本単価（リネンクリーニング込）',
    `清掃回数 x ${formatYen(analysis.cleaningFeeExTax)}`,
  ]);
  addMoneyRow(rows, 'ゴミ回収', analysis.trashFeePerCleaningExTax, '清掃回数 x ');
  addMoneyRow(rows, 'BBQ清掃（必要時のみ）', analysis.bbqCleaningFeePerCleaningExTax, '清掃回数 x ');
  addMoneyRow(rows, 'ペット清掃', analysis.petCleaningFeePerCleaningExTax, '清掃回数 x ');
  rows.push(['消耗品補充', '宿泊人数 x 宿泊数 x 150円']);
  rows.push(['備品修理、買付等サポート、駆けつけ出動費用', '2,500円/時間']);
  rows.push(['夜間料金', '+2,000円/時間追加']);
  rows.push(['管理システム料', '月額2,500円']);
  return rows;
}

function buildNotes(analysis) {
  const notes = [
    '合計金額に別途消費税がかかります。',
    '予約サイト準備、必要備品及び消耗品チェック、マニュアル作成、初期館内表示作成が含まれます。',
    '販売開始前に施設の清掃が必要となる場合は、別途清掃料を頂戴いたします。',
    'リネンサプライご希望の場合は別途税込+550円 x 宿泊人数 頂戴します。',
    'エリア・距離により交通費が発生する場合があります。',
    '各種予約サイト（OTA手数料約15%）が別途実費でかかります。',
  ];
  if (analysis.notes.specialEquipment) notes.push(analysis.notes.specialEquipment);
  return notes;
}

function buildServiceTables() {
  return [
    {
      category: '管理、マーケティング業務',
      headers: ['区分', '内容'],
      lead: '管理、マーケティング業務に含まれるサービスは以下になります。',
      items: [
        'オンライン集客',
        '月次実績報告',
        'カスタマーサポート（オンライン）',
        '清掃手配',
        '多言語対応',
        'チェックイン対応',
        'レビュー管理',
        '宿泊金額最適化',
        '複数予約サイト管理',
        '開業時 マニュアル作成',
        '周辺地域の苦情等受付',
      ],
    },
    {
      category: '清掃業務',
      headers: ['区分', '内容'],
      lead: '清掃業務には以下が含まれます。',
      items: [
        '基本客室清掃',
        '郵便物の回収、手配',
        '忘れ物対応',
        '消耗品補充作業',
        '設備の異常チェック',
        'リネンクリーニング',
      ],
      notes: [
        '忘れ物の着払転送は別途事務手数料1,100円を頂戴します。保管期限1週間。',
        '郵便物の回収、転送は別途事務手数料1,100円を頂戴します。保管期限1週間。',
      ],
    },
    {
      category: 'リネンクリーニング',
      headers: ['区分', '内容'],
      lead: 'リネンクリーニングには以下が含まれます。',
      items: [
        'シーツ',
        'バスタオル（人数分）',
        'ベッドカバー',
        'ハンドタオル（人数分）',
        '枕カバー',
        'バスマット 1枚',
      ],
      notes: [
        '3セットのご用意をお願いいたします。アイロン作業は含まれません。',
        'リネンサプライご希望の場合は別途税込+550円 x 宿泊人数 頂戴します。',
      ],
    },
    {
      category: '消耗品補充',
      headers: ['区分', '内容'],
      lead: '消耗品補充には以下が含まれます。',
      items: [
        'シャンプー及びコンディショナー',
        'ティッシュ',
        'ボディソープ',
        'トイレットペーパー',
        'ハンドソープ',
        '食器用洗剤',
        'キッチン布巾',
        'スポンジ',
        'ゴミ袋',
        '排水溝ネット',
        'トイレ用洗剤',
        'お風呂用洗剤',
        'アルコール除菌液又はホームリセット',
        'トイレクリーナー',
        'カーペットクリーナー替え芯',
        '床用ウェットシート',
        'ダスター',
        'カビハイター',
      ],
    },
  ];
}

function buildPdfModel(row, analysis, options = {}) {
  if (analysis.status !== 'estimate_ready') {
    throw new Error('保留行のためPDFモデルを作成できません。');
  }

  return {
    title: '概算お見積書',
    issueDate: options.issueDate || todayJapanese(),
    customerName: customerName(row[FORM_HEADERS.name]),
    facilityAddress: text(row[FORM_HEADERS.address]) || '未定',
    facilitySummary: facilitySummary(row, analysis) || '未定',
    packageTitle: '宿泊施設管理フルパッケージ基本料金',
    priceRows: buildPriceRows(analysis),
    notes: buildNotes(analysis),
    serviceTables: buildServiceTables(),
    serviceSections: [
      {
        title: '管理、マーケティング業務に含まれるサービス',
        items: [
          'オンライン集客',
          '月次実績報告',
          'カスタマーサポート（オンライン）',
          '清掃手配',
          '多言語対応',
          'チェックイン対応',
          'レビュー管理',
          '宿泊金額最適化',
          '複数予約サイト管理',
          '開業時 マニュアル作成',
          '周辺地域の苦情等受付',
        ],
      },
      {
        title: '清掃業務に含まれるサービス',
        items: [
          '基本客室清掃',
          '郵便物の回収、手配',
          '忘れ物対応',
          '消耗品補充作業',
          '設備の異常チェック',
          'リネンクリーニング',
        ],
      },
      {
        title: 'リネンクリーニングに含まれるもの',
        items: [
          'シーツ',
          'バスタオル（人数分）',
          'ベッドカバー',
          'ハンドタオル（人数分）',
          '枕カバー',
          'バスマット 1枚',
        ],
      },
    ],
    otherTerms: [
      '備品はオーナー様のご負担でご用意いただきます。清掃道具もオーナー様でご用意いただき、施設に保管いただきます。',
      'リネンや消耗品の一時的な保管のために、鍵を掛けられ、清掃クルーがアクセスできる倉庫または収納（最低1.8m2〜）を1箇所ご用意ください。',
      'ご予定を事前にご連絡いただくことで、オーナー様利用も自由に可能です。オーナー様ご滞在の場合は、清掃、リネン、消耗品費用のみ頂戴いたします。',
    ],
    paymentTerms: [
      'フルサービスの場合は不動産管理と同様に、弊社アカウントにて集金し、必要経費を控除した上で、オーナー様に剰余金をお振込みいたします。',
      'OTAの入金期間に依存しますが、月末閉め後約1ヶ月で精算致します。',
      '契約は年単位での更新となります。',
      'サービス内容の変更または停止は3ヶ月前までに通知が必要になります。',
    ],
    contact: {
      name: 'Jin Watanabe',
      company: 'Minpaku Resort',
      phone: '070-3188-5667',
      email: 'jin@nomadresort.com',
    },
  };
}

module.exports = {
  buildPdfModel,
  formatYen,
};

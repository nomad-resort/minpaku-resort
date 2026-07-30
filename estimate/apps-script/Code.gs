const SHEET_NAMES = {
  form: 'フォームの回答 1',
  management: '見積処理管理',
  holds: '保留一覧',
  pricing: '料金ルール',
};

const DOC_FOLDER_NAME = 'Minpaku Resort 見積書Doc';

const MANAGEMENT_COLS = {
  formRowNumber: 2,
  status: 7,
  tentativeFields: 9,
  cleaningFee: 10,
  initialSetupFee: 11,
  transportFee: 12,
  docFileName: 13,
  docUrl: 14,
  emailDraft: 15,
  processedAt: 16,
  updatedBy: 17,
};

const FORM_HEADERS = {
  timestamp: 'タイムスタンプ',
  email: 'メールアドレス',
  name: 'お名前（会社名）',
  serviceTypes: 'ご希望のサービス内容を選択ください\n（複数選択可）\n',
  requestedServices: '【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。',
  area: '【対象施設が既にあるお客様】\n物件平米数',
  layout: '【対象施設が既にあるお客様】\n間取り',
  guests: '【対象施設が既にあるお客様】\n希望最大収容人数',
  grade: '【対象施設が既にあるお客様】\n施設グレード',
  trash: '【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n',
  pet: '【対象施設が既にあるお客様】\nペット対応',
  address: '【対象施設が既にあるお客様】\n住所',
  specialEquipment: '【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など',
  permitType: '宿泊施設の許可の種類\n',
};

const MANAGEMENT_HEADERS = [
  '回答ID',
  'フォーム行番号',
  '回答タイムスタンプ',
  'メールアドレス',
  'お名前（会社名）',
  'サービス判定',
  '処理ステータス',
  '保留理由',
  '仮設定項目',
  '概算清掃単価（税抜）',
  '初期設定費（税抜）',
  '交通費（税抜）',
  '見積書ファイル名',
  '見積書URL',
  'メール下書き本文',
  '処理日時',
  '最終更新者',
  'メモ',
];

const HOLD_HEADERS = [
  '回答ID',
  'フォーム行番号',
  '回答タイムスタンプ',
  'メールアドレス',
  'お名前（会社名）',
  '保留カテゴリ',
  '保留理由',
  '次アクション',
  '担当者',
  'ステータス',
  '更新日時/メモ',
];

// ─────────────────────────────────────────────────────────
// 不足項目のデフォルト値（保留にせず仮設定で見積を作成する）
// ─────────────────────────────────────────────────────────
const DEFAULTS = {
  areaSqm: 100,
  guests: 8,
  layout: '3LDK',
  grade: '標準',
  addressDisplay: '未確認',
};

// ─────────────────────────────────────────────────────────
// 料金ルールのフォールバック値（料金ルールタブが読めない場合のみ使用）
// 実運用ではスプレッドシートの「料金ルール」タブのE列（値）を1:1で採用する。
// ─────────────────────────────────────────────────────────
const DEFAULT_RULES = {
  initialSetup: { defaultUnder3Ldk: 75000, threeLdkOrMore: 100000, villaOr200Sqm: 150000 },
  permitSupport: { minpaku: 150000, hotelOrSimpleLodging: 200000 },
  managementRate: 0.15,
  cleaning: {
    areaBands: [
      { key: 'area_0_50', max: 50, value: 8000 },
      { key: 'area_51_100', max: 100, value: 8000 },
      { key: 'area_101_150', max: 150, value: 10000 },
      { key: 'area_151_200', max: 200, value: 12000 },
      { key: 'area_201_250', max: 250, value: 14000 },
      { key: 'area_251_300', max: 300, value: 16000 },
      { key: 'area_301_350', max: 350, value: 18000 },
      { key: 'area_351_400', max: 400, value: 20000 },
      { key: 'area_401_plus', max: Infinity, value: 22000 },
    ],
    guestSurchargeAfterTwo: 500,
    gradeCoefficients: { luxury: 1.25, standard: 1, budget: 1 },
  },
  trashRequiredPerCleaning: 1000,
  petCleaningPerCleaning: 2000,
  bbqCleaningPerCleaning: 1500,
  consumablesPerGuestNight: 150,
  emergencySupportPerHour: 2500,
  nightSurchargePerHour: 2000,
  managementSystemMonthly: 2500,
  linenSupplyPerGuest: 550,
};

// ─────────────────────────────────────────────────────────
// 交通費（サイトのシミュレーターと同一ロジック / js/regional.js 準拠）
// ─────────────────────────────────────────────────────────
const TRANSPORT_DEFAULT_FEE = 2000; // 算出できない場合の暫定額
const PREF_MUNICIPALITIES = {
  '北海道': ['札幌市', '函館市', '小樽市', 'ニセコ町', '倶知安町', '富良野市', '美瑛町', '洞爺湖町', '登別市'],
  '宮城県': ['仙台市', '松島町'],
  '山形県': ['山形市', '尾花沢市（銀山温泉）', '米沢市'],
  '栃木県': ['宇都宮市', '日光市', '那須町'],
  '神奈川県': ['横浜市', '鎌倉市', '箱根町', '藤沢市（江の島）', '川崎市'],
  '石川県': ['金沢市', '七尾市（和倉温泉）', '加賀市'],
  '山梨県': ['甲府市', '富士吉田市', '河口湖町', '山中湖村', '北杜市（清里・小淵沢・大泉）', '韮崎市'],
  '長野県': ['長野市', '松本市', '軽井沢町', '白馬村', '野沢温泉村'],
  '岐阜県': ['岐阜市', '高山市', '白川村', '下呂市'],
  '静岡県': ['静岡市', '浜松市', '熱海市', '伊東市', '下田市', '富士宮市'],
  '愛知県': ['名古屋市', '豊田市', '常滑市'],
  '三重県': ['伊勢市', '鳥羽市', '志摩市', '玉城町'],
  '京都府': ['京都市', '宇治市', '宮津市（天橋立）'],
  '大阪府': ['大阪市（中央区・北区・浪速区・天王寺区等）', '堺市', '泉佐野市（関空周辺）', '東大阪市'],
  '兵庫県': ['神戸市', '姫路市', '豊岡市（城崎温泉）', '淡路市', '西宮市'],
  '奈良県': ['奈良市', '橿原市', '吉野町'],
  '和歌山県': ['和歌山市', '白浜町', '那智勝浦町'],
  '岡山県': ['岡山市', '倉敷市'],
  '広島県': ['広島市', '廿日市市（宮島）', '尾道市', '福山市'],
  '香川県': ['高松市', '小豆島町', '丸亀市'],
  '愛媛県': ['松山市', '今治市'],
  '福岡県': ['福岡市', '太宰府市', '北九州市', '糸島市'],
  '長崎県': ['長崎市', '佐世保市', '五島市'],
  '熊本県': ['熊本市', '阿蘇市', '黒川温泉'],
  '大分県': ['大分市', '別府市', '由布市（湯布院）'],
  '鹿児島県': ['鹿児島市', '霧島市', '屋久島町', '指宿市'],
  '沖縄県': ['那覇市', '恩納村', '名護市', '本部町', '今帰仁村', '読谷村', '北谷町', '石垣市', '宮古島市', '国頭村', '宜野座村'],
  '新潟県': ['村上市（笹川流れ・瀬波温泉）', '胎内市', '関川村'],
};

function onOpen() {
  installEstimateMenu();
}

function installEstimateMenu() {
  SpreadsheetApp.getUi()
    .createMenu('見積自動化')
    .addItem('見積処理管理を更新', 'processEstimateRows')
    .addSeparator()
    .addItem('選択行の見積書(Doc)を生成', 'generateDocForSelectedManagementRow')
    .addToUi();
}

function generateDocForSelectedManagementRow() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const managementSheet = spreadsheet.getActiveSheet();
  if (managementSheet.getName() !== SHEET_NAMES.management) {
    throw new Error(`${SHEET_NAMES.management} で見積書を生成したい行を選択してください。`);
  }

  const selectedRow = managementSheet.getActiveRange().getRow();
  if (selectedRow <= 1) throw new Error('ヘッダー行ではなく、対象の管理行を選択してください。');

  const status = text(managementSheet.getRange(selectedRow, MANAGEMENT_COLS.status).getValue());
  if (status !== '作成済み・要確認') {
    throw new Error('処理ステータスが「作成済み・要確認」の行のみ見積書を生成できます。');
  }

  const rules = loadPricing();
  const formRowNumber = Number(managementSheet.getRange(selectedRow, MANAGEMENT_COLS.formRowNumber).getValue());
  const source = getFormRowByNumber(spreadsheet, formRowNumber);
  const analysis = analyzeResponse(source.row, formRowNumber, rules);
  if (analysis.status !== 'estimate_ready') {
    throw new Error(`この行は保留対象のため見積書を生成できません: ${analysis.holds.map((hold) => hold.reason).join(' / ')}`);
  }

  const transport = computeTransport(analysis.parsed.address);
  const docFile = createEstimateDocFile(source.row, analysis, transport, rules);
  const processedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');

  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.transportFee).setValue(transport.fee);
  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.docFileName).setValue(docFile.getName());
  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.docUrl).setValue(docFile.getUrl());
  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.emailDraft).setValue(buildEmailDraft(source.row, analysis, transport, docFile.getName()));
  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.processedAt).setValue(processedAt);
  managementSheet.getRange(selectedRow, MANAGEMENT_COLS.updatedBy).setValue('Apps Script');
  if (analysis.defaultsApplied.length > 0 || transport.isDefault) {
    const tentative = analysis.defaultsApplied.concat(transport.isDefault ? [`交通費(¥${TRANSPORT_DEFAULT_FEE.toLocaleString()}暫定)`] : []);
    managementSheet.getRange(selectedRow, MANAGEMENT_COLS.tentativeFields).setValue(tentative.join(', '));
  }

  SpreadsheetApp.getUi().alert(`見積書(Google ドキュメント)を生成しました。\n${docFile.getName()}\n\nDocを開いて内容を確認・調整し、必要に応じてPDFに書き出してください。`);
}

function processEstimateRows() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = spreadsheet.getSheetByName(SHEET_NAMES.form);
  if (!formSheet) throw new Error(`${SHEET_NAMES.form} が見つかりません。`);

  const rules = loadPricing();
  const managementSheet = ensureSheet(spreadsheet, SHEET_NAMES.management, MANAGEMENT_HEADERS);
  const holdSheet = ensureSheet(spreadsheet, SHEET_NAMES.holds, HOLD_HEADERS);
  const values = formSheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0];
  const processedAt = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm:ss');
  const managementRows = [];
  const holdRows = [];

  values.slice(1).forEach((valuesRow, index) => {
    if (valuesRow.every((value) => text(value) === '')) return;

    const row = objectFromHeaders(headers, valuesRow);
    const analysis = analyzeResponse(row, index + 2, rules);
    managementRows.push(buildManagementRow(row, analysis, processedAt));

    if (analysis.status === 'hold') {
      analysis.holds.forEach((hold) => {
        holdRows.push(buildHoldRow(analysis, hold, processedAt));
      });
    }
  });

  replaceBodyRows(managementSheet, managementRows, MANAGEMENT_HEADERS.length);
  replaceBodyRows(holdSheet, holdRows, HOLD_HEADERS.length);
}

function ensureSheet(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function replaceBodyRows(sheet, rows, columnCount) {
  const lastRow = Math.max(sheet.getLastRow(), 1);
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, columnCount).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, columnCount).setValues(rows);
  }
}

function objectFromHeaders(headers, valuesRow) {
  return headers.reduce((record, header, index) => {
    record[header] = valuesRow[index] || '';
    return record;
  }, {});
}

function text(value) {
  return value == null ? '' : String(value).trim();
}

function includesAny(value, needles) {
  const haystack = text(value).toLowerCase();
  return needles.some((needle) => haystack.indexOf(String(needle).toLowerCase()) !== -1);
}

function parseFirstNumber(value) {
  const normalized = text(value).replace(/[０-９．]/g, (char) => {
    if (char === '．') return '.';
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  });
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// ─────────────────────────────────────────────────────────
// 料金ルールの読み込み（E列＝「値」列を1:1で採用）
// ─────────────────────────────────────────────────────────
let _pricingCache = null;

function loadPricing() {
  if (_pricingCache) return _pricingCache;
  _pricingCache = buildRulesFromSheet(readPricingMap());
  return _pricingCache;
}

// 「¥75,000.00」→75000 / 「15.00%」→0.15 / 「1.25」→1.25
function parsePricingValue(raw) {
  const s = text(raw);
  if (s === '') return null;
  const isPercent = s.indexOf('%') !== -1;
  const num = Number(s.replace(/[¥￥,%\s]/g, ''));
  if (isNaN(num)) return null;
  return isPercent ? num / 100 : num;
}

function readPricingMap() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.pricing);
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(text);
  const keyCol = headers.indexOf('キー');
  const valueCol = headers.indexOf('値');
  if (keyCol === -1 || valueCol === -1) return map;
  values.slice(1).forEach((row) => {
    const key = text(row[keyCol]);
    if (!key) return;
    const value = parsePricingValue(row[valueCol]);
    if (value !== null) map[key] = value;
  });
  return map;
}

function buildRulesFromSheet(map) {
  const pick = (key, fallback) => (Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback);
  const bands = DEFAULT_RULES.cleaning.areaBands.map((band) => ({
    max: band.max,
    value: pick(band.key, band.value),
  }));
  return {
    initialSetup: {
      defaultUnder3Ldk: pick('default_under_3ldk', DEFAULT_RULES.initialSetup.defaultUnder3Ldk),
      threeLdkOrMore: pick('three_ldk_or_more', DEFAULT_RULES.initialSetup.threeLdkOrMore),
      villaOr200Sqm: pick('villa_or_200sqm', DEFAULT_RULES.initialSetup.villaOr200Sqm),
    },
    permitSupport: {
      minpaku: pick('permit_minpaku', DEFAULT_RULES.permitSupport.minpaku),
      hotelOrSimpleLodging: pick('permit_hotel_or_simple_lodging', DEFAULT_RULES.permitSupport.hotelOrSimpleLodging),
    },
    managementRate: pick('management_rate', DEFAULT_RULES.managementRate),
    cleaning: {
      areaBands: bands,
      guestSurchargeAfterTwo: pick('guest_surcharge_after_2', DEFAULT_RULES.cleaning.guestSurchargeAfterTwo),
      gradeCoefficients: {
        luxury: pick('grade_luxury', DEFAULT_RULES.cleaning.gradeCoefficients.luxury),
        standard: pick('grade_standard', DEFAULT_RULES.cleaning.gradeCoefficients.standard),
        budget: pick('grade_budget', DEFAULT_RULES.cleaning.gradeCoefficients.budget),
      },
    },
    trashRequiredPerCleaning: pick('trash_required', DEFAULT_RULES.trashRequiredPerCleaning),
    petCleaningPerCleaning: pick('pet_cleaning', DEFAULT_RULES.petCleaningPerCleaning),
    bbqCleaningPerCleaning: pick('bbq_cleaning', DEFAULT_RULES.bbqCleaningPerCleaning),
    consumablesPerGuestNight: pick('consumables', DEFAULT_RULES.consumablesPerGuestNight),
    emergencySupportPerHour: pick('emergency_support', DEFAULT_RULES.emergencySupportPerHour),
    nightSurchargePerHour: pick('night_surcharge', DEFAULT_RULES.nightSurchargePerHour),
    managementSystemMonthly: pick('management_system_fee', DEFAULT_RULES.managementSystemMonthly),
    linenSupplyPerGuest: pick('linen_supply_note', DEFAULT_RULES.linenSupplyPerGuest),
  };
}

// ─────────────────────────────────────────────────────────
// 回答の分析（不足項目はデフォルト値で補完し、保留にしない）
// ─────────────────────────────────────────────────────────
function analyzeResponse(row, rowNumber, rules) {
  const pricing = rules || loadPricing();
  const defaultsApplied = [];

  let areaSqm = parseFirstNumber(row[FORM_HEADERS.area]);
  if (areaSqm === null) { areaSqm = DEFAULTS.areaSqm; defaultsApplied.push(`物件平米数(${DEFAULTS.areaSqm}㎡)`); }

  let guests = parseFirstNumber(row[FORM_HEADERS.guests]);
  if (guests === null) { guests = DEFAULTS.guests; defaultsApplied.push(`希望最大収容人数(${DEFAULTS.guests}名)`); }

  let layout = text(row[FORM_HEADERS.layout]);
  if (!layout) { layout = DEFAULTS.layout; defaultsApplied.push(`間取り(${DEFAULTS.layout})`); }

  let grade = text(row[FORM_HEADERS.grade]);
  if (!grade) { grade = DEFAULTS.grade; defaultsApplied.push(`施設グレード(${DEFAULTS.grade})`); }

  let address = text(row[FORM_HEADERS.address]);
  if (!address) { address = ''; defaultsApplied.push(`住所(${DEFAULTS.addressDisplay})`); }

  const decision = serviceDecision(row);
  const holds = detectHolds(row, decision);
  const canCalculate = holds.length === 0;
  const parsed = {
    areaSqm,
    guests,
    layout,
    grade,
    address,
    addressDisplay: address || DEFAULTS.addressDisplay,
  };

  return {
    responseId: [text(row[FORM_HEADERS.timestamp]), text(row[FORM_HEADERS.email]), rowNumber].join('|'),
    rowNumber,
    timestamp: text(row[FORM_HEADERS.timestamp]),
    email: text(row[FORM_HEADERS.email]),
    name: text(row[FORM_HEADERS.name]),
    serviceDecision: decision,
    status: canCalculate ? 'estimate_ready' : 'hold',
    holds,
    defaultsApplied,
    parsed,
    cleaningFeeExTax: canCalculate ? calculateCleaningFee(areaSqm, guests, grade, pricing) : '',
    initialSetupFeeExTax: canCalculate ? calculateInitialSetupFee(areaSqm, layout, row[FORM_HEADERS.specialEquipment], pricing) : '',
    permitSupportFeeExTax: canCalculate ? calculatePermitSupportFee(row, pricing) : '',
    trashFeePerCleaningExTax: canCalculate ? trashFeePerCleaning(row, pricing) : '',
    petCleaningFeePerCleaningExTax: canCalculate ? petCleaningFeePerCleaning(row, pricing) : '',
    bbqCleaningFeePerCleaningExTax: canCalculate ? bbqCleaningFeePerCleaning(row, pricing) : '',
    notes: {
      linenSupply: `リネンサプライご希望の場合は別途税込+${pricing.linenSupplyPerGuest}円 x 宿泊人数 頂戴します。`,
      transport: 'エリア・距離により交通費が発生します。（自動概算・実費精算）',
      specialEquipment: includesAny(row[FORM_HEADERS.specialEquipment], ['サウナ', 'ジャグジー', '庭', 'プール'])
        ? 'サウナ、ジャグジー、庭、プール等の特殊設備は別途相談です。'
        : '',
    },
  };
}

function serviceDecision(row) {
  const serviceTypes = row[FORM_HEADERS.serviceTypes];
  if (includesAny(serviceTypes, ['施設管理運営代行'])) return 'full_package';
  if (includesAny(serviceTypes, ['清掃サービス'])) return 'cleaning_only';
  return 'unsupported';
}

function detectHolds(row, decision) {
  const holds = [];
  if (decision === 'cleaning_only') {
    holds.push({ category: 'cleaning_only', reason: '清掃サービスのみのため、自動見積書は作成せず保留します。' });
  } else if (decision === 'unsupported') {
    holds.push({ category: 'unsupported_service', reason: '施設管理運営代行が選択されていないため、自動見積対象外です。' });
  }

  if (isLikelyMultipleProperties(row)) {
    holds.push({ category: 'multiple_properties', reason: '複数棟または複数物件の可能性があるため、自動見積書は作成せず保留します。' });
  }
  return holds;
}

function isLikelyMultipleProperties(row) {
  const combined = [
    row[FORM_HEADERS.area],
    row[FORM_HEADERS.layout],
    row[FORM_HEADERS.address],
  ].map(text).join(' ');
  return /(?:全\s*)?[2-9]\s*棟/.test(combined)
    || /複数棟/.test(combined)
    || /・.+・/.test(text(row[FORM_HEADERS.address]));
}

function gradeCoefficient(grade, rules) {
  const coeffs = rules.cleaning.gradeCoefficients;
  if (includesAny(grade, ['高級'])) return coeffs.luxury;
  if (includesAny(grade, ['割安', '低予算'])) return coeffs.budget;
  return coeffs.standard;
}

function calculateCleaningFee(areaSqm, guests, grade, rules) {
  const coefficient = gradeCoefficient(grade, rules);
  const basePrice = Math.round(baseCleaningFeeForArea(areaSqm, rules) * coefficient);
  const guestSurcharge = Math.round(Math.max(0, guests - 2) * rules.cleaning.guestSurchargeAfterTwo * coefficient);
  return basePrice + guestSurcharge;
}

function baseCleaningFeeForArea(areaSqm, rules) {
  const band = rules.cleaning.areaBands.find((candidate) => areaSqm <= candidate.max);
  return band ? band.value : rules.cleaning.areaBands[rules.cleaning.areaBands.length - 1].value;
}

function calculateInitialSetupFee(areaSqm, layout, specialEquipment, rules) {
  if (areaSqm >= 200 || includesAny(`${layout} ${specialEquipment}`, ['villa', 'ヴィラ'])) return rules.initialSetup.villaOr200Sqm;
  if (/([3-9]|[1-9][0-9]+)\s*LDK/i.test(text(layout))) return rules.initialSetup.threeLdkOrMore;
  return rules.initialSetup.defaultUnder3Ldk;
}

function wantsPermitSupport(row) {
  return includesAny(`${row[FORM_HEADERS.serviceTypes]} ${row[FORM_HEADERS.requestedServices]}`, ['許可取得']);
}

function calculatePermitSupportFee(row, rules) {
  if (!wantsPermitSupport(row)) return 0;
  if (includesAny(row[FORM_HEADERS.permitType], ['旅館業', '簡易宿所', 'ホテル', '旅館'])) return rules.permitSupport.hotelOrSimpleLodging;
  return rules.permitSupport.minpaku;
}

function trashFeePerCleaning(row, rules) {
  if (includesAny(row[FORM_HEADERS.trash], ['不要', '行政が回収可能'])) return 0;
  return rules.trashRequiredPerCleaning;
}

function petCleaningFeePerCleaning(row, rules) {
  return includesAny(row[FORM_HEADERS.pet], ['受け入れ可能', '可'])
    && !includesAny(row[FORM_HEADERS.pet], ['不可'])
    ? rules.petCleaningPerCleaning
    : 0;
}

function bbqCleaningFeePerCleaning(row, rules) {
  return includesAny(row[FORM_HEADERS.specialEquipment], ['BBQ', 'バーベキュー']) ? rules.bbqCleaningPerCleaning : 0;
}

// ─────────────────────────────────────────────────────────
// 交通費の自動計算（js/regional.js の距離ティアと同一）
// ─────────────────────────────────────────────────────────
function kmToTransportFee(km) {
  if (km < 3) return 0;
  if (km <= 6) return 1000;
  if (km <= 12) return 2000;
  if (km <= 18) return 3000;
  if (km <= 25) return 4000;
  return 5000;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 国土地理院 AddressSearch → {lat, lng} | null（GeoJSON座標は[経度, 緯度]）
function geocodeAddress(query) {
  try {
    const res = UrlFetchApp.fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
      { muteHttpExceptions: true }
    );
    if (res.getResponseCode() !== 200) return null;
    const json = JSON.parse(res.getContentText());
    if (Array.isArray(json) && json.length > 0 && json[0].geometry) {
      const coords = json[0].geometry.coordinates;
      return { lat: coords[1], lng: coords[0] };
    }
  } catch (e) {
    // ネットワーク失敗時は null を返し、呼び出し側で暫定額にフォールバック
  }
  return null;
}

function geocodeMunicipality(prefName, municipality) {
  const clean = municipality.replace(/（[^）]*）/g, '');
  const cache = CacheService.getScriptCache();
  const cacheKey = `geo_${prefName}${clean}`;
  const hit = cache.get(cacheKey);
  if (hit) return JSON.parse(hit);
  const coords = geocodeAddress(`${prefName}${clean}1丁目1番地`) || geocodeAddress(`${prefName}${clean}`);
  if (coords) cache.put(cacheKey, JSON.stringify(coords), 21600);
  return coords;
}

// 住所文字列からジオコーディング精度を下げる要素を除去する。
// 例: 「〒874-0840 大分県別府市鶴見１丁目２４−４５」→「大分県別府市鶴見１丁目２４−４５」
function normalizeAddressForGeocode(address) {
  return text(address)
    .replace(/〒?\s*\d{3}[-−ー―－]?\d{4}\s*/g, '') // 郵便番号
    .replace(/\s+/g, '')
    .trim();
}

function detectPrefName(address) {
  const addr = text(address);
  const prefNames = Object.keys(PREF_MUNICIPALITIES);
  return prefNames.find((pref) => addr.indexOf(pref) !== -1)
    || prefNames.find((pref) => addr.indexOf(pref.replace(/[都道府県]$/, '')) !== -1)
    || null;
}

// 住所からサイトと同じロジックで交通費を算出。算出できない場合は暫定額。
function computeTransport(address) {
  const fallback = (reason) => ({
    fee: TRANSPORT_DEFAULT_FEE,
    label: `${reason}のため暫定額`,
    isDefault: true,
    km: null,
    base: null,
  });

  const addr = text(address);
  if (!addr) return fallback('住所未確認');

  // 〒郵便番号・建物名の後半などジオコーディングを妨げる要素を除去する
  const cleanAddr = normalizeAddressForGeocode(addr);

  const pref = detectPrefName(cleanAddr);
  if (!pref) return fallback('対応エリア外');

  const propCoords = geocodeAddress(cleanAddr);
  if (!propCoords) return fallback('住所を特定できず');

  let minKm = Infinity;
  let nearest = null;
  PREF_MUNICIPALITIES[pref].forEach((mun) => {
    const coords = geocodeMunicipality(pref, mun);
    if (!coords) return;
    const km = haversineKm(coords.lat, coords.lng, propCoords.lat, propCoords.lng);
    if (km < minKm) { minKm = km; nearest = mun; }
  });

  if (nearest === null) return fallback('最寄り拠点を特定できず');

  const fee = kmToTransportFee(minKm);
  const baseLabel = nearest.replace(/（[^）]*）/g, '');
  return {
    fee,
    label: fee === 0 ? `${baseLabel}拠点圏内（交通費なし）` : `${baseLabel}拠点から約${Math.round(minKm)}km`,
    isDefault: false,
    km: minKm,
    base: nearest,
  };
}

// ─────────────────────────────────────────────────────────
// シート書き込み
// ─────────────────────────────────────────────────────────
function buildManagementRow(row, analysis, processedAt) {
  const draft = analysis.status === 'estimate_ready' ? buildEmailDraft(row, analysis, null) : '';
  return [
    analysis.responseId,
    analysis.rowNumber,
    analysis.timestamp,
    analysis.email,
    analysis.name,
    serviceLabel(analysis),
    analysis.status === 'estimate_ready' ? '作成済み・要確認' : '保留',
    analysis.holds.map((hold) => hold.reason).join('\n'),
    analysis.defaultsApplied.join(', '),
    analysis.cleaningFeeExTax,
    analysis.initialSetupFeeExTax,
    '',
    '',
    '',
    draft,
    processedAt,
    'Apps Script',
    '',
  ];
}

function buildHoldRow(analysis, hold, processedAt) {
  return [
    analysis.responseId,
    analysis.rowNumber,
    analysis.timestamp,
    analysis.email,
    analysis.name,
    hold.category,
    hold.reason,
    nextActionForHold(hold),
    '',
    '未対応',
    processedAt,
  ];
}

function serviceLabel(analysis) {
  if (analysis.serviceDecision === 'full_package') return 'フルパッケージ';
  if (analysis.serviceDecision === 'cleaning_only') return '清掃サービスのみ';
  return '対象外';
}

function nextActionForHold(hold) {
  if (hold.category === 'cleaning_only') return '別清掃会社紹介フローで対応予定';
  if (hold.category === 'multiple_properties') return '物件ごとの見積対象を確認';
  return '担当者確認';
}

function buildEmailDraft(row, analysis, transport, docFileName) {
  const lines = [
    `${customerName(row[FORM_HEADERS.name])}`,
    '',
    'この度はMinpaku Resortへお問い合わせいただき、誠にありがとうございます。',
    'ヒアリングフォームにご入力いただいた内容をもとに、概算お見積書を作成いたしました。',
    '',
    '【概算条件】',
    `施設所在地：${analysis.parsed.addressDisplay}`,
    `施設概要：${analysis.parsed.guests}名 / ${analysis.parsed.areaSqm}㎡ / ${analysis.parsed.layout}`,
    `清掃基本単価：${formatYen(cleaningUnitWithTransport(analysis, transport))}（税抜・清掃回数ごと）`,
  ];
  lines.push('');
  const tentativeLabels = tentativeCustomerLabels(analysis);
  if (tentativeLabels.length > 0) {
    lines.push(`※ ヒアリングフォームで一部の項目（${tentativeLabels.join('、')}）が未記入だったため、仮の条件で概算しております。実際の内容の確認後に金額が変動する場合がございます。`, '');
  }
  if (docFileName) {
    lines.push(`添付予定ファイル：${docFileName}`, '');
  }
  return lines.concat([
    '本見積はフォーム回答に基づく概算です。物件の状態、設備内容、運用方法の詳細確認後に金額が変動する場合がございます。',
    '内容をご確認いただき、ご不明点や追加のご要望がございましたらお気軽にお知らせください。',
    '',
    'どうぞよろしくお願いいたします。',
    '',
    'Jin Watanabe',
    'Minpaku Resort',
    '電話番号: 070-3188-5667',
    'メールアドレス: jin@nomadresort.com',
  ]).join('\n');
}

function isCompanyName(name) {
  return /(株式会社|有限会社|合同会社|合名会社|合資会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人|社団法人|財団法人|特定非営利活動法人|ＮＰＯ法人|NPO法人|法人|\(株\)|（株）|Inc\.?|Corp\.?|Co\.,?|Ltd\.?|L\.?L\.?C\.?|K\.?K\.?)/i.test(text(name));
}

function customerName(name) {
  const raw = text(name);
  if (!raw) return 'ご担当者様';
  if (raw.endsWith('様') || raw.endsWith('御中')) return raw;
  if (isCompanyName(raw)) return `${raw}御中`;
  return `${raw}様`;
}

function formatYen(value) {
  return `${Number(value || 0).toLocaleString('ja-JP')}円`;
}

function getFormRowByNumber(spreadsheet, rowNumber) {
  if (!rowNumber || rowNumber < 2) throw new Error('フォーム行番号が不正です。');
  const formSheet = spreadsheet.getSheetByName(SHEET_NAMES.form);
  if (!formSheet) throw new Error(`${SHEET_NAMES.form} が見つかりません。`);
  const lastColumn = formSheet.getLastColumn();
  const headers = formSheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const valuesRow = formSheet.getRange(rowNumber, 1, 1, lastColumn).getValues()[0];
  if (valuesRow.every((value) => text(value) === '')) throw new Error(`フォーム${rowNumber}行目が空です。`);
  return {
    headers,
    row: objectFromHeaders(headers, valuesRow),
  };
}

// ─────────────────────────────────────────────────────────
// Google ドキュメント生成（HTML→Google Docs 変換 / Drive 高度サービス）
// ※ エディタで「サービス → Drive API」を有効化しておくこと
// ─────────────────────────────────────────────────────────
function createEstimateDocFile(row, analysis, transport, rules) {
  const fileName = estimateFileName(row);
  const html = buildEstimateHtml(row, analysis, transport, rules);
  const htmlBlob = Utilities.newBlob(html, MimeType.HTML, fileName);
  const folderId = getOrCreateDocFolder().getId();
  const inserted = insertConvertedDoc(fileName, folderId, htmlBlob);
  applyDocPagination(inserted.id);
  return DriveApp.getFileById(inserted.id);
}

// HTMLのCSS page-break はDoc変換で無視されるため、変換後に実ページ区切りを入れる。
// 「サービス内容」「その他条件」の各見出しを必ず新しいページの先頭から始める。
const DOC_PAGE_BREAK_HEADINGS = ['サービス内容', 'その他条件'];

function applyDocPagination(docId) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  DOC_PAGE_BREAK_HEADINGS.forEach((heading) => insertPageBreakBeforeHeading(body, heading));
  doc.saveAndClose();
}

function insertPageBreakBeforeHeading(body, headingText) {
  const paragraphs = body.getParagraphs();
  for (let i = 0; i < paragraphs.length; i++) {
    if (text(paragraphs[i].getText()) !== headingText) continue;
    const index = body.getChildIndex(paragraphs[i]);
    if (index <= 0) return;
    body.insertParagraph(index, '').appendPageBreak();
    return;
  }
}

// Drive 高度サービスは v2(insert) / v3(create) のどちらが有効でも動くよう分岐する。
// どちらも無い場合は REST API を直接呼び出す（DriveApp と同じ権限で動作）。
function insertConvertedDoc(fileName, folderId, htmlBlob) {
  if (typeof Drive !== 'undefined' && Drive.Files) {
    if (typeof Drive.Files.insert === 'function') {
      // v2: convert パラメータで HTML → Google Docs 変換
      return Drive.Files.insert(
        { title: fileName, mimeType: MimeType.GOOGLE_DOCS, parents: [{ id: folderId }] },
        htmlBlob,
        { convert: true }
      );
    }
    if (typeof Drive.Files.create === 'function') {
      // v3: convert は廃止。target mimeType を Google Docs にすると自動変換される
      return Drive.Files.create(
        { name: fileName, mimeType: MimeType.GOOGLE_DOCS, parents: [folderId] },
        htmlBlob
      );
    }
  }
  return insertConvertedDocViaRest(fileName, folderId, htmlBlob);
}

function insertConvertedDocViaRest(fileName, folderId, htmlBlob) {
  const boundary = 'minpaku' + Date.now();
  const metadata = { name: fileName, mimeType: MimeType.GOOGLE_DOCS, parents: [folderId] };
  const head = Utilities.newBlob(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: ${MimeType.HTML}; charset=UTF-8\r\n\r\n`
  ).getBytes();
  const tail = Utilities.newBlob(`\r\n--${boundary}--`).getBytes();
  const payload = head.concat(htmlBlob.getBytes()).concat(tail);
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'post',
    contentType: `multipart/related; boundary=${boundary}`,
    payload,
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
    muteHttpExceptions: true,
  });
  const json = JSON.parse(res.getContentText());
  if (!json.id) throw new Error(`見積書Docの生成に失敗しました: ${res.getContentText()}`);
  return json;
}

function getOrCreateDocFolder() {
  const spreadsheetFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
  const parents = spreadsheetFile.getParents();
  const parent = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
  const folders = parent.getFoldersByName(DOC_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : parent.createFolder(DOC_FOLDER_NAME);
}

function estimateFileName(row) {
  const date = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  const name = customerName(row[FORM_HEADERS.name]).replace(/[\\/:*?"<>|\s]/g, '');
  return `MinpakuResort管理サービス概算見積書_${date}_${name}`;
}

function buildEstimateHtml(row, analysis, transport, rules) {
  const model = buildPdfModel(row, analysis, transport, rules);
  const tentativeBlock = model.tentativeNote
    ? `<p class="tentative">${escapeHtml(model.tentativeNote)}</p>`
    : '';
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4; margin: 18mm 18mm 16mm; }
    body { color: #242424; font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; font-size: 11px; line-height: 1.55; }
    h1 { font-size: 22px; letter-spacing: 0; margin: 0 0 20px; text-align: center; }
    h2 { border-bottom: 1px solid #b89b5e; color: #6d5828; font-size: 15px; margin: 20px 0 8px; padding-bottom: 4px; }
    h3 { color: #6d5828; font-size: 12px; margin: 14px 0 5px; }
    table { border-collapse: collapse; margin: 8px 0 14px; width: 100%; }
    th { background: #f4efe4; color: #4d3b17; font-weight: 700; }
    th, td { border: 1px solid #cfc7b8; padding: 6px 7px; vertical-align: top; }
    ul { margin: 0; padding-left: 16px; }
    li { margin: 0 0 3px; }
    .meta { margin-bottom: 18px; width: 100%; }
    .meta td { border: none; padding: 2px 0; }
    .right { text-align: right; }
    .tentative { background: #fff6e0; border: 1px solid #e0c580; color: #7a5b12; font-size: 10px; margin: 0 0 14px; padding: 6px 8px; }
    .price td:first-child { width: 62%; }
    .price td:last-child { text-align: right; white-space: nowrap; }
    .service-category { background: #fbfaf7; color: #5d491f; font-weight: 700; width: 22%; }
    .service-detail { width: 78%; }
    .service-items { font-weight: 400; margin: 0; }
    .service-item { color: #242424; display: inline-block; font-weight: 400; padding: 0 10px 4px 0; vertical-align: top; width: 47%; }
    .service-note { color: #4c4c4c; font-size: 10px; margin: 5px 0 0; }
    .note { font-size: 10px; margin: 3px 0; }
    .signature { margin-top: 26px; }
    .signature p { margin: 2px 0; }
    .signature .logo { margin-top: 12px; }
    .signature .logo img { width: 180px; height: auto; }
  </style>
</head>
<body>
  <h1>${escapeHtml(model.title)}</h1>
  <table class="meta">
    <tr><td>${escapeHtml(model.customerName)}</td><td class="right">${escapeHtml(model.issueDate)}</td></tr>
    <tr><td colspan="2">施設所在地：${escapeHtml(model.facilityAddress)}</td></tr>
    <tr><td colspan="2">施設概要：${escapeHtml(model.facilitySummary)}</td></tr>
  </table>
  ${tentativeBlock}

  <h2>${escapeHtml(model.packageTitle)}</h2>
  ${moneyTable(model.priceRows)}
  ${model.notes.map((note) => `<p class="note">※ ${escapeHtml(note)}</p>`).join('')}

  <h2 data-page-break="true">サービス内容</h2>
  <p>本見積に含まれる主なサービス内容は以下の通りです。</p>
  <table class="service-grid">
    <tr><th>カテゴリ</th><th>含まれる内容</th></tr>
    ${model.serviceTables.map(serviceChecklistHtml).join('')}
  </table>

  <h2 data-page-break="true">その他条件</h2>
  ${model.otherTerms.map((term) => `<p>・${escapeHtml(term)}</p>`).join('')}
  <h2>お支払い条件</h2>
  ${model.paymentTerms.map((term) => `<p>${escapeHtml(term)}</p>`).join('')}
  <div class="signature">
    <p>${escapeHtml(model.contact.name)} / ${escapeHtml(model.contact.company)}</p>
    <p>TEL: ${escapeHtml(model.contact.phone)}</p>
    <p>Email: ${escapeHtml(model.contact.email)}</p>
    <p class="logo"><img src="${LOGO_DATA_URI}" alt="Minpaku Resort" width="180"></p>
  </div>
</body>
</html>`;
}

function buildPdfModel(row, analysis, transport, rules) {
  if (analysis.status !== 'estimate_ready') throw new Error('保留行のためPDFモデルを作成できません。');
  return {
    title: '概算お見積書',
    issueDate: todayJapanese(),
    customerName: customerName(row[FORM_HEADERS.name]),
    facilityAddress: analysis.parsed.addressDisplay,
    facilitySummary: facilitySummary(row, analysis) || '未確認',
    packageTitle: '宿泊施設管理フルパッケージ基本料金',
    priceRows: buildPriceRows(analysis, transport, rules),
    notes: buildNotes(analysis, rules),
    serviceTables: buildServiceTables(),
    tentativeNote: buildTentativeNote(analysis),
    otherTerms: [
      '備品はオーナー様のご負担でご用意いただきます。清掃道具もオーナー様でご用意いただき、施設に保管いただきます。',
      'リネンや消耗品の一時的な保管のために、鍵を掛けられ、清掃クルーがアクセスできる倉庫または収納を1箇所ご用意ください。',
      'オーナー様ご滞在の場合は、清掃、リネン、消耗品費用のみ頂戴いたします。',
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

// お客様向けの注記。フォーム未記入項目を仮条件で概算した旨のみを伝える。
// スタッフ確認用の詳細（暫定額など）は管理タブの「仮設定項目」列に記録する。
function buildTentativeNote(analysis) {
  const items = tentativeCustomerLabels(analysis);
  if (items.length === 0) return '';
  return `ヒアリングフォームで一部の項目が未記入だったため、下記は仮の条件で概算しております。実際の内容の確認後に金額が変動する場合がございます：${items.join('、')}`;
}

// 仮設定項目を「物件平米数(100㎡)」→「物件平米数」のように顧客向けの簡潔な表記へ変換する。
// 交通費は清掃単価に合算し個別表示しないため、顧客向けの一覧には含めない。
function tentativeCustomerLabels(analysis) {
  return analysis.defaultsApplied.map((item) => item.replace(/\(.*\)$/, ''));
}

function todayJapanese() {
  const now = new Date();
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
}

function facilitySummary(row, analysis) {
  const parts = [];
  if (analysis.parsed.guests) parts.push(`収容人数${analysis.parsed.guests}名`);
  if (analysis.parsed.areaSqm) parts.push(`${analysis.parsed.areaSqm}㎡`);
  if (analysis.parsed.layout) parts.push(analysis.parsed.layout);
  if (text(row[FORM_HEADERS.specialEquipment])) parts.push(text(row[FORM_HEADERS.specialEquipment]));
  return parts.join('、');
}

function buildPriceRows(analysis, transport, rules) {
  const rows = [];
  addMoneyRow(rows, '許可取得サポート', analysis.permitSupportFeeExTax);
  rows.push(['販売開始OTA準備、初期設定', formatYen(analysis.initialSetupFeeExTax)]);
  rows.push(['管理、カスタマーサービス', `売上合計 x ${Math.round(rules.managementRate * 100)}%`]);
  // 交通費（実費概算）は清掃基本単価に合算し、見積書上は交通費として個別表示しない
  rows.push(['一棟 清掃サービス 基本単価（リネンクリーニング込）', `清掃回数 x ${formatYen(cleaningUnitWithTransport(analysis, transport))}`]);
  addMoneyRow(rows, 'ゴミ回収', analysis.trashFeePerCleaningExTax, '清掃回数 x ');
  addMoneyRow(rows, 'BBQ清掃（必要時のみ）', analysis.bbqCleaningFeePerCleaningExTax, '清掃回数 x ');
  addMoneyRow(rows, 'ペット清掃', analysis.petCleaningFeePerCleaningExTax, '清掃回数 x ');
  rows.push(['消耗品補充', `宿泊人数 x 宿泊数 x ${rules.consumablesPerGuestNight.toLocaleString('ja-JP')}円`]);
  rows.push(['備品修理、買付等サポート、駆けつけ出動費用', `${rules.emergencySupportPerHour.toLocaleString('ja-JP')}円/時間`]);
  rows.push(['夜間料金', `+${rules.nightSurchargePerHour.toLocaleString('ja-JP')}円/時間追加`]);
  rows.push(['管理システム料', `月額${rules.managementSystemMonthly.toLocaleString('ja-JP')}円`]);
  return rows;
}

// 清掃基本単価に交通費（実費概算）を丸め込んだ、清掃回数あたりの単価。
function cleaningUnitWithTransport(analysis, transport) {
  return analysis.cleaningFeeExTax + (transport ? transport.fee : 0);
}

function addMoneyRow(rows, label, value, prefix) {
  if (!value) return;
  rows.push([label, `${prefix || ''}${formatYen(value)}`]);
}

function buildNotes(analysis, rules) {
  const notes = [
    '合計金額に別途消費税がかかります。',
    '予約サイト準備、必要備品及び消耗品チェック、マニュアル作成、初期館内表示作成が含まれます。',
    '販売開始前に施設の清掃が必要となる場合は、別途清掃料を頂戴いたします。',
    analysis.notes.linenSupply,
    `各種予約サイト（OTA手数料約${Math.round(rules.managementRate * 100)}%）が別途実費でかかります。`,
  ];
  if (analysis.notes.specialEquipment) notes.push(analysis.notes.specialEquipment);
  return notes;
}

function buildServiceTables() {
  return [
    {
      category: '管理、マーケティング業務',
      lead: '管理、マーケティング業務に含まれるサービスは以下になります。',
      items: ['オンライン集客', '月次実績報告', 'カスタマーサポート（オンライン）', '清掃手配', '多言語対応', 'チェックイン対応', 'レビュー管理', '宿泊金額最適化', '複数予約サイト管理', '開業時 マニュアル作成', '周辺地域の苦情等受付'],
    },
    {
      category: '清掃業務',
      lead: '清掃業務には以下が含まれます。',
      items: ['基本客室清掃', '郵便物の回収、手配', '忘れ物対応', '消耗品補充作業', '設備の異常チェック', 'リネンクリーニング'],
      notes: ['忘れ物の着払転送は別途事務手数料1,100円を頂戴します。保管期限1週間。', '郵便物の回収、転送は別途事務手数料1,100円を頂戴します。保管期限1週間。'],
    },
    {
      category: 'リネンクリーニング',
      lead: 'リネンクリーニングには以下が含まれます。',
      items: ['シーツ', 'バスタオル（人数分）', 'ベッドカバー', 'ハンドタオル（人数分）', '枕カバー', 'バスマット 1枚'],
      notes: ['3セットのご用意をお願いいたします。アイロン作業は含まれません。', 'リネンサプライご希望の場合は別途税込+550円 x 宿泊人数 頂戴します。'],
    },
    {
      category: '消耗品補充',
      lead: '消耗品補充には以下が含まれます。',
      items: ['シャンプー及びコンディショナー', 'ティッシュ', 'ボディソープ', 'トイレットペーパー', 'ハンドソープ', '食器用洗剤', 'キッチン布巾', 'スポンジ', 'ゴミ袋', '排水溝ネット', 'トイレ用洗剤', 'お風呂用洗剤', 'アルコール除菌液又はホームリセット', 'トイレクリーナー', 'カーペットクリーナー替え芯', '床用ウェットシート', 'ダスター', 'カビハイター'],
    },
  ];
}

function moneyTable(rows) {
  return `<table class="price"><tr><th>項目</th><th>金額・単価（税抜）</th></tr>${rows.map((row) => `<tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td></tr>`).join('')}</table>`;
}

function serviceChecklistHtml(table) {
  const items = table.items
    .map((item) => `<span class="service-item">・${escapeHtml(item)}</span>`)
    .join('');
  const notes = (table.notes || [])
    .map((note) => `<p class="service-note">※ ${escapeHtml(note)}</p>`)
    .join('');
  return `<tr><td class="service-category">${escapeHtml(table.category)}</td><td class="service-detail"><div class="service-items">${items}</div>${notes}</td></tr>`;
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─────────────────────────────────────────────────────────
// Minpaku Resort ロゴ（images/minpaku-resort-doc-logo.png を420pxに縮小してデータURI化）
// 見積書Docの署名欄に画像として埋め込む。差し替え時は元PNGを再エンコードすること。
// ─────────────────────────────────────────────────────────
const LOGO_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAaQAAACsCAYAAAA0aNjsAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAA5GVYSWZNTQAqAAAACAAHARIAAwAAAAEAAQAAARoABQAAAAEAAABiARsABQAAAAEAAABqASgAAwAAAAEAAgAAATEAAgAAADkAAAByATsAAgAAAA0AAACsh2kABAAAAAEAAAC6AAAAAAAAAGAAAAABAAAAYAAAAAFDYW52YSBkb2M9REFITk1yWERlSzQgdXNlcj1VQUY4N0pocV9HSSBicmFuZD1Ob21hZFJlc29ydAAA5bCP5ZC55pm65bqDAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAABpKADAAQAAAABAAAArAAAAABpqcYRAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAEvWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpleGlmPSJodHRwOi8vbnMuYWRvYmUuY29tL2V4aWYvMS4wLyIKICAgICAgICAgICAgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5DYW52YSBkb2M9REFITk1yWERlSzQgdXNlcj1VQUY4N0pocV9HSSBicmFuZD1Ob21hZFJlc29ydDwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8dGlmZjpYUmVzb2x1dGlvbj45NjwvdGlmZjpYUmVzb2x1dGlvbj4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+OTY8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWERpbWVuc2lvbj45OTI8L2V4aWY6UGl4ZWxYRGltZW5zaW9uPgogICAgICAgICA8ZXhpZjpDb2xvclNwYWNlPjE8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxZRGltZW5zaW9uPjQwNzwvZXhpZjpQaXhlbFlEaW1lbnNpb24+CiAgICAgICAgIDxkYzpjcmVhdG9yPgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaT7lsI/lkLnmmbrluoM8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6U2VxPgogICAgICAgICA8L2RjOmNyZWF0b3I+CiAgICAgICAgIDxkYzp0aXRsZT4KICAgICAgICAgICAgPHJkZjpBbHQ+CiAgICAgICAgICAgICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+aW1pbi1sbWdzIC0gMTE8L3JkZjpsaT4KICAgICAgICAgICAgPC9yZGY6QWx0PgogICAgICAgICA8L2RjOnRpdGxlPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KjX/h5wAAQABJREFUeAHsfQmcVNWV971vq613aDYREASRVhFRENxaXHEbY9JOJslkzMw3OFn008xknWR8ZmaSMTM/SfTLIpOJThKz2DGLRk1cMS4IiHujCLLITtP0XlVvvd//3Krqru6urq5qqqEb34WuevXeu9v/3nvOPeeeey5jQQgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQCBAIEAgQOLYRME1TObZrGNQuQCBAIEAgQGDUI/Doo4+Gtm1bN2nPyy9HR31hgwIGCBwDCASzv2OgEYMqjAwCJ48X1Urcv/gg65w2MjkEqQYIBAhkIxAwpGw0gusAgSwEuiKarkfKZpRpakXW7eAyQCBAYIQQCBjSCAEbJDv2EYiwMFM5V5mujf3KBDUIEBgDCAQMaQw0UlDEo4RAgjGfOYLCUSpBkG2AwAcKgYAhfaCaO6hsMQgkIq3M8ZhgAUMqBrbg3QCBYSMQMKRhQxdEPNYRqPYnCY0J/1ivZ1C/AIHRgkDAkEZLSwTlGHUIJBWFM6wijbqCBQUKEDhGEQhWa4/Rhg2qdfgIRCIRrCFxjv8BUzp8OIMUAgSGRCCQkIaEKHjhg4pAR+dBGNl5qq5pgVHDB7UTBPU+oggEDOmIwh1kNpYQCMPsm3sw+w5CgECAwBFBIGBIRwTmIJMxiUAY+5B0pnueHzClMdmAQaHHGgKHvYZkmvXavApLZ2xq7rrv3MV24cmCypBzobnazf3SB+su9D/87puWG67WlnNCMPX4qay7o1nsYKtt08QyRm/gD5gNejdrzhmv97V8VzPwcHu+F4Z4NgPPtw94p7MmIiYdKhOte7aK6taZfsMDjT5WXsa0qivqeqpgWpgZRrCGNKDFgxsBAqVH4LAGmllfr82+YtwJ3PcWMC5inmAe9wXnQsh0sRYsHOYx1cUcU1He2eo++hoI7AeeKd31zeW1VZ44C9PvccL3FVVRmed74DyKrwBAWHYZnBtt7JD3/Cf/67cHMs3+k/+8FBjXnKF49hRDAFMuuFA1xQfmKubwnCuA3oepsoJHsBDDPXoGYzFkg2+8Tvd6goer7N89D1IXwklHpkZFepSIUJEMZUuvpON6SMcVmqVw2/Zcv5u7TluSRzrGlzW37mmvdaOs2d2BV0xzNeU4ZpjUzp0vnqi75f8Uj9v3z6xb+FwKleAzQCBAYKQQOCwJaV7tanEo+aFoZYhfLHz7UkX4UYUrDFQ1NYMHQ9I9X/iq73qu91BF+1X/ytgfdo9UZcZCuvfcs1A3WrRzOLe/zpk9VdE0hXGwIiAmfBekHjwjpIN/az8/WJVcm10npbtWDZU7iwV3P+W5brmCSArmAAKchmEeAI4BrsTAqhz8AmNzyDqMg9khFbABl+7ZqRTpbYrCbLIjA6PqFygKbqdkHMw0GFlA47+g6QTdBfODEwPcSb2oCW4hFVvhXrdvqK0xbh2KW2V7xpe5uxyncs9MRXvv93d8dM87LfHORLQjMRaYk9MdU/UQM8LaYQ0TCVHwESAQIDA0Aoc10q5vZN6j5019p7Vzxy9czz5F4e7ZHmbSROcoEM3ChB30C0SPKcui5fYjDzQ07Lu+sZFmyh/IEG6ZVsFFYhkTzqkg7rrHHZJsgIUgaUYyDq7o6y3h/X7c65F92SBtYfd3zUxcs9r3kleoinOyT57WUlBLZiHfpSTI0w2HtMWYDdGJ5CIZ6FuIFPTZznCyrzP5ZZKlhGX5qGwIwvcoT7BQsChqWrr2IZCBIyJxRENLQ+KTr3PISp4bR/wW1XO3d4rk28dXK6/6XvlbD668bseO9/e2dVSusSA1E/8bdYFzhytqTEkoybQsOOqKGBQoQOCYQuCwGBIhccXNd1vfM+vXl2mhP4CgnoRZeg3RPXom5NQcaiM5n/ZnRDV12ca65jWskR2k5x/EoGh8OqSShWDUOokghFQvkyD1mpJwHO+pNt949ebG+/swbiLcD9wZaupqSz4BrnAmopf7ngdBJ8XQMniCwSAddRcPh9dpXO8Cn6AXZADb6+U1mZt5v8FgEB1MDlkKAf0ghCFexnwvCuVdCHlF0NAVnuOWoyZRvGN4nksEHKo9KPg4r6A/XJ+ACcpS31VauBbaatn+uom1tS9M0f7y9XvN/btzrJflLdWReFim6zRL0HSP5NcgBAgECIw0AofNkKiAnzVXd//4G5c+pTGo7hi7AFNlmlaDPuFDXtJUWui+cM873imfiygv4m9UzoqpPiMV7jXrw268exEEhxOBB5bdSNbo5Q/ykusHsKr06qGnd8dzlaPh843Ju756yboKle9D45UjFUoAsGe+ATjoJz6ftBz9P7uF06rpIZlJLAaRyY72ZpjOIGRowrLdPvd778WZayD9bjxGopouuNbtaTyiRJK2F1NVLaoo4RquusfrhjLN96wZ0AyO9117AooxXniiGkuLOhgwmBQPIZEpwk1MYSyxkCvhq31hvRgKVz06SzS8ctdNXTtvvvsxK1e9j9Y9yPbQqpZkmBytKgT5BgiMGQRKNdLEoV2h92qPS64D5zkbtcesWc7TcZmic/QTi+tzNMO66J4vXfzmjXc82T5mUCpRQb1QaKrhiguATU1KuwVsJDz0AYCIbzN2iBtip7k6t0UiXhA/dNj7apjtxOXsHumI+JF0uwZbBq4mHVc02Xu2v3fjqg1OiYo/aDJkaXnB9BlaWxsLxxN+pW2o1eGQcRzWFOt81TvTc506MKXjIAmWSbMI6hxCRBRmzfYddzrWy87VFG91+ST+q3tvuXb9jqrfdZijRI0HVCHGBhq7QRs/eBAgUEIESsWQmHGK2+m1qts05nWhfCG51qBC04HhTPP39AQeC/HifEVnD+DOB4ohgcAqIU9ZLIR9NvBILf4Q+8mEFDOipZ92NaEShoOGuOHFQ0w7oMCGkdbppCRKb4MpySQ5T0BLt/dIMCPKFgYKZOpAf0n8teFvB9YK37TrIs8phj+Fic6TYX5xHvSPkKDdWegSEan/A1f2fcfwfXcWVJVTDK7PdiZYv5xpX/2IaXbuSaeL5I5eAAMFqF52Sx29wgQ5Bwgc4wiUTDd+6FDCw3aNNhUiEGbtB0EpsXZBzIhWkHpR9IU3TzfUs+68tSHSe/fYv5rIPjRe1bTzFFULYaW8BcBAIiJOnQq9V3rSChlpW7jM077fHS2aw32XCH9K7UmmeSkJC7eIKalJXVFa+8Y6sr/IcOUT5v0dH/vqL97Z4v7h94c6nf8Sig7LQu1XUILthq27SxMVYkxUdt/3Ir5vn68L8RVFF587IRQ59YEH6owjW+qBuSnwrQo7xawePPCd4E6AQIBAaRAoGUOi2azw9S5NDbmwEnsJyyMvgRelCCYmmUQoyYoMBKgWY/zD1ZXJ6aWpwuhPxTRNpSKinovKQ0LiTwOb7VJq7FN00GVYpymqbqu2k3evllGNPUgQtfpFJ8qeIpwqd7Dxa8RVdX3yz/OD1G83ffuJPdPc+COOqt+uKLGvK0x/XFHVQ6kSk5hH/cPHn3M8E/anVV+YiU3TL4XBTFmepEf0keM4KTzRaUc0oyDxAIEAAYlAyRgSpaZqMDPWdAhI6nbPVp+Dug6zdLm4ITPDFbEmFfPhBYrinPmAefRnwLJgI/xxgvV6tXDjFwnPJYvD54BJZw/zyMqbqJ7CQYq1cB/ruqxX5GVF+gZJF5JSknEEQlphB/M22l6bepR+dVR8kaeO//O1R9/fY8QbPRH6JtNCD8IacDf6CR2DRz0FQjVKjrUm7Mm6FNuqPxflxhKsUYWPVgUALGEr8T1aZQjyDRD4oCBQUoZEW/exoM64qse7XbbW9ZR3icJIdZJEFBQHs2DBvQmwA7ugNTFz0rEONJRpXC335sJ++AzHtdclk6wJjIPCgKpLhiJ5DC3FFBmImGfELrQqdoOBxI/KIL7whce7Q68ba31HXwnjy/tgib6DdvhKFS+KnGZK5Nn0Al1TVkz31LPMG44CUzJgXgjmTm5GRiWSQaECBI4xBEo60LhG7MbnKibovCv+FrzhPIU7tJaUmrzTJ0lJgoUwjT87FLJPBZ4DKfMxBPKPv31NmaKpF6maXiZs5TGuKwfAomHUMPxK2skcxyFASsok2cOYhp/FiMekNaZPfv2373S76n+DZ/8EvWJnTw2oJrR1SrCw8J3lcKT0WRjxnU7WfCNesOwMyEidedAs0hpdEAIEAgRGGoGSMiSys8L6ujRjeJdXtLi+eBL6u62SUMohLQmNZE5Qy5zANLboji9ec9TWCEYaXEpftfRpWB25EKbPb3XZYl3ShXoKu4cz0kBPGQgfgqeHKvc8GXhR2dFzLwUryWFENCXS+Ex997w0ei/EjebDOztt4z5fKA+CCR1CUWnKkq4IiX1+DGL1laqufHKGG5kunx+p+nRxTK7gZxDOKY5UlkE+AQIfZARKypCwRAKzrxSpHfdmwmuNK+9AXloPE2Qbt1OaO/rCQgreiinCWxgLdU47VhvggYY6A27pFmOyX+t74qmWb5+zL6rBUwIB0D8QycNd8CNB5/DkDdiBlNlWLCllhoBLkFMxR+Ma0iB1Ep/TH93pJPgvsKP3GSAAYw10lh6EpA4TniH8a7jBln/vM/XY3nuEQhnKgabSICkFIUAgQGDkESgpQ6LigtFgiShFTpxqr4UJ5WlsK9yPGXxPbbB3Bjo80BzunVKuhxaYN8wYggL3RB1TFx3zT5oMV0FXeba3vz3hvmgy03ddct2Tf8LtaPnNjC2DdEgpA8ZcgIDfKWroyGq3cpWj4HuwwtsdrnwTpz38Ams276biZZg25Eti1Ewcp6nsL8umlM0zsURWcNqH8yIkJCxsqcwaosEOJ48gboBAgEAPAiUe2C74DsawVB+lNkzG48nXhaK9k9JEgY6mVEuSKEO1NBlmvhfXTD35uJ4SHSMXDQ1MjRr8TGz9rHM95wU3WbONqhZmGrzR9DLnnurSLakZ4iwW0QfnNhShkl5NJSJTSuOdIZuFaP168h0lF6bZaCeZ/zwq/iCmKrTHivR1KVRk/WgC458Bv3lXVZr1GUPDES69TRuPoWPNa/Q4wmUIkg8Q+OAgUGKGRJokHImEzz2dnVIM0PjEPTBueAmTWhg3SCKTQhfEF+sDhsrF2WFFnLZw4UIc8nfshIYFDTVwlXQ5DgqybEd97vMrGxNUO5KQIAVkqaQG1JnDEq/4kFHb5Re+ik/3CMb4tPl4M1wePQJHFq9ItR0J2iRKp3gTlh3dKFZ0rogxY15DQ8PI+/Mh56pBCBAIEDhiCJSUIcFTA1iOynXyZ7MwVYcnt7KuuDBWg6i8LWfuWevDqd9iqsbdpdddVlVzxGo98hlxWzin4eBCnF3EXuvsTG7syTJMCxJiIO6SkaTon+2QWm/wELJ6VXqpaAQq4o598ikO7efv+i57Bky7E30G7Ijqluk0pKj05mBrweWLpyWrB0eoxE/GkPazxDUPkgsQOKIIDCSMh5G954NUgHzg7OoehtQI896opb3uCfVZeFe1QDSxKJDJhOioiOLM0/NqDP1k3MWNsR9wsmsUVmHLIClGYVX3aGzuiT2nvsLgHd4YoKwk5wT9A/EU4XNDhwSVL5CRXf+Wk5JESp4gfV6+6KP5WXLVk53Y97MG0uXWVC16oZDrk/BwrivexRMqvVnmQBRKWjXKDwkKNa/fjJJmGSQWIPCBRqA/WTtMMOCejBgOyG1aQJLp/U1ofiserIYub7uc7NLJpfRm6gOuK8XcMPcW32NefUz4t9O8cTNUVV2C/UZbPMd6+cYbV/Vx40P+uGXt+6OdZiPhIUw8LKMLgheaDu/3kGvg3nPdP90x9Nskra/d/i6sErGPDbIS1VDiQlMd/AFUeHE40fW9U1lD3YjLLpg34IT2kdcOjqEmCooaIDBiCJSYIaGcIBsajtSufnKmJCOy5KYJ+hJ61efaangQgIvqTH0wlYdNNHw7lGHt+Hy3LTE982Ssfq+4Z4WOY6+XwHs1DDW8xzvaK/oe2U6n/RAv6cEgXVPJTegmZ8lkfr5shcuyYmcuJYs6FngS290VafM8/U3w2N4NV5L1ppfeOKvUdXZieObk/ECVoBPBZvSYwLQEUARJBAiMOAIlZkhywgomE+Ib6/qWvbwptN/1xNMwMdsHJpReG6B3oL7C/kMcV3F6uIovvmn5clpkGbPhwuaOSXBXsQyqt4PC1p7NGDNkKqSqtA8JAk6eEA5L+4dB36jo6EAS0nIefC1DL6UheN50B01wlD2YV1+b8DS2CXMV+EJM149qJv9o2y8Oe/T8EyaUx0bY2o62z2EXHXrnKIMoKE6AwDGJQEkZErx5g2TA2YrvD0iXXMW4amQD85VXoK5KD3AiNqSpl4f3jYd25KLTTmW1YxVp02SKr1lncGbPt63E+i5D35KrLqhuXsbR0ZnfqKGDpelwtr+6FIvPcKdc2Y6Ze9dfD9+rrrsHqzcHJVB99JvyDk1pxiuaP7IMibboAjUbB6qMGfCCggYIjGEESqqDp8SIE8HTipiXA5S93uk7j1fXPaH77jngSeOzp/eQkgz4wFvEYg4swNn+DRtYn3WXHMmNulsTkh+r5LHE+Vh1CPtMWb/iS40dN365bzE9TxHY4DmQcRDJk4RXiIryIYwa8Krk+PR+hlaSNVrulam+BRgrv9xQO9fdA2DxNH3pwxBklTmvErY/opaZAmbf6JfCCPXhiMNGkCYse/YsDGutSdl8E1Ip2WZjU9+jRArIgdJiSCvuhuUCVzSsixZ1l3P33VsorYH9K3ea/IYbZoRmdMckHWjpspy7H9tSzBHyyq0NS0KVrEOWoZ1VeJWNayyT1gELCLRXb3r4tLCiW0qbVuZNmbIhiXoVFJeSN+EJhdXWGpGy9DEhbFxWrjhyLCuUdelCm9Dp72VJrEs2ucXkk5VMn0sTw7A9U39Mo9ubUf861L+IOvRJMOvHihUL9YqEY5SVe3zPzrA/ZWHB2PCblp9oeGUhnfpXvLyKz9KS3pOrNliNIM1ZWQy4RLl7+hT1pz1up7WqiBOn6+uZdubxp4Uy7dnaijwb8+fZvxBa/xuH8xuWUdBtgFyQc+R5A+uOc4Hs//nGZc/jlbdBYc5BXj2ERkpJjB0PQn7h31y6/MUNGx5rPpyyHI24FdXJk3Ay6jk4hHCzULxXgMRAwgCFJFzPUnX7BvotKa3ChpKQJsBTA0WGoNWDHzEjpAn62TfZsforGYrHQ1w/CPKE3daszx410lair9WEQmGiQETcCyZiReFhw0WDHoawVlSswV7mnZsW1kyIuGf45aEqsFmeoAHD9K3mDTPeMO/bXtTuM3vLeRN5zDlT05xyFezAc1y/VkzafNdNs9+6+e7HCmIqt966JFzWzk+3K+zpHkw3YpVlm01z6uuFntT76U+fW6nb3WckPH0ilCOiPOR12Lec9wr7znN7BwMh+37dpPrJfsJe6LJQ+QSPHWzfuWQdY2sOZb8z2PWKFUz3QuPqdNc/OdnFuKYY2L7WAUe4XKG6MAatbpoE0QJBK9SuysFowuAVrbZfvddckdhlrtpAuvH+I3GwLAfc71xRXxPxuxZ0O5HxStwTRnmynW0/61XG1u8b8HKRN8Z1a7NxrvI82jMzfpLa0vXeUqT7Yq+17iDpfflj51aJcutU1fEmdcO0ORZRRJsyYfvFK65+o3HVw/FBosnbnZvqa2JV3uIQt6vRnawZPNpkMvYu/goaAefMO2syd/lC39OjEzzl0JRxl77SyB4fsszZZSopQ7LRKw1QD1BGvrF35012fixUNX6b197+NBfxU/FeVYpoUxy8xllEYf45VSHvVHDr1fgbGULTp0Sl+UHHI2hMnAdvnJMdV2n0rNptuVKmBTLyOZBvFBi6ne8xO2C38hlsArgPoXaMcKB+YEXsCodFnW7shqVNV30YEr2KhZ0oCDGcNtQr5urVI9JPDMOQ3RLnfB12MKmhQqGp3a79Dwpz52C/Hhzeo7foygtJY+o3Gdu+tdBMcDy8urF6/xI36X9BeM54OmYLKblwuvebQ1ZiB9IpiCFF9vkVbsy/HqcPL8dxMMBZNLImtgnxuwooCx/vWlPglmUFKjIfXEDAXL8t4iur7rpp+c+HYoqmnEj486B2/QKz3YlCVTdFuPYvyLcghjTLvSZshzuvcv3EJxzPUVwlibEAUyJYTRExAcMnhzFyHKUHE82VLa4obQrXmnweedT8q/o15i9WkyiVfqWAWve+osQMa6GbYF/QFWsKnaqjMO2gE9bvArN8aNWq4Wt4UBj+tZhYJjzx95pvhYRrbK6qiv477jdjLAxa1s801JUpMesS7opPuY49jY6g8V17jxOxfrpXS7zVW/TcV5VV7nT00s9ZrjMb55R1eeHI/7TfumQbW7lmSIZE0i73jFN93/qC77m1OKT1Pcvp+DfkVBRDkqqD3MUr/q6GgUszdMz7AFo/q4Z0clsO3d+V9PiTMOHdRNDiv7RqSO3LoSm+mIPNjxdMTlxcXnwJjl6M42bVTsYYuBBjYBeI5XOfMu/LOeMlSkG6tcMpaciohiQKEgK4etIh5RKGYs/vMX7RXgMC6bM4kEp7RuytEPUx+OszPM+NwQCipH24N5cUVYcamc5VPPxgMtYt7BicxJ6A8tch2TrO/bkMBxFiEnZywwOF25Zvnm2NBzu71HPts8gEHkxpDtTE88CWptoRkpcKCwld0TSFHYducxJI+DwYkRzXYiQKxtMRShhOfE/AxkKKPxdAne05zodBQk9CCXr7Zo7imLiH+WslpJk5XFAdxGyUI5rj1Zy39lZ0wBE7ByPw5gjXOtF1nBNcK1Hr2tY4EOPxnm3Xuq5T6zrWBPxN9Bz7ePzVuVbyPMeOfxKE88t+VfJK85b6ypwZDHHT/PjiMnhhOY8JdynG4ckY0vMwdzqbeXZ9OVs4rDQzWd4O7HRVmwiGUgcUTwKTnS20SEU+QL94zUnllVXly0AUVsAd2yUUD9cRyAbrk777UlNzbX5LKco8rEbRnjPR42cBV9oXOlE92F1wfxDMqURfPBFHm81mqj+XK37RJzkUnFkGrHzfOFcbmAFGGM1BT5vzVZJ6dMvdhBniixgAiT4gE6VhokLX1CWaoc7ImcAovFlfX6/F9ORZXBGzYcL+XJeopllmzqC5jpy29ak3vSmrTvwE7FhPqeRyJiBvtgMmdDWM4J50aDqYzaAGjzwmnjgHYUfnO6n1kJ5KZooOlq4SQ+b6vpauAU8zbx32N2YPnovDq3Ag0mGnZTJmgAthCo/jR1B2NDj9+cKfAK3C0jNeubJQAw2uWvHZOO59CcqEglEnAASqiu1Sil89ZN/prQkOP8Q2bCzSoRdhbxwd0iW8ykjB0iZpHJG1K7sdLlAX4OUsdhz7mjtvvWwoTxqgXw5UAcKhrR+I7sHLVsF5M9YG3o4uIOdgiK+qe9BSD2GNFksleiP8Z8IyRvk1U/VfYyf6Qyjon5mibYGE1A1iGwUzXwKd3gowqDNp/PaiUtiVHWEzIOGeDbEwoiiaC5oH6icMTKLOKtdicwpLZfC30ChUN7kCQjN8LYTayvn7gDjc/Ex9mT6l5mJdYTejBc8hVDApfk8xQvcmfONH2l1/fo8cFAyI2e+GDx2fzAONAZzIFABxJvV7a/CfCrSliAgVO3qToqPYOc5tGzy6fFJShpTOi0gjnzdv8JxPuHRxKwr7HDrKjr4TqRRt8YR/mqKLhVDHFN1RBs915J787ZXVNWjJy7Gy0Q29x9MrvrQqa/9M33zdbjL7Rt/qT0apK1BHQC9giUK21yCNbDIpqVLfvI6FX6hWf6SIFxN8QsUCyuaRrKQBGgPegTYdUIbhZEsqbVii0g5ftDMRYfwJEQLhOZ/b7rRC0rxnxdURz1WWgKDOJGSoaPIf0SDwu0LSyH6H2BnWWBCZ7hZXTd/XUASwJYopE8Dc2LPHW7bVkBDeknuwMJ+dV/a1mc4McTMmK8IwCvcdWNVWBR0BJr9AkHDQtfAWTYvercbKv8HC0duVcOx2ZsS+wVnVN7A69q+aEbtd1bU7FE1/EgtNUEkK7tr2ApxMcEn9XLso4xjJwFR2muvbp2IUeoBgt6aH9gILCO7eST5zzpIGF9kVLuIa2NDEhWqXnnASwjlJIf/yp0+tcj37ctX3P++51gVgthoadLOqGPd6Ue2+//rRn7cjPRRz6KDA9RtNMuhNEitkl5g4dDx6o64uRY2oQahpaYjKmU5h0XveylnLnqfDuMCkZchufeGFpvsD8/JXsQiwBvWfDQRSagaMTGJmmGuN1xhfUlvPHmWr2WEvEA6jGsVE4dz14IXaXQxF/ppkN38DFchmFX3S0nAKFFGhAW9Qn8NtOQ9iQ0vXfRKlH0RZZKI0PMd+iHX7GovpWJLFXqBc1RHCZYqXOMWCHcxIBdvhPk4xL1gHlqccJlr3S+jsEElk26sazghTVCy8OBGokk7yw+yMB8yGt6+H1/M8ybD2SneysJ1lvmdFQXgcVdU917XDhBFm6fmiDvIM5aEuQ1weSCeTGYu1QV7Pui1lAhAgImHEGKBCsyDX6q7VPRf09K/2GuXv4XXSFgxowttw73ZQQNezevqr7XiFV6AKqSIm6KaMjzWjOHZD7P73lX/uuxE9q7y3NjS8Vla16z1N4THXTy7zfC/iec5ZXiRKYkDBax1L53i1WJ05D+rJKnBj+FzEETuKGvYU5TrAWC6gytMmVP4Oae7Iyr64SwAoK4hPUAXyyjwg/q1/t6Ta4PoljCVvQR84iyRUMMVNvqL+2NK0X668e80eGX1AzNw3HDA91bepRZEnqDCmKQXyI5kg8kVMKKKpuWmaMqRMNrAcRc+oBibR9w6KQbMEGDXkXkPKvO20zN4LbcgGFL0zTYXpEaIDDOFDRc7PjPlldaYpragy0Ubd9+/vuKYspIUugTrASDrOn2aw5oN5Cwk1EMgS6tkv0JCl2hOzKiDIPpP9HqVJyVLKkrhkPxx718lwGfwrceiPBGxF+pefbviO7ylOdWvryDEkzNhhtIX0hzGy+hc58xuVIm/4mHg061poo6LoSayjQMJ2lm082DY+81qubxoLwnHmg4Fh8Rh7/YS6C1LiVhABl6Y4IFw8VIzKrhJeJ2WnoS4DRHGOVhjmvrnyznEPL2ugf5IGEWOIq5qxUVWVvaiPYSUSl7p2fLl5y+mDr6dAy5imfjQoBo6JHJlmboVDtSRF0P4I2duJ/kWG0CysbGxMVJdNXecr/AkQ22Sal01hCSXbXjyTRc5vE6QWzqDnoVeQlbDBVa1F1dSn4P7saU03WoEnhBXnjCTThk27kAfBghrJRoWogaZJSS4ZjPiXGhZWlhvsIuZZNzk21hJBddEY2xTd+N9yVvWzlT9cQ4y50LbEq8APDIlypVgknFHLTmSFs6S0VEHR5D+S8GTCRXyUlCHB2wL1D5n9vHm515AyZbv57rttZnuvQ9vYJPsVdSuAkeok1BbeiUJzllWwBpoLjdbA44o+T2j+eSj3RuZ66y80Vw+cymSV3qUTYxEG8Ayqcg96WREKuSQmhpGQehVfBGLeUhSS6NF9Z6KRUHFKRwQ1ydlHQdDjWLPs2FhXl673yJQXxBWLGyVYQ8oUDw0P2kGzthZQkGex7rADtEb1bGdBKMzn4jXZPzKvZ39Xbr+2Ar3nXNdJTsBk2AZTWue5XhOIeYqQ4GXLIaPEwoLuhqCXkRpERIDVtAr63lz4bosoNMtQLMnMQL7IzO1pGA7+CUzKAlEm5vqX3C1fPLjqDiSsp7RQ4muDavhyVkgKEZQCMqZZuatZQ/YFeE5J4jic3aC3JArQ5DDMVGsI75FZ2ZvLy7A+dQ7cLE5HPX1VC212hP6qasTWqbrxLuk/he9P4o59Qdv2wz23i0qIaQZ6TKYEDdAmmf+wtNYYr17pO+7nHNtajAzB2dWNTA/9j86MX/7zj57an3m/mG9fgc0kBhz1J8xTkKnCOsuSPS2UNy0TUcATScdNAeXGhKG4SQbFyznY6cFwAxIUCowaNm6MDZW2sMpCTUDgKaguYN6LwhOVJv6KP+hCy2B9syzmtc9GWQoDZbiFHma8B+5sCKOol0EPPRXw/xELgEOqFyEgySAbPle+oDh6AQRQqvaASu8IJNwoQYlf7+1ceYyBe7B2iWLryDgM8AFqZaom2EQ75j/N2NvWM1hLXi00FhZqhTCcUuSBcSGVW9KNiQJajERfg/vYtWgy33YS02Fpdu5//tNfD2ppZk/omgwLsoWgP1gxVg5pmvpnMMwWDBsig4BKYbpROEMivPp3lDJspCwUR8tG90+/DUkSGkNjD4wkfqeqxib8hhbbXgCq9okDkfBMpNkn3dtNE78heULDI8uAX7SJKDUtLaQErfIl5I8oSEHqiQaFridBWDPCohnbCCTRRf2Rr0ZCa4Eh2sZnwnjgQmiMoyhsGwxD1kw2pu1ivrEd5XhRUbUE+Aes2/zzq2LegHoXmI18DWUDgUcZ0dHd7hTlmP4Pp43DGvt1wvX/EVaES1AOqK7VN3RN/z5nxv+aU57fVUwe2e+6rkLb0KkrydukooClefYrea+5hghSqCMyTjScQC4uDMU0ikpNg8hHfBELY35NTfmQhfnMVx5pQ8lfxNxsK/WS1PBA/0IqBAlMWufg8NQl95gLC1nlL6qspXjZctg0DKILUNJ9luetHczUOzsvjWaheQKNzyE0D+nYGENISXYdcHX6IQcmnkrmniePsfAoZrAoRsY4EBpZxT5lRnXR9TssVxnUeKTP+8P8IcoNLPn4IuQWPoEeKisaqMQ+MKMNw6T8EKTAl6Bp64C/rZjvu0u53nZ8rjToQELYWp1i28kTqJ2hHnrPZtpruAYHkgmCjiDx7lyxB7lHS5U03NJfhTMDGQWUnTSFqfaBVRbU7GSkUb4eRPkhoSptIMqG79kXM0+74i5zeZ9tHE1NTcSJ8ApRwFRQsZdJdur073xfrYyM+CQzS0cnnpJ336dMrm7NZZVw5zwbGcObCuJA1Sh4OJkvr8wzKemp7iLfc2BiD/UpV3dh3WbdTXff39m077Fuy/YwuVD2UGvA6GQ2PNKfY149PNoFUk6DmiZEwIcDGdunNaMIL7sU2x3+HtaMp2OPHqxKtLc1NfS9Vif0m2+uwoZkkyo1vGAYsEtE90y1ATUOSlHwylrKEID6A8pLiQwrDJh9DiuVdCR4xeG6hiO6dd09dGBfIWUSCRZ9IyqS8N7AsB+BweIoFaibgrFhR7u/THRPfgR3R9SgKp1twV8E/C9VbxH3lXk4BPYXSaV8WyGRVQ8i0KCo0/IlNg8UbNNAaGWGMy7TjEmWY9A8CinlUX8HlEapwTisIgPp/oEEaQyctnLfK4b89k9m6N8WPDUYMQgxiYGFGDp2zjdACNGtQWgUTQUhFIrVtZ4Z6hasWp8JInYKzPDOxMbXzeT7MTuBi+uS1a2d7DzMlidAOsaatbYe/WS7CzUX9uFg6KD18a87B17Z6WRfx2E8g62/PXXrk2H2i4NekxONNEuD7l2HuPCN//dU85f+dtGvNUWbD4HwMtoDhBnqR9pb+Jtwh/NsxhUNVE/sLRc5SpaUzqAIjR3WDplfnsqdKkACkuPqBrncmdKapWaipewmuPVhFWqkEr4PnTikCg/OjznRGpo+79DDLP+6b7p4e6tqag3XP9/13GrExVk7/A3o096hUrBG5n/5M+wtbId9FbRrJqpVpTK/PnpCDTQnxdMubBRGsuDvYNi0Jg/PCZXY1HM5pM4bwe1Ow2wdvErBRl/tVbVTffzuXz5XuCiTrs+AL6j5ydyc7qMO6E2+KI/CA0bBAZte8K4UVvENgalogafoCHnLRpYgKBFmfuDSzQVx6jnOoWZX0Z6CvL+TDFdl98YxfzSRxOSA6NH8UMw56154Qsib9xF++INvXVkFG9fzwDC7XE15/MBXfo7NQSUIQC0xHCs7mXXPhLUEBTl6SZgNDbqn2cdBJZJaEJdzxUx5iIyAGGAm2mJ0wsJp5AJ0dXIw5jBwGnammGYhTcwh4T9KRTWaI8pmnNfysgdbYWzmnGA51tId09v7L7LzuKXNdpz4ImgNQqj7Piw7PXdgq94hKUC6NCCCONyx8PUu2oeERSSiITIZuoharvydTjL/l41VvF5+hqWT1OuRadPfhvTwM6Hp71JiUC0twLj+2IRQaBq9QQA0pl7FFU096SYScmhRnXhrAQECUkptDcJJaQg2zmDWglrNOItNqV2kTZks/4yWSYu9STVLysfzZVBIfQJM/ybPs+Zj3Y4aAXo/5UWfGQW5Oirz1FOxNW4hmAJUfrwFyL3EkuGMml6E3fF7oD9bgzbuBGFVXdebHxfO/AeK2PScqXlKWiSoABGOT1B85wJXJD4DLBf7wpVqFuCGbPzpToU7kxhxJu5wv3v7OVIGoLQMXfRiVGasouS2nHpl99ChS1ZahkSuGiigY+7Z0yn7WerG4J9kBCBs7zX0jg3olNiVT6yI2gHR0WfgiHQSU73L7Ynl5CtwVAQUj1erkVOgNjkLeopXNKE2mbLWQxdPquzAafOFoTfG9saWw5k073JMAruCUO+NPxqvTpzUFcb66kysI1ZmEbxUUal7cJ6Am5oddnPN0DqaUVRB2peBCQzptahvY5QIHxIDPJOqf0YxD3i+ozuJ+JmqzsnTQU+4Ez7nElbnYtuy5rhQ3uia8ZarsFcnzNhO3EOSAPrADA4SUnGhR0ChrgNo+7okzZ+WQ48lyZTjFXzBFSZumTBdF4b/lKoov8Usvs133YhlxS/hjnLBihVTorejzCQhySCV87hCEo4kgen7hXxRv8dCOu2YQT1OQn+5BYb0prCTtzlOt/yzveS/cMe53Xet22EEcKtrWed7DpwfC9YN9zbPg748MW9XxZCTSbhDCmEDwvm2Y01HGyBbBi+22ivmfatpcYdGHTdXPZxgmrcB8+ltVHx4jZgE6XXx7hev7aOupGf5gomHZHJNnIjgwdVxMKf/MDbyngEubHOu74aE3Y7mgnjsLQbHv2GcbcwyzcO0CdCIBSHI/gluhx66f3+G36Ye5fvEWJW9kN4hcd2A2Wa+93M9y08Zc8UYgXsOU/aBO6+GqcjBvpASOYIXcOEvUqMJ8m83Ksr7429/sYwJ+xLsYai2hPb4ps65BU8kXFLZ9RrNDECTZrkDbg56g15Nt7mk0/hBPwm2dN8aNOoofrAr6lRhoM0BoYn29GhUiSpGYwWks9nxxOaOymZJE0e0KpiGF6/Kyl0iMmpQ4E2BaiCrk9p+J7p8EDFNfdfHgWHY5Dg7kfBON014sk4H24/Veklrke8kK0GI4jAaeKFGn7ivvXsyrRxTcghABX0nVpAbulTCjp0lIVF0/KWzLPgLDFa2CCKAM8AM3JQ9kn/re+sOuYr/GzjBWQNG52DNY7LvJa6a6E0/qamhV0JCg6abmJbnC29OaOwoI5Q4haXvOtWOFV+EY1/Od5JJ/CXOtxOJ861E/HzPSi7BnqE6SBbVmPN2Y6FkN0zUn9Qi+j3tB5XX+6tHc1UelnUTHSuxACb3ETB+B54ItoR9fvArn1xU849/tXBc5o/begv41Wa0CroN9jn53mmdPHFcrjQHuwc6l6oWjWPZ7Xk5+NBUdBoXZuavcV3/MdYgn4Xi2sK9MvTQa7juf8jecx7ZaBfdhply9BohpJMAtY2Xn1RweqlxkjIQoZUvSItEr9Ptm8kl//eoIPA3mg8nLFd/HpvLXgHAaEsEgoE6G/U6RZmqKtoFFe2XjQYTcB5Wd82BIcbF6OjvQUf+HCy98m5mlPVJf2gquZfCKMyMw+yHmSr3uzf4z8xYJqAkWAV3nsHTPOpPeIWin4BZ4VzUKMsumAanHJ/YPAPi7WnwTI05zMgHqPOLG1R5i4TunGokaKiUlHqsQo9iIVx9EQtj3SDcFdhXMj/KaqX3ABOqeI8rdbZrz8csGdtMIlvh2vp5Ml/ehYxosFAvkGlKwyD8KCL0SEiIA45UZP/B4c8yBlUK04ceO+wUXkY89g6Y5C+wzrEFJVXBcM8V3PnwnHHLJsGVDSwzUHbo9jLF9bGZJ3Nd0LfsDsSVMJtX9FaYYK8Ho3kBmos1mmas0fGth/Q1qmG8BOCeg8HmE8juN/Dgdw829tzRfWDaMysb1wy5YgsGoXQb8dNg4Qi/eXDMgGkAhNEamGxco8SUv4lW6Z/M/CkauxI4QLKn5RhsYnO9E7HZdL5ZhNcZYkgwUMP8BTXDf6kXFQpcmesvYm3uh4Yd/SEsWX6savrrII4wusNGXd/5qCqcy265Ic++r4JAxUsZsgJo64rQS6UakqgbACJhaRgBXaK0AQ1Bcx6UZiES3lBo4qKr6+DWkF71awi6C0BdJ9FkLZUWhFeVxQyFXV1WpTyDBGmRsLiOW2gpCnjvgf9YUSF4+/UQQU70VP1byZrcXr0HTcrCaa+h3JsPU3UWwnaHNt1Fo/dggH4LqPAPUBVLUgYt51F6QD7QyiLexajRXBqNqVVFdKhUJVFT1uwK/ps9+9k2FLEHg5EqLuVfyrR7ZiJoQKjqUklPqI+L9x/7I4jq5VAtLYQxxzmso+xMNOojn/ubRZXjrc5Lfcc6Ef7abEXX/tS9r+sNqvtUfNCMkpgS5BQyUOchq/A1JETLDqkpTfadAq7pUE7an496yanxbbcxQQQVQUCdlQSB/EO5ERrPfe2fYEV4HLQKn1SV7tavfHbRfQwilDSFB8KoK3z9YadsircOiXmExhDc4MnXERmbU9/ylfA3QmG2F94rJDV0MeVnkGWYrvq6b7uwhLWdLiXhJY3OsllLE98qcMtAVevi2k7hXIu1o+PJ0y8wJ1XZRdiOfAGMUORATBWYKkJY+Dr6DbSHGJK+c5xtW8u1M7U18DqzTSIzxIdJzwlOAgUBfb9DMfQHMeRXdcW0N1auXJ0wVyzE5l6cuaFoXwXTnw9sT8F7/xhVo8mbbjrxtzgXK7PDRKZRyAe1BRxIojtRPZAtJhGFxMu8g/kErRpxol7EkpBSqgKZFwr4LjlDor5J+S4snBnJYt5655rkf//rZWtDTH0FDp4vRypod9SOdihDFYF70+HFcMmd5mVrP2/+qSAX9QXUv9hXoAbvOsHgXj08D+7GvpE1N964qnA9A3KjXhIhn4WDBOzfEIab//iJ3qjEwlLEgHAnVTqeycHY+86YuuJlZXwWVB3YaCyiqaFBrAhzRBqWmIFjW8GmRJKvve2ehxPmqpGtG2wapEJK1dKU4TCzoymzDLKZIHalp5G0l+qLf3vO1pDGNkD1NB/GDcfbSvcZX/q7k56NhrTjofY5E4PAwOz/AOjFy5G6qztZY3qyl/bUApAk5SpmYywst2AE0VMpcqXJI6HiHGISEevpcFC5yXL0JMnYyvtea/+nFUv+GFFUsgz7KOoyBbP567gXegum7grqk559FUe7EpbDddoMIustGXInZM5NX/+OdJdDJeg/Fvpl8HhWKQe/NMHz40rFXCfReZbrOQbazwZRakZnTFKXJLJL2g5cpvlHSsGDd1BlNh6PDWhRFoiEeto9CxfuunHDhoLoBdJLlRefkLgOGqrxRI1e+drNK1NnXdFZTl/9P4v/jKdzMCamoCSwvvTmKKr74XJr/LsNDVteL/ZwPEfg4BxsuKaMUS8VWx7CnXtaC2JK89ASb3ksBDMXqWpGGh6kxYLqmo0+TbBKGqhtKMHqi2emW6aw5Kk92zvEdjDZp0Fksb8E0dEmlBitjUECpn0DF8YcPg8zsJKXu5BS3mveEMLZOBdAEpkGs+TVrKJiYyHxst8pcyOyo+UicfTAkw+K2XZFsYAPoAIBT9EGdGY6NiE737FwjYXjck33LkRZQbyIeNNHFlKCdUBf9+SOg+4O6i8jXSfeYctZv1fQLpWhS5OSBjBtTFNtNcv+P7F3fwvm+S9BLXMQe42iSSu5MKTVzMDC8Hycvofzk8h6Vdvs2srbxMAot134yzA10ksQWAy2wYWGaNY+UqDcF+tCEgG5QSNQ1wNBRv7YKdU/GootyqdM3QpR6EGsf7wNDGAN7Z/GHPsvPO5iXQn+1Gl80xDHHor+8Qf7TRISotAcHN/Ei2GHBqtBXGb+KGrmmr6HFz5TH8X5Pos9x5oJlSm8WejbdCP0E66Fv6vqoe9wVf8uHKuuVLjxHUwYvqNoke9yLfIdtONPVa7uI2Sghj3Bt+3F289WC/PobqaLSjUDpJCMEmq47MBNdz2WvTQgjKnLm2ER/ltsAfsjahrH9AndxbkAkvJHZsXOPh6ppOhBgTW3XZGETNkpWxQMCX1rYrIKy5IFhDW3NhiCexMRl6xAiYnGNW4UbXRUcAcooEzyFbmNi4hFj11noTFxXkzZ0oTHtXWY6r+bwTI1qUQ15XDz6nTdW3oiW17EsCs8/yHfDCUnwZLocjDGbh/GDB+/6f6izY67tMyJG4OPEUMrVELKlJgAp31bcgBmbo6pb9r4Ga1lpxqKuByDsJKWymUfkOQGVyQJMOW1eEJ5PDLl3KJxHw4YcD9NZHLwhhpOohisxGOlW5Ve/QTH0eE2FCSvYjNPE6gIhIjkydh/cg6sxOvhjaFaVdEpuLbeKOt8P5NtXXOIbPYoENUC5ROiG36sCw06jBoy7xIroY2idHR15l4h36iKJHoZ2ok4A4ggWd0Znd5aTdUehVFGG/hIGc4OugjqnWXQycKnutQ1k3qL4haUf8I6gAMr0iVEDBBjX9PIe1FpgxFWp8CQ4VzXdWMQBR1N19f4Ef5TLWL8FN5xf6ZHoz9TrcjPu9zI/Zodud9T1fuNaOh+Xw3/VNF1nBqNeSI5cYW5Np7PRAEH4JOrxCSb08SFdr4QD6eQnsf0vE4Tk66ymvdcrvwE75LIjKzc8Tjr6Tot7F9208cXF2Xdh5WCDrTLXoITKSlYLztRtdU5PRnmuRhnt0xAb8Khq35IMjSuHPC4OqT1Yv8kS86QCDUQRgYfYwUBn10gAjjZ4eDgPpxdwngXTYCo+dCospti1FVoin8udKfTsuMdiWuSylRdkFfvOhCU9VC2voZiFT0AdGwhkA2eq9AyNThpy/Us+15lantO9i2aofZISEjH9of265Ud/yhf8+V18enwrPZhgHMGxiIm0kRiqfmpG9GoZvtcofze7WAbMxLCiJdZauFh2lSijIjEUFLUzFCzkKiQGX/yFk6o3Q7G8xJm3klQscmYX1yLAx3ORf/HeW2hfXAV9ELT7tm9zHgGEsJpRAgyXRgjF7UPKbufYQsjDTOZGCVYSPCkFE7CWioaVtdlOXLGPenqQ64RfkQ19LUgsDbWPWbA4q0eWY6nSSx6L2jgQAkrZ1ryZrVkoJm8kTH5+y5poFNQsaZyiuNatK4NQ0it2efaGq0qvM38zuq2//jB8630jbWytu/gj74z95KH3G1M0f8MqbCd3CpB9zGPKc6C23F8yJCFNFNvpMCUXQMCh8RmQPvcfTekJmGsg9umX4BAbUMjAloxSzjeR6sjbDHWk+iQ6oJCeUd7C1RumBApCRI9YcQxy7O7l33zpvNqkcCgbfuf/3RpzOXuOWhAUi3DykJYONzqnYRnFb1ZNzMgCipwIS/RVA3MlV1QyMs53tlfZh+CWuYpIP8eYYD08A9Dhf5DawFJSZ5DUoqNYDmyH/TWNKthXIi5y/ACXNepj8fHjz846MtDPSCWlCNQTTEoaYTnDeEwvG8RNH1Cr4REh6yOocBX/vt1k3SDXYczzv4Ck5CUWgMVBBY0ColQwqW38rDjiD8dGre4CBng8FDAXhqJMc7n64f1sNKVA5pEfZpBYtKGsddXPT9vN9bOFX0dmNJ21DkKyWgpNFrTwZ1RffVVmBO/ln3QWnt3+ugGKh4li08c4TAo4chdapLXEGTnU1i8iOMnKBpGJWVLlzgNRH7l/KBJhNPtNEEt+Uv4y34XANC5GeOReYQsV6iZpUozZ+xcN1tBaVKVzuSf663DuVen1VfDyeD52Ec1gdpNUY23VY2/dtttzwxpMFBZd5nlCm891GlbUpY5Yhykl6WO10LEfeiQWkClZqXAcUr9YLRafPvHL3SGXPUxWDP+Dsy+GWMIPty8hS73PoH1pDrs+erb0QbLva4hjkZYi+w206DDvrgqx05cGbecj5ifWTofTl0n3HrrkogJi0E678m8ob7qX28+f3Y8Gb/Cd5yPwWBluuzbHB7fXXdt2aTj2gbLarD7g1VysPeHuI96o38CRN7chL43jABTXjfJ9TexJfZVgAPDjXSTyLSIL4kJiqGevWTKxHHDSH64UXioyjsFKpRzUZo3sAvhhWKNGQrNmCSdQt4ljLPfI/6UkZDoUa82KPut0Xf9/z57UU2Nn7wGp0l8Asd5TyeZGMRadiJSIqH5E/BB/JTN9XuTbcqWIyYdASpuwyE0epxWIjDTBLengVHPPm1I+2EcYcGUl78JL9wKzkoqB3HRsU7RBrXWs5AAdmW3IP1AGihiiiRjGl3ELqSslKgzURrwHoH9F33KlPXWgEs6D4li0QNKQtB5fXnCHT9+oQst+gQa+LeoHghnKj7FomqQc1V85U2jJ3nsQ0qRGuKksv6Il7Uo1vPisC+4E3NOhPXaeUgdnhkUC1LKWss33iMhZKhUqZ/CCm8LgH0ZJYWQjTQYjFMUPo/U00PFR6WoesR05atkQZk3zozwLuxL/iUY4LOY7jjoL+XwgHep6nsNcz511pS8cdMP5aRBF6/7XP8N0tgDgqKQ3z74I4SHCPcWl4u/KY+r17pzrcvdiTVXeBHno57l3oSDDm/F4YDngXFDGiPzdO0ZbnjroKo92kYN8nwTVM+Hyq45P4B5EBrnRpohH78E6a8Fr0EEzRYasA2I+Us97teZqX6cJ6XSPPrZXR8vx1i/AGZI47EC+4QS9nceTsoYgEN26GLTJ4KAMsp0U4SvRFS02IIU+D46v/I984pJlVONyxVm3wBmNA/qEdhiEA/CME7RtiRMZ1/A4sr/Ws3itZvvTlkYFZjFYb8m15CQigeTysNODP1YrgqgcYj6k+zluQOl4Q6lch8o8+s4ioFmq2A48A+m8s14dz1UQn3MK2KxlOtH0h0QXlBN8LJirBpQKZr4pysnv4qxsiNqQ01F/5EIkWlumoMjhQzEuy1T90FX+Xu8+gKYrpPJHOQWFneFryFFDGgJSI0lcwee8GARL6HOzjTrQ0qIL8KsHxu0Ydquqi2ur70aavIKXheZrriHQLmwjqS2U7PD7dN0VfGWHudsHnJtByoQqhl9UBuBM/UhggNApon8xNi4N+GQ6kH0GSx7UAxvIvrchxRdvezTHzu1ekCkHDe2N89ohue8RlT5V+iHYKhgiZ5Xh8nRhzBB+4wvrC+CS32FOcmv4Mjd/+u4yY9BtbcIeUWB0j7M3v4I3nn/BK12O5Ivms6VWEJKFYGwn9dUW3RhMvg03NboWK62Dh32TQjy1N9TadE1MSiclYQ94UsiX7ymIAuQTLrD/OZ+R+ccHE5cDzX3HniCX3P95xuH3Ew3WF4OPDUMG5jBEk3fB5GTRIXSH85ZJEMkX7LHsFYMTzNenVuls78Ctf8MZLvTMXBp74bkRTIjweOgxGug4vnvQ4nK5440M5JlgPdEbNaGZxb0wMMMJuJjIoVD4ZTdoL07QC22JnkS1qR9A5iTNo0AAEAASURBVNYELFDXl/Hey5hibAdB2oKlodVWogOGPn1DefkuctV6EJR5B0jXdtv39uIgi+zZW98I/X75Dg4x8MVeaEa3YYRtxd8+34kVHB+66wR63E6Mi+1YP9oKK7RDTWaqD/bLqucnqRxbDkY2wSTv1xjYL4MfboM2ahsafhdsGvsw3J5IOS7eh3k6jA0OIu+twJPi79MSoTxKwxyJ5LkV2u9GcBbD8WADzQAZazPaS1jm32SuXl3wkuKNqzbAs4L+FuqJrSx8OwTKA8B4kjE+lNco6zYQcijMWqAzQ73QBwTb6cH3Eoqbtx/SGOFq8jkM/gchbW7ELGE7GDXRy0XjjbLMtrU8tWaM2qdN4Vs8EboXVp2rMCyfADd+D0WycbxxLdSOJ9M2BOb6p8PJ7HSs/dFcZA/UhWs1w/iZqke/b4Ria4c7Xks+jUZvLt7Faz+IiAHd8UW2ZUolfxZMaRFsoeE6A00K9kmjBSIT1hmcc8aHxMP4KTcJ9kuiZD/vMa+OKJqyBO45yI79V3bY2Hy4iVOvKjVTovTSjDtNPUvetIdbbfaMWa9t0SvGcb9lvsbcq9GaF6Op4bMOJ29CJwE1AU0JqaGx34a/CInp5+3t8ae/vPLJgmelh13IrASUTsxny7GdogRQEpH5olD2wBT4friPegq2wM08YW/Nyq7nMuT6r3Vr/Hsw3p8EMwGXufzlslk1A/benbdvgft6xZanwbjbYNvgCzvxRncr7+5JaIiLsojVBa3kH0Cw3oM6CvRSvNERabGHiNbz2E66B3DI/M9t1/+zxvw4rLtefgDlSHfAnvf6X3yvcXX3rZ9Y+EzUQN0En0QUHrORFsWt2I3LgobHYi2ZfN/TnsZyKXCB21SNb+7QrZKtL1pcczwHxB3W9ZjxkwnKlni3v6N/XYb4LeK2/25I8HuA7nHQS2J7rn1AdavzTmgJgK/ErRcApIWlRuwH4i3t3V0FaWX0d6r3e9O7G4HpTsASQ1oC0nUH1qCSGGC09jxkII/sWKN/p8oNt2ia+zKYYx12FZ2AMToZLsZjGJ9hEsAUn5MK9iBozw74V9ykeGpTe9TduXLlc3nrl68AJRhqvcl7QIG6de+d4V8lomd0O2L9UwYXV4HSLpKbI6UcK5Wp4Mr+fKGKc+41Z2z6lLm94JlVsSWKhsJTVMW9GMO9C8ePPF2xBp7sj3ZowzFS5ZV9eBpJF5liyX4HN2WZ30fzG4Xiq8DUK8qVcft8fVbUsc70ubUMktFZYPDjYE2WYkLUtjh1FJ19Gza5Pwp3KA91MeO1z698aoAUccTqAwlJo1lQCQIRhobuGc11tRsfSbhhta213JtQx3L2Wwf7S+z3fvOIC4dpIVhURFo7EqbZRHS7T6A1p1sblqyvjCXeSMDjYygZs+5sXG2t7PNWnh9TNiQP7ln4QjXT19FEzz6k2fc0rnExLS4ovO/ObJ3ubPqjGtG1rm5NjLO7IAEOHZWwME/csJ/tWfiHNmwcDaHsjhv2YzOkm/uefpwvJZI+sKj+csLofNOCQXwVF3YE9ckXp6hn8J6hHWh8msV1CF6qSMYUe9zUy2DMgDX/IkLl8Ze1sT0PP5aAvThFE6hn6H1vKIItQqL89YTe+U4C9BRHg3mV7+sUZ0hsSIKDunGT9b7zvu3rWKtqYyHdE8nQhILaJlO19DEhe3EGVPPeaPmrrutXc8+vAUsLwxRe547vd+O42pDB27tcfqg2Ijo7Kp+3VppSZsgkU/R3Ad2n8DR/fsc1l4Qi5T+CH6mfWM90mYU4LcyX+ve/fGV1eZn/VeE7n4OhUYjm0BTAkmgi7bpCfdBKal/+9H/8cbt8UOIPZMd/eed1V0OJ+l3P8ddanvKFv/3a7wuaqQxWlHu+sGxWOMZXwVZvGdQyUqyhd8nslfYbqFr4Vx0e+8dPf+0PNFvMGVbecHpV5dTKf9EM9WYgIW3ACBlgIsm6rsd2wyf0DR//yoNP5kxghG6iDPz6BqY01DWonXH01clamc6ik6E7n81961QsfJ4BRjQHLkThKBL7FVKBJKIkZqD7MRl8CxbOf3KF+/g2O7ad9q+MUFELSnbHu2/MxAbMr9tJ+2dTT5r/VEGRgpcCBI5RBIge3n672cMzbrvtNhryGc1MSWpdcgmJVgFKFca/F+2In9KxGsY3V4Izn0xkm9KmxXvY2mNftrdQj/CzwMV3Y8ZUtEXHUOX8n9sbquHK5nysHwm4xHqyK2YfGCpOIc+xGIu1xkLezPMOQMgOWN/tSRJrCjBi8uQLZDyQ/R4OB+j7s8Bf8+Y18I0bU4Yqk/fM4eSq0HprpzJpbpmejIej3E1WNIb1so9yVmE7zrhYWajWtWyoKbpnobVwNIB1nO/aMPP15UwRHRkHJqvdYMN7oCNvgq79ZVcJYd1QNG3rPuMgyk2T9iAECAQIjBIESAoA/eihXBijJS9ZSRmSAf1aKUtIEtZPZ1/3Cot0rQZznglpQJ6YRnIA1hvI6erxGlOWJaYc9wIcue4pZd6UVigs5mIz4vnwLL0J56g8f/PNpbHygklmIZqNwasDn+eQ2jBTSTWfBB0A0TchgzUBw3OV2b/89nUHXQVbJ3Dfo2MvEBTlwz0zHPIRiY1wPb/7uxsizuHi+BUcVKe42y19Tmgyjn9iqj+nWzO6bN2bURaxE351WEmO81VnIjwbV2EPVA02DdeiHJVw5lIB4yecZS9iKBOsSIUD0+R2SERkPbkN53BvUYT6hiqUDUnV2BGLs0PXS6not1TUox8yMtzRL0lQggCBDwQCJWVIdOKgJl3rlQ6794xDzTOc6FOqbl8BEWB6SkoiVZdkSVgv9JdUc/tk02T78FeyWfW9Zn04EtHPhznyZJjuPBgLh3eUolY6tpeAWING50ithzXkeJZ9C9vN/HJwBiQCPiRVdXicZnKYxnhOGYj+X4IB1EM7j7VHspBN2YT7cHdASeEtGCfZWJjstUGRRSIE5Ym/OF0bEQWKqyhgfpBsBO9Cljj0Bh74HZxcCpVjGKnGsDM7CpEPm0A8HbYn8ITsa/CKjG0LwkFy2L2pNOP+IVjrYIFY2wXJCOakykY4cnzfYVrzFru13fxq4dZLVP4jEciXHU6+HlvbjI8EMEEeAQIjhEBJGdJIlJHs63/4taveiAjlFRgyTEUeIKhkj0UknQgtmyV0dVmlfe0Gxn5X9M7gwcqsGBOnYffxMmyGPeR66nMf/VJjkn1+sLcLv5/EOnaM5Z56p1gLSSxDcCZISDDYQaZYs8yENDsipgJzTPK/f7KnOrOU1DYTsO9UmjAHJ56O3whwnpZxCCZ/e/IhGFqqBJJrghe5Al6cQZZxCAy5yiAHb5B6GJ06IJmbVBbCVA4MCs4E2PswANkJabYVDKgV0VpgmrwT5tt7Vd/fLXRjvyfU1oildZJ5P9KQWWeqMZq+RYjcfeNYhJBKYAchQCBAYIQRGPUMieq/7wDfPeN49gRo8BL8nASimiFioIWiDPu768sUB7uLsQmNuNVhhnvuWaFr7a1L4cVsLhJbLVRvS8kIJyy3yKUCFTLNQ4ovLdiuqEjxlExk0HVZb3xAotG6gcuTsGDbAahU7BSAVS/tIkS+yBR8hGQ07LckBpQKYCRy5yYMr2VCsHKTLI9+kj0w1Z+Obga7rAUXugSVOA4xpClGJg2k60H6eRk87JfYtr8X2z7jjkh2ci9yaAdrS85rWu1c35glcJiZmKP3W7Y7zDlHbwmDkgUIHDsIjAmGhLPq4z/8+lUvRnTvLZDSidiAh8l4ajYPKop9hM7cqKKd03hnw0Z2GJtWM80abt4zATsiL4bzSCLfz259+d2SSV7hJDgSDuaG1/BMdj3fJJEQQ+i5ke8ie86e4cLEZUiKwS5/eO59OCyU57BzW9HoZBNUSE+552d0Dg6Hi8eejGAsG6ZnWDRK4lrXHAg0qcylHa2VZK6miSRs3mKKPwE2qSFITNehHaC2QypAif6gPoXUpNQwX2ve9ua2DXuqzxGrVq0iXpdd2ny1Gp3PSBcdhACBAIERR2BMMCRCge9PbhdTlRexLrIIU3xsjE2RU6LFUKtVwX/SJVaH9She3XI4qJFVmqE1nQ5H/gux9etN19fXmo1NJTU/hvRCjG5gMXs4xMBHhd2hNJEyVGcwxmj+qy/99rBM1HPlecMN9fvrT4w+CNnoNBj6zSMeKIUzYko4QwXS31kKd68cVzfrPZOt2oc0xjYzygVCcC9AIEBgRBCQawAjknKJE32ytbrLc43VcFHRROtHJAuQPAHiDkKIpXfhL+BhseieFSvIOGzYYT7bXsE0/yIQ9jJ43fhjp6NtH3Zig0SE3HV4rAdrSPkCUodnml7ruXzvFvvsPvhTc+La84D89+QhoEc4kk1C9vgelInuVZWKW/+T2KWQw4IQIBAgECBQGAJjhiGRjyVX6X4TGyifw5J+d4olgReRWQMF35kAFdJFbMreysKqnvMt3l2emAvudi7Mk7cmXPb8Z83GkrkjoRyTYSjBBjk3hqQmkp5ylizrZtIik+9cgfgcKf7AqmnJaITC7m8+1NyZEA+hGmuxbkT+0FITA5kf6sB8nHDqNbh26KSB+6BGqFBBsgECAQJjHoExw5AI6SebVrdiF/8LUHjtBsElyUgqviQNF0LHMZunh5k9E68OQrDztxdMvUNayt388VimepYlwu/lj1H8U7mGNEjxyPbtsKWn4otUdAwT7P9gu90Ei/FfQx+3k449kIGkVbAjgK/Dd/M5cH95xeTO1TWph2PwE3MHmKsHIUAgQOAIITCmGFIjLLQcK4yzYrTXwXN6Vpqxji+lAqwlzeAaW4oTDId1MIpWUTtVVZSLYSndgkP4Vt/4H40l96NG3r5TNDtHC5eQ+Alp9JEjjxLdMr+/usu1lSchHP0JEhms+sisQRrxkYhHOtTx2M50dVltbCFZLZYo2yOajF/ukSvjYA3siKIeZPZBRmDMGDVkGglnIe7H3poXYAZWj43/E0AFQcaJFhJPElXgTReN09XH8XtjJk4h37T2pItDS5HUqdxX/qj5ehOm+iVkEVmlGKl0s7LAmQnZv0bketcL8d215yq/jWnK6YrqLSbVXY+ERxt4mH+K8NQPhQ4c2AKGtTXVViNSlJFJlCQk2jJWWiypr1IYmb6VSjv7M5PfUHmmxlBvzEy84ZYTZyPVq5NZuRFjFVp32OaxpIEdbbodm9ftXH99I1lfjkgwTabMYw1aMhbWw15Sa0UuU6qTzh42GV6sV9FhIsOtU3Z5M/jQvVzpDfU8O63DupaTwVRuR7Uch1WJdOQxx5BWmA8n7rvj6nWa529EG9TSJhliR1LZhRMvMT0/Q0S0RabZgNNFC3fO6U7ZNY6LyOXYu4MdOPzpd5295N5mZAJptbK76wjkUloamruA5Fn4zgWXvWyU+Q+HFD4bb8lTfKWwJK1NvCgkjEsw/l/9/u3192NLV0nX43KXqtR3sRutREmCQGuVdk1teXk0psIUn5JVYJ8v90lbIQZX0jLomoturPuu0umqXaqFQ7+6WBNLFOusmNbvTjBer3Z4rDqddOoLTBbem3n29uxM3prcHJ31tmUd2sXq2pBWQZIiEcfv394Qi4bU8Tg+4zife1NtjVcZrqbaId9WtWRL+7vG3h/918f2GkI9+Mkv/JTO+clFSLMKUdglxrwxp0yrSNruhE7NmGp49qRubpTBssZvaxOdip3Y+4N/a9j9I5M1VzSx9mLxzJSCcJ2QXF/JwuFqWq0NhdJI9sPVI2+b3aowNMvzLWaXh73u1uqt8RtvLMzvJk2S7Sn7aiOhiqib7i/UPnRNOVL6mquK//1Pxn70rcHWldHHrIQfN/z2Ca9qbcOtc6buI/1dYobkkqxSks41WMWJ9/xvm7bZj3qrsaAOF584qpfyBF+itSTuuxPgUq9+ciLxNNJ4f7B0su8/8ECDam91FuDwqUXY3/SG4+g4fncEXdnI9a+R40jSxAAnCWbXcaSuO1b+qS301SsehXP9M+FiaDkmCGEyqKB5AjmlBXefhupeq3vhVzCQNxRK2EaqvMWkK48wD+klY0hGc7ySVY+71nLceTjAx8OJ3wIHqTHhoMWg40TZZJsl4RcXx09jG1zE8UIKjmFx3g/NVzb9eMGntr1vT28pFMMLpm83tu2NXghyeB56G5zZKnCagQU/bGLAFZMnvmLUQCmJJksZwRDXkf2HjslVuaeH9acW7V67GrczPAuXuQMx3B/cPm5aSFfPxknop3u+OwVtX6N6rrS2RGfwko6CgxfdNh5X9sKTyOs/+tYn1sX3tOwc7oFuVJIHcCR4++nWeKaIk9vi/hnodrOYa09AhSvIr6M8GJ1xy/adNlRuv9CVd/fXOWtX1l275ZbbftdeLM2qaVmrO5XRJXDseBE2oZMHE4JNYUnpsV/IPSJ0BzKggDfIpMM9LCUkWhxtv7t35ubv/fPszc26t3+oCXNn+d7KCqPiSkyQT0Z/oXaS+mOkJvPAkeXookkGN144qFX1VPhtk1vYyciW2tWlQqAMiu4qjvt8a93WZ1ljCY/VlamX9qPEDKm0hRsstW2h37ZO5Vc8E+LqVYD7TJqMpzqVNANHnfwlRlSfj7Prd5N13mDpZO7v3hgrr422LReeFRNK9PFI+P2S79/J5JX5RnmHHSycz0L1JeqVKxmwZWyhwpFtRyCYAPteI/5O0o78PGr4M7F0dRqdpUhiq/xmQoOMcZamG5dVtK4hI5EBB80dgWIOKws6whwCMzYNS6iHlUZ2pEh5TTkWQS8FV1iI7cpvCk1txbZusCK0IpgFyeboz/QLhEfAJyCDk1yvHB5wdYf7B9DkL05zXn0Qjwvqn9vb2nCQWuQcz3E/oqnG61hrPQCfgxotHNP8Dfmgj6C30A0EkC/ZrdIf5NEQRzI50f1nJHJ1s1Sk9CdN6lo2KnPBzD6RcMVSRLZs190Kze02HB0DJgSHiD6Ol+Lws6ioUxRFX8x9b6mnirOjteW/esasX3vhMCaB8PSv759qz1Wt8BUu85aAN1SRuyrXdnY6Kn8T1xbWhIkwhAV3x6lcOyHJxEJMZpcaXH/6+1/7i8dNc8HuQpk8VTfR3WFEKsJnwnHJR5DyJjgo3kccXQJJJq74T+sHBCh4hwpWH3Y9EcYePTBmr8tV2ZuTFf/hu+5a/lo+h82i3CJbWTBVPpF6CaVP0240HtKHOgg70GHiepLr0NKF9ramcRzhgnaknNHQYI94Dz3JZw5ixtwDcIA5ysOYZEimyfwfmO47IZU9g45VBw/TEdkLqAGoGRQxHQ134WV17AUYQgxJAKuibTM04Z/jemw7zl7688f+eQ1WD0YwoDfh37AD2bVDAoFDG+qkw06mZBE/Za5O/vv/vei5SLX6GGapJ6ARKoioEVtKFVHUaNy9orKSr4OBwzM33riq5EeFlKwy/RKCQCESFmpTguB4XIXhTYUuvARoy0OgMW878KSOxUufJV2mhuHqApTHgYgEShSKe04U0++JOE9qIaA8Fw6MTnEMzfmfO675yd996aHOoYrU2q4r8KxRBq4Kl7run8APXg6rmkIqSBVedcEB+1QsDEfucooDfS/KqnAMCtvq2rF7Rz0m/asHzY564Y9u9yajjB+zPe9DkFA2gmb+nifcV2wlcdDr9i1eHvYtp1vVhBGJajgjyxALUIDLdV2/2lLV8rfUWvLWv23QTHI8IMmobQqrg7T3dy73LoZH+2Yw9ac1xl9KJDu3widjO0yfpMZV4EjTKNOq3JiLs1M0HCnDLkIbnKwZ+via7rVQJ7Pd+AMZGTokYhUQeLwY9324Stae1XztWWJ6qprWSiBHWKDC6T2c88LRsOXB8bDtV0AoPkk43rmK5v+lp4Qmin3h7yK3JvzlzLd7u91RPsfGmIquR3Oh2CTKKsK2fa5raD1LRID933uuM11TtRcVrj8rVPhAti1iWXgB58R6Ar6QMaty/N1Rt3NIKXfo2o/sG2OSIREk45oqW5KnxJ/iqnslqMU8dERo2zAtQM/AbyxpuBfYTusDmPlA/WamZNccWD4AvTOmE0vg83oyU7SfxhVp6p2zg+SIflRu0ZG1NG0iLQFRytFQWOe7TzUnzEsfi3C1nnNvEQwcSDlEkpwMmCicaijaX+gHtm/GjW2pu2PjU6PZbgkCCAe2zYH7+BzWm+5ru5Inrp83rwnnTGFOxUysFOGPvuXfasxma5Wa1s4w3Da9yKP6Lo95n3IU9aN+QlmPEq0HtnnLBXcm0NOhJRjrhvr0zf32/WtIXZdKn77zBRNHyJoMYwfRH8ubT+PtDbptKIvchPMhSAL7dEP9AWvZ+dItd68lpjkgrmmy3aH9V27WKtl7sHK4WRfiQkiMa+68teGnn1/ZONRpqj2F3l9nTeQs9teYkP4FBsK7mq/cBzXW6kPRTQfMO3N6V9mLU2a3hapDTUY4tBtM6eNgI3+tllV03mUu/9nN5mMFWdXiFAAp/aBiCd+239qr/+rFea83yJ7eCJ1YXV2mzsCQrVYm7+vke2krRGhCTSjsNmmu/g82Vy6FthYq7IZ3B1PdmdiEjhTeaWpITTsbWAPSa2SsoYFB88POm7Q8poyruAKjzHJd+x3NOvTSmj2d3sWtM3voXSOiNsAP2Ma608Stq37Xcx8JjcqglbZUcuimSVBpU+6fGi3O3XHCNW9OrnBewsCcg5mdVKwQAZTkQ4jZOO1zaazjxTcRt7t//Mxvr1ydCLp5CQTgNvh9e+LJDVhAPkqBxCZwVNQgP4QhbIzlZRDmM6/RkM9c4zKVxpGthIlJ4Z3t/K1Qtfow/AfNRCkmkHRESiAanmBIOBLDvww+9V4G4dlXDOE5sjUZmJtWolGiwpAAihtorEBCXOH3TpRAZGQws78zxINYyMa7vnBt0jf4NCj1rlZD2qLbP1X/BohdXklerYz5XmcChzWid8CKwvw69DcymKmvIT8Le6+joqOMx6uXOI5bA3+JP1fZwRc/e/faQccRGBLK8Ugrjl9/YfKs2mpVckhxtRbregpFIrXukOGBW5dEDvLYJa7vXgXJ7H2k8X3PiD958zfzMxUi8kh8y79/9Zr7I8xN+p76WfTOT8BL4xaoDZ8uRG04Hgm0pSaDZEWFI8OpPpk2xFXPpUn1yLQjaQXit9xw+hOTaiePV1z3y9zQz5zMkr/G/YP0Yq5gUvx0esTsZEhnULdCcydAJYGiCNuDNAtmREePr2I4+CAryFi9hcp6MvouR71OMR9kiWjHASgdngUNhw438yZpioiq+2UK8y4u173peJJFrjPvYRRgERY6+sVYcTkDMV7xrMQbhaw59aZQ4qucpRyYRztEJMl0iBHlCFBj5rg78rc+v/JPrVa3/whGyAvQXzhgRMRhZcakvcPYmq4K/8ORslZ4USfGOyYCaAdx1RKEcIggQWLY7aakltoLTFVM2q5vhyTwrAdPwljUnls5g5Hf+LxBephCV4CYyqM4FSvvy4fxUI9XRHzXnQF1ZBcOeXzjs2Zh1pQrG9ckVDv5EjrG657nztNY9ARcD1lOeqetevxMT7gNJG5ileQnHut+slAJh6r6z998aH9I934DxeXvodqaDrL/kVe12omFwEDcAwYfGGaZw1sKiZV65zv3vdYGVeJL6AY7YckyFWZgQzgCy5P2FJQDs1jabkHH0O1tTQ6JXZ7URsWjo0O5SlR1soSD9cl6tMIroHukr5NrM9RAmIeCGHoLImH1LCweUnsNCDNZdY3KnMsxGMpsVzy7ldlDrjcNSOQo3AhPwOpRvnyxOFGiSX2+XHI9E3ZceQcE/EGM1q00WvoFDUtfSyOacsV3bvkQLYUNeKHf+6PiJ+h5ycpJa9OYPMGqu7iqkUYA6xV70MstmN9V6cY0CAX5w/9v78qj46rO+337bJKszZZsvGBsFitQAoGwJOCAA6HBDmljepKcLE3a0LQlJ80pTdKkJ9OT5oS0KbTlQHHTtDlJwx/4lIIdNpOAsTE2cWwWI2O8ysa2ZMlaRzPz9tvf90ZjW7KkeaMZLWPfe8CamXffXX53+e633owJHcZQywNFyvjZJ/x0kPWTYFDDkQNKFHlcrm1kJRJPncRCfQ0qjwFJ41XETRdKz2I9Ozx6A24ovgrZt6iO/WwxxChf/l8knznh2846EIj90LXcqLnsajLOyD8f629DPSYunSyQoWDmUQqJVBu92J26wdwYcJUashkfJWOBn5qD5xhiOuyhIc21sGGp8FTRBImw97z0IddTn8I6bw+0R3T0xlQh+oSRmg3V7KcSg/pFI8eJJp6a0OAI632MS8pbGMmXJ9XU+1QDilqvp94680MNmxUY9NBmE8zAkdslfpzMDejMtoz8TOa7lp15Borcn6CR7bRccnmwBNFgjEytqvAv1NQ5d0J0V/CUP7L8qf4eLBCV7jssTyLLJ8xQXBxVFIdElUu4i34W/tEg8evT5OMFhzgWCS4YxBKAurv4+kJ3WBrUBnFMh+OzXCvD5PupH62qCvvyNx7camopcz1uHf4HnCffDJZugZfbemrnuZ7/cddzHFXi67q0p8ggYSIJDNbhXTBPf8rznHpD1u4Y3D9YV6igdNbJ3yUGQ4PiSZLmKXEovGH4o2QV05mwoUE7mYEg5c5L1I6rg++V/E/FEyRYeFl9GWcrfAG2gxZhXgdc0tA+jcgvkv9+2bOuh7x+GNPQvdutlzzrdpzkq6HY/HU0or5XOQNJEuyAGJVtoyxn3//8/lf6BtL8GWy+GzEQNqgm2km6dTooYIS4f6HC7E+T6A71zsg+nMYDhFRyy9JG2nmILMOARtIhajpdR+FPDyeXxzXNgLm4osNQ7i12sJccSsdNxCGRNxggxz/apK31yyLplOW5m3Ao7Iaj0aoON7Zyzf2riQMOk3hnTfpIROt7XjneFmoNesxegEG5TFWUw57L9+V0OGGqOjvPfT9+KwN93g7Q7G7Ld1okXjvv7Fxn/4K7v8iCFGNIpvrhE/RUKlP5xVgI8/HuUaPaKkkqA3FlsIIgHkJbhuuOwrdq5uQctknPnGYV1RJ+pCndNmsg9gK0hzdBgVuXo0YwnKVrtTmfA1nCjdX9m55DqbmTFDbIyPftS3yu3KTKytvYLF+4+xtPhLbuKap1Z2UuH1MARj3Y6s+qYvp/4MqutoP+B5c+AV7gCjSnJbf7YmSwa8GqEf4o0g1xTf2D//r2HUe/9MNnu6a/yWO0QPJgpQunxDKkBIyEHRJqYdTI3i5skWvWrIwpvTU3W5a7Ag6Q73iO99qfQXkd5n2sCZA/aK0gJKSYgrXtc4cIYStLdA9KJ+phqIa0aKiwtrY2lqoiLwpczdyRcMN49pMhQPK+399WpSi/cDn/vOx4X5dc5eI1P1i93ZXZu6rEunQzbh1mP7NHIx5DkokxjSCGmhb8QcOkfzWdOeBM6jUtul1OdXee+XwCn7ke99p9bnR4rtvsKW5ToTLimQE+oEUBLUEXfhyJGB1gcy71XecuvOzLHt/WuM4KZdk3Wpua2XHm8iXUCgzwaDkq77dzgSCxB7+x1Xz0bz7622gCjnDMuynYpmmU6ECOzQ/Wc9c11BtXYXiIyeUPI7SJEbVvwhji9ln+xJEeb08lDR1dP+FDKDKT5+DXnt1vPXT5ha/Goup6TXEuAL41wfoNBKqIRihxfPc/IcUir8P09Vdjmb5O/7jIzCoTh0R9AS3CWVZSYjJPvPTwnyeOef0yecpVRY1TRC8VheNTmisZf1CPGlX1do90g+3BehfejziVP7Y/1bs/FC7gUeQexMD3nMSAK63QOq2mXq0fdiU+rKO51D87gSgUGRj9eWzP0GySlzZwlQ79XPFO1Lu7XmpZ/kYYyzMWf6bTH1z5mK5xC/69H4dk4g9Aym+Fj9B7Wdc54MqDR5vk1Yd/8gP1uMIzvY6qD9QuZoPFxrTbiPh4rs2qYM8r67rc4ScWhSJk4+EFU5OMLSkIqOwvcWQthJEBlEiQxYD5xH9qnA4Mte0p2YzrPJW2pUZUZkSrpRREe+lIQrIwjo1STXy3K10Ka5a7YIJ/BQzjnmbcffkjGyceESaN+qAcD+aNUhyjNh4c0/qszAQpJ9Ym64Ip7hXvsOP75/uZjbrsX4sxiuaGCR4xHpzJmLcQLboOUcBfvO/HG9KaPLBQ4voKeC6ddDh/+Zv/uK7kSR26v1BhQpwPUon/RkEJIhYplmv8uEWSUnXcDDPg4aZDL5z4aMtt6zWuXg1d3S1QXCvBgRJtp3GRVPliiFM/dYE5ABPm0m76nczulovwu7ganjsKg2d9XUaTVx5IDYB7hKej4fIsXFqImeEI2SNnMGN9FoU/ZbVj8oXgMBbiJvoeeNX+pxeNPP3j720Y043hLBwQusD13IiXdZeDpbqC8Af2qIvBfT8QoWIi0VTK72hkowkRn+x7hqqq6/qsVjwsqK8izmf16vVHPnDhqscMzX0ThgK/B8J7icTc2bDAu95G1AlFRchig/Ujtl4HAom82/m28yZiy+2RGw92ho3v9kR3VFmUkKuJsgOvXtYcjlOk/o6VsnrCMrjcD2McXGGjFbxU8iTZI5Ae11ejquJ/xHlPr+/SGlWWotGUeA8CqcBpFRbhmiTb5MNaW9XN7SamqIuBvwJLxPWKIz9+Qj95eKw2hf2d9gvsI5JX5p08bP3lzlf+bhA8cBA+ZTNf7haPVd6sJwdk/7YtcMc8BmPMJcFeT1MW44VVjiCfylX1iehCCroaV9LXIJwNPLb1DbbPwVWFoABj1Vvk72RSQ+Je2gJGTz7rh7/K6M9G/DpeMSOyTsdXuD54LU39by+on/U4NBiXYBwWkEIDi5J0G9gDXQMfP4yt6kYYOBybqb5JKqIflQU/2LNgOkJ/bkczGXYdjtcQZdLBBG7dLunYTiccWXQcwmfpqjaba7oJovSqz7ztXZm2MX1WTr+d+xSzZvMU76AK0ookb3R8MEJYnPiBNFgQaYNVw+d8xfgQzDvETpNhxwlGx9tVU7M1lGiQaqTxXsvWtcOdoqeuN/qGU2/V+oNyPWSec+F/tgBEahG32HwQqMuwBD6gKvKdvi3vVNqXbHg4ufjVMJdhLl26j3ntl4Nkwtobfbm4vSrf/JHdD/3d0FXupslUDdo9Pczxo574XCDk6CZuqobV5AWMrFRg2QFsoS3FIYO2HsrFbA0hE2KY8I2GEYv5vvMKopa8xnTnYDmMqDCIoPuIMwWuN3SHZ3DG8hMkDAF0BFPeZTqh/eS7bD88PN7EVLkQSw5ic1pfpEYm1Z93pSxZ11/AoemVtRUgCw6cBV/YsEMJvcDL0SlSbI93BAN8iHKCIDEhEvKSWHJGpyS89R/51ooXlbh8MxblH2EVw2SNGk7Nxiffb1ZV7c5oTf8OOKC/Q5vaTOoQjrkIwBJqOEI128M+hUNSL7iWZyD2OQh2BR1G6CA4NhKXQisHpjmyqqmIASNXu6p8EffcK6F7+hB2PHOh0dSNLG1hKsuYFPMINqSKmtIU9SWEdXuF9ZHqqm9IQEfSqb5TRQ3fimex+Kw+8y+ThbmjUwXkPnBstCC9zARqJ/8+ufxgfFA30jwTrYnMSjim2QgR4iJVUlsYU68GN/YxHNCu1CRpzZrkyqfvSa4f11jj8p793pv+xWnu4SzDlJq9uN4CdRXk4Ea0cdhX1UvrnhyD4zZzVNctaPUWjTmS60RwnpIQFo9vcSxnB1gmcLW4RQ0lw/AkKN/BQMPPifahKKhds6PY2IPkhZ4i361L0RQOx9tKFVWT/IfSjFo0QYsm9k/5CRJGFSeCIHwGNpcpTb7afYJ5Dc+DBl2HlUjWMrST0DGFVnkD/t6sKXoCX67BIfCtrCttm2pHWDeNpQe7Bjp/jkygRWg6pm7INNOJ0VA3+EsH2o+uvGL+/6HXWJDsfXSYCw4L1AHsl9jyb4LJ7V0rFqzsWMvWT+kBYXyoTSx0WiJDMcrGz1zwqetBhKNBUqlovSp3fuMPOG/kTKxy/55ZgGxUSf4gV2GuXYu7pq6G4OezWFarTc87BpeFn0L3UtAIJxbJ8gzEfyTWUQ1p8K++/eRp6nNmZSV+xmFQXrZsdRAC6XT0ieDMwRkMHlA8/U9iRkQqX34UBGq35Xa/GvFqX+SGeovMlbsQnu2ruhztheJ/43g6q48kmffP39L6YLzkI3jrPKMuEke54xIxPB83WSlWxTU+mzhJcD2hMAKhRwQM+FxJbGs62/lcvoLh7GQdiyDsOVdMWa9DKD2bLYHMciUOzHfaoCMxztvx3r78uxP5CxjotdB7xkTqmMp3ykqQIAII3H80DUEak1PZjVxd9yR3ZB9N3rqlSla2IwLvPBJM4BgFlhaCEh+Bi2UJVnXu5RAfVMOT7DeDx9+cqP/ChDunxulSBrg2jlZCEdOKJNSjFTETf1u7ttW+ce5FW2rr7V9BmDEf/9eQ2JLWEbgmnA1YA7jYT3hVJq6oaPl1MjlqHLJp6BpZRIY/IBRsoGFB2K+DICnMUIz0nz70WEELK2z2vdHMqhM1mu45zE1yT/vYiXfVp1HXoYL1IUOge8dsk7Hjh8lfbB5wtcpc9smLut/lF9eYb7yN99vGKYO4p1ME6t57l5ycp17WBoEZGAn/HkVTV221al/H+8QFjpUQrlQ6oUlqD3RhC9VUhKIrlGKliQkozXZsq0lWtC5wpEQkxk3xjAYrO1CUQEQnpyEFKDiOKLAPcfS6Y41SPzioRR7iPYJOQ4dYGkEKBHWVICoZF9HTD3P83unvpX8CODgBTMrkD9E4Lh2PtVmuvAlkqI82OzQmOD8QZUJn54GthtxePgCt7Stfe2h/QfY8RJ1FZYGCjajjmPhApIXlWPjAB3o0JvnCkzGfFdXYMmbuq13X5Tnyk+A4XsMGgPahn9RKjBGGCMcGr8WQpLtqzPkIiDLDUkkCodN9UdK5cccJSbKhdDj9ZOxPIEg+jG4Qpjn9Wxg27MHKWhr3ss1jv3H6SR/EcYQunaFx5cWkzImWlhaFKcbNPtP/OpqIfPB07YU/PYT1Z/5o/VFcFfEipsMAwnhdXqfIdYXeVNTsUdd33nVsZ+Gg7yxG/jHXU6Gy/ju53GBq5ErPw23TEt8zaFkFD6nEwufMQgqVPuw5TyKOnsTdfQhjuBVKwwSiki8Cx1gSU0DnOeo+hwHmsNoq9EuoRRG2b1huBkUb9CAEnw4Oidp5z3+sz9jc24z9+i0aKmx2wYDRMxBKDD4nue9L/Sx2kH6b6gQPc4gQiVJSImo5POGBnInBe6OEFOBfwvuT8SptrEe6M60Qs/wven08OCyQs2yAABDBxT2YOR+tjUm3QZcQm4w2TKRMXMJG8+ascZpIWQg8SiwhKITPHWe4cKdQeZFsth+KpQ40JYG7K2B3HDJBgo49iyt0K89kpLY0RcmrwVDCqZRdnMT8LaYa5Pc1PdqpaloKxug1clQmEdy4yeis7oCp+hZMGhgJ+Nf92713wAliYklSZs3DoNwKmBxJcrdUNx/pLVwSGDjcyUeAQmp3tux9nALSiQ1ZxLBrQyxDsIVqHfjJkggS2oD/6MhRVDPGaeH0Pipq8hRoKtlY69DsyRDustbWXDj2Au9MymO7W93recpmFD4IJSL+kNIiR5cgxD+EibCpYacThs0ue/t8m8EXFxeVjSiZjG1Jt41Aj2rMmztcvzwiL66+zL8++iZDs3QGWt0kH0HQzUH5Bc6V50GJsCPToARCh+CQhz3zAkV2P8U9hy5XHBeDEZBM2ldcsFa2NWIadATBRobOF0sg2lO1kPK40MPg/k9VIbuY/BwYu+8UhBcokyEW1kPh/GOXNOaT7y1qs+HLdxhiaMv2nEurk7eTpURRScJ9DMBEx1qFr7pecGf9i0fWpiGN34z8bZjmt+tN8WvCxKAb2ajHH1gdNSXjdgzIBzQj8jYuLtoWxvw8EdPogl8MJTTBRXLPdDBTDBkh2OEeKfNY46LSCBL6BAhgshVcKzKyh5X3vWyLDV2XXF/WSD8CZwu1patrUhZAGIgRTy2FtmzG2fBIbtliBwgCrkK5Ksk7nEhsTxgP9DB1FZsnVoWr0byAUxv1VYgCNCdujrsZJ5RGGbY7dKPoGCm4pXLcMsZ4cdJ/Ppaw30ub0hO40vZQjk88rU4DacKVcP4HcfPs6hUtvfMmvTEFKpBstK2Ms1h1KbQqkeHiBT7VS3D5KC7JxvuQQPhagaYHj+0IXb8Okz3cB1KiIdqY1UnYYB1r8B3c9bTPs/2rpKxxPToZGrUkmAxVkhfjqvFaTVU7M2Ya3jwFEze5txsitqdAEpocW/lS5y71UrwVut6v4KbZzhT7kOv4n4VtI454/P/ajV1tBWtGhsyBHlCjwNAF9RXP4Bi+A24MK0BStFQ2VdI6hZMZ6UdgUV+Qjofp2rTnKRtBWrPmapz7vbjn2ppjmUbd5dGSgC4RGZ7p19/AlfOvYIODCWpOQIT4Gsdh6r1ZSnWUogQtqWlm2tVxMhplQ6Gtihg5PyHZ9rgiq56YAVM9vRonI6yGPFXC9p7b4fGLr8O/ajzr8pL6UMrLpNS20+7vsEM+DwJk5TQcVCI1nrpAEZ/dVbBH+/iDyS8WfdoupW1nvQuOJlggxe85ZxV16gd4vOJwVLTIbmAAd/JxBbJcuupVlnDSLrj5WuYghzUaGZRzxPYguc6kpF7dP+J7/vOu7yXg7PzZf/vOJ1voavFClRHhmv/9VUtxnfldkH2psIffVB+vCrU2v3X/032ax56Aj+9217OWu372zx74uz9cFqZeEglf0jT/JniEfdXxvIUI4bNeyqSfSybbyFy9cJrTRCdb4IkZ7BWvhobpP40F/nC5li0uXF+BHCTw1vxzI1ZD2ZbawEC93ujx2bi210Bc4jnRJoc2kxMFsJy0x0++OdD9uQ9pT+NSs1uhBbgIO53nK8o2L6u89iUEZJ20iscvWFLiejX37HhupzvNHeRfA3lpiHOPLIfIYXfUVOvSNW/+bFgNgh7RvkTnZvqTU8lgqcQ05s0mMUaxoVlGrbDMP245/puTH43dusGIsjtAhpYExIjoEbqBbROfEJ1A9j5X63f0Qem7HkRssMxNKKo41S3bMiGFDskoYZ9QnJHBnc313o6TPOPA+QUbdxWZWZ95KdxoHcocd6QYLkD3YdoXkbXZ//KDT8/RnNEDxZJN9nDlTZzFYKntZ6z0e7F1aRDAMQna95LPpv7x6yuekvXIPNDKW0Bavms2LX76ke/O+62SMDqsY6+bTR37A+FW7wq4HrG5mt5fX/3Tf3KvND17te95N8GnaAP0des/f98vClv0oK00W5L79u6dtXTRvzOOS58l6Xas8NnevCXPPfz9BdvUwdTx9mht9nvLmLdxd5e0CxEe1Lm1MdfJLsB97rdAnLMSDOtckIUnHcP971cPPVvQui6PcTpzTIrFFwTh160ccck/CvUXQiRHUnGrFcOdVlGzIOEer1CfLOpxVDHlLN83XsYKeVa2lZboq5klRwcuAQsdg5X1EpnH5wODaSNIGxEjauWNt71e50nbmcIX4QR2krvKpmynfgTtwp4w9QmOcJrG+hANkc8KWgC3uWEtCTRdfqMSi16EvJvGcpqLRpzZiMEzl/g+EmQHPRkqCXMTNIpHEYRzycEdDD5XjG48n1GJnF+v/WultdHwdyL46oV09KeeUCOJLiFRvLX349mfLLKi3VBav0zXWgRPpuEflxZ9GVIaVnagDOihJBVp08B+dc8Or/E7SzrgQQttkLL00O8s4qLHFW+BkeaeDwokqQ2OJ33ZkNTbuApNHViDwB4coGMnD9Ss8ImBIapKDGEwAohkwtLQlOjVsU3L3NXwIVs75qEAL/CvZHr3L/Xr13hRw4Sf1e0o6hKuxd9xLb7faPrA0e6ma/rApLnshJJQVTbb4vZF4KrggsEbYHW2TVasR/nRw3tRf+i1mYQ7wZrk4s1pi5mwpL8b16DfgJG6VGeRd1kiurvRd957dJ+a4nIT4l1IVcz25qs8crnL3cU4FyCoH3sMN87+b/z48b3FOGRTNNeFpECi85ONoEhFpqxkplVH71dUpcFMm7V4fUK+dwM17TyeacQZDkJHx+dz55YetaLIrpQ9e1kIEpzh5Kj0u0shIUf8KghVOV9sIGpMcnXLWzRpyt7qkAW2DRzsrKlf+oIiOcshfHmH8/gWUoiGfL3s2Wb19tTqDeq1oDs1NJtPydiCmgJSQr/VSq597RyH/wo/HxvZCBAq3fB7r4L+dx72EEANspTbxIe2dLyBKBXw8r+yNmo249uMI0jUp/Rhu6v2Uq0VYRvuxB6EzXWk0p1HIGb/INe9rybqfT/5xS++kvzZz8KJVKiCMiYQ96I3ndGq15xU2o/Et8FoI+Z7g6EcMPPlJDGqP8wO7FY05XlQjt4Op6vgyfqQmnCarDSsTZ1NOKa4kIrVYZIEfSHTCpo2mEF0LEJ8Rcj2XAfEKs+1E0MEYZqh1exmHQX3Cbo6G3qZdy+Jz/kJtur9oGfXIo7dPJT7EdcFeZIlB3EMMC0l3XR8GdEnEO2NtWNfXwc7jRflfr7rnpARzPOY0F+K7AAu+rUaN97JubFT8tj1cB5eACp7OwgURcBAQrdgR0LiYUTIAO7+i3CA3egoyu9S0VT7N360o6gTh9HV71lzm/YojrvRtDJFExPflMC7ms/4vlrryHpBbM/s77DPrXHfmpfdhb7UuZ7Usad1Y1nm6bA6pvjLxME4o6HNkdYqgym3uC5fSiIk+IY3In7GHc1XvO8Vtrb1wBlZp/Qj+Tk8+nfzd8Qj8ddhCtR6uLNrPxowLYNGhKRBMREhwr4BGMFMZyQURFhoi+A69CgfjsUZ7nBave5MLulxWJ5lPatFNtRViHIyi7aWPDGi0k5RJpyY4Hx5pazJt0JefqRQOJaRLZmK7821KUvSGjqxccAOjDa/4WmoL3GY966Aw6Rx8WV9iV/+8DMvf/bbj9FGPqVjCMOAIZI/vI3FfuuIdvfVZIyfcz8lx4+bFHm+qNQtH9vbYDc/YHLZrTk6MCbHki+05sG1Vv/XP/xcnCmvQ3kvw1kcokIIrPyopCCgqw1fcQT6BJYOjGNVWMmo8FfC5MR3E3kRBhTXZMQ72SusYF1UJxElWEceuKHF6cSh6sWszS/QcLUtYtbNhrozCkIF8wofhotefxYeg8x2D2S4dbR5oLt3IsQo30+IdM3HV7O9x+bd1Q6Tqs1MdeZLhn4hDBUa0A3iSbFns7Tjut3o/z7F1N7LSvbJ++7fQOLBoufSg2uPmn/7lTm/0Z3YTkvqeS/fjrB/GzafPNl+jfY/TIvHIlZX0fMgXw8O+87ffj3ya5Y2XtdN70gxXF6+jJn2tywL7Zff/8OlsuZ803HN63DQQngEbIdarMPz5IfU7LJn7k4mp41LeuDL19c1XNT8cZd7nV/6zlMbMABFT8ByDNpPk6vmxuLql2GS9AlsACA6oEhD/kgB808HORzhSOeNE7mvqPrTZtZ95I+Tz3Tk67//mytqFtTHV+N0+QWoqWvI3jMQAOEoi8Ns0C94r+MvbO+hXWZyZFPvoPzjv/zBE4fzZcyUv8uXL1e/cFP8k7rm/BX0KlXQi9BRhpjG3Jwks3UowwAHTvGqoxnxncxTf7E7Y7yWTE4Np3R47/bFUT3yXctxfz5/6fs3lgO7ZDKnPcTfs6lwiAooMgJlK2LzkfDO6ePPWry8unBFLV2AnS1nbONGPznaiaFwEdK9dyzR65csNRK6qiN0kWJDeqhrKs/wtKs5irnwcI1ZbmtXTH7pa/feodcr2WhdtFFT3LTiaDXc1Qfhk+LaPa1HTNrI0fxS9wEZuEpFjMMwxICp3Jp7n+ZBKW3Jt6PUcoa1b7q+lIVDGvD8fkOW1uK89ZwNm55AXwcpR8aSD1cvoxUwfWlg/ta+WeyO5/yTQfC4Uga+pE6oetoyzehmRfFaoQWAohknUJKaYHvBUZRMLnzfgmsgTqww4JQhW+iT+/RhIiozGnVMl+1SfO8BlzKBgsFqkDQuFJ2Z4nTiAArDexzoEdkEelM75fspOgXSJj9tfR8NOOj4vE9/6Jad8PC/H9GfVTI9VDUfJGhIZBT8wVUNcB9UVMS7ozOuz04uY9sntJGP1obCv8HMDuC6blESnXGLnSghyhc6gQ2Qn/VOiCWZy7IxX+1E/vKHcCcWbhWZUt0fJjpnOX3jZNfrA9cJpyQR+RLeP6PiktpxRjkz4mNZCFL9MrW7d7e5WR30pLxAdc6cFFN827v77uA0Mm2dzW0Az+abNW3tiL5e19fbYv52oN+XqhPdp4jDQH+9NAdzM5vABW1qjnvvSznIo/FfH9sxYlGtNyV7+Zudgz1v0/OgMyBCA7hhpjqxEN+HuH+ch202l9n8OOvZWkXc6an6pg2Asyvm7ap/uNnrCqybOtFn3FHKCIt8ylvE0G+9iRjuiWp3P5Oc2vkErg229SQcFUkgIBAQCAgEBALThEDbnj0Xdhxs/c9D7+y8eZqaIKoVCJxXCJyWLZ9X3RadFQiEQaCfjEY8SEUFhxQGLpFHIFAiAoIglQigeP3cRoDUdCIJBAQCU4OAIEhTg7OopUIRgAuLx2GDUqHNF80WCFQUAoIgVdRwicZOJQI86yNWAQz/soJNmkrcRV3nLwKCIJ2/Yy96XgABCssEg3OXfPwLZBWPBQICgTIgIAhSGUAURZybCPhaNeJ+IviMKkR25+YIi17NNAQEQZppIyLaM2MQ4JE0bvKADzPTybFYJIGAQGCSERAEaZIBFsVXMAKZbBB3HIE5hciugodRNL1yEBAEqXLGSrR0qhEAPUKQCASuptBnIgkEBAKTjYAgSJONsCi/YhGIRAywRjKP+Iow+67YURQNryQEBEGqpNESbZ1SBCgqLQLY4oq7Ka1WVCYQOG8REATpvB160fFCCMRxmxzlUUW4hkJQiecCgbIgIAhSWWAUhZyrCOCaENwgKHRI5+r4in7NLAQEQZpZ4yFaM4MQwMV8ssqZi+smhQ5pBo2LaMq5i4AgSOfu2IqelYgAN2o4USJcvy3MvkvEUrwuEAiDgCBIYVASec5LBAw95Tu4f9ex4SArkkBAIDDpCAiCNOkQiwoqFQGexvXpXHFt3L8rkkBAIDD5CAiCNPkYixoqFYEYY55ku5oQ2VXqCIp2VxgCgiBV2ICJ5k4dApmT3Uz1VcdxyCNJJIGAQGCyERAEabIRFuVXLAK+b3AbHJLiy8LKrmJHUTS8khAQBKmSRku0dUoR4N4ALotVLVv1hVHDlCIvKjtfERAE6XwdedHvggikIanzPW4qflRwSAXREhkEAqUjIAhS6RiKEs5RBNTmJg+Rvl3mm4JDOkfHWHRrZiEgCNLMGg/RmhmEgN//DuzrFNfXhMhuBg2LaMo5jIAgSOfw4IqulYaAbSl+xuz1FNkU8b5Lg1K8LRAIhYAaKpfIJBA4DxFIxJu4xz3L7BMc0nk4/KLL04CA4JCmAXRRZWUg0M/6GbNMR5WZVxktFq0UCFQ2AoIgVfb4idZPIgKu28kdVfUyfrcwaphEnEXRAoE8AoIg5ZEQfwUCIxCoci3Osk5G6c8IDmkENuKrQGAyEBA6pMlAVZR5TiDQ6Vxh2id3Ho7WGT3nRIdEJwQCAgGBgECgchF4KZmkQ1twlXnl9kK0XCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAQCAgEBABniAnAAAAIklEQVQICAQEAgIBgYBAQCAgEBAICAQEAgIBgYBAYMoQ+H8YuTSBymvmMAAAAABJRU5ErkJggg==';

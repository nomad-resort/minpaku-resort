const { includesAny, text } = require('./utils');

const FORM_HEADERS = {
  timestamp: 'タイムスタンプ',
  email: 'メールアドレス',
  name: 'お名前（会社名）',
  phone: '電話番号',
  serviceTypes: 'ご希望のサービス内容を選択ください\n（複数選択可）\n',
  requestedServices: '【施設管理運営代行、清掃サービスを希望するお客様】\n必要なサービスを選択ください。',
  area: '【対象施設が既にあるお客様】\n物件平米数',
  layout: '【対象施設が既にあるお客様】\n間取り',
  beds: '【対象施設が既にあるお客様】\nベッドタイプと数\n（常設数とエクストラ）',
  guests: '【対象施設が既にあるお客様】\n希望最大収容人数',
  grade: '【対象施設が既にあるお客様】\n施設グレード',
  buildYear: '【対象施設が既にあるお客様】\n建築年（大規模改修した場合は完了年）',
  storage: '【対象施設が既にあるお客様】\n管理上使用可能な倉庫や押入れ（数、場所、広さ）',
  trash: '【対象施設が既にあるお客様】\n施設所在地域のゴミ処理方法\n',
  pet: '【対象施設が既にあるお客様】\nペット対応',
  address: '【対象施設が既にあるお客様】\n住所',
  specialEquipment: '【対象施設が既にあるお客様】\nその他可能な限り\n施設の特別な設備など',
  listingUrl: '【対象施設が既に販売されているお客様】\n予約サイトやホームページのURL',
  permitType: '宿泊施設の許可の種類\n',
  startDate: 'サービス開始希望日',
  notes: 'その他、弊社に期待すること、ご質問やご要望がございましたら、こちらにご記入ください',
};

const RULES = {
  initialSetup: {
    defaultUnder3Ldk: 75000,
    threeLdkOrMore: 100000,
    villaOr200Sqm: 150000,
  },
  permitSupport: {
    minpaku: 150000,
    hotelOrSimpleLodging: 200000,
  },
  cleaning: {
    areaBands: [
      { max: 50, value: 8000 },
      { max: 100, value: 8000 },
      { max: 150, value: 10000 },
      { max: 200, value: 12000 },
      { max: 250, value: 14000 },
      { max: 300, value: 16000 },
      { max: 350, value: 18000 },
      { max: 400, value: 20000 },
      { max: Infinity, value: 22000 },
    ],
    guestSurchargeAfterTwo: 500,
    gradeCoefficients: {
      luxury: 1.25,
      standard: 1,
      budget: 1,
    },
  },
  trashRequiredPerCleaning: 1000,
  petCleaningPerCleaning: 2000,
  bbqCleaningPerCleaning: 1500,
};

// 不足項目のデフォルト値（保留にせず仮設定で見積を作成する）。
// 実際の交通費算出とGoogleドキュメント生成は Apps Script (apps-script/Code.gs) 側で行う。
const DEFAULTS = {
  areaSqm: 100,
  guests: 8,
  layout: '3LDK',
  grade: '標準',
  addressDisplay: '未確認',
};

function parseFirstNumber(value) {
  const normalized = text(value).replace(/[０-９．]/g, (char) => {
    if (char === '．') return '.';
    return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
  });
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function extractAreaSqm(value) {
  return parseFirstNumber(value);
}

function extractGuests(value) {
  return parseFirstNumber(value);
}

function gradeCoefficient(grade) {
  if (includesAny(grade, ['高級'])) return RULES.cleaning.gradeCoefficients.luxury;
  if (includesAny(grade, ['割安', '低予算'])) return RULES.cleaning.gradeCoefficients.budget;
  return RULES.cleaning.gradeCoefficients.standard;
}

function baseCleaningFeeForArea(areaSqm) {
  const band = RULES.cleaning.areaBands.find((candidate) => areaSqm <= candidate.max);
  return band.value;
}

function calculateCleaningFee({ areaSqm, guests, grade }) {
  const coefficient = gradeCoefficient(grade);
  const basePrice = Math.round(baseCleaningFeeForArea(areaSqm) * coefficient);
  const guestSurcharge = Math.round(
    Math.max(0, guests - 2) * RULES.cleaning.guestSurchargeAfterTwo * coefficient
  );
  return basePrice + guestSurcharge;
}

function isThreeLdkOrMore(layout) {
  const match = text(layout).match(/([3-9]|[1-9][0-9]+)\s*LDK/i);
  return Boolean(match);
}

function calculateInitialSetupFee({ areaSqm, layout, specialEquipment }) {
  if (areaSqm >= 200 || includesAny(`${layout} ${specialEquipment}`, ['villa', 'ヴィラ', 'VILLA'])) {
    return RULES.initialSetup.villaOr200Sqm;
  }
  if (isThreeLdkOrMore(layout)) return RULES.initialSetup.threeLdkOrMore;
  return RULES.initialSetup.defaultUnder3Ldk;
}

function wantsPermitSupport(row) {
  return includesAny(
    `${row[FORM_HEADERS.serviceTypes]} ${row[FORM_HEADERS.requestedServices]}`,
    ['許可取得']
  );
}

function calculatePermitSupportFee(row) {
  if (!wantsPermitSupport(row)) return 0;

  const permitType = row[FORM_HEADERS.permitType];
  if (includesAny(permitType, ['旅館業', '簡易宿所', 'ホテル', '旅館'])) {
    return RULES.permitSupport.hotelOrSimpleLodging;
  }
  return RULES.permitSupport.minpaku;
}

function serviceDecision(row) {
  const serviceTypes = row[FORM_HEADERS.serviceTypes];
  const hasManagement = includesAny(serviceTypes, ['施設管理運営代行']);
  const hasCleaning = includesAny(serviceTypes, ['清掃サービス']);

  if (hasManagement) return 'full_package';
  if (hasCleaning) return 'cleaning_only';
  return 'unsupported';
}

function isLikelyMultipleProperties(row) {
  const combined = [
    row[FORM_HEADERS.area],
    row[FORM_HEADERS.layout],
    row[FORM_HEADERS.address],
    row[FORM_HEADERS.notes],
  ].map(text).join(' ');

  return /(?:全\s*)?[2-9]\s*棟/.test(combined)
    || /複数棟/.test(combined)
    || /・.+・/.test(text(row[FORM_HEADERS.address]));
}

function trashFeePerCleaning(row) {
  const trash = row[FORM_HEADERS.trash];
  if (includesAny(trash, ['不要', '行政が回収可能'])) return 0;
  return RULES.trashRequiredPerCleaning;
}

function petCleaningFeePerCleaning(row) {
  return includesAny(row[FORM_HEADERS.pet], ['受け入れ可能', '可']) && !includesAny(row[FORM_HEADERS.pet], ['不可'])
    ? RULES.petCleaningPerCleaning
    : 0;
}

function bbqCleaningFeePerCleaning(row) {
  return includesAny(row[FORM_HEADERS.specialEquipment], ['BBQ', 'バーベキュー'])
    ? RULES.bbqCleaningPerCleaning
    : 0;
}

function buildResponseId(row, rowNumber) {
  return [
    text(row[FORM_HEADERS.timestamp]),
    text(row[FORM_HEADERS.email]),
    rowNumber || '',
  ].join('|');
}

function detectHolds(row, { decision }) {
  const holds = [];

  if (decision === 'cleaning_only') {
    holds.push({
      category: 'cleaning_only',
      reason: '清掃サービスのみのため、自動見積書は作成せず保留します。',
    });
  } else if (decision === 'unsupported') {
    holds.push({
      category: 'unsupported_service',
      reason: '施設管理運営代行が選択されていないため、自動見積対象外です。',
    });
  }

  if (isLikelyMultipleProperties(row)) {
    holds.push({
      category: 'multiple_properties',
      reason: '複数棟または複数物件の可能性があるため、自動見積書は作成せず保留します。',
    });
  }

  return holds;
}

function calculatePricing(row, parsed) {
  return {
    cleaningFeeExTax: calculateCleaningFee({
      areaSqm: parsed.areaSqm,
      guests: parsed.guests,
      grade: parsed.grade,
    }),
    initialSetupFeeExTax: calculateInitialSetupFee({
      areaSqm: parsed.areaSqm,
      layout: parsed.layout,
      specialEquipment: row[FORM_HEADERS.specialEquipment],
    }),
    permitSupportFeeExTax: calculatePermitSupportFee(row),
    trashFeePerCleaningExTax: trashFeePerCleaning(row),
    petCleaningFeePerCleaningExTax: petCleaningFeePerCleaning(row),
    bbqCleaningFeePerCleaningExTax: bbqCleaningFeePerCleaning(row),
  };
}

function analyzeResponse(row, options = {}) {
  const decision = serviceDecision(row);
  const specialEquipment = row[FORM_HEADERS.specialEquipment];
  const defaultsApplied = [];

  let areaSqm = extractAreaSqm(row[FORM_HEADERS.area]);
  if (areaSqm == null) { areaSqm = DEFAULTS.areaSqm; defaultsApplied.push(`物件平米数(${DEFAULTS.areaSqm}㎡)`); }

  let guests = extractGuests(row[FORM_HEADERS.guests]);
  if (guests == null) { guests = DEFAULTS.guests; defaultsApplied.push(`希望最大収容人数(${DEFAULTS.guests}名)`); }

  let layout = text(row[FORM_HEADERS.layout]);
  if (!layout) { layout = DEFAULTS.layout; defaultsApplied.push(`間取り(${DEFAULTS.layout})`); }

  let grade = text(row[FORM_HEADERS.grade]);
  if (!grade) { grade = DEFAULTS.grade; defaultsApplied.push(`施設グレード(${DEFAULTS.grade})`); }

  const address = text(row[FORM_HEADERS.address]);
  if (!address) defaultsApplied.push(`住所(${DEFAULTS.addressDisplay})`);

  const parsed = {
    areaSqm,
    guests,
    layout,
    grade,
    address,
    addressDisplay: address || DEFAULTS.addressDisplay,
  };
  const holds = detectHolds(row, { decision });
  const canCalculate = holds.length === 0;
  const pricing = canCalculate ? calculatePricing(row, parsed) : {};

  return {
    responseId: buildResponseId(row, options.rowNumber),
    rowNumber: options.rowNumber || null,
    timestamp: text(row[FORM_HEADERS.timestamp]),
    email: text(row[FORM_HEADERS.email]),
    name: text(row[FORM_HEADERS.name]),
    status: canCalculate ? 'estimate_ready' : 'hold',
    serviceDecision: decision,
    holds,
    defaultsApplied,
    parsed,
    cleaningFeeExTax: pricing.cleaningFeeExTax ?? null,
    initialSetupFeeExTax: pricing.initialSetupFeeExTax ?? null,
    permitSupportFeeExTax: pricing.permitSupportFeeExTax ?? null,
    trashFeePerCleaningExTax: pricing.trashFeePerCleaningExTax ?? null,
    petCleaningFeePerCleaningExTax: pricing.petCleaningFeePerCleaningExTax ?? null,
    bbqCleaningFeePerCleaningExTax: pricing.bbqCleaningFeePerCleaningExTax ?? null,
    notes: {
      linenSupply: 'リネンサプライご希望の場合は別途税込+550円 x 宿泊人数 頂戴します。',
      transport: 'エリア・距離により交通費が発生する場合があります。',
      specialEquipment: includesAny(specialEquipment, ['サウナ', 'ジャグジー', '庭', 'プール'])
        ? 'サウナ、ジャグジー、庭、プール等の特殊設備は別途相談です。'
        : '',
    },
  };
}

module.exports = {
  FORM_HEADERS,
  RULES,
  analyzeResponse,
  calculateCleaningFee,
  calculateInitialSetupFee,
  calculatePermitSupportFee,
  extractAreaSqm,
  extractGuests,
};

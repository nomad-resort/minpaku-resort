function text(value) {
  return value == null ? '' : String(value).trim();
}

function includesAny(value, needles) {
  const haystack = text(value).toLowerCase();
  return needles.some((needle) => haystack.includes(String(needle).toLowerCase()));
}

function stripBom(value) {
  return String(value || '').replace(/^\uFEFF/, '');
}

function safeFilePart(value) {
  return String(value || 'estimate')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 40) || 'estimate';
}

function datePart(issueDate, fallbackDate = new Date()) {
  const digits = String(issueDate || '').replace(/\D/g, '');
  return digits.length >= 8
    ? digits.slice(0, 8)
    : fallbackDate.toISOString().slice(0, 10).replace(/-/g, '');
}

module.exports = {
  datePart,
  includesAny,
  safeFilePart,
  stripBom,
  text,
};

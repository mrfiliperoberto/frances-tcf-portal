/** Helpers shared by the job-source adapters (server side). */

export const MAX_DESCRIPTION_LENGTH = 6000;

const NAMED_ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    const lower = code.toLowerCase();
    try {
      if (lower.startsWith('#x')) return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith('#')) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    } catch {
      return match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}

/**
 * Converts job-description HTML into plain text (paragraphs and bullet points kept). The
 * client renders only this text, never third-party HTML.
 */
export function htmlToText(html) {
  if (typeof html !== 'string' || !html) return '';
  const text = html
    .replace(/<(script|style|iframe|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n+• /g, '\n• ') // lists without blank lines between items
    .trim();
}

/** The URL if it is http(s), otherwise null (blocks javascript:, data: and similar links). */
export function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function capText(text, max = MAX_DESCRIPTION_LENGTH) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** ISO string from an ISO-like date (no zone = UTC), epoch seconds or epoch ms. */
export function toIsoUtc(value) {
  if (value === null || value === undefined || value === '') return null;
  let date;
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const n = Number(value);
    date = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    const str = String(value).trim().replace(' ', 'T');
    date = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(str) ? str : `${str}Z`);
  }
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Accepts arrays or Python-like "['a', 'b']" strings; returns a clean string array. */
export function toStringList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) {
    const inner = value.trim().replace(/^\[|\]$/g, '');
    return inner
      .split(',')
      .map((v) => v.trim().replace(/^['"]|['"]$/g, '').trim())
      .filter(Boolean);
  }
  return [];
}

export function formatSalary(min, max, currency, period) {
  const lo = Number(min);
  const hi = Number(max);
  const hasLo = Number.isFinite(lo) && lo > 0;
  const hasHi = Number.isFinite(hi) && hi > 0;
  if (!hasLo && !hasHi) return '';
  const fmt = (n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  const cur = currency && currency !== 'None' ? `${currency} ` : '';
  const range = hasLo && hasHi && lo !== hi ? `${fmt(lo)}–${fmt(hi)}` : fmt(hasLo ? lo : hi);
  const per = period === 'hourly' || period === 'hour' ? '/h' : period === 'monthly' || period === 'month' ? '/mês' : '/ano';
  return `${cur}${range}${per}`;
}

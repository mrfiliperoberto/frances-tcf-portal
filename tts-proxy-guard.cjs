/**
 * Validation shared by the /__tts proxy in server-local.cjs and vite.config.js.
 *
 * The proxy fetches whatever `url` it is given, so without this check it is an open
 * proxy (SSRF: any https host, including internal services). Only Google Translate
 * TTS is allowed.
 */

const ALLOWED_HOSTNAME = 'translate.google.com';
const ALLOWED_PATHNAME = '/translate_tts';

/**
 * Returns the parsed URL if `rawUrl` is https://translate.google.com/translate_tts?...,
 * otherwise null.
 */
function parseAllowedTtsUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || rawUrl.length === 0) return null;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== ALLOWED_HOSTNAME ||
    parsed.pathname !== ALLOWED_PATHNAME ||
    parsed.port !== '' ||
    parsed.username !== '' ||
    parsed.password !== ''
  ) {
    return null;
  }
  return parsed;
}

module.exports = { parseAllowedTtsUrl, ALLOWED_HOSTNAME, ALLOWED_PATHNAME };

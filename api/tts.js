/**
 * Vercel serverless function: the /__tts proxy for the deployed site.
 *
 * Locally, /__tts is served by vite.config.js (dev) and server-local.cjs (desktop app). On
 * Vercel there was no such route, so the site always fell back to the browser voice.
 * vercel.json rewrites /__tts → /api/tts, so the client (ttsService) needs no change.
 *
 * Same rules as the local proxy (tts-proxy-guard.cjs: only https://translate.google.com/
 * translate_tts), plus limits suited to a public endpoint: GET only, French only, short text.
 */
import ttsProxyGuard from '../tts-proxy-guard.cjs';

const { parseAllowedTtsUrl } = ttsProxyGuard;

export const MAX_TTS_TEXT_LENGTH = 200;
const UPSTREAM_TIMEOUT_MS = 8000;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

/** Returns the upstream URL to fetch, or null when the request must be rejected. */
export function validateTtsRequest(rawRequestUrl) {
  let requestUrl;
  try {
    requestUrl = new URL(rawRequestUrl || '', 'http://localhost');
  } catch {
    return null;
  }
  const upstream = parseAllowedTtsUrl(requestUrl.searchParams.get('url'));
  if (!upstream) return null;

  const text = upstream.searchParams.get('q') || '';
  const lang = (upstream.searchParams.get('tl') || '').toLowerCase();
  if (!text.trim() || text.length > MAX_TTS_TEXT_LENGTH) return null;
  if (lang !== 'fr' && !lang.startsWith('fr-')) return null;
  return upstream;
}

function sendText(res, status, message) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(message);
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    sendText(res, 405, 'Method not allowed');
    return;
  }

  const upstream = validateTtsRequest(req.url);
  if (!upstream) {
    sendText(res, 400, 'Invalid TTS URL');
    return;
  }

  try {
    const response = await fetch(upstream.toString(), {
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS)
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.includes('audio')) {
      sendText(res, 502, 'Upstream error');
      return;
    }
    const audio = Buffer.from(await response.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(audio.length));
    // Same text → same audio: let the browser and Vercel's CDN reuse it.
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000');
    res.end(req.method === 'HEAD' ? undefined : audio);
  } catch {
    sendText(res, 502, 'Proxy network error');
  }
}

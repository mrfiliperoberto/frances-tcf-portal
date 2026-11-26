import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import handler, { validateTtsRequest, MAX_TTS_TEXT_LENGTH } from '../api/tts.js';

const google = (q, tl = 'fr-CA') =>
  `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${tl}&client=tw-ob`;
const proxied = (url) => `/__tts?url=${encodeURIComponent(url)}`;

function fakeRes() {
  return {
    statusCode: 0,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(body) {
      this.body = body;
    }
  };
}

afterEach(() => vi.unstubAllGlobals());

describe('validateTtsRequest', () => {
  it('accepts French Google TTS URLs', () => {
    expect(validateTtsRequest(proxied(google('bonjour')))?.hostname).toBe('translate.google.com');
    expect(validateTtsRequest(proxied(google('bonjour', 'fr')))).not.toBeNull();
  });

  it.each([
    ['another host', proxied('https://evil.example/translate_tts?q=x&tl=fr')],
    ['non-French language', proxied(google('hello', 'en'))],
    ['empty text', proxied(google('  '))],
    ['text too long', proxied(google('a'.repeat(MAX_TTS_TEXT_LENGTH + 1)))],
    ['missing url', '/__tts'],
    ['http instead of https', proxied(google('bonjour').replace('https:', 'http:'))]
  ])('rejects %s', (_label, url) => {
    expect(validateTtsRequest(url)).toBeNull();
  });
});

describe('api/tts handler', () => {
  it('streams the upstream audio with cache headers', async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }));
    vi.stubGlobal('fetch', fetchMock);
    const res = fakeRes();
    await handler({ method: 'GET', url: proxied(google('bonjour')) }, res);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toContain('translate.google.com/translate_tts');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('audio/mpeg');
    expect(res.headers['cache-control']).toContain('s-maxage');
    expect(Array.from(res.body)).toEqual([1, 2, 3]);
  });

  it('returns 400 without calling Google for an invalid URL', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = fakeRes();
    await handler({ method: 'GET', url: proxied('https://169.254.169.254/latest') }, res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 405 for non-GET methods', async () => {
    const res = fakeRes();
    await handler({ method: 'POST', url: proxied(google('bonjour')) }, res);
    expect(res.statusCode).toBe(405);
  });

  it('returns 502 when Google answers with something that is not audio', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { headers: { 'content-type': 'text/html' } })));
    const res = fakeRes();
    await handler({ method: 'GET', url: proxied(google('bonjour')) }, res);
    expect(res.statusCode).toBe(502);
  });

  it('returns 502 on network errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNRESET'); }));
    const res = fakeRes();
    await handler({ method: 'GET', url: proxied(google('bonjour')) }, res);
    expect(res.statusCode).toBe(502);
  });
});

describe('vercel.json', () => {
  it('rewrites /__tts to the function before the SPA fallback', () => {
    const { rewrites } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf-8'));
    expect(rewrites[0]).toEqual({ source: '/__tts', destination: '/api/tts' });
    expect(rewrites.at(-1).destination).toBe('/index.html');
  });
});

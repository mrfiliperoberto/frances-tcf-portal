import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/** Fake HTMLAudioElement: `mode` decides what happens on play(). */
function installFakeAudio(mode) {
  const instances = [];
  class FakeAudio {
    constructor() {
      this.src = '';
      this.error = null;
      this.onended = null;
      this.onerror = null;
      this.playbackRate = 1;
      instances.push(this);
    }
    play() {
      if (mode === 'reject') return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }));
      if (mode === 'error') {
        setTimeout(() => {
          this.error = { code: 4, message: '' };
          this.onerror?.();
        }, 0);
        return Promise.resolve();
      }
      if (mode === 'ok') setTimeout(() => this.onended?.(), 0);
      return Promise.resolve(); // 'hang': never ends until stopped
    }
    pause() {}
    removeAttribute() {}
    load() {}
  }
  vi.stubGlobal('Audio', FakeAudio);
  return instances;
}

function installFakeSpeech({ voices = [], fail = false } = {}) {
  const spoken = [];
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(text) {
        this.text = text;
      }
    }
  );
  window.speechSynthesis = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => voices,
    cancel: vi.fn(),
    resume: vi.fn(),
    speak(u) {
      spoken.push(u);
      setTimeout(() => (fail ? u.onerror?.({ error: 'synthesis-failed' }) : u.onend?.()), 0);
    }
  };
  return spoken;
}

let tts;
beforeEach(async () => {
  tts = await import('../src/services/ttsService.js');
});
afterEach(() => {
  delete window.speechSynthesis;
  vi.unstubAllGlobals();
});

describe('text helpers', () => {
  it('extracts the text of Google Translate TTS URLs only', () => {
    expect(
      tts.extractGoogleTtsText('https://translate.google.com/translate_tts?ie=UTF-8&q=bonjour&tl=fr-CA&client=tw-ob')
    ).toBe('bonjour');
    expect(tts.extractGoogleTtsText('https://translate.google.com/translate_tts?tl=fr-CA')).toBe('');
    expect(tts.extractGoogleTtsText('https://upload.wikimedia.org/x.ogg')).toBeNull();
    expect(tts.extractGoogleTtsText('/audio/x.mp3')).toBeNull();
    expect(tts.extractGoogleTtsText(undefined)).toBeNull();
  });

  it('cleans HTML and [phonetic] brackets', () => {
    expect(tts.cleanSpeechText('<b>Bonjour</b> [bɔ̃.ʒuʁ]  le monde')).toBe('Bonjour le monde');
  });

  it('splits long text at sentence, then comma boundaries, max 180 chars', () => {
    const sentence = 'Lorsque j’avais six ans j’ai vu, une fois, une magnifique image, dans un livre sur la forêt vierge.';
    const text = Array(6).fill(sentence).join(' ');
    const chunks = tts.splitIntoChunks(text);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(180));
    expect(chunks.join(' ')).toBe(tts.cleanSpeechText(text));

    const longClause = 'mot, '.repeat(60).trim();
    tts.splitIntoChunks(longClause).forEach((c) => expect(c.length).toBeLessThanOrEqual(180));
    expect(tts.splitIntoChunks('court')).toEqual(['court']);
    expect(tts.splitIntoChunks('  ')).toEqual([]);
  });

  it('builds the proxy URL wrapping the fr-CA Google TTS URL', () => {
    const url = tts.buildProxyTtsUrl('Bonjour à tous');
    expect(url.startsWith('/__tts?url=')).toBe(true);
    const inner = new URL(decodeURIComponent(url.slice('/__tts?url='.length)));
    expect(inner.hostname).toBe('translate.google.com');
    expect(inner.pathname).toBe('/translate_tts');
    expect(inner.searchParams.get('tl')).toBe('fr-CA');
    expect(inner.searchParams.get('client')).toBe('tw-ob');
    expect(inner.searchParams.get('q')).toBe('Bonjour à tous');
  });

  it('selects fr-CA, then any fr-*, else null', () => {
    const fr = { lang: 'fr-FR', name: 'Fr' };
    const ca = { lang: 'fr-CA', name: 'Ca' };
    const en = { lang: 'en-US' };
    expect(tts.selectFrenchVoice([en, fr, ca])).toBe(ca);
    expect(tts.selectFrenchVoice([en, fr])).toBe(fr);
    expect(tts.selectFrenchVoice([en])).toBeNull();
  });
});

describe('playFrench', () => {
  it('plays every chunk through /__tts on one shared audio element', async () => {
    const audios = installFakeAudio('ok');
    installFakeSpeech();
    const text = Array(5).fill('Une phrase assez longue pour forcer plusieurs morceaux de texte.').join(' ');
    const result = await tts.playFrench(text);
    expect(result).toEqual({ source: 'proxy', cancelled: false });
    expect(audios).toHaveLength(1);
    expect(audios[0].src.startsWith('/__tts?url=')).toBe(true);
  });

  it('falls back to speechSynthesis with an fr-CA voice when the audio errors', async () => {
    installFakeAudio('error');
    const ca = { lang: 'fr-CA' };
    const spoken = installFakeSpeech({ voices: [{ lang: 'en-US' }, ca] });
    const result = await tts.playFrench('Bonjour [bɔ̃ʒuʁ]', { rate: 0.8 });
    expect(result.source).toBe('speech');
    expect(spoken[0].text).toBe('Bonjour');
    expect(spoken[0].voice).toBe(ca);
    expect(spoken[0].lang).toBe('fr-CA');
    expect(spoken[0].rate).toBe(0.8);
  });

  it('falls back when play() rejects, using lang fr-FR without French voices', async () => {
    installFakeAudio('reject');
    const spoken = installFakeSpeech({ voices: [] });
    const result = await tts.playFrench('Salut');
    expect(result.source).toBe('speech');
    expect(spoken[0].voice).toBeUndefined();
    expect(spoken[0].lang).toBe('fr-FR');
  });

  it('rejects only when both strategies fail, with both causes', async () => {
    installFakeAudio('error');
    installFakeSpeech({ fail: true });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = await tts.playFrench('Salut').catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/Proxy: .*MEDIA_ERR_SRC_NOT_SUPPORTED/);
    expect(err.message).toMatch(/Speech: speechSynthesis error: synthesis-failed/);
  });

  it('stopFrench resolves the pending playback as cancelled', async () => {
    installFakeAudio('hang');
    installFakeSpeech();
    const pending = tts.playFrench('Une longue lecture');
    tts.stopFrench();
    await expect(pending).resolves.toEqual({ source: 'proxy', cancelled: true });
  });
});

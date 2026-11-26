import { describe, it, expect } from 'vitest';
import guard from '../tts-proxy-guard.cjs';

const { parseAllowedTtsUrl } = guard;

describe('/__tts proxy guard', () => {
  it('accepts Google Translate TTS URLs', () => {
    const ok = parseAllowedTtsUrl('https://translate.google.com/translate_tts?ie=UTF-8&q=bonjour&tl=fr-CA&client=tw-ob');
    expect(ok).not.toBeNull();
    expect(ok.searchParams.get('q')).toBe('bonjour');
  });

  it.each([
    [undefined],
    [''],
    ['not a url'],
    ['http://translate.google.com/translate_tts?q=x'],
    ['https://evil.com/translate_tts?q=x'],
    ['https://translate.google.com.evil.com/translate_tts?q=x'],
    ['https://evil.com/?https://translate.google.com/translate_tts'],
    ['https://translate.google.com/translate_ttsX?q=x'],
    ['https://translate.google.com/other'],
    ['https://translate.google.com:8443/translate_tts?q=x'],
    ['https://user:pass@translate.google.com/translate_tts?q=x'],
    ['https://169.254.169.254/latest/meta-data/'],
    ['file:///etc/passwd']
  ])('rejects %s', (url) => {
    expect(parseAllowedTtsUrl(url)).toBeNull();
  });
});

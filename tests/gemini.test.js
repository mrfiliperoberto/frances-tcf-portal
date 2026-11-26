import { describe, it, expect, vi } from 'vitest';
import {
  parseJsonLoose,
  normalizeListeningQuestion,
  normalizeTCFOral,
  normalizeTCFWritten,
  normalizeShadowing,
  normalizeCamilleAudio,
  GeminiResponseError
} from '../src/services/geminiValidation.js';

const FAKE_KEY = 'test-key-not-real';

describe('Chave do Gemini', () => {
  it('ignora VITE_GEMINI_API_KEY: só usa a chave pessoal do usuário', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'valor-do-env');
    const svc = await import('../src/services/geminiService.js');
    expect(svc.getGeminiApiKey()).toBe('');
    svc.setGeminiApiKey(FAKE_KEY);
    expect(svc.getGeminiApiKey()).toBe(FAKE_KEY);
    vi.unstubAllEnvs();
  });

  it('envia a chave no header e não na URL; usa apenas modelos verificados', async () => {
    const svc = await import('../src/services/geminiService.js');
    expect(svc.GEMINI_CANDIDATE_MODELS).toEqual(['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash']);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'Salut' }] } }] })
    });
    vi.stubGlobal('fetch', fetchMock);
    svc.setGeminiApiKey(FAKE_KEY);
    await svc.sendCamilleChatMessage({ message: 'Bonjour' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain(FAKE_KEY);
    expect(url).not.toContain('key=');
    expect(url).toContain('gemini-3.8-flash');
    expect(init.headers['x-goog-api-key']).toBe(FAKE_KEY);
    vi.unstubAllGlobals();
  });

  it('cai para o próximo modelo em 404/429/503 e para em 403 sem vazar a chave', async () => {
    const svc = await import('../src/services/geminiService.js');
    svc.setGeminiApiKey(FAKE_KEY);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => '{}' })
      .mockResolvedValueOnce({ ok: false, status: 403, text: async () => JSON.stringify({ error: { message: `bad key ${FAKE_KEY}` } }) });
    vi.stubGlobal('fetch', fetchMock);
    const err = await svc.sendCamilleChatMessage({ message: 'x' }).catch((e) => e);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(err.status).toBe(403);
    expect(err.message).not.toContain(FAKE_KEY);
    vi.unstubAllGlobals();
  });

  it('resposta estruturada inválida vira erro tratável, não dados corrompidos', async () => {
    const svc = await import('../src/services/geminiService.js');
    svc.setGeminiApiKey(FAKE_KEY);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [{ content: { parts: [{ text: '{"question":"Q?","options":[{"id":"A","text":"x"}]' }] } }] })
      })
    );
    const err = await svc.generateTCFListeningQuestion({ level: 'B1' }).catch((e) => e);
    expect(err.name).toBe('GeminiResponseError');
    vi.unstubAllGlobals();
  });
});

describe('Validação defensiva', () => {
  it('parseJsonLoose aceita cercas ```json``` e rejeita lixo', () => {
    expect(parseJsonLoose('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(parseJsonLoose('Voici: {"a":2} fin')).toEqual({ a: 2 });
    expect(() => parseJsonLoose('{"a":')).toThrow(GeminiResponseError);
    expect(() => parseJsonLoose('')).toThrow(GeminiResponseError);
  });

  const validQ = {
    level: 'B1',
    audioScript: 'Bonjour',
    question: 'Quoi ?',
    options: [
      { id: 'b', text: 'B' },
      { id: 'A', text: 'A' },
      { id: 'C', text: 'C' },
      { id: 'D', text: 'D' }
    ],
    correctOption: 'b',
    keyVocabulary: { french: 'x' },
    extra: '<script>'
  };

  it('normaliza questão de múltipla escolha', () => {
    const q = normalizeListeningQuestion(validQ, 'B1');
    expect(q.options.map((o) => o.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(q.correctOption).toBe('B');
    expect(q.keyVocabulary).toEqual({ french: 'x', portuguese: '', example: '' });
    expect(q.extra).toBeUndefined();
  });

  it('rejeita alternativas incompletas ou resposta correta inválida', () => {
    expect(() => normalizeListeningQuestion({ ...validQ, options: validQ.options.slice(0, 3) })).toThrow(GeminiResponseError);
    expect(() => normalizeListeningQuestion({ ...validQ, correctOption: 'E' })).toThrow(GeminiResponseError);
    expect(() => normalizeListeningQuestion({ ...validQ, audioScript: '' })).toThrow(GeminiResponseError);
    expect(() => normalizeListeningQuestion([])).toThrow(GeminiResponseError);
  });

  it('normaliza avaliação oral com tipos trocados', () => {
    const r = normalizeTCFOral({
      transcription: 'Je suis',
      score20: 14,
      nclcLevel: 'NCLC 7',
      phoneticAnalysis: { pronunciationScore: '180' },
      strengths: 'um ponto',
      corrections: [{ original: 'a', corrected: 'b' }, null, 'lixo']
    });
    expect(r.score20).toBe('14');
    expect(r.phoneticAnalysis.pronunciationScore).toBe(100);
    expect(r.strengths).toEqual(['um ponto']);
    expect(r.corrections).toHaveLength(1);
    expect(() => normalizeTCFOral({ transcription: 'x' })).toThrow(GeminiResponseError);
  });

  it('normaliza avaliação escrita, shadowing e áudio', () => {
    expect(normalizeTCFWritten({ scoreOutOf20: '12/20', nclcLevel: 'NCLC 6', strengths: ['a', 'b'] }).strengths).toBe('a b');
    expect(() => normalizeShadowing({ pronunciationScore: 'abc' })).toThrow(GeminiResponseError);
    expect(normalizeShadowing({ pronunciationScore: 77.6 }).pronunciationScore).toBe(78);
    expect(normalizeCamilleAudio({ replyText: 'Salut', userTranscription: 'oi' }).transcription).toBe('oi');
    expect(() => normalizeCamilleAudio({ transcription: 'oi' })).toThrow(GeminiResponseError);
  });
});

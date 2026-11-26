import { describe, it, expect } from 'vitest';
import {
  detectLevel,
  detectImmigration,
  detectLanguages,
  detectTrack,
  summarizeLocations,
  scoreJob,
  classifyJob,
  isVisibleInFeed,
  profileKeywords,
  suggestFromResume
} from '../src/services/jobs/jobClassifier.js';

const job = (extra = {}) => ({
  id: 'x:1',
  track: 'support',
  title: 'Customer Support Associate',
  description: 'Help customers via chat. CRM experience is a plus.',
  tags: [],
  locations: [],
  location: 'Worldwide',
  seniority: [],
  remote: true,
  ...extra
});

const profile = { tracks: ['support', 'dev'], keywords: ['customer success'], acceptRemote: true, showNeedsAuthorization: false };

describe('detectLevel', () => {
  it.each([
    ['Software Engineering Intern', [], 'internship'],
    ['Stagiaire en développement web', [], 'internship'],
    ['Senior Customer Success Manager', ['Entry-level'], 'senior'],
    ['Customer Support Associate', ['Entry-level'], 'entry'],
    ['Junior PHP Developer', [], 'entry'],
    ['Support Specialist', ['Mid-level'], 'mid'],
    ['Support Specialist', [], 'unspecified']
  ])('"%s" %j → %s', (title, seniority, expected) => {
    expect(detectLevel(job({ title, seniority }))).toBe(expected);
  });

  it('uses "N+ years" from the description when nothing else says the level', () => {
    expect(detectLevel(job({ title: 'Support Specialist', description: 'You have 5+ years of experience.' }))).toBe('senior');
    expect(detectLevel(job({ title: 'Support Specialist', description: '3 years in SaaS.' }))).toBe('mid');
    expect(detectLevel(job({ title: 'Support Specialist', description: '1-2 years of experience' }))).toBe('entry');
  });
});

describe('detectImmigration', () => {
  it('worldwide or Brazil/LATAM-inclusive roles are 🟢 remote-brazil', () => {
    expect(detectImmigration(job()).status).toBe('remote-brazil');
    expect(detectImmigration(job({ locations: ['Argentina', 'Brazil', 'Chile'] })).status).toBe('remote-brazil');
    expect(detectImmigration(job({ locations: ['LATAM'] })).status).toBe('remote-brazil');
  });

  it('explicit "authorized to work" / "no sponsorship" wins over the location', () => {
    const j = job({ description: 'Candidates must be legally authorized to work in Canada.' });
    expect(detectImmigration(j).status).toBe('needs-authorization');
    expect(detectImmigration(job({ description: 'We are unable to sponsor visas.' })).status).toBe('needs-authorization');
    expect(detectImmigration(job({ description: 'Open to Canadian citizens or permanent residents only' })).status).toBe('needs-authorization');
  });

  it('Canada-only remote roles need authorization; lists with Canada but not Brazil say so', () => {
    expect(detectImmigration(job({ locations: ['Canada'] })).reason).toMatch(/Remoto restrito ao Canadá/);
    const multi = detectImmigration(job({ locations: ['Canada', 'United States', 'Germany', 'France'] }));
    expect(multi.status).toBe('needs-authorization');
    expect(multi.reason).toMatch(/Não aceita candidatos do Brasil/);
  });

  it('on-site Canada roles outside Québec asking for French are 🟡 francophone-mobility', () => {
    const moncton = job({ remote: false, locations: ['Canada'], location: 'Moncton, NB', description: 'Bilingual (English/French) agent.' });
    expect(detectImmigration(moncton).status).toBe('francophone-mobility');
    const montreal = job({ remote: false, locations: ['Canada'], location: 'Montréal, QC', description: 'Bilingual agent in Montréal.' });
    expect(detectImmigration(montreal).status).toBe('needs-authorization');
  });

  it('other countries only are other-country', () => {
    expect(detectImmigration(job({ locations: ['United States'] })).status).toBe('other-country');
  });
});

describe('detectLanguages / detectTrack / summarizeLocations', () => {
  it('detects French, Portuguese and other required languages in the title', () => {
    const langs = detectLanguages(job({ title: 'German-Speaking Customer Support Agent', description: 'Bilingual French is a plus' }));
    expect(langs.french).toBe(true);
    expect(langs.otherRequired).toEqual(['alemão']);
    expect(detectLanguages(job({ title: 'Support Specialist with Spanish/Portuguese' })).otherRequired).toEqual([]);
    expect(detectLanguages(job({ description: 'Atendimento em português' })).portuguese).toBe(true);
  });

  it('decides the track by the title, falling back to the source track', () => {
    expect(detectTrack(job({ title: 'Assistente Customer Service', track: 'dev' }))).toBe('support');
    expect(detectTrack(job({ title: 'Junior Laravel Developer', track: 'support' }))).toBe('dev');
    expect(detectTrack(job({ title: 'Social Media Assistant', track: 'dev' }))).toBe('marketing');
    expect(detectTrack(job({ title: 'Office Assistant', track: 'marketing' }))).toBe('marketing');
  });

  it('summarizes long location lists', () => {
    expect(summarizeLocations(job())).toBe('Mundo todo');
    expect(summarizeLocations(job({ locations: ['Brazil'] }))).toBe('Brazil');
    const many = Array.from({ length: 31 }, (_, i) => `C${i}`).concat('Brazil');
    expect(summarizeLocations(job({ locations: many }))).toBe('32 países (inclui Brasil)');
  });
});

describe('scoring and feed visibility', () => {
  it('matches profile and track keywords, with bonuses for entry level, Brazil and Portuguese', () => {
    const strong = scoreJob(job({ title: 'Customer Success Associate (Portuguese)', seniority: ['Entry-level'] }), profile);
    const weak = scoreJob(job({ title: 'Senior Customer Success Manager', locations: ['United States'] }), profile);
    expect(strong.matched).toContain('customer success');
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(strong.score).toBeLessThanOrEqual(100);
  });

  it('penalizes roles that require a language outside the profile', () => {
    const base = scoreJob(job({ title: 'Customer Support Agent' }), profile).score;
    const german = scoreJob(job({ title: 'German Customer Support Agent' }), profile).score;
    expect(german).toBeLessThan(base);
  });

  it('profileKeywords merges profile keywords with track defaults (normalized, unique)', () => {
    const keywords = profileKeywords({ tracks: ['dev'], keywords: ['Laravel', 'PHP'] });
    expect(keywords).toContain('laravel');
    expect(keywords.filter((k) => k === 'php')).toHaveLength(1);
  });

  it('hides senior/mid, other tracks, dismissed and (by default) not-eligible roles', () => {
    const visible = (extra, p = profile) => isVisibleInFeed(classifyJob(job(extra), p), p);
    expect(visible({})).toBe(true);
    expect(visible({ title: 'Senior Support Engineer' })).toBe(false);
    expect(visible({ title: 'Social Media Assistant', track: 'marketing' })).toBe(false);
    expect(visible({ status: 'dismissed' })).toBe(false);
    expect(visible({ locations: ['United States'] })).toBe(false);
    expect(visible({ locations: ['United States'] }, { ...profile, showNeedsAuthorization: true })).toBe(true);
  });
});

describe('suggestFromResume', () => {
  it('suggests tracks, keywords and languages from résumé text (accents ignored)', () => {
    const text = `Atendimento N1, Customer Success, CRM e onboarding. Desenvolvedor PHP / Laravel, APIs REST,
      Docker e GitHub Actions. Criação de conteúdo para redes sociais com Canva. Inglês avançado. Português nativo.`;
    const { tracks, keywords, languages } = suggestFromResume(text);
    expect(tracks).toEqual(expect.arrayContaining(['support', 'dev', 'marketing']));
    expect(keywords).toEqual(expect.arrayContaining(['customer success', 'crm', 'php', 'laravel', 'rest api', 'docker', 'github actions', 'social media', 'canva']));
    expect(languages).toEqual({ english: true, portuguese: true, french: false });
  });

  it('returns nothing for empty text', () => {
    expect(suggestFromResume('')).toEqual({ tracks: [], keywords: [], languages: { english: false, portuguese: false, french: false } });
  });
});

/**
 * Classifies job postings for the "Alerta de Vagas" feed (runs on the device).
 * - level: internship | entry | mid | senior | unspecified
 * - immigration: remote-brazil | francophone-mobility | needs-authorization | other-country | unknown
 * - languages: english / french / portuguese mentions
 * - score (0-100) + matched keywords against the profile
 */

export const TRACKS = Object.freeze({
  support: {
    label: 'Atendimento / Customer Success',
    keywords: ['customer support', 'customer success', 'customer service', 'support', 'technical support', 'help desk', 'helpdesk', 'tier 1', 'onboarding', 'crm', 'zendesk', 'hubspot', 'intercom', 'chat', 'retention', 'service à la clientèle', 'soutien technique']
  },
  dev: {
    label: 'Desenvolvimento',
    keywords: ['php', 'laravel', 'javascript', 'node', 'node.js', 'rest api', 'api', 'mysql', 'docker', 'git', 'github actions', 'phpunit', 'back-end', 'backend', 'full stack', 'full-stack', 'web developer', 'développeur']
  },
  marketing: {
    label: 'Marketing digital',
    keywords: ['marketing', 'social media', 'content', 'canva', 'photoshop', 'premiere', 'video editing', 'copywriting', 'seo', 'community']
  }
});

export const LEVEL_LABELS = Object.freeze({
  internship: 'Estágio / Co-op',
  entry: 'Entry level / Júnior',
  mid: 'Pleno',
  senior: 'Sênior',
  unspecified: 'Nível não informado'
});

export const IMMIGRATION = Object.freeze({
  'remote-brazil': { emoji: '🟢', label: 'Remoto do Brasil' },
  'francophone-mobility': { emoji: '🟡', label: 'Possível via Mobilidade Francófona' },
  'visa-sponsorship': { emoji: '🟡', label: 'Oferece patrocínio de visto' },
  'needs-authorization': { emoji: '🔴', label: 'Exige autorização para trabalhar no Canadá' },
  'other-country': { emoji: '🔴', label: 'Restrita a outro país' },
  unknown: { emoji: '❔', label: 'Elegibilidade não informada' }
});

const normalize = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const INTERN_RE = /\b(intern|internship|co-?op|stagiaire|stage|estagi[oa]|trainee|apprentice)\b/;
const SENIOR_TITLE_RE = /\b(senior|sr\.?|lead|principal|staff|head of|director|vp|vice president|architect|manager|gerente)\b/;
const ENTRY_RE = /\b(junior|jr\.?|entry[- ]level|new grad|graduate|debutant|associate|beginner|no experience)\b/;
const MID_RE = /\b(mid[- ]level|intermediate|pleno)\b/;
const YEARS_RE = /\b(\d{1,2})\s*\+?\s*(?:-\s*\d{1,2}\s*)?(?:years|yrs|ans|anos)\b/g;

export function detectLevel(job) {
  const title = normalize(job.title);
  if (INTERN_RE.test(title)) return 'internship';
  if (SENIOR_TITLE_RE.test(title)) return 'senior';
  const seniority = (job.seniority || []).map(normalize).join(' ');
  if (/entry/.test(seniority)) return 'entry';
  if (/intern/.test(seniority)) return 'internship';
  if (ENTRY_RE.test(title)) return 'entry';
  if (/senior|director|manager|executive/.test(seniority)) return 'senior';
  if (/mid/.test(seniority) || MID_RE.test(title)) return 'mid';
  // "5+ years" etc. in the description
  const years = [...normalize(job.description).matchAll(YEARS_RE)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 30);
  if (years.length) {
    const min = Math.min(...years);
    if (min >= 5) return 'senior';
    if (min >= 3) return 'mid';
    if (min <= 2) return 'entry';
  }
  return 'unspecified';
}

const NEEDS_AUTH_RE = new RegExp(
  [
    'legally (?:authori[sz]ed|entitled|eligible) to work',
    'must (?:be|have) (?:\\w+ ){0,4}(?:authori[sz]ed|eligible|entitled) to work',
    'work authori[sz]ation (?:is )?required',
    'authori[sz]ed to work in (?:canada|the us|the united states|the u\\.s\\.)',
    'no (?:visa )?sponsorship',
    'not (?:able to |be able to )?(?:offer |provide )?(?:visa )?sponsor',
    '(?:cannot|can\'t|unable to|will not|won\'t|do not|does not|don\'t) (?:offer |provide )?(?:visa )?sponsor',
    'without (?:the need for )?(?:visa )?sponsorship',
    '(?:citizens?|citizenship) (?:or|and|/) permanent residen',
    'permanent residents? (?:or|and|/) citizens?',
    'security clearance',
    'u\\.?s\\.? citizens? only',
    'must (?:reside|live|be located|be based) in (?:canada|the us|the united states|the u\\.s\\.)'
  ].join('|')
);
const BRAZIL_RE = /\b(worldwide|anywhere|global|brazil|brasil|latam|latin america|south america|americas)\b/;
const QUEBEC_RE = /\b(quebec|montreal|laval|gatineau|sherbrooke|trois-rivieres|saguenay|mascouche|longueuil|levis)\b|\(qc\)|\bqc\b/;

/** Languages a title may require that are not in the profile (pt, en, fr). */
const OTHER_LANGUAGES = {
  german: 'alemão',
  spanish: 'espanhol',
  italian: 'italiano',
  dutch: 'holandês',
  japanese: 'japonês',
  korean: 'coreano',
  mandarin: 'mandarim',
  chinese: 'chinês',
  arabic: 'árabe',
  turkish: 'turco',
  polish: 'polonês',
  russian: 'russo',
  swedish: 'sueco',
  danish: 'dinamarquês',
  norwegian: 'norueguês',
  finnish: 'finlandês',
  czech: 'tcheco',
  hungarian: 'húngaro',
  greek: 'grego',
  romanian: 'romeno',
  hebrew: 'hebraico',
  hindi: 'hindi',
  thai: 'tailandês',
  vietnamese: 'vietnamita'
};

export function detectLanguages(job) {
  const title = normalize(job.title);
  const text = normalize(`${job.title} ${job.description} ${(job.tags || []).join(' ')}`);
  const portuguese = /\b(portuguese|portugues|brazilian|brasileiro|pt-br)\b/.test(text);
  // Only the title is used for "required" languages: descriptions often list many optional ones.
  const otherRequired = Object.entries(OTHER_LANGUAGES)
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(title))
    .filter(([name]) => !(name === 'spanish' && portuguese)) // "Spanish/Portuguese" roles fit
    .map(([, label]) => label);
  return {
    french: Boolean(job.frenchHint) || /\b(french|francais|francophone|bilingual|bilingue|fr\/en|en\/fr)\b/.test(text),
    portuguese,
    english: true,
    otherRequired
  };
}

// Negation before ("no relocation assistance") or after ("relocation is not provided").
const NO_RELOCATION_RE = /\b(no|not|without|unable to (?:offer|provide)|cannot (?:offer|provide)|does not (?:offer|provide)|do not (?:offer|provide)|won't (?:offer|provide))\b[^.\n]{0,40}\breloc|\breloc\w*\b[^.\n]{0,30}\b(not|isn't|unavailable|n't)\b/;
const RELOCATION_RE = /\breloc(?:ation|ate|ating|alisation)\b[^.\n]{0,60}\b(assistance|package|support|bonus|stipend|allowance|provided|available|offered|help|covered|benefit|reimburse)|\b(assistance|package|support|help|bonus|stipend|allowance)\b[^.\n]{0,30}\breloc(?:ation|ate|alisation)\b|aide (?:a|à) la (?:reinstallation|relocalisation)/;
const SPONSOR_RE = /visa sponsorship (?:is |will be )?(?:available|provided|offered|possible)|sponsorship for (?:an? )?(?:\w+ ){0,2}(?:work permit|visa|permanent residen)|\b(?:we|will|can|able to|happy to|open to) (?:\w+ ){0,2}sponsor(?:ing|ship)?\b|sponsorship (?:is )?(?:available|provided|offered)|lmia (?:support|sponsorship|available|approved)|work permit (?:support|sponsorship|assistance)/;

/** { relocation, sponsorship } mentioned positively in the posting (negations excluded). */
export function detectRelocation(job) {
  const text = normalize(`${job.title}\n${job.description}`);
  const sponsorship = SPONSOR_RE.test(text) && !NEEDS_AUTH_RE.test(text);
  const relocation = RELOCATION_RE.test(text) && !NO_RELOCATION_RE.test(text);
  return { relocation, sponsorship };
}

const includesBrazil = (locations) => locations.some((l) => BRAZIL_RE.test(normalize(l)));

/**
 * Short location label for the post: "Mundo todo", "Brasil", "Canadá, EUA" or
 * "32 países (inclui Brasil)" for long lists.
 */
export function summarizeLocations(job) {
  const locations = job.locations || [];
  if (locations.length === 0) return 'Mundo todo';
  if (locations.length <= 3) return locations.join(', ');
  const brazil = includesBrazil(locations);
  const canada = locations.some((l) => /canada/i.test(l));
  const note = brazil ? 'inclui Brasil' : canada ? 'inclui Canadá, não o Brasil' : 'não inclui o Brasil';
  return `${locations.length} países (${note})`;
}

/** { status, reason } — see IMMIGRATION for labels. */
export function detectImmigration(job) {
  const text = normalize(`${job.title}\n${job.description}`);
  const locations = job.locations || [];
  const locationText = normalize(locations.join(', '));

  if (NEEDS_AUTH_RE.test(text)) {
    return { status: 'needs-authorization', reason: 'O anúncio pede autorização de trabalho ou diz que não patrocina visto.' };
  }
  if (locations.length === 0 || includesBrazil(locations)) {
    return {
      status: 'remote-brazil',
      reason: locations.length === 0 ? 'Aberta a candidatos de qualquer país.' : `Aceita candidatos do Brasil (${summarizeLocations(job)}).`
    };
  }
  if (locations.some((l) => /canada/i.test(l))) {
    if (detectRelocation(job).sponsorship) {
      return { status: 'visa-sponsorship', reason: 'O anúncio diz que a empresa patrocina visto/permissão de trabalho.' };
    }
    const french = detectLanguages(job).french;
    const outsideQuebec = !QUEBEC_RE.test(`${locationText} ${normalize(job.location)} ${text}`);
    if (french && outsideQuebec && !job.remote) {
      return { status: 'francophone-mobility', reason: 'Vaga no Canadá fora do Québec que pede francês: candidata à Mobilidade Francófona.' };
    }
    if (locations.length > 1) {
      return { status: 'needs-authorization', reason: `Não aceita candidatos do Brasil (${summarizeLocations(job)}): no Canadá, exige poder trabalhar lá.` };
    }
    return {
      status: 'needs-authorization',
      reason: job.remote
        ? 'Remoto restrito ao Canadá: exige morar e poder trabalhar lá.'
        : 'Vaga presencial no Canadá sem menção a francês.'
    };
  }
  if (detectRelocation(job).sponsorship) {
    return { status: 'visa-sponsorship', reason: 'O anúncio diz que a empresa patrocina visto/permissão de trabalho.' };
  }
  return { status: 'other-country', reason: `Não aceita candidatos do Brasil (${summarizeLocations(job)}).` };
}

/** Track from the job title (falls back to the track given by the source/search). */
const TRACK_TITLE_RE = {
  support: /\b(support|success|service|help ?desk|customer|chat|care|client|atendimento|clientele|soutien)\b/,
  dev: /\b(developer|engineer|programmer|php|laravel|software|web|full[- ]?stack|back[- ]?end|front[- ]?end|devops|qa|tester|desenvolvedor|developpeur)\b/,
  marketing: /\b(marketing|social media|content|seo|copywriter|community|brand|growth|writer|redator)\b/
};

export function detectTrack(job) {
  const title = normalize(job.title);
  const hits = Object.entries(TRACK_TITLE_RE).filter(([, re]) => re.test(title)).map(([track]) => track);
  if (hits.length === 1) return hits[0];
  if (hits.includes(job.track)) return job.track;
  return hits[0] || job.track;
}

function keywordRegex(keyword) {
  const escaped = normalize(keyword).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`);
}

/** Keywords used for matching: profile keywords + defaults of the selected tracks. */
export function profileKeywords(profile) {
  const fromTracks = (profile?.tracks || []).flatMap((t) => TRACKS[t]?.keywords || []);
  return [...new Set([...(profile?.keywords || []), ...fromTracks].map((k) => normalize(k).trim()).filter(Boolean))];
}

/** { score 0-100, matched: string[] } */
export function scoreJob(job, profile, extra = {}) {
  const keywords = profileKeywords(profile);
  const title = normalize(job.title);
  const tags = normalize((job.tags || []).join(' | '));
  const description = normalize(job.description);
  const matched = [];
  let points = 0;
  for (const keyword of keywords) {
    const re = keywordRegex(keyword);
    if (re.test(title)) {
      points += 12;
      matched.push(keyword);
    } else if (re.test(tags)) {
      points += 6;
      matched.push(keyword);
    } else if (re.test(description)) {
      points += 3;
      matched.push(keyword);
    }
  }
  const level = extra.level ?? detectLevel(job);
  const immigration = extra.immigration ?? detectImmigration(job);
  const languages = extra.languages ?? detectLanguages(job);
  if (level === 'internship' || level === 'entry') points += 15;
  if (level === 'senior') points -= 40;
  if (immigration.status === 'remote-brazil') points += 15;
  if (immigration.status === 'francophone-mobility') points += 20;
  if (immigration.status === 'visa-sponsorship') points += 20;
  if (extra.relocation ?? detectRelocation(job).relocation) points += 10;
  if (languages.portuguese) points += 12;
  if (languages.french) points += 6;
  if (languages.otherRequired?.length) points -= 30;
  return { score: Math.max(0, Math.min(100, Math.round(points))), matched: matched.slice(0, 8) };
}

export function classifyJob(job, profile) {
  const level = detectLevel(job);
  const immigration = detectImmigration(job);
  const languages = detectLanguages(job);
  const track = detectTrack(job);
  const { relocation, sponsorship } = detectRelocation(job);
  const { score, matched } = scoreJob(job, profile, { level, immigration, languages, relocation });
  return { ...job, track, level, immigration, languages, relocation, sponsorship, score, matched, locationLabel: summarizeLocations(job) };
}

/**
 * Feed visibility: selected tracks only, no mid/senior roles, and no roles the user cannot take
 * (needs authorization / other country) unless `profile.showNeedsAuthorization`.
 */
export function isVisibleInFeed(classified, profile) {
  if (profile?.tracks?.length && !profile.tracks.includes(classified.track)) return false;
  if (classified.level === 'senior' || classified.level === 'mid') return false;
  if (classified.status === 'dismissed') return false;
  const blocked = classified.immigration.status === 'needs-authorization' || classified.immigration.status === 'other-country';
  if (blocked && !profile?.showNeedsAuthorization) return false;
  if (!profile?.acceptRemote && classified.remote) return false;
  return true;
}

/** Résumé text → suggested tracks and keywords (simple dictionary match, no AI). */
const RESUME_HINTS = [
  { track: 'support', patterns: ['atendimento', 'customer success', 'suporte', 'help desk', 'n1', 'chamados', 'onboarding', 'retencao', 'sac'], keywords: ['customer support', 'customer success', 'onboarding', 'crm', 'tier 1'] },
  { track: 'support', patterns: ['crm'], keywords: ['crm'] },
  { track: 'dev', patterns: ['php'], keywords: ['php'] },
  { track: 'dev', patterns: ['laravel'], keywords: ['laravel'] },
  { track: 'dev', patterns: ['javascript'], keywords: ['javascript'] },
  { track: 'dev', patterns: ['node'], keywords: ['node.js'] },
  { track: 'dev', patterns: ['api rest', 'apis rest', 'rest api'], keywords: ['rest api'] },
  { track: 'dev', patterns: ['mysql'], keywords: ['mysql'] },
  { track: 'dev', patterns: ['docker'], keywords: ['docker'] },
  { track: 'dev', patterns: ['phpunit'], keywords: ['phpunit'] },
  { track: 'dev', patterns: ['github actions', 'ci/cd'], keywords: ['github actions'] },
  { track: 'marketing', patterns: ['marketing'], keywords: ['marketing'] },
  { track: 'marketing', patterns: ['redes sociais', 'social media', 'conteudo'], keywords: ['social media', 'content'] },
  { track: 'marketing', patterns: ['canva'], keywords: ['canva'] },
  { track: 'marketing', patterns: ['photoshop'], keywords: ['photoshop'] },
  { track: 'marketing', patterns: ['premiere', 'capcut'], keywords: ['video editing'] }
];

export function suggestFromResume(text) {
  const resume = normalize(text);
  const tracks = new Set();
  const keywords = new Set();
  for (const hint of RESUME_HINTS) {
    if (hint.patterns.some((p) => keywordRegex(p).test(resume))) {
      tracks.add(hint.track);
      hint.keywords.forEach((k) => keywords.add(k));
    }
  }
  const languages = {
    english: /\b(ingles|english)\b/.test(resume),
    portuguese: /\b(portugues|portuguese)\b/.test(resume) || /\bbrasil\b/.test(resume),
    french: /\b(frances|french|francais)\b/.test(resume)
  };
  return { tracks: [...tracks], keywords: [...keywords], languages };
}

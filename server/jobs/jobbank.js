/**
 * Job Bank Canada (Government of Canada) through its official Atom job-search feed.
 * robots.txt asks for a 5-second crawl delay, so the searches run one after another with that
 * spacing; results are cached by /api/jobs. Postings are on-site jobs in Canada.
 */
import { decodeEntities, safeHttpUrl, toIsoUtc } from './common.js';
import { trackForTitle } from './companies.js';

export const JOBBANK_FEED = 'https://www.jobbank.gc.ca/jobsearch/feed/jobSearchRSSfeed';
export const JOBBANK_DELAY_MS = 5000;

/** Searches (nationwide, newest first). `french: true` marks French/bilingual searches. */
export const JOBBANK_QUERIES = Object.freeze([
  { track: 'support', q: 'bilingual customer service', french: true },
  { track: 'support', q: 'service à la clientèle', french: true },
  { track: 'dev', q: 'web developer' },
  { track: 'marketing', q: 'bilingual marketing', french: true }
]);

const PROVINCE_IN_PARENS = /\(([A-Z]{2})\)/;
const FRENCH_TITLE = /bilingu|french|fran[cç]ais|[àâçéèêëîïôûùüÿœ]/i;

function field(summary, label) {
  const match = summary.match(new RegExp(`<strong>${label}:<\\/strong>\\s*([^<]*)`, 'i'));
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
}

/** Parses the Atom feed into raw entries (no XML library needed for this fixed format). */
export function parseJobBankFeed(xml) {
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.map((entry) => {
    const title = (entry.match(/<title[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || [])[1] || '';
    const link = (entry.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    const updated = (entry.match(/<updated>([^<]+)<\/updated>/) || [])[1] || '';
    const summary = (entry.match(/<summary[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/summary>/) || [])[1] || '';
    return {
      title: decodeEntities(title).trim(),
      url: decodeEntities(link),
      updated,
      jobNumber: field(summary, 'Job number'),
      location: field(summary, 'Location'),
      employer: field(summary, 'Employer'),
      salary: field(summary, 'Salary')
    };
  });
}

const capitalize = (text) => text.replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export function normalizeJobBankEntry(entry, query) {
  const url = safeHttpUrl(entry.url);
  if (!url || !entry.title) return null;
  // Job Bank search is fuzzy (managers, retail...): keep only titles that fit a track.
  const track = trackForTitle(entry.title);
  if (!track) return null;
  const province = (entry.location.match(PROVINCE_IN_PARENS) || [])[1] || '';
  const city = entry.location.replace(PROVINCE_IN_PARENS, '').split(/\s{2,}/)[0].trim();
  const id = entry.jobNumber || (url.match(/jobposting\/(\d+)/) || [])[1] || url;
  return {
    id: `jobbank:${id}`,
    source: 'jobbank',
    sourceName: 'Job Bank (Guichet-Emplois)',
    track,
    title: capitalize(entry.title),
    company: entry.employer,
    url,
    postedAt: toIsoUtc(entry.updated),
    jobType: '',
    location: [city, province].filter(Boolean).join(', ') || 'Canada',
    locations: ['Canada'],
    province,
    seniority: [],
    salary: entry.salary,
    tags: [],
    // French is assumed only from the title itself (bilingual / written in French), not from the search.
    frenchHint: FRENCH_TITLE.test(entry.title),
    description: `Vaga presencial anunciada no Job Bank do governo do Canadá. Empregador: ${entry.employer || 'não informado'}. Abra o anúncio para ver requisitos, quem pode se candidatar e se o empregador tem LMIA.`,
    remote: false
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchJobBankJobs({ fetchImpl = fetch, timeoutMs = 15000, queries = JOBBANK_QUERIES, delayMs = JOBBANK_DELAY_MS } = {}) {
  const jobs = [];
  const errors = [];
  const seen = new Set();
  for (let i = 0; i < queries.length; i += 1) {
    const query = queries[i];
    if (i > 0 && delayMs > 0) await sleep(delayMs); // robots.txt: Crawl-delay: 5
    try {
      const url = `${JOBBANK_FEED}?searchstring=${encodeURIComponent(query.q)}&sort=D`;
      const res = await fetchImpl(url, { headers: { Accept: 'application/atom+xml' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const entry of parseJobBankFeed(await res.text())) {
        const job = normalizeJobBankEntry(entry, query);
        if (job && !seen.has(job.id)) {
          seen.add(job.id);
          jobs.push(job);
        }
      }
    } catch (err) {
      errors.push(`jobbank "${query.q}": ${err?.message || 'erro'}`);
    }
  }
  return { jobs, errors };
}

/**
 * Himalayas remote jobs API (free, no key): https://himalayas.app/docs/remote-jobs-api
 * Rules we follow: credit Himalayas with a link, send "Apply" to the job's applicationLink,
 * don't poll more than daily (data refreshes every 24 h). Max 20 results per request.
 */
import { capText, formatSalary, htmlToText, safeHttpUrl, toIsoUtc, toStringList } from './common.js';

export const HIMALAYAS_SEARCH = 'https://himalayas.app/jobs/api/search';

/**
 * One request per query (first page, 20 newest jobs). `country: 'Brazil'` returns only jobs open
 * to candidates in Brazil (no work permit needed). Dev searches are limited to entry level,
 * since most dev postings are senior; support/marketing postings often omit the level, so the
 * client-side classifier drops the senior ones instead.
 */
export const HIMALAYAS_QUERIES = Object.freeze([
  { track: 'support', q: 'customer support', country: 'Brazil' },
  { track: 'support', q: 'customer success', country: 'Brazil' },
  { track: 'support', q: 'technical support', country: 'Brazil' },
  { track: 'support', q: 'portuguese', country: 'Brazil' },
  { track: 'dev', q: 'php', country: 'Brazil', entryOnly: true },
  { track: 'dev', q: 'laravel', country: 'Brazil', entryOnly: true },
  { track: 'dev', q: 'developer', country: 'Brazil', entryOnly: true },
  { track: 'marketing', q: 'marketing assistant', country: 'Brazil' },
  { track: 'marketing', q: 'social media', country: 'Brazil' }
]);

export function buildHimalayasUrl({ q, country, entryOnly }) {
  const params = new URLSearchParams({ q, limit: '20' });
  if (country) params.set('country', country);
  if (entryOnly) params.set('seniority', 'Entry-level');
  return `${HIMALAYAS_SEARCH}?${params.toString()}`;
}

export function normalizeHimalayasJob(raw, track) {
  const url = safeHttpUrl(raw?.applicationLink || raw?.guid);
  if (!raw || !raw.title || !url) return null;
  const locations = toStringList(raw.locationRestrictions);
  return {
    id: `himalayas:${raw.guid || url}`,
    source: 'himalayas',
    sourceName: 'Himalayas',
    track,
    title: String(raw.title).trim(),
    company: String(raw.companyName || '').trim(),
    url,
    postedAt: toIsoUtc(raw.pubDate),
    jobType: String(raw.employmentType || ''),
    location: locations.length ? locations.join(', ') : 'Worldwide',
    locations,
    seniority: toStringList(raw.seniority),
    salary: formatSalary(raw.minSalary, raw.maxSalary, raw.currency, raw.salaryPeriod),
    tags: toStringList(raw.categories).slice(0, 10).map((t) => t.replace(/-/g, ' ')),
    description: capText(htmlToText(raw.description || raw.excerpt || '')),
    remote: true
  };
}

export async function fetchHimalayasJobs({ fetchImpl = fetch, timeoutMs = 10000, queries = HIMALAYAS_QUERIES } = {}) {
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const { track, q } = query;
      const url = buildHimalayasUrl(query);
      const res = await fetchImpl(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`Himalayas "${q}": HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data?.jobs) ? data.jobs : []).map((raw) => normalizeHimalayasJob(raw, track));
    })
  );
  return collect(results, queries.map((x) => `himalayas "${x.q}"`));
}

/** Merges settled results into { jobs, errors }, dropping nulls and duplicate ids. */
export function collect(results, labels) {
  const seen = new Set();
  const jobs = [];
  const errors = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      errors.push(`${labels[i]}: ${result.reason?.message || 'erro'}`);
      return;
    }
    result.value.forEach((job) => {
      if (job && !seen.has(job.id)) {
        seen.add(job.id);
        jobs.push(job);
      }
    });
  });
  return { jobs, errors };
}

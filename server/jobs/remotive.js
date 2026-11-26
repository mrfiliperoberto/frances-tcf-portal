/**
 * Remotive public API (remote jobs): https://remotive.com/api-documentation
 * Rules we follow: link back to the Remotive job URL, mention Remotive as the source and call it
 * at most ~4 times a day. The free API currently returns a small fixed sample and ignores
 * filters, so one request is enough; the track comes from each job's category.
 */
import { capText, htmlToText, safeHttpUrl, toIsoUtc, toStringList } from './common.js';
import { collect } from './himalayas.js';

export { htmlToText } from './common.js';
export { MAX_DESCRIPTION_LENGTH } from './common.js';

export const REMOTIVE_API = 'https://remotive.com/api/remote-jobs';

const CATEGORY_TRACK = [
  [/customer service|customer support/i, 'support'],
  [/software development|information technology|qa|devops/i, 'dev'],
  [/marketing|writing/i, 'marketing']
];

export function trackForCategory(category) {
  for (const [pattern, track] of CATEGORY_TRACK) {
    if (pattern.test(String(category || ''))) return track;
  }
  return null;
}

export function normalizeRemotiveJob(raw) {
  const url = safeHttpUrl(raw?.url);
  if (!raw || raw.id === undefined || !raw.title || !url) return null;
  const track = trackForCategory(raw.category);
  if (!track) return null;
  const location = String(raw.candidate_required_location || '').trim();
  return {
    id: `remotive:${raw.id}`,
    source: 'remotive',
    sourceName: 'Remotive',
    track,
    title: String(raw.title).trim(),
    company: String(raw.company_name || '').trim(),
    url,
    postedAt: toIsoUtc(raw.publication_date),
    jobType: String(raw.job_type || ''),
    location,
    locations: /worldwide|anywhere/i.test(location) || !location ? [] : toStringList(location),
    seniority: [],
    salary: String(raw.salary || '').trim(),
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 15).map(String) : [],
    description: capText(htmlToText(raw.description || '')),
    remote: true
  };
}

export async function fetchRemotiveJobs({ fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const results = await Promise.allSettled([
    (async () => {
      const res = await fetchImpl(REMOTIVE_API, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!res.ok) throw new Error(`Remotive: HTTP ${res.status}`);
      const data = await res.json();
      return (Array.isArray(data?.jobs) ? data.jobs : []).map(normalizeRemotiveJob);
    })()
  ]);
  return collect(results, ['remotive']);
}

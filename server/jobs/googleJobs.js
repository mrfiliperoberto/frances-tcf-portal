/**
 * Google Jobs through SerpApi (https://serpapi.com/google-jobs-api). Google has no public API
 * for Google Jobs, so this optional source needs a SerpApi key in the SERPAPI_KEY environment
 * variable (Vercel project settings, or .env.local for the dev and desktop servers — never in
 * the code). Without the key the source is skipped.
 *
 * Free plan: 250 searches/month. 3 searches per refresh with the 12 h cache of /api/jobs =
 * at most 6 a day (~180 a month).
 */
import { capText, safeHttpUrl } from './common.js';

export const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';

export const GOOGLE_JOBS_QUERIES = Object.freeze([
  { track: 'support', q: 'bilingual customer support', location: 'Canada' },
  { track: 'dev', q: 'junior php laravel developer remote', location: 'Canada' },
  { track: 'support', q: 'customer success remote latin america', location: 'Brazil' }
]);

/** "3 days ago" / "há 2 dias" → ISO date (approximate), else null. */
export function postedAtFromAgo(text, now = Date.now()) {
  const match = String(text || '').match(/(\d+)\s*\+?\s*(minute|hour|day|week|month|minuto|hora|dia|semana|m[eê]s)/i);
  if (!match) return null;
  const n = Number(match[1]);
  const unit = match[2].toLowerCase();
  const ms = unit.startsWith('min') ? 60e3 : unit.startsWith('h') ? 3600e3 : unit.startsWith('d') ? 86400e3 : unit.startsWith('w') || unit.startsWith('sem') ? 7 * 86400e3 : 30 * 86400e3;
  return new Date(now - n * ms).toISOString();
}

export function normalizeGoogleJob(raw, query) {
  const url = safeHttpUrl(raw?.apply_options?.[0]?.link || raw?.share_link || raw?.related_links?.[0]?.link);
  if (!raw?.title || !url) return null;
  const ext = raw.detected_extensions || {};
  const location = String(raw.location || '').trim();
  const remote = Boolean(ext.work_from_home) || /anywhere|remote/i.test(location);
  const anywhere = /anywhere/i.test(location);
  return {
    id: `google:${raw.job_id || url}`,
    source: 'google',
    sourceName: `Google Jobs${raw.via ? ` (${String(raw.via).replace(/^via\s+/i, '')})` : ''}`,
    track: query.track,
    title: String(raw.title).trim(),
    company: String(raw.company_name || '').trim(),
    url,
    postedAt: postedAtFromAgo(ext.posted_at),
    jobType: ext.schedule_type || '',
    location: location || query.location,
    locations: anywhere ? [] : [query.location === 'Brazil' ? 'Brazil' : 'Canada'],
    seniority: [],
    salary: ext.salary || '',
    tags: [],
    description: capText(String(raw.description || '').trim()),
    remote
  };
}

export async function fetchGoogleJobs({ fetchImpl = fetch, apiKey = process.env.SERPAPI_KEY, timeoutMs = 15000, queries = GOOGLE_JOBS_QUERIES } = {}) {
  if (!apiKey) return { jobs: [], errors: [], skipped: true };
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const params = new URLSearchParams({ engine: 'google_jobs', q: query.q, location: query.location, hl: 'en', api_key: apiKey });
      const res = await fetchImpl(`${SERPAPI_ENDPOINT}?${params.toString()}`, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.error) throw new Error(String(data.error).slice(0, 120));
      return (data?.jobs_results || []).map((raw) => normalizeGoogleJob(raw, query));
    })
  );
  const jobs = [];
  const errors = [];
  const seen = new Set();
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      // Never echo the request URL: it contains the API key.
      errors.push(`google "${queries[i].q}": ${result.reason?.message || 'erro'}`);
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

/**
 * GET /api/jobs — job postings for the "Alerta de Vagas" tab.
 *
 * Same handler on Vercel (this file), in the Vite dev server (vite.config.js) and in the desktop
 * server (server-local.cjs). It takes no parameters: nothing personal (resume, profile) is ever
 * sent here; filtering and matching happen on the device.
 *
 * Sources:
 * - Himalayas, Jobicy, Remotive: remote-job APIs (free, no key);
 * - career pages of ~100 Canadian companies (public ATS job boards, server/jobs/companies.js);
 * - Job Bank Canada official feed (5 s between requests, per its robots.txt);
 * - Google Jobs via SerpApi, only when SERPAPI_KEY is set (skipped otherwise).
 * Each post links to the original posting and names its source. Results are cached in memory
 * and on the CDN for 12 hours.
 */
import { fetchHimalayasJobs } from '../server/jobs/himalayas.js';
import { fetchJobicyJobs } from '../server/jobs/jobicy.js';
import { fetchRemotiveJobs } from '../server/jobs/remotive.js';
import { fetchAllCompanyJobs } from '../server/jobs/companies.js';
import { CANADIAN_COMPANIES } from '../server/jobs/companyList.js';
import { fetchJobBankJobs } from '../server/jobs/jobbank.js';
import { fetchGoogleJobs } from '../server/jobs/googleJobs.js';

export const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export const JOB_SOURCES = Object.freeze([
  { id: 'himalayas', name: 'Himalayas', url: 'https://himalayas.app', fetch: fetchHimalayasJobs },
  { id: 'jobicy', name: 'Jobicy', url: 'https://jobicy.com', fetch: fetchJobicyJobs },
  { id: 'remotive', name: 'Remotive', url: 'https://remotive.com', fetch: fetchRemotiveJobs },
  { id: 'companies', name: `Páginas de carreira (${CANADIAN_COMPANIES.length} empresas canadenses)`, url: null, fetch: fetchAllCompanyJobs },
  { id: 'jobbank', name: 'Job Bank Canada', url: 'https://www.jobbank.gc.ca', fetch: fetchJobBankJobs },
  { id: 'google', name: 'Google Jobs (via SerpApi)', url: 'https://serpapi.com/google-jobs-api', fetch: fetchGoogleJobs }
]);

let cache = null; // { at: number, payload: object }

export function clearJobsCache() {
  cache = null;
}

export async function getJobsPayload({ fetchImpl = fetch, now = Date.now(), sources = JOB_SOURCES } = {}) {
  if (cache && now - cache.at < CACHE_TTL_MS) return { ...cache.payload, cached: true };

  const results = await Promise.all(
    sources.map((source) =>
      source.fetch({ fetchImpl }).catch((err) => ({ jobs: [], errors: [`${source.id}: ${err?.message || 'erro'}`] }))
    )
  );
  const seen = new Set();
  const jobs = [];
  results.forEach((result) =>
    result.jobs.forEach((job) => {
      if (!seen.has(job.id)) {
        seen.add(job.id);
        jobs.push(job);
      }
    })
  );
  const payload = {
    fetchedAt: new Date(now).toISOString(),
    jobs,
    errors: results.flatMap((r) => r.errors),
    sources: sources.map(({ id, name, url }, i) => ({
      id,
      name,
      url,
      count: results[i].jobs.length,
      skipped: Boolean(results[i].skipped)
    }))
  };
  // Only cache when at least one source answered, so a transient failure is retried soon.
  if (jobs.length > 0) cache = { at: now, payload };
  return { ...payload, cached: false };
}

/** Builds the request handler (options let tests inject fake sources). */
export function createJobsHandler(options = {}) {
  return (req, res) => handleJobsRequest(req, res, options);
}

export default async function handler(req, res) {
  return handleJobsRequest(req, res);
}

async function handleJobsRequest(req, res, options = {}) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    res.end('Method not allowed');
    return;
  }
  try {
    const payload = await getJobsPayload(options);
    const ok = payload.jobs.length > 0 || payload.errors.length === 0;
    res.statusCode = ok ? 200 : 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', ok ? 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=3600' : 'no-store');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(payload));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'jobs-unavailable', message: err?.message || 'erro' }));
  }
}

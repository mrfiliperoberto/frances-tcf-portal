import { db, ensureDbOpen } from './db';

export const PROFILE_ID = 'default';
export const JOB_STATUSES = ['new', 'saved', 'applied', 'interview', 'dismissed'];
/** Statuses the user chose to keep: never pruned. */
const KEPT_STATUSES = new Set(['saved', 'applied', 'interview']);
/** Postings older than this (and not kept by the user) are removed on refresh. */
export const RETENTION_DAYS = 30;

export const DEFAULT_JOB_PROFILE = Object.freeze({
  id: PROFILE_ID,
  resumeText: '',
  tracks: ['support', 'dev'],
  keywords: [],
  provinces: [],
  acceptRemote: true,
  showNeedsAuthorization: false,
  workStatus: 'no-authorization', // 'no-authorization' | 'work-permit' | 'pr-citizen'
  immigrationGoals: ['mobilite-francophone', 'express-entry'],
  lastFetchAt: null,
  lastFetchError: null
});

export async function getJobProfile() {
  await ensureDbOpen();
  const stored = await db.jobProfile.get(PROFILE_ID);
  return { ...DEFAULT_JOB_PROFILE, ...(stored || {}), id: PROFILE_ID };
}

export async function saveJobProfile(patch) {
  await ensureDbOpen();
  return db.transaction('rw', db.jobProfile, async () => {
    const current = (await db.jobProfile.get(PROFILE_ID)) || {};
    const next = { ...DEFAULT_JOB_PROFILE, ...current, ...patch, id: PROFILE_ID };
    await db.jobProfile.put(next);
    return next;
  });
}

/**
 * Merges freshly fetched postings into the store:
 * - new ids get `firstSeenAt = now` and `status = 'new'`;
 * - known ids keep `firstSeenAt` and `status` (content fields are refreshed);
 * - old postings the user did not keep are pruned.
 * Returns { added, updated, pruned }.
 */
export async function upsertJobPostings(postings, { now = new Date() } = {}) {
  await ensureDbOpen();
  const nowIso = now.toISOString();
  const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000).toISOString();

  return db.transaction('rw', db.jobPostings, async () => {
    const ids = postings.map((p) => p.id);
    const existing = await db.jobPostings.bulkGet(ids);
    let added = 0;
    const merged = postings.map((posting, i) => {
      const old = existing[i];
      if (!old) {
        added += 1;
        return { ...posting, firstSeenAt: nowIso, status: 'new', statusChangedAt: null };
      }
      return { ...old, ...posting, firstSeenAt: old.firstSeenAt, status: old.status, statusChangedAt: old.statusChangedAt ?? null };
    });
    await db.jobPostings.bulkPut(merged);

    const stale = await db.jobPostings
      .filter((p) => !KEPT_STATUSES.has(p.status) && (p.postedAt || p.firstSeenAt) < cutoff)
      .primaryKeys();
    if (stale.length > 0) await db.jobPostings.bulkDelete(stale);

    return { added, updated: merged.length - added, pruned: stale.length };
  });
}

/** All stored postings, newest first (by posting date, then first seen). */
export async function listJobPostings() {
  await ensureDbOpen();
  const rows = await db.jobPostings.toArray();
  return rows.sort((a, b) =>
    String(b.postedAt || b.firstSeenAt).localeCompare(String(a.postedAt || a.firstSeenAt))
  );
}

export async function setJobPostingStatus(id, status) {
  if (!JOB_STATUSES.includes(status)) throw new Error(`Status inválido: ${status}`);
  await ensureDbOpen();
  const updated = await db.jobPostings.update(id, { status, statusChangedAt: new Date().toISOString() });
  return updated > 0;
}

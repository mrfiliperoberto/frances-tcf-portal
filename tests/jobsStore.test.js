import { describe, it, expect } from 'vitest';

async function load() {
  const dbMod = await import('../src/services/db.js');
  await dbMod.initDatabase();
  const store = await import('../src/services/jobsStore.js');
  return { dbMod, store };
}

const posting = (id, postedAt, extra = {}) => ({
  id: `remotive:${id}`,
  source: 'remotive',
  title: `Job ${id}`,
  postedAt,
  ...extra
});

describe('jobsStore', () => {
  it('returns the default profile and saves partial updates', async () => {
    const { dbMod, store } = await load();
    const profile = await store.getJobProfile();
    expect(profile.tracks).toEqual(['support', 'dev']);
    expect(profile.showNeedsAuthorization).toBe(false);
    await store.saveJobProfile({ resumeText: 'Customer Success, Laravel', provinces: ['NB'] });
    const saved = await store.getJobProfile();
    expect(saved.resumeText).toBe('Customer Success, Laravel');
    expect(saved.provinces).toEqual(['NB']);
    expect(saved.acceptRemote).toBe(true);
    dbMod.db.close();
  });

  it('marks new postings, keeps firstSeenAt/status of known ones and refreshes content', async () => {
    const { dbMod, store } = await load();
    const day1 = new Date('2026-11-20T08:00:00Z');
    const r1 = await store.upsertJobPostings([posting(1, '2026-11-19T10:00:00Z'), posting(2, '2026-11-19T11:00:00Z')], { now: day1 });
    expect(r1).toMatchObject({ added: 2, updated: 0 });
    await store.setJobPostingStatus('remotive:1', 'saved');

    const day2 = new Date('2026-11-21T08:00:00Z');
    const r2 = await store.upsertJobPostings(
      [posting(1, '2026-11-19T10:00:00Z', { title: 'Job 1 (edited)' }), posting(3, '2026-11-20T09:00:00Z')],
      { now: day2 }
    );
    expect(r2).toMatchObject({ added: 1, updated: 1 });

    const all = await store.listJobPostings();
    const byId = new Map(all.map((p) => [p.id, p]));
    expect(byId.get('remotive:1')).toMatchObject({ title: 'Job 1 (edited)', status: 'saved', firstSeenAt: day1.toISOString() });
    expect(byId.get('remotive:3')).toMatchObject({ status: 'new', firstSeenAt: day2.toISOString() });
    expect(all.map((p) => p.id)).toEqual(['remotive:3', 'remotive:2', 'remotive:1']); // newest first
    dbMod.db.close();
  });

  it('prunes old postings but never the ones the user kept', async () => {
    const { dbMod, store } = await load();
    await store.upsertJobPostings(
      [posting('old', '2026-09-01T00:00:00Z'), posting('kept', '2026-09-01T00:00:00Z'), posting('recent', '2026-11-20T00:00:00Z')],
      { now: new Date('2026-09-02T00:00:00Z') }
    );
    await store.setJobPostingStatus('remotive:kept', 'applied');
    const result = await store.upsertJobPostings([], { now: new Date('2026-11-25T00:00:00Z') });
    expect(result.pruned).toBe(1);
    const ids = (await store.listJobPostings()).map((p) => p.id);
    expect(ids).toContain('remotive:kept');
    expect(ids).toContain('remotive:recent');
    expect(ids).not.toContain('remotive:old');
    dbMod.db.close();
  });

  it('rejects unknown statuses', async () => {
    const { dbMod, store } = await load();
    await expect(store.setJobPostingStatus('x', 'hired?')).rejects.toThrow(/Status inválido/);
    dbMod.db.close();
  });
});

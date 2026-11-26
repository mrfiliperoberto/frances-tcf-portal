#!/usr/bin/env node
/**
 * Checks that every YouTube video in the Daily Cartoon and Teoria em Vídeo seeds still exists,
 * is public and can be embedded, using YouTube's public oEmbed endpoint (no API key).
 *
 *   npm run verify:videos            # summary + problems
 *   npm run verify:videos -- --all   # also list every OK video with its channel
 *
 * oEmbed answers 200 for public, embeddable videos; 401 when embedding is disabled or the video
 * is private; 404 when it was removed. Exit code 1 when any video fails.
 */
import { CARTOON_SPRINTS_SEED } from '../src/data/cartoonSeed.js';
import { VIDEO_LESSON_SEED } from '../src/data/videoLessonSeed.js';

const CONCURRENCY = 6;
const showAll = process.argv.includes('--all');

function extractYouTubeId(url) {
  const match = String(url || '').match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function collectVideos() {
  const items = [];
  for (const sprint of CARTOON_SPRINTS_SEED) {
    for (const ep of sprint.episodes) {
      items.push({ source: 'Daily Cartoon', ref: `dia ${ep.day} (${ep.id})`, title: ep.title, url: ep.url });
    }
  }
  for (const lesson of VIDEO_LESSON_SEED) {
    items.push({ source: 'Teoria em Vídeo', ref: `dia ${lesson.day} (${lesson.id})`, title: lesson.title, url: lesson.url });
  }
  return items;
}

async function checkVideo(id) {
  const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (res.status === 200) {
      const data = await res.json();
      return { ok: true, status: 200, channel: data.author_name, ytTitle: data.title };
    }
    const reason = res.status === 401 ? 'privado ou incorporação desativada' : res.status === 404 ? 'removido' : `HTTP ${res.status}`;
    return { ok: false, status: res.status, reason };
  } catch (err) {
    return { ok: false, status: 0, reason: `erro de rede: ${err.message}` };
  }
}

async function main() {
  const items = collectVideos();
  const byId = new Map();
  const invalid = [];
  for (const item of items) {
    const id = extractYouTubeId(item.url);
    if (!id) {
      invalid.push(item);
      continue;
    }
    if (!byId.has(id)) byId.set(id, []);
    byId.get(id).push(item);
  }

  const ids = [...byId.keys()];
  const results = new Map();
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < ids.length) {
        const id = ids[cursor++];
        results.set(id, await checkVideo(id));
      }
    })
  );

  const failures = ids.filter((id) => !results.get(id).ok);
  console.log(`Vídeos referenciados: ${items.length} | únicos: ${ids.length} | OK: ${ids.length - failures.length} | com problema: ${failures.length + invalid.length}`);

  if (showAll) {
    for (const id of ids.filter((i) => results.get(i).ok)) {
      const r = results.get(id);
      console.log(`  OK  ${id}  [${r.channel}]  ${r.ytTitle}`);
    }
  }
  for (const item of invalid) console.log(`  URL inválida  ${item.source} ${item.ref}: ${item.url}`);
  for (const id of failures) {
    const r = results.get(id);
    const where = byId.get(id).map((i) => `${i.source} ${i.ref}`).join(', ');
    console.log(`  FALHA ${id} (${r.reason}) -> ${where}`);
  }
  process.exitCode = failures.length + invalid.length > 0 ? 1 : 0;
}

main();

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playlists Ouro (Níveis Progressivos) públicas do YouTube:
 * 1. Learn French in 1 Hour - Alexa (A1)
 * 2. French Verbs - Alexa (A1/A2)
 * 3. Français avec Pierre - Grammaire (B1/B2)
 */
const PLAYLISTS = [
  {
    playlistId: 'PLV1-QgpUU7N1_uGVmB-LDmGVRKw837Sx0',
    channel: 'Learn French With Alexa',
    defaultLevel: 'A1'
  },
  {
    playlistId: 'PLV1-QgpUU7N008EWBjXpChsBe4_6OXQtE',
    channel: 'Learn French With Alexa',
    defaultLevel: 'A2'
  },
  {
    playlistId: 'PL8E2B2A22D2C42B9A',
    channel: 'Français avec Pierre',
    defaultLevel: 'B1'
  }
];

const TOTAL_DAYS = 365;
const OUTPUT_PATH = path.join(__dirname, 'src', 'data', 'videoLessonSeed.js');

/**
 * Decodifica entidades XML/HTML comuns presentes nos títulos do feed RSS do YouTube.
 */
function decodeXmlEntities(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extrai entradas de vídeo (<entry>) do XML do feed RSS do YouTube usando Regex.
 */
function parseYouTubeRssXml(xmlText, playlistMeta) {
  const entries = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xmlText)) !== null) {
    const entryBlock = match[1];
    const videoIdMatch = entryBlock.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = entryBlock.match(/<title>([\s\S]*?)<\/title>/);

    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1].trim();
      const rawTitle = titleMatch ? titleMatch[1] : `Aula de Francês (${playlistMeta.channel})`;
      const cleanTitle = decodeXmlEntities(rawTitle);

      entries.push({
        videoId,
        title: cleanTitle,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        level: playlistMeta.defaultLevel,
        channel: playlistMeta.channel,
        playlistId: playlistMeta.playlistId
      });
    }
  }

  return entries;
}

/**
 * Busca os vídeos públicos de uma playlist via feed RSS do YouTube.
 */
async function fetchPlaylistVideos(playlistMeta) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(
    playlistMeta.playlistId
  )}`;

  console.log(`📡 Extraindo feed RSS da playlist [${playlistMeta.defaultLevel}] ${playlistMeta.playlistId}...`);

  const response = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }
  });

  if (!response.ok) {
    throw new Error(
      `Falha ao buscar playlist ${playlistMeta.playlistId}: HTTP ${response.status}`
    );
  }

  const xmlText = await response.text();
  const parsed = parseYouTubeRssXml(xmlText, playlistMeta);
  console.log(`   ✓ ${parsed.length} vídeos extraídos de "${playlistMeta.channel}" (${playlistMeta.defaultLevel}).`);
  return parsed;
}

/**
 * Determina o nível progressivo com base na ordem da playlist ou no dia de estudo (1 a 365).
 */
function resolveProgressiveLevel(day, sourceLevel) {
  if (day <= 90) return sourceLevel === 'A1' ? 'A1' : 'A1';
  if (day <= 180) return sourceLevel === 'A1' ? 'A2' : sourceLevel;
  if (day <= 270) return sourceLevel === 'B1' ? 'B1' : 'B1';
  return 'B2';
}

async function generateVideoSeed() {
  console.log('🚀 Iniciando extração das Playlists Ouro do YouTube...\n');

  const extractedByLevel = {
    A1: [],
    A2: [],
    B1: []
  };
  const allExtractedVideos = [];

  for (const playlist of PLAYLISTS) {
    try {
      const videos = await fetchPlaylistVideos(playlist);
      if (videos.length > 0) {
        extractedByLevel[playlist.defaultLevel].push(...videos);
        allExtractedVideos.push(...videos);
      }
    } catch (err) {
      console.warn(`⚠️ Aviso ao processar playlist ${playlist.playlistId}:`, err.message);
    }
  }

  if (allExtractedVideos.length === 0) {
    console.error('❌ Nenhum vídeo pôde ser extraído das playlists. Verifique sua conexão com a internet.');
    process.exit(1);
  }

  // Monta os 365 dias sequenciais respeitando a ordem progressiva das playlists (A1 -> A1/A2 -> B1/B2)
  const seedItems = [];

  for (let day = 1; day <= TOTAL_DAYS; day++) {
    let pool;
    let levelLabel;

    if (day <= 90 && extractedByLevel.A1.length > 0) {
      pool = extractedByLevel.A1;
      levelLabel = 'A1';
    } else if (day <= 180 && extractedByLevel.A2.length > 0) {
      pool = extractedByLevel.A2;
      levelLabel = 'A2';
    } else if (day <= 270 && extractedByLevel.B1.length > 0) {
      pool = extractedByLevel.B1;
      levelLabel = 'B1';
    } else if (extractedByLevel.B1.length > 0) {
      pool = extractedByLevel.B1;
      levelLabel = day > 270 ? 'B2' : 'B1';
    } else {
      pool = allExtractedVideos;
      levelLabel = resolveProgressiveLevel(day, pool[(day - 1) % pool.length].level);
    }

    const videoItem = pool[(day - 1) % pool.length];
    const cycleNumber = Math.floor((day - 1) / pool.length) + 1;
    const displayTitle =
      cycleNumber > 1
        ? `${videoItem.title} (Revisão Ativa #${cycleNumber})`
        : videoItem.title;

    seedItems.push({
      id: `vl_${day}`,
      day,
      level: levelLabel,
      title: displayTitle,
      url: videoItem.url,
      isCompleted: false
    });
  }

  const fileContent = `// Arquivo gerado automaticamente por generateVideoSeed.js a partir das Playlists Ouro do YouTube
// Total de vídeos únicos extraídos: ${allExtractedVideos.length} | Dias mapeados: ${seedItems.length}

export const VIDEO_LESSON_SEED = ${JSON.stringify(seedItems, null, 2)};

export default VIDEO_LESSON_SEED;
`;

  // Os dias 1-180 agora são um currículo curado à mão (tema, resumo, canal). Não sobrescrever sem querer.
  const existing = fs.existsSync(OUTPUT_PATH) ? fs.readFileSync(OUTPUT_PATH, 'utf-8') : '';
  if (existing.includes('currículo por tema') && !process.argv.includes('--force')) {
    console.error(
      '\n⛔ videoLessonSeed.js contém o currículo curado dos dias 1-180 e NÃO foi sobrescrito.\n' +
        '   Use `npm run seed:videos -- --force` apenas se quiser realmente descartar a curadoria.'
    );
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(OUTPUT_PATH, fileContent, 'utf-8');
  console.log(`\n✅ Sucesso! ${seedItems.length} videoaulas reais foram salvas em: ${OUTPUT_PATH}`);
}

generateVideoSeed();


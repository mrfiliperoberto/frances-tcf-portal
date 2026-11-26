const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { parseAllowedTtsUrl } = require('./tts-proxy-guard.cjs');

/**
 * Carrega SERPAPI_KEY (opcional, Google Jobs no Alerta de Vagas) de .env.local / .env, sem
 * imprimir nada. Só essa variável é lida; o arquivo nunca é servido (não está em dist/).
 */
function loadServerEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      const text = fs.readFileSync(path.join(__dirname, file), 'utf-8');
      const match = text.match(/^\s*SERPAPI_KEY\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m);
      if (match && !process.env.SERPAPI_KEY) process.env.SERPAPI_KEY = match[1].trim();
    } catch {
      // arquivo ausente: tudo bem
    }
  }
}
loadServerEnv();

const PORT = Number(process.env.PORT || 5173);
const DIST_DIR = path.join(__dirname, 'dist');
const PID_FILE = path.join(__dirname, '.server.pid');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url || '/', `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    if (pathname === '/__health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', pid: process.pid }));
      return;
    }

    // Alerta de Vagas: mesmo handler da função do Vercel (api/jobs.js, módulo ES)
    if (pathname === '/api/jobs') {
      const { pathToFileURL } = require('url');
      import(pathToFileURL(path.join(__dirname, 'api', 'jobs.js')).href)
        .then(({ default: handler }) => handler(req, res))
        .catch(() => {
          if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'jobs-unavailable' }));
        });
      return;
    }

    // Proxy local para evitar bloqueio CORS/ORB do Chrome em URLs translate.google.com/translate_tts
    if (pathname === '/__tts') {
      const allowedUrl = parseAllowedTtsUrl(parsedUrl.searchParams.get('url'));
      if (!allowedUrl) {
        res.writeHead(400);
        res.end('Invalid TTS URL');
        return;
      }

      https
        .get(
          allowedUrl.toString(),
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
              Accept: '*/*'
            }
          },
          (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
              res.writeHead(proxyRes.statusCode || 502);
              res.end('Upstream error');
              return;
            }
            res.writeHead(200, {
              'Content-Type': proxyRes.headers['content-type'] || 'audio/mpeg',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*'
            });
            proxyRes.pipe(res);
          }
        )
        .on('error', () => {
          res.writeHead(502);
          res.end('Proxy network error');
        });
      return;
    }

    if (pathname === '/') {
      pathname = '/index.html';
    }

    let filePath = path.join(DIST_DIR, pathname);

    // Prevenir Path Traversal
    if (!filePath.startsWith(DIST_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Se o arquivo não existir ou for diretório, faz fallback para index.html (SPA)
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Service worker e HTML não devem ficar presos em cache HTTP agressivo
    const isNoCache = ext === '.html' || pathname.endsWith('sw.js') || pathname.endsWith('.webmanifest');
    const cacheControl = isNoCache ? 'no-cache' : 'public, max-age=31536000, immutable';

    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheControl
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Erro interno ao servir o portal: ' + err.message);
  }
});

let retriedBind = false;

function startListening() {
  server.listen(PORT, '127.0.0.1', () => {
    try {
      fs.writeFileSync(PID_FILE, String(process.pid), 'utf-8');
    } catch (_) {}
    console.log(`Portal Do Zero ao Canadá ativo em http://localhost:${PORT} (PID: ${process.pid})`);
  });
}

function killOldPidAndRetry() {
  if (retriedBind) {
    process.exit(0);
    return;
  }
  retriedBind = true;
  try {
    if (fs.existsSync(PID_FILE)) {
      const oldPid = Number(fs.readFileSync(PID_FILE, 'utf-8').trim());
      if (oldPid && oldPid !== process.pid) {
        try {
          process.kill(oldPid);
        } catch (_) {}
      }
    }
  } catch (_) {}
  setTimeout(startListening, 400);
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    if (process.argv.includes('--restart')) {
      killOldPidAndRetry();
      return;
    }
    // Verifica se o servidor ativo já possui o endpoint /__tts atualizado (deve retornar 400 sem parâmetro url)
    const probe = http.get(`http://127.0.0.1:${PORT}/__tts`, (res) => {
      res.resume();
      if (res.statusCode !== 400) {
        killOldPidAndRetry();
      } else {
        process.exit(0);
      }
    });
    probe.on('error', () => {
      killOldPidAndRetry();
    });
    return;
  }
  process.exit(1);
});

startListening();

function cleanup() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const currentPid = fs.readFileSync(PID_FILE, 'utf-8').trim();
      if (currentPid === String(process.pid)) {
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);


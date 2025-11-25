import http from 'http';
import fs from 'fs/promises';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { Buffer, Blob } from 'buffer';

const PORT = process.env.ADMIN_DATA_PORT ? Number(process.env.ADMIN_DATA_PORT) : 8890;
const DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const CONTACTS_FILE = path.join(DIRNAME, 'data', 'contacts.json');
const NOTES_FILE = path.join(DIRNAME, 'data', 'notes.json');
const DOWNLOADS_DIR = path.join(DIRNAME, '..', 'tmp', 'downloads');
const DEFAULT_DOWNLOAD_NOTE =
  'Queued via admin console. Replace with internal media pipeline once ready.';
const CATBOX_UPLOAD_URL = 'https://catbox.moe/user/api.php';
const SPOTIFY_DOWN_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://spotifydown.com',
  Referer: 'https://spotifydown.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
};
const SPOTIFY_COOKIE =
  process.env.SPOTIFY_SP_DC || process.env.SP_DC || process.env.SPOTIFY_COOKIE || '';
const DOWNLOAD_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const DOWNLOAD_ROUTE_PREFIX = '/api/tools/downloads/';
const SPOTIFY_FORMAT_BY_QUALITY = {
  '320k': 'OGG_VORBIS_320',
  '256k': 'OGG_VORBIS_160',
  lossless: 'OGG_VORBIS_320'
};
const FORMAT_EXTENSION = {
  OGG_VORBIS_96: 'ogg',
  OGG_VORBIS_160: 'ogg',
  OGG_VORBIS_320: 'ogg',
  MP3_96: 'mp3',
  MP4_128: 'm4a',
  MP4_128_DUAL: 'm4a',
  MP4_256: 'm4a',
  MP4_256_DUAL: 'm4a'
};
const MIME_BY_EXTENSION = {
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  opus: 'audio/ogg',
  flac: 'audio/flac',
  wav: 'audio/wav'
};
const YT_DLP_ALLOWED_EXTENSIONS = ['m4a', 'mp3', 'opus', 'webm', 'flac', 'wav'];
const YT_DLP_FORMAT_ARGUMENT = 'bestaudio[ext=m4a]/bestaudio/best';
const downloadCache = new Map();
const downloadExpiryTimers = new Map();
let tsLoaderReady = false;
let spdlModulePromise = null;
let spotifyClientPromise = null;
let downloadDirPromise = null;
let ytDlpModulePromise = null;
let ytDlpBinary = null;

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, defaultHeaders);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  try {
    if (pathname.startsWith('/api/admin/contacts')) {
      return handleContacts(req, res);
    }
    if (pathname.startsWith('/api/admin/notes')) {
      return handleNotes(req, res, pathname);
    }
    if (pathname === '/api/tools/download') {
      return handleDownloadQueue(req, res);
    }
    if (pathname === '/api/tools/cdn-upload') {
      return handleCdnUpload(req, res);
    }
    if (pathname.startsWith(DOWNLOAD_ROUTE_PREFIX)) {
      return handleDownloadAsset(req, res, pathname);
    }
    res.writeHead(404, defaultHeaders);
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (error) {
    console.error('Admin data server failure', error);
    res.writeHead(500, defaultHeaders);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

async function handleContacts(req, res) {
  if (req.method === 'GET') {
    const items = await readJsonFile(CONTACTS_FILE);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ items, count: items.length }));
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const payload = await readRequestBody(req);
    const incoming = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
      ? payload.items
      : [];
    if (!Array.isArray(incoming)) {
      res.writeHead(400, defaultHeaders);
      return res.end(JSON.stringify({ error: 'Payload must be an array of contacts' }));
    }
    await writeJsonFile(CONTACTS_FILE, incoming);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ saved: incoming.length }));
  }

  res.writeHead(405, defaultHeaders);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

async function handleNotes(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/admin/notes') {
    const items = await readJsonFile(NOTES_FILE);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ items, count: items.length }));
  }

  if (req.method === 'POST' && pathname === '/api/admin/notes') {
    const payload = await readRequestBody(req);
    const note = buildNote(payload);
    const existing = await readJsonFile(NOTES_FILE);
    await writeJsonFile(NOTES_FILE, [note, ...existing]);
    res.writeHead(201, defaultHeaders);
    return res.end(JSON.stringify({ note }));
  }

  const noteId = pathname.replace('/api/admin/notes/', '');
  if (!noteId) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Note ID required' }));
  }

  if (req.method === 'PATCH') {
    const payload = await readRequestBody(req);
    const items = await readJsonFile(NOTES_FILE);
    let updated;
    const next = items.map((item) => {
      if (item.id !== noteId) return item;
      updated = {
        ...item,
        ...normalizeNotePatch(payload),
        updatedAt: new Date().toISOString()
      };
      return updated;
    });
    if (!updated) {
      res.writeHead(404, defaultHeaders);
      return res.end(JSON.stringify({ error: 'Note not found' }));
    }
    await writeJsonFile(NOTES_FILE, next);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ note: updated }));
  }

  if (req.method === 'DELETE') {
    const items = await readJsonFile(NOTES_FILE);
    const next = items.filter((item) => item.id !== noteId);
    await writeJsonFile(NOTES_FILE, next);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ removed: noteId }));
  }

  res.writeHead(405, defaultHeaders);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

async function handleDownloadQueue(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const payload = await readRequestBody(req);
  const provider = normaliseProvider(payload?.provider);
  if (!provider) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Provider must be youtube or spotify' }));
  }
  if (!payload?.url) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Provide a media URL to download' }));
  }

  try {
    const job =
      provider === 'spotify'
        ? await buildSpotifyJob(payload.url, payload.quality)
        : await buildYoutubeJob(payload.url, payload.quality);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ job }));
  } catch (error) {
    console.error('Failed to enqueue media job', error);
    res.writeHead(502, defaultHeaders);
    return res.end(JSON.stringify({ error: error?.message || 'Unable to queue download' }));
  }
}

async function handleDownloadAsset(req, res, pathname) {
  if (req.method !== 'GET') {
    res.writeHead(405, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const assetId = pathname.replace(DOWNLOAD_ROUTE_PREFIX, '').replace(/\?.*$/, '').trim();
  if (!assetId) {
    res.writeHead(404, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Download not found' }));
  }

  const asset = downloadCache.get(assetId);
  if (!asset) {
    res.writeHead(404, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Download expired or invalid' }));
  }

  try {
    const stats = await fs.stat(asset.path);
    res.writeHead(200, {
      'Content-Type': asset.contentType || 'application/octet-stream',
      'Content-Length': stats.size,
      'Content-Disposition': `attachment; filename="${asset.fileName}"`,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=60'
    });
    const stream = createReadStream(asset.path);
    stream.on('error', (error) => {
      console.error('Download stream failed', error);
      if (!res.headersSent) {
        res.writeHead(500, defaultHeaders);
      }
      res.end(JSON.stringify({ error: 'Failed to stream download' }));
    });
    return stream.pipe(res);
  } catch (error) {
    console.warn('Download asset missing on disk', error?.message || error);
    await cleanupDownloadAsset(assetId);
    res.writeHead(410, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Download expired' }));
  }
}

async function handleCdnUpload(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Method not allowed' }));
  }

  const payload = await readRequestBody(req);
  if (!payload?.base64 || !payload?.fileName) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Missing file payload' }));
  }

  try {
    const upload = await pushToCatbox(payload);
    res.writeHead(200, defaultHeaders);
    return res.end(JSON.stringify({ upload }));
  } catch (error) {
    console.error('Catbox upload failed', error);
    res.writeHead(502, defaultHeaders);
    return res.end(JSON.stringify({ error: error?.message || 'Catbox upload failed' }));
  }
}

async function readRequestBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  if (!body) return {};
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error('Invalid JSON payload');
  }
}

async function readJsonFile(filePath) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeJsonFile(filePath, []);
      return [];
    }
    throw error;
  }
}

async function writeJsonFile(filePath, payload) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

function normaliseProvider(value) {
  if (!value) return '';
  const lowered = `${value}`.trim().toLowerCase();
  if (lowered === 'youtube' || lowered === 'spotify') return lowered;
  return '';
}

async function buildSpotifyJob(url, quality) {
  const cleaned = `${url}`.trim();
  validateSpotifyUrl(cleaned);
  const targetQuality = normalizeQuality(quality);
  const jobId = generateId();
  const lookup = await requestSpotifyDownload(cleaned, targetQuality, jobId).catch((error) => {
    throw new Error(error?.message || 'Spotify conversion service unavailable');
  });

  return {
    id: jobId,
    provider: 'spotify',
    url: cleaned,
    quality: targetQuality,
    status: 'ready',
    title: lookup.title,
    artwork: lookup.artwork,
    downloadUrl: lookup.downloadUrl,
    expiresAt: lookup.expiresAt,
    note: lookup.note ?? DEFAULT_DOWNLOAD_NOTE,
    queuedAt: new Date().toISOString()
  };
}

async function buildYoutubeJob(url, quality) {
  const cleaned = `${url}`.trim();
  validateYoutubeUrl(cleaned);
  const targetQuality = normalizeQuality(quality);
  const downloadUrl = buildYoutubeDownloadUrl(cleaned, targetQuality);
  return {
    id: generateId(),
    provider: 'youtube',
    url: cleaned,
    quality: targetQuality,
    status: 'ready',
    downloadUrl,
    note: 'Uses Piped audio endpoint. Swap with self-hosted ytdlp service when ready.',
    queuedAt: new Date().toISOString()
  };
}

function normalizeQuality(value) {
  if (!value) return '320k';
  const lowered = `${value}`.toLowerCase();
  if (['320k', '256k', 'lossless'].includes(lowered)) return lowered;
  if (lowered.includes('loss')) return 'lossless';
  if (lowered.includes('256')) return '256k';
  return '320k';
}

function validateSpotifyUrl(url) {
  if (!/^https?:\/\/open\.spotify\.com\/(track|album|playlist)\//.test(url)) {
    throw new Error('Expected a Spotify track/album/playlist URL');
  }
}

function validateYoutubeUrl(url) {
  if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(url)) {
    throw new Error('Expected a YouTube video URL');
  }
}

function buildYoutubeDownloadUrl(url, quality) {
  const qualityParam = quality === '256k' ? 'medium' : 'best';
  const endpoint = 'https://piped.video/download';
  const params = new URLSearchParams({
    downloadFormat: 'audio',
    quality: qualityParam,
    url
  });
  return `${endpoint}?${params.toString()}`;
}

async function requestSpotifyDownload(url, quality, jobId) {
  const errors = [];

  if (SPOTIFY_COOKIE) {
    try {
      return await requestLocalSpotifyDownload(url, quality, jobId);
    } catch (error) {
      errors.push(error);
      console.warn('Local Spotify capture failed, falling back to remote providers:', error?.message || error);
    }
  }

  const providers = [requestSpotifyDownOfficial, requestSpotifyMirror];
  for (const provider of providers) {
    try {
      const lookup = await provider(url);
      if (lookup?.downloadUrl) {
        return lookup;
      }
      errors.push(new Error('Spotify provider returned no download link'));
    } catch (error) {
      errors.push(error);
    }
  }

  try {
    return await requestSpotifyYoutubeFallback(url, quality, jobId);
  } catch (error) {
    errors.push(error);
  }

  const detail = errors
    .map((err) => (err && err.message ? err.message : null))
    .filter(Boolean)
    .join(' | ');
  const suffix = SPOTIFY_COOKIE
    ? ''
    : ' Configure SPOTIFY_SP_DC or SPOTIFY_COOKIE env vars for reliable local capture.';
  const fallbackMessage = `All Spotify providers failed.${detail ? ` Details: ${detail}` : ''}${suffix}`;
  const lastError = errors[errors.length - 1];
  if (lastError instanceof Error) {
    lastError.message = fallbackMessage;
    throw lastError;
  }
  throw new Error(fallbackMessage);
}

async function requestLocalSpotifyDownload(url, quality, assetId) {
  if (!SPOTIFY_COOKIE) {
    throw new Error('Set SPOTIFY_SP_DC environment variable to enable local Spotify downloads');
  }

  await ensureDownloadDir();
  const module = await loadSpdlModule();
  const spdl = module?.default;
  const SpotifyCtor = module?.Spotify;
  if (!spdl || !SpotifyCtor) {
    throw new Error('node-spdl module is unavailable');
  }

  const client = await getSpotifyClient(SpotifyCtor);
  const format = mapQualityToFormat(quality);
  const extension = FORMAT_EXTENSION[format] || 'ogg';
  const targetPath = path.join(DOWNLOADS_DIR, `${assetId}.${extension}`);
  await fs.rm(targetPath, { force: true }).catch(() => {});

  const downloadStream = spdl(url, { client, format, preload: true });
  const fileStream = createWriteStream(targetPath);

  try {
    await pipeline(downloadStream, fileStream);
  } catch (error) {
    await fs.rm(targetPath, { force: true }).catch(() => {});
    throw error;
  }

  const trackMeta = await fetchSpotifyTrackMetadata(client, url);
  const title = trackMeta?.title || 'Spotify capture';
  const artwork = trackMeta?.artwork || null;
  const fileName = buildDownloadFileName(title, extension);
  const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_MS).toISOString();

  rememberDownloadAsset(assetId, {
    path: targetPath,
    fileName,
    contentType: MIME_BY_EXTENSION[extension] || 'application/octet-stream',
    createdAt: Date.now(),
    expiresAt
  });

  return {
    downloadUrl: `${DOWNLOAD_ROUTE_PREFIX}${assetId}`,
    expiresAt,
    title,
    artwork,
    note: 'Served by local node-spdl capture (expires in 6 hours)'
  };
}

async function requestSpotifyDownOfficial(url) {
  const response = await fetch('https://api.spotifydown.com/download', {
    method: 'POST',
    headers: SPOTIFY_DOWN_HEADERS,
    body: JSON.stringify({ url })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error('SpotifyDown rejected the request');
  }
  return hydrateSpotifyPayload(
    payload,
    'Powered by spotifydown.com API. Replace with self-hosted spotdl when ready.'
  );
}

async function requestSpotifyMirror(url) {
  const endpoint = `https://spapi.downloader.workers.dev/?link=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    throw new Error('Spotify mirror rejected the request');
  }
  return hydrateSpotifyPayload(payload, 'Fallback mirror via downloader.workers.dev');
}

async function requestSpotifyYoutubeFallback(url, quality, assetId) {
  await ensureDownloadDir();
  const ytDlp = await loadYtDlpBinary();
  if (typeof ytDlp !== 'function') {
    throw new Error('yt-dlp binary unavailable');
  }

  await cleanupYtDlpArtifacts(assetId);
  const oembedMeta = await fetchSpotifyOembedMetadata(url);
  const searchQuery = buildYoutubeSearchQuery(oembedMeta, url);
  const baseOutput = path.join(DOWNLOADS_DIR, `${assetId}.%(ext)s`);

  await ytDlp(`ytsearch1:${searchQuery}`, {
    output: baseOutput,
    format: YT_DLP_FORMAT_ARGUMENT,
    noPlaylist: true,
    quiet: true,
    restrictFilenames: true,
    preferFreeFormats: true,
    addMetadata: false,
    embedThumbnail: false
  });

  const { filePath: downloadedPath, extension } = await resolveYtDlpOutput(assetId);
  const title = oembedMeta?.title || oembedMeta?.displayTitle || 'Spotify capture';
  const artwork = oembedMeta?.artwork || null;
  const finalFileName = buildDownloadFileName(title, extension);
  const finalPath = path.join(DOWNLOADS_DIR, finalFileName);

  await moveFile(downloadedPath, finalPath);

  const expiresAt = new Date(Date.now() + DOWNLOAD_TTL_MS).toISOString();
  rememberDownloadAsset(assetId, {
    path: finalPath,
    fileName: finalFileName,
    contentType: MIME_BY_EXTENSION[extension] || 'audio/mpeg',
    createdAt: Date.now(),
    expiresAt
  });

  return {
    downloadUrl: `${DOWNLOAD_ROUTE_PREFIX}${assetId}`,
    expiresAt,
    title,
    artwork,
    note: 'YouTube search fallback via yt-dlp. Quality may vary. Expires in 6 hours.'
  };
}

async function pushToCatbox({ fileName, base64, label, fileSize, contentType }) {
  const buffer = Buffer.from(base64, 'base64');
  const form = new FormData();
  form.set('reqtype', 'fileupload');
  form.set('fileToUpload', new Blob([buffer], { type: contentType || 'application/octet-stream' }), fileName);

  const response = await fetch(CATBOX_UPLOAD_URL, {
    method: 'POST',
    body: form
  });
  const text = await response.text();
  if (!response.ok || !text || text.startsWith('ERROR')) {
    throw new Error(text?.replace('ERROR:', '').trim() || 'Catbox rejected the upload');
  }
  return {
    id: generateId(),
    fileName,
    size: fileSize,
    status: 'uploaded',
    url: text.trim(),
    label: label || null,
    note: 'Uploaded to catbox.moe'
  };
}

function hydrateSpotifyPayload(payload, defaultNote) {
  const audioEntry = Array.isArray(payload?.audio)
    ? payload.audio.find((entry) => entry?.url)
    : payload?.audio;
  const downloadUrl = audioEntry?.url || payload?.downloadUrl || payload?.link;
  if (!downloadUrl) {
    throw new Error('Spotify provider did not return a download link');
  }
  return {
    downloadUrl,
    title: payload?.metadata?.name || payload?.title || 'Spotify capture',
    artwork: payload?.metadata?.cover || payload?.thumbnail || null,
    expiresAt: payload?.expiresAt || null,
    note: payload?.note || defaultNote
  };
}

async function loadSpdlModule() {
  if (!spdlModulePromise) {
    spdlModulePromise = (async () => {
      if (!tsLoaderReady) {
        const { register } = await import('esbuild-register/dist/node.js');
        register({ target: 'node18', extensions: ['.ts'] });
        tsLoaderReady = true;
      }
      return import('spdl/src/index.ts');
    })();
    spdlModulePromise.catch(() => {
      spdlModulePromise = null;
    });
  }
  return spdlModulePromise;
}

async function getSpotifyClient(SpotifyCtor) {
  if (spotifyClientPromise) {
    return spotifyClientPromise;
  }

  spotifyClientPromise = SpotifyCtor.create({
    cookie: formatSpotifyCookie(SPOTIFY_COOKIE),
    forcePremium: true
  }).catch((error) => {
    spotifyClientPromise = null;
    throw error;
  });

  return spotifyClientPromise;
}

function formatSpotifyCookie(rawValue) {
  const value = `${rawValue || ''}`.trim();
  if (!value) return '';
  if (value.includes('sp_dc=')) {
    return value;
  }
  return value.includes('=') ? value : `sp_dc=${value}`;
}

function mapQualityToFormat(quality) {
  return SPOTIFY_FORMAT_BY_QUALITY[quality] || 'OGG_VORBIS_320';
}

async function ensureDownloadDir() {
  if (!downloadDirPromise) {
    downloadDirPromise = fs.mkdir(DOWNLOADS_DIR, { recursive: true }).catch((error) => {
      downloadDirPromise = null;
      throw error;
    });
  }
  return downloadDirPromise;
}

function buildDownloadFileName(title, extension) {
  const safeTitle = sanitizeFileName(title || 'spotify-track');
  return `${safeTitle}.${extension}`;
}

function sanitizeFileName(value) {
  return (
    value
      .replace(/[^a-z0-9-_]+/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'spotify-track'
  );
}

function extractSpotifyEntity(url) {
  try {
    const parsed = new URL(url);
    const [type, id] = parsed.pathname.split('/').filter(Boolean);
    return { type: type || '', id: (id || '').split('?')[0] };
  } catch (error) {
    return { type: '', id: '' };
  }
}

async function fetchSpotifyTrackMetadata(client, url) {
  try {
    const { type, id } = extractSpotifyEntity(url);
    if (type !== 'track' || !id) {
      return {};
    }
    const track = await client.tracks.get(id);
    if (!track) {
      return {};
    }
    const artistEntry = Array.isArray(track.artists) && track.artists.length ? track.artists[0] : null;
    const title = artistEntry?.name ? `${track.name} — ${artistEntry.name}` : track.name;
    const artwork = Array.isArray(track.album?.images) && track.album.images.length
      ? track.album.images[0].url
      : null;
    return { title: title || 'Spotify capture', artwork };
  } catch (error) {
    console.warn('Failed to read Spotify metadata', error?.message || error);
    return {};
  }
}

function rememberDownloadAsset(id, asset) {
  downloadCache.set(id, asset);
  const priorTimer = downloadExpiryTimers.get(id);
  if (priorTimer) {
    clearTimeout(priorTimer);
  }
  const timer = setTimeout(() => {
    cleanupDownloadAsset(id).catch((error) => {
      console.warn('Failed to cleanup download asset', error?.message || error);
    });
  }, DOWNLOAD_TTL_MS);
  downloadExpiryTimers.set(id, timer);
}

async function cleanupDownloadAsset(id) {
  const asset = downloadCache.get(id);
  if (!asset) return;
  downloadCache.delete(id);
  const timer = downloadExpiryTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    downloadExpiryTimers.delete(id);
  }
  await fs.rm(asset.path, { force: true }).catch((error) => {
    if (error?.code !== 'ENOENT') {
      console.warn('Failed to remove asset from disk', error?.message || error);
    }
  });
}

async function loadYtDlpBinary() {
  if (ytDlpBinary) {
    return ytDlpBinary;
  }
  if (!ytDlpModulePromise) {
    ytDlpModulePromise = import('yt-dlp-exec')
      .then((mod) => mod?.default || mod)
      .catch((error) => {
        ytDlpModulePromise = null;
        throw error;
      });
  }
  ytDlpBinary = await ytDlpModulePromise;
  return ytDlpBinary;
}

async function cleanupYtDlpArtifacts(assetId) {
  const artefacts = [
    ...YT_DLP_ALLOWED_EXTENSIONS.flatMap((ext) => [
      path.join(DOWNLOADS_DIR, `${assetId}.${ext}`),
      path.join(DOWNLOADS_DIR, `${assetId}.${ext}.part`)
    ]),
    path.join(DOWNLOADS_DIR, `${assetId}.info.json`)
  ];
  await Promise.all(
    artefacts.map((target) => fs.rm(target, { force: true }).catch(() => {}))
  );
}

async function resolveYtDlpOutput(assetId) {
  for (const extension of YT_DLP_ALLOWED_EXTENSIONS) {
    const candidate = path.join(DOWNLOADS_DIR, `${assetId}.${extension}`);
    try {
      const stats = await fs.stat(candidate);
      if (stats.isFile()) {
        return { filePath: candidate, extension };
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn('Failed to inspect yt-dlp output', error?.message || error);
      }
    }
  }
  throw new Error('yt-dlp fallback did not produce an audio file');
}

async function moveFile(fromPath, toPath) {
  try {
    await fs.rename(fromPath, toPath);
  } catch (error) {
    if (error?.code === 'EXDEV') {
      await fs.copyFile(fromPath, toPath);
      await fs.rm(fromPath, { force: true }).catch(() => {});
    } else {
      throw error;
    }
  }
}

async function fetchSpotifyOembedMetadata(url) {
  try {
    const endpoint = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Spotify oEmbed returned ${response.status}`);
    }
    const payload = await response.json();
    const normalizedTitle = normalizeOembedTitle(payload?.title, payload?.author_name);
    return {
      title: normalizedTitle || payload?.title || null,
      displayTitle: payload?.title || payload?.author_name || null,
      artwork: payload?.thumbnail_url || null,
      author: payload?.author_name || '',
      rawTitle: payload?.title || ''
    };
  } catch (error) {
    console.warn('Failed to fetch Spotify metadata via oEmbed', error?.message || error);
    return {};
  }
}

function buildYoutubeSearchQuery(meta = {}, fallback) {
  const parts = [];
  if (meta.rawTitle) {
    parts.push(meta.rawTitle);
  }
  if (meta.author && !meta.rawTitle?.toLowerCase().includes(meta.author.toLowerCase())) {
    parts.push(meta.author);
  }
  parts.push('audio official');
  const query = parts.filter(Boolean).join(' ');
  return query || fallback;
}

function normalizeOembedTitle(rawTitle, author) {
  if (!rawTitle && author) {
    return author;
  }
  if (!rawTitle) {
    return '';
  }
  const cleaned = rawTitle.replace(/\s+-\s+/g, ' — ');
  if (author && !cleaned.toLowerCase().includes(author.toLowerCase())) {
    return `${cleaned} — ${author}`;
  }
  return cleaned;
}

function buildNote(payload = {}) {
  const now = new Date().toISOString();
  return {
    id: payload.id ?? generateId(),
    title: (payload.title || 'Untitled note').trim(),
    body: (payload.body || '').trim(),
    visibility: normalizeVisibility(payload.visibility),
    author: payload.author || 'admin',
    createdAt: now,
    updatedAt: now
  };
}

function normalizeNotePatch(patch = {}) {
  const result = {};
  if (typeof patch.title === 'string') {
    result.title = patch.title.trim();
  }
  if (typeof patch.body === 'string') {
    result.body = patch.body.trim();
  }
  if (patch.visibility) {
    result.visibility = normalizeVisibility(patch.visibility);
  }
  return result;
}

function normalizeVisibility(value) {
  return value === 'public' ? 'public' : 'private';
}

function generateId() {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `note-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

server.listen(PORT, () => {
  console.log(`Admin data server listening on http://localhost:${PORT}`);
  console.log(
    'Endpoints: /api/admin/contacts, /api/admin/notes, /api/tools/download, /api/tools/cdn-upload, /api/tools/downloads/:id'
  );
});

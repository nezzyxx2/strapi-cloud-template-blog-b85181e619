const ADMIN_DATA_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_DATA_BASE_URL
  ? import.meta.env.VITE_ADMIN_DATA_BASE_URL.replace(/\/$/, '')
    : 'http://localhost:8890';

const DOWNLOAD_ENDPOINT = `${ADMIN_DATA_BASE}/api/tools/download`;
const CDN_UPLOAD_ENDPOINT = `${ADMIN_DATA_BASE}/api/tools/cdn-upload`;

function withAdminBase(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  const normalized = url.startsWith('/') ? url : `/${url}`;
  return `${ADMIN_DATA_BASE}${normalized}`;
}

function normalizeJob(job) {
  if (!job) return null;
  if (!job.downloadUrl) return job;
  return {
    ...job,
    downloadUrl: withAdminBase(job.downloadUrl)
  };
}

async function parseResponse(response) {
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Remote tooling endpoint failed');
  }
  return response.json().catch(() => ({}));
}

export async function requestMediaDownload({ provider, url, quality }) {
  const response = await fetch(DOWNLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, url, quality })
  });
  const payload = await parseResponse(response);
  if (payload?.job) return normalizeJob(payload.job);
  throw new Error('Download service did not return a job');
}

export async function requestCdnUpload({ fileName, fileSize, label, base64, contentType }) {
  const response = await fetch(CDN_UPLOAD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, fileSize, label, base64, contentType })
  });
  const payload = await parseResponse(response);
  if (payload?.upload) return payload.upload;
  throw new Error('CDN uploader did not return metadata');
}

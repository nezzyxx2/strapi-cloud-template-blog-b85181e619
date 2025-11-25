const ADMIN_DATA_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_DATA_BASE_URL
    ? import.meta.env.VITE_ADMIN_DATA_BASE_URL.replace(/\/$/, '')
    : 'http://localhost:8890';

const NOTES_ENDPOINT = `${ADMIN_DATA_BASE}/api/admin/notes`;

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Notes service rejected the request');
  }
  return response.json().catch(() => ({}));
}

export async function fetchOpsNotes() {
  const response = await fetch(NOTES_ENDPOINT, {
    headers: { 'Content-Type': 'application/json' }
  });
  const payload = await handleResponse(response);
  return Array.isArray(payload?.items) ? payload.items : [];
}

export async function createOpsNote(note) {
  const response = await fetch(NOTES_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(note)
  });
  const payload = await handleResponse(response);
  return payload?.note;
}

export async function updateOpsNote(id, patch) {
  if (!id) throw new Error('Note ID required');
  const response = await fetch(`${NOTES_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch)
  });
  const payload = await handleResponse(response);
  return payload?.note;
}

export async function deleteOpsNote(id) {
  if (!id) throw new Error('Note ID required');
  const response = await fetch(`${NOTES_ENDPOINT}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  await handleResponse(response);
  return true;
}

import { writable } from 'svelte/store';

const STORAGE_KEY = 'ftr-contact-submissions';
const CONTACT_WEBHOOK_URL =
  'https://discord.com/api/webhooks/1440230479096844288/el9OCphpnb08TmC9JxIQQiSd6gtKpYjHA1_6Pj0yaoUscQYFvCl_N_b-26ZsMgoSHT9y';
const STATUS_VALUES = ['New', 'In Progress', 'Done', 'Closed'];
const ADMIN_DATA_BASE =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ADMIN_DATA_BASE_URL
    ? import.meta.env.VITE_ADMIN_DATA_BASE_URL.replace(/\/$/, '')
    : 'http://localhost:8890';
const CONTACTS_ENDPOINT = `${ADMIN_DATA_BASE}/api/admin/contacts`;

const syncState = writable({ state: 'idle', message: 'Local cache' });
export const contactSyncState = syncState;

function buildId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function readPersisted() {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error('Failed to read stored contacts', err);
    return [];
  }
}

function persist(items) {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to persist contacts', err);
  }
}

function normaliseStatus(status) {
  if (typeof status !== 'string') return 'New';
  const match = STATUS_VALUES.find((value) => value.toLowerCase() === status.toLowerCase());
  return match ?? 'New';
}

function canUseRemotePersistence() {
  return typeof fetch === 'function';
}

async function fetchRemoteContacts() {
  if (!canUseRemotePersistence()) {
    throw new Error('Remote persistence unavailable in this environment');
  }
  const response = await fetch(CONTACTS_ENDPOINT, {
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Unable to fetch contacts');
  }
  const payload = await response.json().catch(() => []);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

async function pushRemoteContacts(items) {
  if (!canUseRemotePersistence()) {
    throw new Error('Remote persistence unavailable in this environment');
  }
  const response = await fetch(CONTACTS_ENDPOINT, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(details || 'Unable to save contacts');
  }
  return response.json().catch(() => ({}));
}

function createContactStore() {
  const { subscribe, update, set } = writable(readPersisted());
  let currentSnapshot = readPersisted();

  function write(items) {
    persist(items);
    currentSnapshot = items;
    return items;
  }

  async function syncRemote(items = currentSnapshot) {
    if (!items) return;
    syncState.set({ state: 'saving', message: 'Saving contacts…' });
    try {
      await pushRemoteContacts(items);
      syncState.set({ state: 'ready', message: `Saved ${items.length} contacts` });
    } catch (error) {
      console.error('Failed to sync contacts to server', error);
      syncState.set({ state: 'error', message: error.message || 'Failed to sync contacts' });
      throw error;
    }
  }

  return {
    subscribe,
    add(entry) {
      const initialStatus = normaliseStatus(entry?.status);
      const submission = {
        id: buildId(),
        status: initialStatus,
        statusHistory: [
          {
            status: initialStatus,
            changedAt: entry?.submittedAt ?? new Date().toISOString()
          }
        ],
        ...entry,
        submittedAt: entry?.submittedAt ?? new Date().toISOString()
      };
      let snapshot;
      update((items) => {
        snapshot = write([submission, ...items]);
        return snapshot;
      });
      syncRemote(snapshot).catch(() => {});
      return submission;
    },
    updateStatus(id, status) {
      let updated;
      let snapshot;
      update((items) => {
        const next = items.map((item) => {
          if (item.id !== id) return item;
          const nextStatus = normaliseStatus(status);
          updated = {
            ...item,
            status: nextStatus,
            statusHistory: [
              ...(item.statusHistory ?? []),
              { status: nextStatus, changedAt: new Date().toISOString() }
            ]
          };
          return updated;
        });
        snapshot = write(next);
        return snapshot;
      });
      syncRemote(snapshot).catch(() => {});
      return updated;
    },
    reset() {
      const cleared = write([]);
      set(cleared);
      syncRemote(cleared).catch(() => {});
    },
    hydrate() {
      set(readPersisted());
    },
    async refreshFromServer() {
      syncState.set({ state: 'loading', message: 'Refreshing contacts…' });
      try {
        const remoteItems = await fetchRemoteContacts();
        set(write(remoteItems));
        syncState.set({ state: 'ready', message: `Loaded ${remoteItems.length} contacts` });
        return remoteItems;
      } catch (error) {
        syncState.set({ state: 'error', message: error.message || 'Unable to refresh contacts' });
        throw error;
      }
    },
    async persistSnapshot() {
      return syncRemote();
    }
  };
}

export const contactSubmissions = createContactStore();

export function recordContactSubmission(entry) {
  const submission = contactSubmissions.add(entry);
  if (CONTACT_WEBHOOK_URL && typeof window !== 'undefined') {
    sendContactToDiscord(submission);
  }
  return submission;
}

export function updateContactStatus(id, status) {
  return contactSubmissions.updateStatus(id, status);
}

export const contactStatuses = STATUS_VALUES;

async function sendContactToDiscord(submission) {
  try {
    await fetch(CONTACT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: '📥 New contact submission',
            color: 0x25c2ff,
            fields: [
              { name: 'Name', value: submission.name || '—', inline: true },
              { name: 'Email', value: submission.email || '—', inline: true },
              { name: 'Company', value: submission.company || '—', inline: true },
              { name: 'Social / Website', value: submission.socialLink || '—', inline: true },
              { name: 'Status', value: submission.status, inline: true },
              {
                name: 'Project notes',
                value: submission.message || submission.notes || 'No message provided.'
              }
            ],
            timestamp: submission.submittedAt
          }
        ]
      })
    });
  } catch (err) {
    console.error('Failed to notify Discord about contact submission', err);
  }
}

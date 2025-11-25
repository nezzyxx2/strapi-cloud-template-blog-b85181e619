const DEFAULT_WEBHOOK_MESSAGE = 'Automated message from FTR Digital admin console.';
const DEFAULT_LOOKUP_ENDPOINT = 'https://discord-lookup.ultirequiem.com/api/lookup/{id}';
const LOOKUP_ENDPOINT =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_DISCORD_LOOKUP_API
    ? import.meta.env.VITE_DISCORD_LOOKUP_API
    : DEFAULT_LOOKUP_ENDPOINT;

export async function sendWebhookMessage({
  url,
  content,
  username,
  avatarUrl,
  embeds
}) {
  if (!url) {
    throw new Error('Webhook URL required');
  }
  const payload = {
    content: content?.trim() || DEFAULT_WEBHOOK_MESSAGE,
    username: username?.trim() || 'FTR Digital Bot',
    avatar_url: avatarUrl?.trim() || undefined,
    embeds: Array.isArray(embeds) && embeds.length ? embeds : undefined
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Discord rejected the payload');
    }
    return { ok: true };
  } catch (error) {
    console.warn('Discord webhook call failed', error);
    throw new Error(error?.message || 'Webhook request failed');
  }
}

export async function lookupDiscordId(id) {
  if (!id) {
    throw new Error('Discord ID required');
  }
  const sanitized = `${id}`.trim();
  if (!/^\d{5,}$/.test(sanitized)) {
    throw new Error('Discord IDs only contain numbers');
  }

  const approximateTimestamp = buildSnowflakeTimestamp(sanitized);
  const remote = await fetchLookupFromApi(sanitized).catch(() => null);
  if (remote) {
    return {
      id: sanitized,
      createdAt: remote.created_at ?? approximateTimestamp,
      type: remote.type ?? remote.category ?? 'unknown',
      note: remote.note ?? 'Powered by UltiRequiem discord-lookup service.',
      raw: remote
    };
  }

  return {
    id: sanitized,
    createdAt: approximateTimestamp,
    type: 'snowflake',
    note:
      'Offline lookup via snowflake timestamp. Configure VITE_DISCORD_LOOKUP_API for enriched data.'
  };
}

async function fetchLookupFromApi(id) {
  if (!LOOKUP_ENDPOINT) return null;
  const targets = buildLookupTargets(LOOKUP_ENDPOINT, id);
  for (const target of targets) {
    try {
      const response = await fetch(target, {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) {
        continue;
      }
      const payload = await response.json();
      if (payload) {
        return payload;
      }
    } catch (error) {
      // Ignore and attempt next target
    }
  }
  return null;
}

function buildLookupTargets(endpoint, id) {
  const trimmed = endpoint.trim();
  if (trimmed.includes('{id}')) {
    return [trimmed.replace('{id}', id)];
  }
  const targets = [];
  const withSlash = `${trimmed}${trimmed.endsWith('/') ? '' : '/'}`;
  targets.push(`${withSlash}${id}`);
  const queryPrefix = trimmed.includes('?')
    ? `${trimmed}${trimmed.includes('=') ? '&' : ''}`
    : `${trimmed}?`;
  targets.push(`${queryPrefix}id=${id}`);
  return targets;
}

function buildSnowflakeTimestamp(id) {
  try {
    const snowflake = BigInt(id);
    const discordEpoch = 1420070400000n;
    const timestamp = Number((snowflake >> 22n) + discordEpoch);
    if (Number.isNaN(timestamp)) return 'Unknown timestamp';
    return new Date(timestamp).toISOString();
  } catch (error) {
    return 'Unknown timestamp';
  }
}

export function getDefaultBots() {
  return [
    {
      id: 'atlas-scout',
      name: 'Atlas Scout',
      status: 'idle',
      description: 'Prospecting assistant for partner outreach',
      scopes: ['messages', 'webhooks']
    },
    {
      id: 'relay-runner',
      name: 'Relay Runner',
      status: 'sleeping',
      description: 'Bridges Discord to Notion + Linear',
      scopes: ['commands', 'sync']
    },
    {
      id: 'echo-lens',
      name: 'Echo Lens',
      status: 'live',
      description: 'Listens to Discord chatter + publishes insights',
      scopes: ['listeners', 'alerts']
    }
  ];
}

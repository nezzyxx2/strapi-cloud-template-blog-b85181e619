import http from 'http';

const PORT = process.env.AI_PROXY_PORT ?? 8787;
const PANDORA_URL = process.env.PANDORA_URL ?? process.env.PANDORA_BASE_URL ?? '';
const PANDORA_KEY = process.env.PANDORA_API_KEY ?? process.env.PANDORA_KEY;
const PANDORA_MODEL = process.env.PANDORA_MODEL ?? process.env.AI_MODEL ?? 'gpt-4o-mini';
const GPT4FREE_URL = process.env.GPT4FREE_URL ?? '';

const defaultHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, defaultHeaders);
    return res.end();
  }

  if (req.method !== 'POST' || req.url !== '/api/ai/chat') {
    res.writeHead(404, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Route not found' }));
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }

  let payload;
  try {
    payload = body ? JSON.parse(body) : {};
  } catch (error) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
  }

  const history = Array.isArray(payload.messages) ? payload.messages : [];
  const latestMessage = history.at(-1)?.content ?? payload.prompt;
  if (!latestMessage) {
    res.writeHead(400, defaultHeaders);
    return res.end(JSON.stringify({ error: 'Missing prompt' }));
  }

  try {
    const responsePayload = await forwardToProviders(history, latestMessage);
    res.writeHead(200, defaultHeaders);
    res.end(JSON.stringify(responsePayload));
  } catch (error) {
    console.error('AI proxy failure', error);
    res.writeHead(502, defaultHeaders);
    res.end(JSON.stringify({ error: 'AI provider unavailable' }));
  }
});

async function forwardToProviders(history, prompt) {
  const providers = buildProviderTargets();
  if (!providers.length) {
    return buildLocalFallback(prompt, history, 'No PandoraAI/gpt4free endpoints configured.');
  }

  let lastError;
  for (const provider of providers) {
    try {
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.headers ?? {})
        },
        body: JSON.stringify({
          model: provider.model,
          temperature: provider.temperature ?? 0.6,
          stream: false,
          messages: history
        })
      });

      if (!response.ok) {
        const payload = await response.text();
        throw new Error(payload || response.statusText);
      }

      const data = await response.json();
      const reply = data?.choices?.[0]?.message?.content || data?.reply || data?.message;
      if (!reply) {
        throw new Error('Provider returned an empty response.');
      }

      return {
        reply,
        meta: {
          provider: provider.label,
          model: provider.model,
          endpoint: provider.endpoint
        }
      };
    } catch (error) {
      lastError = error;
    }
  }

  return buildLocalFallback(prompt, history, lastError?.message);
}

function buildProviderTargets() {
  const providers = [];
  if (PANDORA_URL) {
    providers.push({
      id: 'pandora',
      label: 'PandoraAI',
      endpoint: PANDORA_URL,
      headers: PANDORA_KEY
        ? {
            Authorization: PANDORA_KEY.startsWith('Bearer ')
              ? PANDORA_KEY
              : `Bearer ${PANDORA_KEY}`
          }
        : undefined,
      model: PANDORA_MODEL
    });
  }

  if (GPT4FREE_URL) {
    providers.push({
      id: 'gpt4free',
      label: 'gpt4free',
      endpoint: GPT4FREE_URL,
      model: process.env.GPT4FREE_MODEL ?? 'gpt-4o-mini'
    });
  }

  return providers;
}

function buildLocalFallback(latestMessage, history, reason) {
  const contactCount = history.filter((entry) => entry.role === 'user').length;
  const details = reason ? ` (${reason})` : '';
  const reply = `Dev sandbox reply${details}. You asked: "${latestMessage}". Logged ${contactCount} turns. Configure PANDORA_URL/PANDORA_API_KEY or GPT4FREE_URL to stream real answers.`;
  return {
    reply,
    meta: {
      provider: 'local-dev'
    }
  };
}

server.listen(PORT, () => {
  console.log(`AI proxy ready on http://localhost:${PORT}/api/ai/chat`);
  if (!PANDORA_URL && !GPT4FREE_URL) {
    console.log('PANDORA_URL / GPT4FREE_URL not set — responding with local sandbox text.');
  }
});

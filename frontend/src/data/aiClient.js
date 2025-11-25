const DEFAULT_PANDORA_ENDPOINT = 'http://localhost:9595/v1/chat/completions';
const PANDORA_ENDPOINT = import.meta.env?.VITE_PANDORA_URL?.trim() || '';
const PANDORA_KEY = import.meta.env?.VITE_PANDORA_KEY?.trim();
const PANDORA_MODEL = import.meta.env?.VITE_PANDORA_MODEL?.trim() || 'gpt-4o-mini';
const AI_PROXY_ENDPOINT = import.meta.env?.VITE_AI_PROXY?.trim() || '';
const AI_PROXY_KEY = import.meta.env?.VITE_AI_KEY?.trim();
const AI_PROXY_BEARER = import.meta.env?.VITE_AI_BEARER?.trim();
const OLLAMA_ENDPOINT = import.meta.env?.VITE_OLLAMA_URL?.trim() || '';
const OLLAMA_MODEL = import.meta.env?.VITE_OLLAMA_MODEL?.trim() || 'llama3';

const GPT4FREE_ENDPOINT = import.meta.env?.VITE_GPT4FREE_URL?.trim() || '';
const GPT4FREE_MODEL = import.meta.env?.VITE_GPT4FREE_MODEL?.trim() || 'claude-3-haiku';

const AI_TIMEOUT_MS = Number(import.meta.env?.VITE_AI_TIMEOUT_MS ?? 20000);
const TEMPERATURE = Number(import.meta.env?.VITE_AI_TEMPERATURE ?? 0.6);

const OFFLINE_RESPONSES = [
  'Here’s the move: tighten the value prop, launch a lightweight test, and let momentum prove the angle.',
  'Log it. Ship a three-point plan — audience, message, channel — then drop it into the sprint board.',
  'Keep it simple: clarify who you’re talking to, commit to one channel, and measure the signal fast.'
];

function normalizeMessages(messagesOrPayload) {
  if (!messagesOrPayload) {
    return [];
  }

  if (Array.isArray(messagesOrPayload)) {
    return messagesOrPayload
      .map(({ role = 'user', content = '' }) => ({ role, content: `${content}`.trim() }))
      .filter((entry) => entry.content);
  }

  if (typeof messagesOrPayload === 'string') {
    return [{ role: 'user', content: messagesOrPayload.trim() }];
  }

  if (Array.isArray(messagesOrPayload.messages)) {
    return normalizeMessages(messagesOrPayload.messages);
  }

  return [];
}

function buildOpenAICompatiblePayload(messages, overrides = {}) {
  return {
    model: overrides.model ?? PANDORA_MODEL,
    messages: messages.map(({ role, content }) => ({ role, content })),
    temperature: overrides.temperature ?? TEMPERATURE,
    stream: false
  };
}

function describeTarget(target) {
  return target.label ?? target.id ?? 'ai-provider';
}

function fetchWithTimeout(url, fetchOptions, timeoutMs, signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const externalAbortHandler = () => controller.abort();
  signal?.addEventListener?.('abort', externalAbortHandler, { once: true });

  const mergedSignal = controller.signal;

  return fetch(url, { ...fetchOptions, signal: mergedSignal }).finally(() => {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', externalAbortHandler);
  });
}

async function requestCompletion(target, payload, { signal } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(target.headers ?? {})
  };

  const response = await fetchWithTimeout(
    target.endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    },
    target.timeout ?? AI_TIMEOUT_MS,
    signal
  );

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    const reason = errorPayload?.error?.message || errorPayload?.message || `${response.status} ${response.statusText}`;
    throw new Error(`${describeTarget(target)} rejected the request: ${reason}`);
  }

  const data = await safeJson(response);
  const reply = extractReplyText(data);
  if (!reply) {
    throw new Error(`${describeTarget(target)} responded but no content was returned.`);
  }

  return {
    reply,
    meta: {
      provider: describeTarget(target),
      endpoint: target.endpoint,
      model: payload.model,
      cost: data?.usage?.total_tokens ?? null
    }
  };
}

function extractReplyText(payload) {
  if (!payload) return '';
  const choice = payload?.choices?.[0];
  if (!choice) {
    if (typeof payload?.reply === 'string') return payload.reply;
    if (typeof payload?.message === 'string') return payload.message;
    return '';
  }

  if (choice.message?.content) {
    if (Array.isArray(choice.message.content)) {
      return choice.message.content.map((part) => (typeof part === 'string' ? part : part?.text ?? '')).join('').trim();
    }
    return `${choice.message.content}`.trim();
  }

  if (choice.text) {
    return `${choice.text}`.trim();
  }

  return '';
}

function buildProviderTargets() {
  const targets = [];
  if (AI_PROXY_ENDPOINT) {
    const proxyHeaders = {};
    if (AI_PROXY_KEY) {
      proxyHeaders['x-api-key'] = AI_PROXY_KEY;
    }
    if (AI_PROXY_BEARER) {
      proxyHeaders.Authorization = AI_PROXY_BEARER.startsWith('Bearer ')
        ? AI_PROXY_BEARER
        : `Bearer ${AI_PROXY_BEARER}`;
    }
    targets.push({
      id: 'ai-proxy',
      label: 'Local AI proxy',
      endpoint: AI_PROXY_ENDPOINT,
      headers: Object.keys(proxyHeaders).length ? proxyHeaders : undefined,
      model: PANDORA_MODEL
    });
  }

  if (OLLAMA_ENDPOINT) {
    targets.push({
      id: 'ollama',
      label: 'Ollama (local)',
      endpoint: OLLAMA_ENDPOINT,
      model: OLLAMA_MODEL
    });
  }

  if (PANDORA_ENDPOINT) {
    targets.push({
      id: 'pandora',
      label: 'PandoraAI',
      endpoint: PANDORA_ENDPOINT,
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

  if (GPT4FREE_ENDPOINT) {
    targets.push({
      id: 'gpt4free',
      label: 'gpt4free',
      endpoint: GPT4FREE_ENDPOINT,
      model: GPT4FREE_MODEL
    });
  }

  return targets;
}

function buildOfflineReply(prompt) {
  if (!prompt) {
    return 'Drop a little context and I’ll map the next best move.';
  }

  const normalized = prompt.toLowerCase();

  if (normalized.includes('deck') || normalized.includes('capabilities')) {
    return 'Spin up a lean deck: one slide for the problem, one for our unfair edge, and one for proof. Keep it sharp.';
  }

  if (normalized.includes('sponsor') || normalized.includes('partnership')) {
    return 'Lead with the overlap in audience, add a 30-day activation plan, and land on the basics: deliverables, timeline, outcomes.';
  }

  if (normalized.includes('growth') || normalized.includes('marketing')) {
    return 'Aim for a one-week experiment. Pair narrative-led content with a retargeting loop, then double down on what converts.';
  }

  return OFFLINE_RESPONSES[Math.floor(Math.random() * OFFLINE_RESPONSES.length)];
}

export function describeProvider(meta) {
  if (meta?.label) return meta.label;
  if (typeof meta?.provider === 'string' && meta.provider.length) {
    if (meta.provider === 'offline') {
      return 'Offline draft mode';
    }
    return meta.provider;
  }
  return 'Offline draft mode';
}

export async function sendAiPrompt(messagesOrPayload, options = {}) {
  const { signal } = options ?? {};
  const messages = normalizeMessages(messagesOrPayload);
  if (!messages.length) {
    throw new Error('AI prompt requires at least one message.');
  }

  const targets = buildProviderTargets();
  const payload = buildOpenAICompatiblePayload(messages);
  const prompt = messages[messages.length - 1]?.content ?? '';

  let lastError;
  for (const target of targets) {
    try {
      const response = await requestCompletion(
        { ...target, timeout: target.timeout ?? AI_TIMEOUT_MS },
        { ...payload, model: target.model ?? payload.model },
        { signal }
      );
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  const reply = buildOfflineReply(prompt);
  return {
    reply,
    meta: {
      provider: 'offline',
      label: 'Offline draft mode',
      offline: true,
      error: lastError?.message ?? null,
      suggestedEndpoint: DEFAULT_PANDORA_ENDPOINT
    }
  };
}

export async function sendAiPromptWithFallback(messagesOrPayload, options = {}) {
  try {
    return await sendAiPrompt(messagesOrPayload, options);
  } catch (error) {
    const prompt = normalizeMessages(messagesOrPayload).at(-1)?.content ?? '';
    return {
      reply: buildOfflineReply(prompt) || 'AI provider unavailable — please try again shortly.',
      meta: {
        provider: 'offline',
        label: 'Offline draft mode',
        offline: true,
        error: error.message,
        suggestedEndpoint: DEFAULT_PANDORA_ENDPOINT
      }
    };
  }
}

export async function testAiConnection() {
  const targets = buildProviderTargets();
  if (!targets.length) {
    return {
      ok: false,
      message: 'No PandoraAI/gpt4free endpoint configured. Set VITE_PANDORA_URL or VITE_GPT4FREE_URL.'
    };
  }

  try {
    const probe = await requestCompletion(
      targets[0],
      {
        ...buildOpenAICompatiblePayload([
          { role: 'system', content: 'You are a heartbeat check.' },
          { role: 'user', content: 'Reply with READY.' }
        ]),
        model: targets[0].model ?? PANDORA_MODEL
      }
    );

    return {
      ok: true,
      provider: probe.meta.provider,
      model: probe.meta.model
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message
    };
  }
}

function safeJson(response) {
  return response
    .json()
    .catch(() =>
      response
        .text()
        .then((text) => {
          try {
            return JSON.parse(text);
          } catch (_) {
            return { message: text };
          }
        })
        .catch(() => ({}))
    );
}

export default {
  sendAiPrompt,
  sendAiPromptWithFallback,
  describeProvider,
  testAiConnection
};

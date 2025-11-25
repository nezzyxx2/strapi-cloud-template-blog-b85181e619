<script>
  import { sendAiPrompt, describeProvider } from '../../data/aiClient.js';

  const quickPrompts = [
    'Draft a capabilities DM for a new client',
    'Summarise the latest contact submissions',
    'Outline sponsorship angles for an AU tech brand'
  ];

  const cryptoRef = globalThis?.crypto;

  function buildId(prefix) {
    if (cryptoRef?.randomUUID) return cryptoRef.randomUUID();
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  let input = '';
  let error = '';
  let isThinking = false;
  let messages = [
    {
      id: buildId('assistant'),
      role: 'assistant',
      content: 'Hey crew — I can riff on proposals, outreach copy or growth tactics. Drop context and I will draft instantly.'
    }
  ];

  async function handleSend(prompt = input) {
    const trimmed = prompt.trim();
    if (!trimmed || isThinking) return;
    error = '';
    input = '';
    const userMessage = {
      id: buildId('user'),
      role: 'user',
      content: trimmed
    };
    messages = [...messages, userMessage];
    isThinking = true;

    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const { reply, meta } = await sendAiPrompt(history);
      const assistantMessage = {
        id: buildId('assistant'),
        role: 'assistant',
        content: reply,
        meta
      };
      messages.push(assistantMessage);
      messages = messages;
    } catch (err) {
      console.error(err);
      error = err?.message ?? 'Unable to reach AI service right now.';
    } finally {
      isThinking = false;
    }
  }

  function handleSuggestion(prompt) {
    input = prompt;
    handleSend(prompt);
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }
</script>

<div class="ai-chat">
  <div class="ai-chat__log">
    {#each messages as message (message.id)}
      <article class={`ai-chat__bubble ai-chat__bubble--${message.role}`}>
        <header>
          <span>{message.role === 'assistant' ? 'FTR Copilot' : 'You'}</span>
          {#if describeProvider(message.meta)}
            <small>{describeProvider(message.meta)}</small>
          {/if}
        </header>
        <p>{message.content}</p>
      </article>
    {/each}
    {#if isThinking}
      <article class="ai-chat__bubble ai-chat__bubble--assistant ai-chat__bubble--ghost">
        <div class="ai-chat__dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </article>
    {/if}
  </div>

  <div class="ai-chat__suggestions">
    {#each quickPrompts as prompt}
      <button type="button" on:click={() => handleSuggestion(prompt)}>{prompt}</button>
    {/each}
  </div>

  <form class="ai-chat__composer" on:submit|preventDefault={() => handleSend()}>
    <textarea
      rows="2"
      placeholder="Ask for copy, growth angles, or technical breakdowns..."
      bind:value={input}
      on:keydown={handleKeydown}
    ></textarea>
    <button class="btn btn--primary" type="submit" disabled={isThinking}>Send</button>
  </form>
  {#if error}
    <p class="ai-chat__error">{error}</p>
  {/if}
</div>

<style>
  .ai-chat {
    display: grid;
    gap: 1rem;
  }

  .ai-chat__log {
    max-height: 420px;
    overflow-y: auto;
    display: grid;
    gap: 0.75rem;
    padding-right: 0.25rem;
  }

  .ai-chat__bubble {
    padding: 0.85rem 1rem;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    backdrop-filter: blur(6px);
    display: grid;
    gap: 0.35rem;
  }

  .ai-chat__bubble--user {
    justify-self: end;
    background: rgba(36, 192, 255, 0.15);
    border-color: rgba(36, 192, 255, 0.45);
  }

  .ai-chat__bubble header {
    display: flex;
    gap: 0.5rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-muted);
  }

  .ai-chat__bubble p {
    margin: 0;
    line-height: 1.5;
  }

  .ai-chat__bubble--ghost {
    border-style: dashed;
  }

  .ai-chat__dots {
    display: inline-flex;
    gap: 0.3rem;
  }

  .ai-chat__dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.4;
    animation: aiPulse 1s infinite ease-in-out;
  }

  .ai-chat__dots span:nth-child(2) {
    animation-delay: 0.15s;
  }

  .ai-chat__dots span:nth-child(3) {
    animation-delay: 0.3s;
  }

  .ai-chat__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .ai-chat__suggestions button {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    color: inherit;
    padding: 0.4rem 0.9rem;
    cursor: pointer;
    font-size: 0.85rem;
  }

  .ai-chat__composer {
    display: grid;
    gap: 0.5rem;
  }

  .ai-chat__composer textarea {
    border-radius: 16px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.9rem 1rem;
    min-height: 90px;
    resize: vertical;
  }

  .ai-chat__error {
    margin: 0;
    color: #ff8b8b;
    font-size: 0.85rem;
  }

  @keyframes aiPulse {
    0%,
    100% {
      opacity: 0.2;
    }
    50% {
      opacity: 0.8;
    }
  }
</style>

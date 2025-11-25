<script>
  import { recordContactSubmission } from '../data/contactStore.js';

  export let contact;
  export let variant = 'inline';

  let formData = {};
  let submitted = false;

  function handleSubmit() {
    recordContactSubmission({
      ...formData,
      submittedAt: new Date().toISOString()
    });
    submitted = true;
    setTimeout(() => (submitted = false), 3500);
    formData = {};
  }
</script>

<section
  id="contact"
  class="section contact"
  class:contact--page={variant === 'page'}
  class:contact--inline={variant !== 'page'}
>
  <div class="section__inner contact__inner">
    <div class="panel contact__brief">
      <p class="eyebrow">Contact</p>
      <h2>{contact?.title}</h2>
      <p>{contact?.copy}</p>
      <ul>
        {#each contact?.details ?? [] as detail}
          <li>
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </li>
        {/each}
      </ul>
    </div>

    <form class="panel contact__form" on:submit|preventDefault={handleSubmit}>
      {#each contact?.form?.fields ?? [] as field}
        <label>
          {field.label}
          {#if field.type === 'textarea'}
            <textarea
              placeholder={field.placeholder}
              rows="4"
              bind:value={formData[field.name]}
              required
            ></textarea>
          {:else if field.type === 'email'}
            <input
              type="email"
              placeholder={field.placeholder}
              bind:value={formData[field.name]}
              required
            />
          {:else}
            <input
              type="text"
              placeholder={field.placeholder}
              bind:value={formData[field.name]}
              required
            />
          {/if}
        </label>
      {/each}
      <label>
        Instagram handle / Website
        <input
          type="text"
          placeholder="@ftrdigital or ftrdigital.org"
          bind:value={formData.socialLink}
        />
      </label>
      <button class="btn btn--primary" type="submit">{contact?.form?.submit}</button>
      {#if submitted}
        <p class="contact__status animate-enter" data-anim="fade">Thanks – we'll reply shortly.</p>
      {/if}
    </form>
  </div>
</section>

<style>
  .contact__inner {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 2rem;
  }

  .contact__brief ul {
    list-style: none;
    padding: 0;
    margin: 2rem 0 0;
    display: grid;
    gap: 1rem;
  }

  .contact__brief li span {
    text-transform: uppercase;
    font-size: 0.75rem;
    color: var(--color-muted);
    letter-spacing: 0.15em;
  }

  .contact__brief strong {
    display: block;
    font-size: 1.1rem;
  }

  .contact__form {
    display: grid;
    gap: 1rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 500;
  }

  input,
  textarea {
    border-radius: 18px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    padding: 0.9rem 1rem;
    color: var(--color-text);
    font-family: inherit;
  }

  .contact__status {
    color: var(--color-accent);
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: var(--btn-hover-border);
    box-shadow: 0 0 0 2px rgba(53, 107, 255, 0.1);
  }

  .contact--page {
    padding-top: 4rem;
    display: flex;
    justify-content: center;
  }

  .contact--page .contact__inner {
    max-width: 860px;
  }

  .contact--page .panel {
    text-align: left;
  }

  @media (max-width: 720px) {
    .contact__inner {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .contact__brief h2 {
      font-size: clamp(1.8rem, 6.5vw, 2.3rem);
    }

    .contact__brief {
      text-align: center;
    }

    .contact__brief ul {
      margin: 1.5rem auto 0;
      justify-items: center;
    }

    .contact__brief li {
      padding: 0.5rem 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      width: 100%;
      max-width: 320px;
    }

    .contact__brief li:last-child {
      border-bottom: none;
    }

    label {
      font-size: 0.95rem;
    }

    input,
    textarea {
      border-radius: 14px;
      padding: 0.75rem 0.9rem;
    }

    .contact__form button {
      width: 100%;
      margin-top: 0.5rem;
    }

    .contact__status {
      text-align: center;
      font-size: 0.9rem;
    }

    .contact--inline {
      display: none;
    }

    .contact--page {
      display: block;
      padding-top: 3rem;
    }
  }
</style>

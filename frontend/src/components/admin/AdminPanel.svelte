<script>
  import {
    contactSubmissions,
    contactStatuses,
    updateContactStatus,
    contactSyncState
  } from '../../data/contactStore.js';
  import { sendWebhookMessage, lookupDiscordId, getDefaultBots } from '../../data/discordTools.js';
  import { requestMediaDownload, requestCdnUpload } from '../../data/downloaderTools.js';
  import { fetchOpsNotes, createOpsNote, updateOpsNote, deleteOpsNote } from '../../data/opsNotes.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import AdminAIChat from './AdminAIChat.svelte';

  export let brand;
  export let siteData;

  const dispatch = createEventDispatcher();

  const navIconPaths = {
    overview: ['M4 4h7v8H4z', 'M14 4h6v4h-6z', 'M14 10h6v10h-6z', 'M4 14h7v6H4z'],
    portfolio: ['M5 6h14v4H5z', 'M5 12h14v4H5z', 'M5 18h10v2H5z'],
    reviews: ['M5 6h14v9H12l-3 3v-3H5z'],
    contacts: ['M4 7h16v10H4z', 'M4 7l8 6 8-6'],
    discord: ['M4 8c0-2 3-4 8-4s8 2 8 4v8c0 2-3 4-8 4s-8-2-8-4z', 'M10 13a1 1 0 1 1 0-2a1 1 0 0 1 0 2z', 'M14 13a1 1 0 1 1 0-2a1 1 0 0 1 0 2z'],
    misc: ['M4 6h16v3H4z', 'M4 11h16v3H4z', 'M4 16h10v3H4z'],
    settings: [
      'M12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10z',
      'M12 2v3',
      'M12 19v3',
      'M3 12h3',
      'M18 12h3',
      'M5.5 5.5l2.2 2.2',
      'M16.3 16.3l2.2 2.2',
      'M18.5 5.5l-2.2 2.2',
      'M7.7 16.3l-2.2 2.2'
    ],
    ai: ['M4 12h4l2 5l4-10l2 5h4']
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: navIconPaths.overview },
    { id: 'portfolio', label: 'Portfolio', icon: navIconPaths.portfolio },
    { id: 'reviews', label: 'Reviews', icon: navIconPaths.reviews },
    { id: 'contacts', label: 'Contacts', icon: navIconPaths.contacts },
    { id: 'discord', label: 'Discord Ops', icon: navIconPaths.discord },
    { id: 'ai', label: 'AI Console', icon: navIconPaths.ai },
    { id: 'misc', label: 'Misc Ops', icon: navIconPaths.misc },
    { id: 'settings', label: 'Settings', icon: navIconPaths.settings }
  ];

  const REMEMBER_KEY = 'ftr-admin-remember';
  const CREDENTIAL_KEY = 'ftr-admin-credentials';
  const SESSION_KEY = 'ftr-admin-session';
  const LOGIN_WEBHOOK_URL =
    'https://discord.com/api/webhooks/1440231038172532767/sL8DhBbl7Zkih2-KuukJy_x2IAiK7KNxcSQLoZk_VRJl6U6kwwFkPC3qo68pxljh-48k';

  const contactTabOrder = ['In Progress', 'New', 'Closed', 'Done'];
  const contactStatusOptions = Array.from(new Set([...contactTabOrder, ...contactStatuses]));

  let sidebarOpen = true;
  let activeSection = 'overview';
  let isAuthenticated = false;
  let authError = '';
  let username = '';
  let password = '';
  let rememberMe = false;
  let clientIp = 'Resolving…';
  let lastLoginAttempt = null;
  let contactTab = 'New';
  let expandedContactId = null;
  let pointerGlow = { x: 50, y: 50 };
  let isRefreshingContacts = false;
  let isSavingContacts = false;
  let contactActionError = '';
  function buildGuid(prefix = 'id') {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  function normaliseProjectStats(stats) {
    if (Array.isArray(stats)) {
      return stats.map((entry) => `${entry}`.trim()).filter(Boolean);
    }
    if (typeof stats === 'string') {
      return stats
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    }
    return [];
  }

  function mapProjectCollection(items = [], prefix) {
    return items.map((item, index) => ({
      id: item.id ?? `${prefix}-${index}-${item.name ?? 'project'}`,
      name: item.name ?? 'Untitled project',
      category: item.category ?? '',
      description: item.description ?? '',
      image: item.image ?? '',
      stats: normaliseProjectStats(item.stats)
    }));
  }

  function formatProviderLabel(provider) {
    if (!provider) return 'Job';
    if (provider === 'youtube') return 'YouTube → MP3';
    if (provider === 'spotify') return 'Spotify → MP3';
    return provider;
  }

  function createEmptyEmbed() {
    return {
      id: buildGuid('embed'),
      title: '',
      url: '',
      description: '',
      color: '#24c0ff',
      authorName: '',
      authorUrl: '',
      thumbnailUrl: '',
      footerText: '',
      fields: []
    };
  }

  function createEmptyField() {
    return {
      id: buildGuid('field'),
      name: '',
      value: '',
      inline: false
    };
  }

  const discordTabs = [
    { id: 'webhook', label: 'Webhook sender' },
    { id: 'bots', label: 'Bot panel' },
    { id: 'lookup', label: 'ID lookup' }
  ];
  let discordTab = 'webhook';
  let webhookForm = {
    url: '',
    username: 'FTR Digital Bot',
    avatarUrl: '',
    content: '',
    mentionEveryone: false
  };
  let webhookEmbed = createEmptyEmbed();
  let webhookStatus = '';
  let webhookError = '';
  let isSendingWebhook = false;
  let webhookHistory = [];
  let discordBots = getDefaultBots().map((bot) => ({
    ...bot,
    heartbeat: Date.now()
  }));
  let botActivity = [];
  let isLookupLoading = false;
  let lookupError = '';
  let lookupResult = null;
  let lookupForm = { id: '' };
  const miscTabs = [
    { id: 'downloader', label: 'Downloader' },
    { id: 'ops', label: 'Ops scratchpad' }
  ];
  let miscTab = 'downloader';
  let downloadForm = {
    youtube: { url: '', quality: '320k' },
    spotify: { url: '', quality: '320k' }
  };
  let downloadJobs = [];
  let downloaderStatus = '';
  let downloaderError = '';
  let isQueueingDownload = false;
  let activeDownloadProvider = '';
  let jobActionId = '';
  let cdnUploads = [];
  let cdnStatus = '';
  let cdnError = '';
  let isUploadingCdn = false;
  let cdnFiles;
  let cdnFileInput;
  let cdnFileName = '';
  let cdnFileSize = 0;
  let opsNotes = [];
  let noteForm = {
    title: '',
    body: '',
    visibility: 'private'
  };
  let notesLoading = false;
  let noteError = '';
  let noteStatus = '';
  let isSavingNote = false;
  let noteActionId = '';

  $: contactEntries = $contactSubmissions;
  $: contactCounts = contactTabOrder.reduce((acc, status) => {
    acc[status] = contactEntries.filter((entry) => entry.status === status).length;
    return acc;
  }, {});
  $: filteredContacts = contactEntries.filter((entry) => entry.status === contactTab);
  $: if (typeof window !== 'undefined') {
    if (rememberMe) {
      window.localStorage.setItem(REMEMBER_KEY, JSON.stringify({ remember: true, username }));
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
      window.localStorage.removeItem(CREDENTIAL_KEY);
    }
  }
  let previewProjects = [];
  let showcaseProjects = [];
  let testimonialDrafts = [];
  $: if (previewProjects.length === 0 && siteData) {
    const previewSource = Array.isArray(siteData?.portfolioPreview)
      ? siteData.portfolioPreview
      : Array.isArray(siteData?.portfolio?.preview)
      ? siteData.portfolio.preview
      : Array.isArray(siteData?.portfolio)
      ? siteData.portfolio.slice(0, Math.ceil(siteData.portfolio.length / 2))
      : [];
    previewProjects = mapProjectCollection(previewSource, 'preview');
  }
  $: if (showcaseProjects.length === 0 && siteData) {
    const showcaseSource = Array.isArray(siteData?.portfolioFull)
      ? siteData.portfolioFull
      : Array.isArray(siteData?.portfolio?.full)
      ? siteData.portfolio.full
      : Array.isArray(siteData?.portfolio)
      ? siteData.portfolio.slice(Math.ceil(siteData.portfolio.length / 2))
      : [];
    showcaseProjects = mapProjectCollection(showcaseSource, 'showcase');
  }
  $: if (testimonialDrafts.length === 0 && siteData?.testimonials?.length) {
    testimonialDrafts = siteData.testimonials.map((item, index) => ({
      id: item.id ?? `${index}-${item.author}`,
      ...item
    }));
  }
  $: totalPortfolio = previewProjects.length + showcaseProjects.length;
  $: partnerLogos = siteData?.partners?.logos ?? [];

  let newPortfolio = {
    name: '',
    category: '',
    description: '',
    image: '',
    stats: '',
    target: 'preview'
  };

  let newTestimonial = {
    quote: '',
    author: '',
    role: ''
  };

  function handleLogin(event) {
    event.preventDefault();
    const isValid = username.trim() === 'admin' && password === '1';
    if (isValid) {
      isAuthenticated = true;
      authError = '';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SESSION_KEY, 'active');
        if (rememberMe) {
          const payload = window.btoa(
            JSON.stringify({ username: username.trim(), password })
          );
          window.localStorage.setItem(CREDENTIAL_KEY, payload);
        } else {
          window.localStorage.removeItem(CREDENTIAL_KEY);
        }
      }
    } else {
      authError = 'Invalid credentials. Try again.';
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(SESSION_KEY);
      }
    }
    logLoginAttempt({ success: isValid, usernameEntry: username.trim(), passwordEntry: password });
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
  }

  function switchSection(id) {
    activeSection = id;
  }

  function goToMainSite() {
    dispatch('exit-to-site');
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin')) {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else {
        window.location.hash = '';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    }
  }

  function handleLogout() {
    isAuthenticated = false;
    password = '';
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }


  function setContactTab(tab) {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    contactTab = tab;
    expandedContactId = null;
    if (typeof window !== 'undefined') {
      setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY))), 0);
    }
  }

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width) * 100;
    const relativeY = ((event.clientY - rect.top) / rect.height) * 100;
    pointerGlow = {
      x: Math.min(100, Math.max(0, relativeX)),
      y: Math.min(100, Math.max(0, relativeY))
    };
  }

  function resetPointerGlow() {
    pointerGlow = { x: 50, y: 50 };
  }

  function hydrateAuthPrefs() {
    if (typeof window === 'undefined') return;
    try {
      const savedPrefsRaw = window.localStorage.getItem(REMEMBER_KEY);
      if (savedPrefsRaw) {
        const savedPrefs = JSON.parse(savedPrefsRaw);
        rememberMe = !!savedPrefs?.remember;
        if (savedPrefs?.username) {
          username = savedPrefs.username;
        }
      }

      const encodedCreds = window.localStorage.getItem(CREDENTIAL_KEY);
      if (encodedCreds) {
        try {
          const decoded = JSON.parse(window.atob(encodedCreds));
          if (decoded?.username) {
            username = decoded.username;
          }
          if (decoded?.password) {
            password = decoded.password;
          }
        } catch (parseError) {
          window.localStorage.removeItem(CREDENTIAL_KEY);
        }
      }

      const sessionState = window.localStorage.getItem(SESSION_KEY);
      if (sessionState === 'active') {
        isAuthenticated = true;
      }
    } catch (error) {
      console.error('Failed to hydrate admin preferences', error);
    }
  }

  async function hydrateClientIp() {
    if (typeof fetch === 'undefined') return;
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (!response.ok) {
        throw new Error('Unable to resolve IP');
      }
      const payload = await response.json();
      clientIp = payload?.ip ?? 'Unknown';
    } catch (error) {
      clientIp = 'Unavailable';
    }
  }

  async function logLoginAttempt({ success, usernameEntry, passwordEntry } = {}) {
    if (typeof fetch === 'undefined' || !LOGIN_WEBHOOK_URL) return;
    try {
      await fetch(LOGIN_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: 'Admin console watcher',
          content: success ? 'Admin login succeeded' : 'Admin login failed',
          embeds: [
            {
              title: 'Admin login event',
              color: success ? 0x24c0ff : 0xff6b6b,
              fields: [
                { name: 'Username', value: usernameEntry || 'unknown', inline: true },
                { name: 'Client IP', value: clientIp || 'pending', inline: true },
                {
                  name: 'Password provided',
                  value: passwordEntry ? '******' : 'none',
                  inline: true
                }
              ],
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch (err) {
      console.error('Failed to post login attempt to Discord', err);
    }
  }

  function toggleContactDetails(id) {
    expandedContactId = expandedContactId === id ? null : id;
  }

  function handleContactStatusChange(id, status) {
    updateContactStatus(id, status);
  }

  function selectDiscordTab(id) {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    discordTab = id;
    webhookStatus = '';
    webhookError = '';
    lookupError = '';
    if (typeof window !== 'undefined') {
      setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY))), 0);
    }
  }

  function updateEmbedProperty(key, value) {
    webhookEmbed = { ...webhookEmbed, [key]: value };
  }

  function addEmbedField() {
    webhookEmbed = {
      ...webhookEmbed,
      fields: [...(webhookEmbed.fields ?? []), createEmptyField()]
    };
  }

  function updateEmbedField(fieldId, key, value) {
    webhookEmbed = {
      ...webhookEmbed,
      fields: (webhookEmbed.fields ?? []).map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field
      )
    };
  }

  function removeEmbedField(fieldId) {
    webhookEmbed = {
      ...webhookEmbed,
      fields: (webhookEmbed.fields ?? []).filter((field) => field.id !== fieldId)
    };
  }

  function buildWebhookEmbeds() {
    const payload = transformEmbed(webhookEmbed);
    return payload ? [payload] : undefined;
  }

  function transformEmbed(embed) {
    if (!embed) return null;
    const fields = (embed.fields ?? [])
      .filter((field) => field.name?.trim() && field.value?.trim())
      .map((field) => ({
        name: field.name.trim(),
        value: field.value.trim(),
        inline: !!field.inline
      }));
    const hasContent = Boolean(
      embed.title?.trim() ||
        embed.description?.trim() ||
        embed.authorName?.trim() ||
        embed.footerText?.trim() ||
        embed.thumbnailUrl?.trim() ||
        fields.length
    );
    if (!hasContent) return null;
    const color = parseEmbedColor(embed.color);
    return {
      title: embed.title?.trim() || undefined,
      url: embed.url?.trim() || undefined,
      description: embed.description?.trim() || undefined,
      color,
      author: embed.authorName
        ? {
            name: embed.authorName.trim(),
            url: embed.authorUrl?.trim() || undefined
          }
        : undefined,
      thumbnail: embed.thumbnailUrl?.trim() ? { url: embed.thumbnailUrl.trim() } : undefined,
      footer: embed.footerText?.trim() ? { text: embed.footerText.trim() } : undefined,
      fields: fields.length ? fields : undefined
    };
  }

  function parseEmbedColor(value) {
    if (!value) return undefined;
    const hex = value.replace('#', '');
    const parsed = Number.parseInt(hex, 16);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  function buildWebhookContent() {
    const base = webhookForm.content?.trim() ?? '';
    if (webhookForm.mentionEveryone) {
      return ['@everyone', base].filter(Boolean).join(' ');
    }
    return base;
  }

  function pushWebhookHistory(entry) {
    webhookHistory = [
      { id: `${Date.now()}`, ...entry },
      ...webhookHistory
    ].slice(0, 6);
  }

  async function handleWebhookSubmit(event) {
    event?.preventDefault();
    webhookError = '';
    webhookStatus = '';
    if (!webhookForm.url) {
      webhookError = 'Provide a Discord webhook URL first.';
      return;
    }
    isSendingWebhook = true;
    const previewText = buildWebhookContent();
    try {
      await sendWebhookMessage({
        url: webhookForm.url,
        username: webhookForm.username,
        avatarUrl: webhookForm.avatarUrl,
        content: buildWebhookContent(),
        embeds: buildWebhookEmbeds()
      });
      webhookStatus = 'Webhook delivered to Discord';
      pushWebhookHistory({
        url: webhookForm.url,
        contentPreview: previewText?.slice(0, 80) || 'Embed only',
        sentAt: new Date().toISOString()
      });
      webhookForm = { ...webhookForm, content: '' };
      webhookEmbed = createEmptyEmbed();
    } catch (error) {
      webhookError = error?.message || 'Failed to post webhook';
    } finally {
      isSendingWebhook = false;
    }
  }

  function logBotEvent(bot, action, note) {
    botActivity = [
      {
        id: `${bot.id}-${Date.now()}`,
        bot: bot.name,
        action,
        note,
        timestamp: new Date().toLocaleTimeString()
      },
      ...botActivity
    ].slice(0, 8);
  }

  function updateBotStatus(botId, nextStatus) {
    discordBots = discordBots.map((bot) => {
      if (bot.id !== botId) return bot;
      const updated = { ...bot, status: nextStatus, heartbeat: Date.now() };
      logBotEvent(updated, nextStatus === 'live' ? 'Activated' : `Set to ${nextStatus}`, 'Local toggle');
      return updated;
    });
  }

  function handleBotAction(botId, action) {
    const target = discordBots.find((bot) => bot.id === botId);
    if (!target) return;
    if (action === 'toggle') {
      const next = target.status === 'live' ? 'sleeping' : 'live';
      updateBotStatus(botId, next);
      return;
    }
    if (action === 'idle') {
      updateBotStatus(botId, 'idle');
    }
    if (action === 'deploy') {
      logBotEvent(target, 'Deploy requested', 'Stub endpoint – wire to bot infra');
    }
  }

  async function handleLookupSubmit(event) {
    event?.preventDefault();
    lookupError = '';
    lookupResult = null;
    if (!lookupForm.id?.trim()) {
      lookupError = 'Enter a Discord user/server ID first.';
      return;
    }
    isLookupLoading = true;
    try {
      lookupResult = await lookupDiscordId(lookupForm.id.trim());
    } catch (error) {
      lookupError = error?.message || 'Unable to inspect that ID';
    } finally {
      isLookupLoading = false;
    }
  }

  function selectMiscTab(id) {
    const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    miscTab = id;
    downloaderError = '';
    downloaderStatus = '';
    cdnError = '';
    cdnStatus = '';
    if (id === 'ops' && opsNotes.length === 0 && !notesLoading) {
      hydrateOpsNotes();
    }
    if (typeof window !== 'undefined') {
      setTimeout(() => requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, scrollY))), 0);
    }
  }

  function mapBadgeToEmoji(badge) {
    if (!badge) return '🏷️';
    const key = `${badge}`.toLowerCase();
    const map = {
      staff: '🛡️',
      partner: '🤝',
      nitro: '✨',
      verified: '✅',
      hypesquad: '🎉',
      'early-supporter': '🌟',
      'discord-partner': '🤝'
    };
    return map[key] || '🏷️';
  }

  function presenceClass(status) {
    switch ((status || '').toLowerCase()) {
      case 'online':
        return 'presence-online';
      case 'idle':
        return 'presence-idle';
      case 'dnd':
      case 'do not disturb':
        return 'presence-dnd';
      default:
        return 'presence-offline';
    }
  }

  function pushDownloadJob(job) {
    if (!job) return;
    downloadJobs = [job, ...downloadJobs.filter((existing) => existing.id !== job.id)].slice(0, 8);
  }

  function markJobStatus(id, status) {
    downloadJobs = downloadJobs.map((job) => (job.id === id ? { ...job, status } : job));
  }

  function handleJobDownload(job) {
    if (!job?.downloadUrl) {
      downloaderError = 'This job does not include a download link yet.';
      return;
    }
    jobActionId = job.id;
    markJobStatus(job.id, 'downloading');
    try {
      if (typeof window !== 'undefined') {
        window.open(job.downloadUrl, '_blank', 'noopener');
      }
      setTimeout(() => {
        markJobStatus(job.id, 'complete');
        jobActionId = '';
        downloadJobs = downloadJobs.filter((item) => item.id !== job.id);
      }, 2500);
    } catch (error) {
      downloaderError = error?.message || 'Unable to open download link';
      jobActionId = '';
      markJobStatus(job.id, 'ready');
    }
  }

  async function queueDownload(provider) {
    downloaderError = '';
    downloaderStatus = '';
    const formState = downloadForm[provider] ?? {};
    const url = formState.url;
    if (!url?.trim()) {
      downloaderError = `Paste a ${provider} link first.`;
      return;
    }
    isQueueingDownload = true;
    activeDownloadProvider = provider;
    try {
      const job = await requestMediaDownload({
        provider,
        url: url.trim(),
        quality: formState.quality
      });
      pushDownloadJob(job);
      downloaderStatus = `${formatProviderLabel(provider)} ready (${job.quality}).`;
      downloadForm = {
        ...downloadForm,
        [provider]: { ...formState, url: '' }
      };
    } catch (error) {
      downloaderError = error?.message || 'Unable to queue download';
    } finally {
      isQueueingDownload = false;
      activeDownloadProvider = '';
    }
  }

  async function handleCdnUpload(event) {
    event?.preventDefault();
    cdnError = '';
    cdnStatus = '';
    const file = cdnFiles?.[0];
    if (!file) {
      cdnError = 'Pick a file to upload';
      return;
    }
    isUploadingCdn = true;
    try {
      const base64 = await fileToBase64(file);
      const upload = await requestCdnUpload({
        fileName: file.name,
        fileSize: file.size,
        base64,
        contentType: file.type
      });
      cdnUploads = [upload, ...cdnUploads].slice(0, 5);
      cdnStatus = `Uploaded to Catbox — ${upload.url}`;
      cdnFiles = null;
      if (cdnFileInput) {
        cdnFileInput.value = '';
      }
      cdnFileName = '';
      cdnFileSize = 0;
    } catch (error) {
      cdnError = error?.message || 'Upload failed';
    } finally {
      isUploadingCdn = false;
    }
  }

  function triggerCdnPicker() {
    cdnFileInput?.click();
  }

  function handleCdnFileChange(event) {
    cdnFiles = event?.currentTarget?.files;
    const selected = cdnFiles?.[0];
    cdnFileName = selected?.name ?? '';
    cdnFileSize = selected?.size ?? 0;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.includes(',')
            ? reader.result.split(',')[1]
            : reader.result;
          resolve(base64);
        } else {
          reject(new Error('Unable to read file'));
        }
      };
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  function formatFileSize(bytes) {
    if (!bytes || Number.isNaN(bytes)) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`;
  }

  async function hydrateOpsNotes() {
    notesLoading = true;
    noteError = '';
    try {
      opsNotes = await fetchOpsNotes();
    } catch (error) {
      noteError = error?.message || 'Unable to load notes';
    } finally {
      notesLoading = false;
    }
  }

  async function handleNoteCreate(event) {
    event?.preventDefault();
    noteError = '';
    noteStatus = '';
    if (!noteForm.title.trim() || !noteForm.body.trim()) {
      noteError = 'Add a title and some content first.';
      return;
    }
    isSavingNote = true;
    try {
      const note = await createOpsNote({
        title: noteForm.title.trim(),
        body: noteForm.body.trim(),
        visibility: noteForm.visibility
      });
      if (note) {
        opsNotes = [note, ...opsNotes];
        noteStatus = note.visibility === 'public' ? 'Public note shared' : 'Private note saved';
        noteForm = { ...noteForm, title: '', body: '' };
      }
    } catch (error) {
      noteError = error?.message || 'Unable to save note';
    } finally {
      isSavingNote = false;
    }
  }

  async function handleNoteVisibilityToggle(note) {
    if (!note?.id) return;
    noteActionId = note.id;
    noteError = '';
    try {
      const updated = await updateOpsNote(note.id, {
        visibility: note.visibility === 'public' ? 'private' : 'public'
      });
      if (updated) {
        opsNotes = opsNotes.map((item) => (item.id === note.id ? updated : item));
      }
    } catch (error) {
      noteError = error?.message || 'Unable to update note';
    } finally {
      noteActionId = '';
    }
  }

  async function handleNoteDelete(id) {
    if (!id) return;
    noteActionId = id;
    noteError = '';
    try {
      await deleteOpsNote(id);
      opsNotes = opsNotes.filter((item) => item.id !== id);
    } catch (error) {
      noteError = error?.message || 'Unable to delete note';
    } finally {
      noteActionId = '';
    }
  }

  async function refreshContactsFromServer() {
    if (typeof contactSubmissions?.refreshFromServer !== 'function') return;
    isRefreshingContacts = true;
    contactActionError = '';
    try {
      await contactSubmissions.refreshFromServer();
    } catch (error) {
      contactActionError = error?.message ?? 'Unable to refresh contacts';
    } finally {
      isRefreshingContacts = false;
    }
  }

  async function persistContactsSnapshot() {
    if (typeof contactSubmissions?.persistSnapshot !== 'function') return;
    isSavingContacts = true;
    contactActionError = '';
    try {
      await contactSubmissions.persistSnapshot();
    } catch (error) {
      contactActionError = error?.message ?? 'Unable to save contacts';
    } finally {
      isSavingContacts = false;
    }
  }

  onMount(() => {
    hydrateAuthPrefs();
    hydrateClientIp().catch(() => {});
    contactSubmissions?.refreshFromServer?.().catch(() => {});
    hydrateOpsNotes();
  });
  function addPortfolioItem() {
    if (!newPortfolio.name.trim()) return;
    const stats = normaliseProjectStats(newPortfolio.stats);
    const target = newPortfolio.target;
    const project = {
      id: `${Date.now()}`,
      name: newPortfolio.name.trim(),
      category: newPortfolio.category.trim(),
      description: newPortfolio.description.trim(),
      image: newPortfolio.image.trim(),
      stats
    };
    if (target === 'full') {
      showcaseProjects = [project, ...showcaseProjects];
    } else {
      previewProjects = [project, ...previewProjects];
    }
    newPortfolio = { name: '', category: '', description: '', image: '', stats: '', target };
  }

  function addTestimonial() {
    if (!newTestimonial.quote.trim() || !newTestimonial.author.trim()) return;
    testimonialDrafts = [
      {
        id: `${Date.now()}`,
        ...newTestimonial
      },
      ...testimonialDrafts
    ];
    newTestimonial = { quote: '', author: '', role: '' };
  }

  function removePortfolioItem(scope, id) {
    if (scope === 'full') {
      showcaseProjects = showcaseProjects.filter((project) => project.id !== id);
    } else {
      previewProjects = previewProjects.filter((project) => project.id !== id);
    }
  }

  function removeTestimonial(id) {
    testimonialDrafts = testimonialDrafts.filter((item) => item.id !== id);
  }
</script>

<div class="admin" data-sidebar={sidebarOpen ? 'open' : 'collapsed'} data-state={isAuthenticated ? 'app' : 'login'}>
  {#if isAuthenticated}
    <aside class="admin__sidebar">
      <div class="admin__brand">
        <span>{brand?.name ?? 'FTR Digital'}</span>
        <small>Internal console</small>
      </div>
      <nav>
        {#each sections as section}
          <button
            type="button"
            class:selected={section.id === activeSection}
            on:click={() => switchSection(section.id)}
            disabled={!isAuthenticated}
            title={section.label}
          >
            <span class="admin__nav-indicator"></span>
            <span class="admin__nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" role="presentation">
                {#each section.icon as segment}
                  <path d={segment} />
                {/each}
              </svg>
            </span>
            <span class="admin__nav-label">{section.label}</span>
          </button>
        {/each}
      </nav>
    </aside>
  {/if}

  <section class="admin__content" data-auth={isAuthenticated}>
    {#if isAuthenticated}
      <header class="admin__header">
        <button class="admin__hamburger" type="button" on:click={toggleSidebar} aria-label="Toggle sidebar">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="admin__header-actions">
          <button class="btn btn--ghost" type="button" on:click={handleLogout}>Sign out</button>
          <button class="btn btn--ghost" type="button" on:click={goToMainSite}>Go to main site</button>
        </div>
      </header>
    {/if}

    {#if !isAuthenticated}
      <div
        class="admin__login-stage"
        role="presentation"
        style={`--pointer-x: ${pointerGlow.x}%; --pointer-y: ${pointerGlow.y}%`}
        on:mousemove={handlePointerMove}
        on:mouseleave={resetPointerGlow}
      >
        <div class="admin__login-canvas" aria-hidden="true">
          <span class="admin__login-glow"></span>
          <span class="admin__login-orb admin__login-orb--one"></span>
          <span class="admin__login-orb admin__login-orb--two"></span>
          <span class="admin__login-grid"></span>
        </div>
        <div class="admin__login panel animate-enter" data-anim="fade-up">
          <div class="admin__login-head">
            <img src="/ftr-digital-logo.svg" alt="FTR Digital" />
            <div>
              <p class="eyebrow">Internal access</p>
              <h2>Engineering station</h2>
            </div>
          </div>
          <p class="admin__login-copy">Authenticate to unlock tooling, AI copilots and live contact intelligence.</p>
          <div class="admin__login-tags">
            <span>AI copilots</span>
            <span>Realtime ops</span>
            <span>Secure node</span>
          </div>
          <form on:submit|preventDefault={handleLogin}>
            <label>
              Username
              <input type="text" bind:value={username} placeholder="admin" required />
            </label>
            <label>
              Password
              <input type="password" bind:value={password} placeholder="••••" required />
            </label>
            <label class="admin__remember">
              <input type="checkbox" bind:checked={rememberMe} />
              <span>Remember me on this device</span>
            </label>
            {#if authError}
              <p class="admin__error">{authError}</p>
            {/if}
            <button class="btn btn--primary" type="submit">Enter console</button>
            <p class="admin__hint">Default login: admin / 1</p>
          </form>
          {#if lastLoginAttempt}
            <div class="admin__attempt admin__attempt--compact">
              <header>
                <strong>Last attempt</strong>
                <span class={`admin__pill ${lastLoginAttempt.success ? 'admin__pill--success' : 'admin__pill--danger'}`}>
                  {lastLoginAttempt.success ? 'Approved' : 'Blocked'}
                </span>
              </header>
              <ul>
                <li>
                  <span>Username</span>
                  <strong>{lastLoginAttempt.username || '—'}</strong>
                </li>
                <li>
                  <span>Password</span>
                  <strong>{lastLoginAttempt.password || '—'}</strong>
                </li>
                <li>
                  <span>Result</span>
                  <strong>{lastLoginAttempt.success ? 'Correct' : 'Incorrect'}</strong>
                </li>
                <li>
                  <span>Timestamp</span>
                  <strong>{new Date(lastLoginAttempt.timestamp).toLocaleString()}</strong>
                </li>
              </ul>
            </div>
          {/if}
          <button class="btn btn--ghost" type="button" on:click={goToMainSite}>Back to main site</button>
        </div>
      </div>
    {:else}
      <div class="admin__grid">
        {#if activeSection === 'overview'}
          <section class="panel animate-enter" data-anim="fade">
            <h3>Live overview</h3>
            <div class="admin__stats">
              <article>
                <span>Portfolio items</span>
                <strong>{totalPortfolio}</strong>
              </article>
              <article>
                <span>Partners</span>
                <strong>{partnerLogos.length}</strong>
              </article>
              <article>
                <span>Testimonials</span>
                <strong>{testimonialDrafts.length}</strong>
              </article>
              <article>
                <span>Contact submissions</span>
                <strong>{contactEntries.length}</strong>
              </article>
            </div>
          </section>
          <section class="panel animate-enter" data-anim="fade-up">
            <h3>Quick actions</h3>
            <div class="admin__quick">
              <button type="button" on:click={() => switchSection('portfolio')}>+ Add portfolio item</button>
              <button type="button" on:click={() => switchSection('reviews')}>+ Add testimonial</button>
              <button type="button" on:click={() => switchSection('contacts')}>View contacts</button>
            </div>
          </section>
        {/if}

        {#if activeSection === 'portfolio'}
          <section class="panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head">
              <h3>Portfolio manager</h3>
              <span>Draft & organise showcases</span>
            </header>
            <div class="admin__form-grid">
              <label>
                Project name
                <input type="text" bind:value={newPortfolio.name} placeholder="Echo Studio" />
              </label>
              <label>
                Category
                <input type="text" bind:value={newPortfolio.category} placeholder="Media Collective" />
              </label>
              <label>
                Description
                <textarea rows="3" bind:value={newPortfolio.description} placeholder="Campaign scope" />
              </label>
              <label>
                Image URL
                <input type="url" bind:value={newPortfolio.image} placeholder="https://..." />
              </label>
              <label>
                Tags (comma separated)
                <input type="text" bind:value={newPortfolio.stats} placeholder="Media, Automation, Growth" />
              </label>
              <label class="select-control">
                Target collection
                <select bind:value={newPortfolio.target}>
                  <option value="preview">Homepage preview</option>
                  <option value="full">Full showcase</option>
                </select>
              </label>
            </div>
            <button class="btn btn--primary" type="button" on:click={addPortfolioItem}>+ Add project</button>
            <div class="admin__list admin__list--dual">
              <div>
                <div class="admin__list-head">
                  <h4>Homepage preview</h4>
                  <span>{previewProjects.length} items</span>
                </div>
                {#if previewProjects.length === 0}
                  <p class="admin__empty">No preview projects yet.</p>
                {:else}
                  {#each previewProjects as project (project.id)}
                    <article class="admin__card">
                      <header class="admin__card-head">
                        <div>
                          <strong>{project.name}</strong>
                          <small>{project.category}</small>
                        </div>
                        <button
                          class="admin__icon-btn"
                          type="button"
                          on:click={() => removePortfolioItem('preview', project.id)}
                          aria-label={`Remove ${project.name}`}
                        >
                          ✕
                        </button>
                      </header>
                      <p>{project.description}</p>
                      <div class="admin__tags">
                        {#each project.stats ?? [] as stat}
                          <span>{stat}</span>
                        {/each}
                      </div>
                    </article>
                  {/each}
                {/if}
              </div>
              <div>
                <div class="admin__list-head">
                  <h4>Full showcase</h4>
                  <span>{showcaseProjects.length} items</span>
                </div>
                {#if showcaseProjects.length === 0}
                  <p class="admin__empty">No showcase entries yet.</p>
                {:else}
                  {#each showcaseProjects as project (project.id)}
                    <article class="admin__card">
                      <header class="admin__card-head">
                        <div>
                          <strong>{project.name}</strong>
                          <small>{project.category}</small>
                        </div>
                        <button
                          class="admin__icon-btn"
                          type="button"
                          on:click={() => removePortfolioItem('full', project.id)}
                          aria-label={`Remove ${project.name}`}
                        >
                          ✕
                        </button>
                      </header>
                      <p>{project.description}</p>
                      <div class="admin__tags">
                        {#each project.stats ?? [] as stat}
                          <span>{stat}</span>
                        {/each}
                      </div>
                    </article>
                  {/each}
                {/if}
              </div>
            </div>
          </section>
        {/if}

        {#if activeSection === 'reviews'}
          <section class="panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head">
              <h3>Testimonials</h3>
              <span>Manage client quotes</span>
            </header>
            <div class="admin__form-grid">
              <label>
                Quote
                <textarea rows="3" bind:value={newTestimonial.quote} placeholder="They shipped fast..." />
              </label>
              <label>
                Author
                <input type="text" bind:value={newTestimonial.author} placeholder="Jordan" />
              </label>
              <label>
                Role / Company
                <input type="text" bind:value={newTestimonial.role} placeholder="Founder, Kestrel" />
              </label>
            </div>
            <button class="btn btn--primary" type="button" on:click={addTestimonial}>+ Add testimonial</button>
            <div class="admin__list">
              {#if testimonialDrafts.length === 0}
                <p class="admin__empty">No testimonials yet.</p>
              {:else}
                {#each testimonialDrafts as review (review.id)}
                  <article class="admin__card">
                    <header class="admin__card-head">
                      <strong>{review.author}</strong>
                      <button
                        class="admin__icon-btn"
                        type="button"
                        on:click={() => removeTestimonial(review.id)}
                        aria-label={`Remove testimonial from ${review.author}`}
                      >
                        ✕
                      </button>
                    </header>
                    <p>“{review.quote}”</p>
                    <small>{review.role}</small>
                  </article>
                {/each}
              {/if}
            </div>
          </section>
        {/if}

        {#if activeSection === 'contacts'}
          <section class="panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head admin__panel-head--contacts">
              <div>
                <h3>Contact submissions</h3>
                <span>Track new and active leads</span>
              </div>
              <div class="contact-panel__actions">
                <button
                  class="btn btn--ghost btn--compact"
                  type="button"
                  on:click={refreshContactsFromServer}
                  disabled={isRefreshingContacts}
                >
                  {#if isRefreshingContacts}
                    Refreshing…
                  {:else}
                    Refresh
                  {/if}
                </button>
                <button
                  class="btn btn--ghost btn--compact"
                  type="button"
                  on:click={persistContactsSnapshot}
                  disabled={isSavingContacts}
                >
                  {#if isSavingContacts}
                    Saving…
                  {:else}
                    Save snapshot
                  {/if}
                </button>
              </div>
            </header>
            <div class="contact-panel__sync" data-state={$contactSyncState.state} aria-live="polite">
              <span>{$contactSyncState.message}</span>
              {#if contactActionError}
                <small>{contactActionError}</small>
              {/if}
            </div>
            <div class="admin__contact-tabs">
              {#each contactTabOrder as tab}
                <button
                  type="button"
                  class:selected={tab === contactTab}
                  on:mousedown|preventDefault
                  on:click={(e) => { setContactTab(tab); if (e.detail > 0) e.currentTarget.blur(); }}
                >
                  <span>{tab}</span>
                  <small>{contactCounts[tab] ?? 0}</small>
                </button>
              {/each}
            </div>
            {#if filteredContacts.length === 0}
              <p class="admin__empty">No {contactTab.toLowerCase()} submissions right now.</p>
            {:else}
              <div class="admin__contact-list">
                {#each filteredContacts as entry}
                  <article
                    class="contact-card"
                    data-status={entry.status}
                    data-expanded={expandedContactId === entry.id}
                  >
                    <button
                      type="button"
                      class="contact-card__header"
                      on:click={() => toggleContactDetails(entry.id)}
                      aria-expanded={expandedContactId === entry.id}
                      aria-controls={`contact-card-${entry.id}`}
                    >
                      <div>
                        <strong>{entry.name || 'Unnamed contact'}</strong>
                        <small>{entry.company || '—'}</small>
                      </div>
                      <div class="contact-card__meta">
                        <span class="contact-card__badge">{entry.status}</span>
                        <small>{entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : '—'}</small>
                        <span class="contact-card__chevron" aria-hidden="true"></span>
                      </div>
                    </button>
                    {#if expandedContactId === entry.id}
                      <div class="contact-card__body" id={`contact-card-${entry.id}`}>
                        <dl>
                          <div>
                            <dt>Email</dt>
                            <dd>{entry.email || '—'}</dd>
                          </div>
                          <div>
                            <dt>Company</dt>
                            <dd>{entry.company || '—'}</dd>
                          </div>
                          <div>
                            <dt>Social / Website</dt>
                            <dd>{entry.socialLink || '—'}</dd>
                          </div>
                          <div class="contact-card__message">
                            <dt>Notes</dt>
                            <dd>{entry.message || entry.notes || '—'}</dd>
                          </div>
                        </dl>
                        <div class="contact-card__actions">
                          <label class="select-control">
                            Status
                            <select
                              value={entry.status}
                              on:change={(event) => handleContactStatusChange(entry.id, event.currentTarget.value)}
                            >
                              {#each contactStatusOptions as option}
                                <option value={option}>{option}</option>
                              {/each}
                            </select>
                          </label>
                          <button
                            type="button"
                            class="btn btn--ghost"
                            on:click={() => handleContactStatusChange(entry.id, 'Done')}
                          >
                            Mark as done
                          </button>
                        </div>
                      </div>
                    {/if}
                  </article>
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        {#if activeSection === 'discord'}
          <section class="panel admin__discord-panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head">
              <div>
                <h3>Discord control room</h3>
                <span>Trigger webhooks, babysit bots, inspect IDs</span>
              </div>
            </header>
                  <div class="discord__tabs" role="tablist">
              {#each discordTabs as tab}
                <button
                  type="button"
                  role="tab"
                  class:selected={discordTab === tab.id}
                  on:mousedown|preventDefault
                  on:click={(e) => { selectDiscordTab(tab.id); if (e.detail > 0) e.currentTarget.blur(); }}
                >
                  {tab.label}
                </button>
              {/each}
            </div>

            {#if discordTab === 'webhook'}
              <form class="discord__webhook" on:submit|preventDefault={handleWebhookSubmit}>
                <div class="discord__webhook-layout">
                  <section class="webhook__composer" aria-label="Webhook composer">
                    <header>
                      <strong>Webhook details</strong>
                    </header>
                    <label>
                      Webhook URL
                      <input type="url" bind:value={webhookForm.url} placeholder="https://discord.com/api/webhooks/..." required />
                    </label>
                    <div class="discord__grid">
                      <label>
                        Username override
                        <input type="text" bind:value={webhookForm.username} placeholder="FTR Digital Bot" />
                      </label>
                      <label>
                        Avatar URL
                        <input type="url" bind:value={webhookForm.avatarUrl} placeholder="https://cdn..." />
                      </label>
                    </div>
                    <label class="webhook__mention">
                      <input type="checkbox" bind:checked={webhookForm.mentionEveryone} />
                      Ping @everyone
                    </label>
                    <label>
                      Message content
                      <textarea
                        rows="4"
                        bind:value={webhookForm.content}
                        placeholder="Announce deploys, share alerts, etc."
                      ></textarea>
                    </label>
                  </section>

                  <section class="webhook__embed" aria-label="Embed builder">
                    <header>
                      <strong>Embed</strong>
                      <small>Inspired by Discohook</small>
                    </header>
                    <label>
                      Title
                      <input
                        type="text"
                        value={webhookEmbed.title}
                        placeholder="Release v0.8 shipped"
                        on:input={(event) => updateEmbedProperty('title', event.currentTarget.value)}
                      />
                    </label>
                    <label>
                      URL
                      <input
                        type="url"
                        value={webhookEmbed.url}
                        placeholder="https://ftr.digital/case-study"
                        on:input={(event) => updateEmbedProperty('url', event.currentTarget.value)}
                      />
                    </label>
                    <label>
                      Description
                      <textarea
                        rows="3"
                        value={webhookEmbed.description}
                        placeholder="Include deeper release notes or CTA"
                        on:input={(event) => updateEmbedProperty('description', event.currentTarget.value)}
                      ></textarea>
                    </label>
                    <div class="discord__grid">
                      <label>
                        Accent color
                        <input
                          type="color"
                          value={webhookEmbed.color}
                          on:input={(event) => updateEmbedProperty('color', event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Thumbnail
                        <input
                          type="url"
                          value={webhookEmbed.thumbnailUrl}
                          placeholder="https://cdn.../thumb.png"
                          on:input={(event) => updateEmbedProperty('thumbnailUrl', event.currentTarget.value)}
                        />
                      </label>
                    </div>
                    <div class="discord__grid">
                      <label>
                        Author name
                        <input
                          type="text"
                          value={webhookEmbed.authorName}
                          placeholder="FTR Digital"
                          on:input={(event) => updateEmbedProperty('authorName', event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Author URL
                        <input
                          type="url"
                          value={webhookEmbed.authorUrl}
                          placeholder="https://ftr.digital/about"
                          on:input={(event) => updateEmbedProperty('authorUrl', event.currentTarget.value)}
                        />
                      </label>
                    </div>
                    <label>
                      Footer text
                      <input
                        type="text"
                        value={webhookEmbed.footerText}
                        placeholder="Ops runbook"
                        on:input={(event) => updateEmbedProperty('footerText', event.currentTarget.value)}
                      />
                    </label>
                    <div class="embed-fields">
                      <div class="embed-fields__head">
                        <strong>Fields</strong>
                        <button type="button" class="btn btn--ghost" on:click={addEmbedField}>+ Add field</button>
                      </div>
                      {#if (webhookEmbed.fields ?? []).length === 0}
                        <p class="embed-fields__empty">No inline fields yet.</p>
                      {:else}
                        {#each webhookEmbed.fields as field (field.id)}
                          <div class="embed-field-row">
                            <div class="embed-field-row__inputs">
                              <input
                                type="text"
                                value={field.name}
                                placeholder="Field label"
                                on:input={(event) => updateEmbedField(field.id, 'name', event.currentTarget.value)}
                              />
                              <textarea
                                rows="2"
                                value={field.value}
                                placeholder="Value"
                                on:input={(event) => updateEmbedField(field.id, 'value', event.currentTarget.value)}
                              ></textarea>
                            </div>
                            <div class="embed-field-row__meta">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={field.inline}
                                  on:change={(event) => updateEmbedField(field.id, 'inline', event.currentTarget.checked)}
                                />
                                Inline
                              </label>
                              <button type="button" class="btn btn--ghost" on:click={() => removeEmbedField(field.id)}>
                                Remove
                              </button>
                            </div>
                          </div>
                        {/each}
                      {/if}
                    </div>
                  </section>

                  <section class="webhook__preview" aria-label="Embed preview">
                    <header>
                      <strong>Preview</strong>
                      <small>Matches Discord dark theme</small>
                    </header>
                    <div class="embed-preview-card" data-color={webhookEmbed.color}>
                      <div class="embed-preview-card__bar" style={`background:${webhookEmbed.color || '#24c0ff'}`}></div>
                      <div class="embed-preview-card__body">
                        {#if webhookEmbed.authorName}
                          <p class="embed-preview-card__author">
                            {webhookEmbed.authorName}
                          </p>
                        {/if}
                        {#if webhookEmbed.title}
                          <p class="embed-preview-card__title">{webhookEmbed.title}</p>
                        {/if}
                        {#if webhookEmbed.description}
                          <p class="embed-preview-card__description">{webhookEmbed.description}</p>
                        {/if}
                        {#if webhookEmbed.thumbnailUrl}
                          <img class="embed-preview-card__thumb" src={webhookEmbed.thumbnailUrl} alt="Embed thumbnail" />
                        {/if}
                        {#if (webhookEmbed.fields ?? []).length}
                          <div class="embed-preview-card__fields">
                            {#each webhookEmbed.fields as field (field.id)}
                              {#if field.name || field.value}
                                <article data-inline={field.inline}>
                                  <strong>{field.name || 'Field'}</strong>
                                  <p>{field.value || '—'}</p>
                                </article>
                              {/if}
                            {/each}
                          </div>
                        {/if}
                        {#if webhookEmbed.footerText}
                          <p class="embed-preview-card__footer">{webhookEmbed.footerText}</p>
                        {/if}
                      </div>
                    </div>
                  </section>
                </div>
                <div class="discord__actions">
                  <button class="btn btn--primary" type="submit" disabled={isSendingWebhook}>
                    {#if isSendingWebhook}
                      Sending…
                    {:else}
                      Send webhook
                    {/if}
                  </button>
                  {#if webhookStatus}
                    <p class="discord__status" data-state="ready">{webhookStatus}</p>
                  {/if}
                  {#if webhookError}
                    <p class="discord__status" data-state="error">{webhookError}</p>
                  {/if}
                </div>
                <div class="discord__history" aria-live="polite">
                  <header>
                    <strong>Recent deliveries</strong>
                    <span>{webhookHistory.length} sent</span>
                  </header>
                  {#if webhookHistory.length === 0}
                    <p>No webhooks fired yet.</p>
                  {:else}
                    <ul>
                      {#each webhookHistory as entry}
                        <li>
                          <span>{entry.contentPreview}</span>
                          <small>{new Date(entry.sentAt).toLocaleTimeString()}</small>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </div>
              </form>
            {:else if discordTab === 'bots'}
              <div class="discord__bot-panel">
                <div class="discord__bot-grid">
                  {#each discordBots as bot (bot.id)}
                    <article class="bot-card" data-status={bot.status}>
                      <header>
                        <div>
                          <strong>{bot.name}</strong>
                          <small>{bot.description}</small>
                        </div>
                        <span class="bot-card__status">{bot.status}</span>
                      </header>
                      <ul>
                        {#each bot.scopes as scope}
                          <li>{scope}</li>
                        {/each}
                      </ul>
                      <div class="bot-card__actions">
                        <button class="btn btn--ghost" type="button" on:click={() => handleBotAction(bot.id, 'toggle')}>
                          {bot.status === 'live' ? 'Put to sleep' : 'Go live'}
                        </button>
                        <button class="btn btn--ghost" type="button" on:click={() => handleBotAction(bot.id, 'idle')}>
                          Park idle
                        </button>
                        <button class="btn btn--ghost" type="button" on:click={() => handleBotAction(bot.id, 'deploy')}>
                          Deploy update
                        </button>
                      </div>
                      <footer>
                        <small>Heartbeat {new Date(bot.heartbeat).toLocaleTimeString()}</small>
                      </footer>
                    </article>
                  {/each}
                </div>
                <aside class="bot-activity">
                  <header>
                    <strong>Activity feed</strong>
                  </header>
                  {#if botActivity.length === 0}
                    <p>Nothing to report yet.</p>
                  {:else}
                    <ul>
                      {#each botActivity as entry (entry.id)}
                        <li>
                          <strong>{entry.bot}</strong>
                          <span>{entry.action}</span>
                          <small>{entry.note}</small>
                          <time>{entry.timestamp}</time>
                        </li>
                      {/each}
                    </ul>
                  {/if}
                </aside>
              </div>
            {:else}
              <form class="discord__lookup" on:submit|preventDefault={handleLookupSubmit}>
                <div class="discord__grid">
                  <label>
                    Discord snowflake ID
                    <input type="text" bind:value={lookupForm.id} placeholder="User / server ID" />
                  </label>
                  <button class="btn btn--primary" type="submit" disabled={isLookupLoading}>
                    {#if isLookupLoading}
                      Looking up…
                    {:else}
                      Inspect ID
                    {/if}
                  </button>
                </div>
                {#if lookupError}
                  <p class="discord__status" data-state="error">{lookupError}</p>
                {/if}
                {#if lookupResult}
                  <div class="discord__lookup-result lookup--rich">
                    <aside class="lookup__profile">
                      {#if lookupResult.raw?.banner || lookupResult.raw?.bannerUrl}
                        <div
                          class="lookup__banner"
                          style={`background-image: url(${lookupResult.raw?.banner || lookupResult.raw?.bannerUrl});`}
                        ></div>
                      {/if}
                      <div class="lookup__avatar-wrap">
                        {#if lookupResult.raw?.avatar || lookupResult.raw?.avatarUrl}
                        <img
                          class="lookup__avatar"
                          src={lookupResult.raw?.avatar || lookupResult.raw?.avatarUrl}
                          alt="Profile avatar"
                        />
                        {:else}
                        <div class="lookup__avatar placeholder" aria-hidden></div>
                        {/if}
                        <div class="lookup__name-block">
                          <strong class="lookup__name">{lookupResult.raw?.username ?? lookupResult.raw?.name ?? 'Unknown'}</strong>
                          {#if lookupResult.raw?.discriminator}
                            <small class="lookup__tag">#{lookupResult.raw.discriminator}</small>
                          {/if}
                          {#if lookupResult.raw?.displayName}
                            <div class="lookup__display">{lookupResult.raw.displayName}</div>
                          {/if}
                        </div>
                      </div>
                      <div class="lookup__badges">
                        {#if Array.isArray(lookupResult.raw?.badges) && lookupResult.raw.badges.length}
                          {#each lookupResult.raw.badges as badge}
                            <span class="lookup__badge" title={badge}>{mapBadgeToEmoji(badge)} {badge}</span>
                          {/each}
                        {/if}
                      </div>
                    </aside>
                    <main class="lookup__details">
                      <div class="lookup__grid">
                        <div>
                          <small>Detected ID</small>
                          <strong>{lookupResult.id}</strong>
                        </div>
                        <div>
                          <small>Created</small>
                          <strong>{lookupResult.createdAt}</strong>
                        </div>
                        <div>
                          <small>Type</small>
                          <strong>{lookupResult.type}</strong>
                        </div>
                        {#if lookupResult.raw?.status || lookupResult.raw?.presence}
                          <div>
                            <small>Status</small>
                            <strong>
                              <span class={`lookup__presence ${presenceClass(lookupResult.raw?.presence?.status || lookupResult.raw?.status)}`}></span>
                              {lookupResult.raw?.presence?.status || lookupResult.raw?.status}
                            </strong>
                          </div>
                        {/if}
                        {#if lookupResult.raw?.spotify || lookupResult.raw?.activities?.some(a => a?.type === 'spotify')}
                          <div>
                            <small>Spotify</small>
                            <strong>
                              {#if lookupResult.raw?.spotify}
                                {lookupResult.raw.spotify.song ?? lookupResult.raw.spotify.current}
                              {:else}
                                {#each lookupResult.raw.activities as act}
                                  {#if act?.type === 'spotify'}
                                    {act.name} — {act.artist}
                                  {/if}
                                {/each}
                              {/if}
                            </strong>
                          </div>
                        {/if}
                        {#if lookupResult.raw?.server || lookupResult.raw?.guild}
                          <div>
                            <small>Server</small>
                            <strong>{lookupResult.raw.server ?? lookupResult.raw.guild}</strong>
                          </div>
                        {/if}
                      </div>
                      <div class="lookup__actions">
                        <button
                          type="button"
                          class="btn btn--ghost"
                          on:click={() => navigator.clipboard?.writeText(lookupResult.id)}
                        >
                          Copy ID
                        </button>
                        <a
                          class="btn btn--ghost"
                          target="_blank"
                          rel="noreferrer"
                          href={`https://discord.com/users/${lookupResult.id}`}
                        >Visit Profile</a>
                      </div>
                      {#if lookupResult.raw?.bio || lookupResult.raw?.about}
                        <article class="lookup__bio">
                          <small>Bio</small>
                          <p>{lookupResult.raw?.bio || lookupResult.raw?.about}</p>
                        </article>
                      {/if}
                      <footer class="lookup__meta">
                        <small>{lookupResult.note}</small>
                      </footer>
                    </main>
                  </div>
                {/if}
              </form>
            {/if}
          </section>
        {/if}

        {#if activeSection === 'misc'}
          <section class="panel admin__misc-panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head">
              <div>
                <h3>Miscellaneous tooling</h3>
                <span>Downloaders, CDN uploads & quick notes</span>
              </div>
            </header>
            <div class="misc__tabs" role="tablist">
              {#each miscTabs as tab}
                <button
                  type="button"
                  role="tab"
                  class:selected={miscTab === tab.id}
                  on:mousedown|preventDefault
                  on:click={(e) => { selectMiscTab(tab.id); if (e.detail > 0) e.currentTarget.blur(); }}
                >
                  {tab.label}
                </button>
              {/each}
            </div>

            {#if miscTab === 'downloader'}
              <div class="misc__grid">
                <article class="misc-card">
                  <header>
                    <h4>YouTube → MP3</h4>
                    <small>Paste any video link</small>
                  </header>
                  <label>
                    Video URL
                    <input type="url" bind:value={downloadForm.youtube.url} placeholder="https://youtu.be/..." />
                  </label>
                  <label class="select-control" data-visibility={noteForm.visibility}>
                    Quality target
                    <select bind:value={downloadForm.youtube.quality}>
                      <option value="320k">320k MP3</option>
                      <option value="256k">256k MP3</option>
                      <option value="lossless">Lossless FLAC</option>
                    </select>
                  </label>
                  <div class="misc-card__actions">
                    <button class="btn btn--primary btn--wide" type="button" disabled={isQueueingDownload} on:click={() => queueDownload('youtube')}>
                      {#if isQueueingDownload && activeDownloadProvider === 'youtube'}
                        Queuing…
                      {:else}
                        Queue download
                      {/if}
                    </button>
                  </div>
                </article>
                <article class="misc-card">
                  <header>
                    <h4>Spotify → MP3</h4>
                    <small>Tracks or playlists</small>
                  </header>
                  <label>
                    Spotify URL
                    <input type="url" bind:value={downloadForm.spotify.url} placeholder="https://open.spotify.com/track/..." />
                  </label>
                  <label class="select-control">
                    Output quality
                    <select bind:value={downloadForm.spotify.quality}>
                      <option value="320k">320k MP3</option>
                      <option value="256k">256k MP3</option>
                      <option value="lossless">Lossless FLAC</option>
                    </select>
                  </label>
                  <p class="misc-card__hint">Uses spotifydown.com with yt-dlp fallback. Swap to self-hosted spotdl when available.</p>
                  <div class="misc-card__actions">
                    <button class="btn btn--primary btn--wide" type="button" disabled={isQueueingDownload} on:click={() => queueDownload('spotify')}>
                      {#if isQueueingDownload && activeDownloadProvider === 'spotify'}
                        Queuing…
                      {:else}
                        Queue conversion
                      {/if}
                    </button>
                  </div>
                </article>
              </div>
              <article class="misc-card misc-card--full">
                <header>
                  <h4>CDN uploader</h4>
                  <small>Ship hero images + assets to your storage bucket</small>
                </header>
                <form class="misc__cdn" on:submit|preventDefault={handleCdnUpload}>
                  <div class="upload-control">
                    <input
                      class="upload-control__input"
                      type="file"
                      bind:this={cdnFileInput}
                      on:change={handleCdnFileChange}
                      accept="image/*,video/*,audio/*,.zip,.rar,.7z,.pdf"
                    />
                    <button
                      class="upload-control__button"
                      type="button"
                      on:click={triggerCdnPicker}
                      disabled={isUploadingCdn}
                    >
                      <span class="upload-control__icon" aria-hidden="true">📤</span>
                      <div class="upload-control__label">
                        <strong>Select asset</strong>
                        <small>Images, audio, video, archives · &lt;200MB</small>
                      </div>
                    </button>
                    <div class="upload-control__details">
                      <strong>{cdnFileName || 'No asset selected yet'}</strong>
                      <small>
                        {cdnFileName
                          ? `${formatFileSize(cdnFileSize)} ready to ship`
                          : 'Drag & drop or use the picker'}
                      </small>
                    </div>
                  </div>
                  <button class="btn btn--primary btn--wide misc__cdn-submit" type="submit" disabled={isUploadingCdn}>
                    {#if isUploadingCdn}
                      Uploading…
                    {:else}
                      Ship to Catbox
                    {/if}
                  </button>
                </form>
                <div class="misc__status">
                  {#if downloaderStatus}
                    <span data-state="ready">{downloaderStatus}</span>
                  {/if}
                  {#if downloaderError}
                    <span data-state="error">{downloaderError}</span>
                  {/if}
                  {#if cdnStatus}
                    <span data-state="ready">{cdnStatus}</span>
                  {/if}
                  {#if cdnError}
                    <span data-state="error">{cdnError}</span>
                  {/if}
                </div>
              </article>
              <div class="misc__jobs" aria-live="polite">
                <header>
                  <strong>Job queue</strong>
                  <span>{downloadJobs.length} active</span>
                </header>
                {#if downloadJobs.length === 0}
                  <p>No downloader jobs yet.</p>
                {:else}
                  <ul>
                    {#each downloadJobs as job (job.id)}
                      <li>
                        <div class="misc__job-details">
                          <strong>{job.title || formatProviderLabel(job.provider)}</strong>
                          <span>{formatProviderLabel(job.provider)} · {job.quality}</span>
                          <small>{job.url}</small>
                        </div>
                        <div class="misc__job-actions">
                          <span class="misc__job-status" data-status={job.status}>{job.status}</span>
                          {#if job.downloadUrl}
                            <button
                              class="btn btn--ghost btn--compact"
                              type="button"
                              disabled={jobActionId === job.id}
                              on:click={() => handleJobDownload(job)}
                            >
                              Download
                            </button>
                          {/if}
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <div class="misc__jobs" aria-live="polite">
                <header>
                  <strong>CDN uploads</strong>
                  <span>{cdnUploads.length}</span>
                </header>
                {#if cdnUploads.length === 0}
                  <p>No uploads yet.</p>
                {:else}
                  <ul>
                    {#each cdnUploads as upload (upload.id)}
                      <li>
                        <div>
                          <strong>{upload.fileName}</strong>
                          <span>{upload.size ? formatFileSize(upload.size) : '—'}</span>
                          <small>{upload.note || 'Uploaded via Catbox'}</small>
                        </div>
                        <div class="misc__cdn-actions">
                          <span>{upload.status}</span>
                          <a href={upload.url} target="_blank" rel="noreferrer">Open</a>
                        </div>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            {:else}
              <div class="misc__notes">
                <form class="notes-form" on:submit|preventDefault={handleNoteCreate}>
                  <header>
                    <div>
                      <h4>Ops notes</h4>
                      <small>Share runbook snippets or keep private reminders</small>
                    </div>
                  </header>
                  <label>
                    Label
                    <input type="text" bind:value={noteForm.title} placeholder="Deploy checklist" />
                  </label>
                  <label class="select-control" data-visibility={noteForm.visibility}>
                    Visibility
                    <select bind:value={noteForm.visibility}>
                      <option value="private">Private (just me)</option>
                      <option value="public">Public (all admins)</option>
                    </select>
                    <span class="select-indicator">{noteForm.visibility === 'public' ? 'Public' : 'Private'}</span>
                  </label>
                  <label>
                    Note body
                    <textarea
                      rows="6"
                      bind:value={noteForm.body}
                      placeholder="What needs to happen next..."
                    ></textarea>
                  </label>
                  <button class="btn btn--primary" type="submit" disabled={isSavingNote}>
                    {#if isSavingNote}
                      Saving…
                    {:else}
                      Save note
                    {/if}
                  </button>
                  <div class="notes-form__status">
                    {#if noteStatus}
                      <span data-state="ready">{noteStatus}</span>
                    {/if}
                    {#if noteError}
                      <span data-state="error">{noteError}</span>
                    {/if}
                  </div>
                </form>
                <section class="notes-list">
                  <header>
                    <div>
                      <strong>Shared board</strong>
                      <small>Public notes surface for every admin</small>
                    </div>
                    <button
                      class="btn btn--ghost btn--compact"
                      type="button"
                      on:click={hydrateOpsNotes}
                      disabled={notesLoading}
                    >
                      {#if notesLoading}
                        Refreshing…
                      {:else}
                        Refresh
                      {/if}
                    </button>
                  </header>
                  {#if notesLoading}
                    <p class="misc-card__hint">Loading notes…</p>
                  {:else if opsNotes.length === 0}
                    <p class="misc-card__hint">No notes captured yet.</p>
                  {:else}
                    <div class="notes-list__grid">
                      {#each opsNotes as note (note.id)}
                        <article class="note-card" data-visibility={note.visibility}>
                          <header>
                            <div>
                              <strong>{note.title}</strong>
                              <small>{new Date(note.updatedAt || note.createdAt).toLocaleString()}</small>
                            </div>
                            <span class="note-card__tag" data-visibility={note.visibility}>
                              {note.visibility}
                            </span>
                          </header>
                          <p>{note.body}</p>
                          <div class="note-card__actions">
                            <button
                              class="btn btn--ghost btn--compact"
                              type="button"
                              disabled={noteActionId === note.id}
                              on:click={() => handleNoteVisibilityToggle(note)}
                            >
                              {note.visibility === 'public' ? 'Make private' : 'Make public'}
                            </button>
                            <button
                              class="btn btn--ghost btn--compact"
                              type="button"
                              disabled={noteActionId === note.id}
                              on:click={() => handleNoteDelete(note.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      {/each}
                    </div>
                  {/if}
                </section>
              </div>
            {/if}
          </section>
        {/if}

        {#if activeSection === 'ai'}
          <section class="panel admin__ai-panel animate-enter" data-anim="fade">
            <header class="admin__panel-head">
              <h3>AI console</h3>
              <span>Binx-inspired copilot for briefs & outreach</span>
            </header>
            <AdminAIChat />
          </section>
        {/if}

        {#if activeSection === 'settings'}
          <section class="panel animate-enter" data-anim="fade-up">
            <header class="admin__panel-head">
              <h3>Site settings</h3>
              <span>Brand + theme controls</span>
            </header>
            <div class="admin__settings">
              <article>
                <span>Brand</span>
                <strong>{brand?.name}</strong>
                <p>{brand?.tagline}</p>
              </article>
              <article>
                <span>Locations</span>
                <strong>{brand?.location}</strong>
              </article>
              <article>
                <span>CTA</span>
                <strong>{brand?.cta?.label}</strong>
                <p>{brand?.cta?.href}</p>
              </article>
            </div>
          </section>
        {/if}
        <footer class="admin__footer">
          <img src="/ftr-digital-logo.svg" alt="FTR Digital logo" />
          <span>Engineering station • Internal use only</span>
        </footer>
      </div>
    {/if}
  </section>
</div>

<style>
  .admin {
    min-height: 100vh;
    display: grid;
    grid-template-columns: auto 1fr;
    background: var(--body-gradient);
    color: var(--color-text);
  }

  .admin[data-state='login'] {
    grid-template-columns: 1fr;
  }

  .admin__sidebar {
    width: 280px;
    background: rgba(4, 6, 12, 0.8);
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    position: relative;
    z-index: 2;
    overflow: hidden;
  }

  .admin[data-sidebar='collapsed'] .admin__sidebar {
    width: 96px;
    animation: sidebarCollapse 220ms ease forwards;
  }

  .admin[data-sidebar='collapsed'] .admin__sidebar:hover {
    animation: sidebarExpand 260ms ease forwards;
  }

  .admin__brand {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-family: var(--font-display);
    letter-spacing: 0.08em;
  }

  nav {
    display: grid;
    gap: 0.5rem;
  }

  nav button {
    width: 100%;
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    gap: 0.6rem;
    border: none;
    border-radius: 14px;
    padding: 0.65rem 0.9rem;
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition: background 200ms ease, color 200ms ease;
  }

  .admin__nav-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: transparent;
    transition: background 200ms ease;
  }

  .admin__nav-icon {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.04);
    display: grid;
    place-items: center;
    border-radius: 18px;
  }
  .admin__nav-icon svg {
    width: 18px;
    height: 18px;
    stroke: currentColor;
    stroke-width: 1.7;
    fill: none;
  }

  .admin__nav-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: opacity 200ms ease;
  }

  nav button.selected {
    background: rgba(36, 192, 255, 0.1);
    color: var(--color-text);
  }

  nav button.selected .admin__nav-indicator {
    background: var(--color-accent);
  }

  .admin[data-sidebar='collapsed'] nav button {
    grid-template-columns: auto;
    justify-content: center;
    padding: 0.65rem;
  }

  .admin[data-sidebar='collapsed'] .admin__nav-label,
  .admin[data-sidebar='collapsed'] .admin__brand small {
    opacity: 0;
    width: 0;
    height: 0;
    overflow: hidden;
  }

  .admin[data-sidebar='collapsed'] .admin__sidebar:hover {
    width: 280px;
  }

  .admin[data-sidebar='collapsed'] .admin__sidebar:hover nav button {
    grid-template-columns: auto auto 1fr;
  }

  .admin[data-sidebar='collapsed'] .admin__sidebar:hover .admin__nav-label,
  .admin[data-sidebar='collapsed'] .admin__sidebar:hover .admin__brand small {
    opacity: 1;
    width: auto;
    height: auto;
  }

  nav button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .admin__content {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    overflow-anchor: none;
  }

  .panel {
    min-height: 360px;
    overflow-anchor: none;
  }

  .admin__content[data-auth='false'] {
    justify-content: center;
  }

  .admin__footer {
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .admin__footer img {
    height: 28px;
    opacity: 0.65;
  }

  .admin__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .admin__hamburger {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
  }

  .admin__hamburger span {
    width: 18px;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
  }

  .admin__login-stage {
    position: relative;
    display: grid;
    place-items: center;
    padding: clamp(2.5rem, 6vw, 5rem) 1.5rem;
    min-height: min(760px, 100vh - 4rem);
    border-radius: 32px;
    overflow: hidden;
    isolation: isolate;
    background: radial-gradient(circle at 20% 20%, rgba(36, 192, 255, 0.12), transparent 60%);
  }

  .admin__login-stage::after {
    content: '';
    position: absolute;
    inset: -20%;
    background: radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgba(36, 192, 255, 0.45), rgba(2, 4, 9, 0));
    filter: blur(140px);
    opacity: 0.85;
    transition: background-position 200ms ease-out;
    z-index: 0;
  }

  .admin__login-canvas {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }

  .admin__login-glow {
    position: absolute;
    inset: -10%;
    background: radial-gradient(circle at var(--pointer-x, 50%) var(--pointer-y, 50%), rgba(15, 109, 255, 0.4), transparent 55%);
    filter: blur(120px);
    opacity: 0.8;
    transition: background 180ms ease-out;
  }

  .admin__login-orb {
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    filter: blur(40px);
    opacity: 0.65;
    animation: floatOrb 14s ease-in-out infinite;
  }

  .admin__login-orb--one {
    top: 10%;
    right: 5%;
    background: linear-gradient(120deg, rgba(255, 129, 229, 0.35), rgba(62, 138, 255, 0.25));
  }

  .admin__login-orb--two {
    bottom: 5%;
    left: 10%;
    background: linear-gradient(180deg, rgba(39, 222, 255, 0.3), rgba(47, 78, 255, 0.2));
    animation-delay: -5s;
  }

  .admin__login-grid {
    position: absolute;
    inset: 15% 5% 0;
    background-image: linear-gradient(
        rgba(255, 255, 255, 0.04) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    opacity: 0.25;
    filter: blur(0.5px);
    transform: perspective(900px) rotateX(72deg);
  }

  .admin__login {
    position: relative;
    z-index: 1;
    width: min(440px, 100%);
    display: grid;
    gap: 1.25rem;
    padding: clamp(2rem, 5vw, 2.75rem);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(6, 8, 15, 0.82);
    box-shadow: 0 25px 70px rgba(3, 6, 12, 0.65);
    backdrop-filter: blur(18px);
  }

  .admin__login-head {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }

  .admin__login-head img {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(36, 192, 255, 0.35), rgba(255, 255, 255, 0.05));
    padding: 0.6rem;
    box-shadow: 0 15px 30px rgba(17, 139, 255, 0.2);
  }

  .admin__login-copy {
    margin: 0;
    color: var(--color-muted);
  }

  .admin__login-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .admin__login-tags span {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.25rem 0.85rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
    background: rgba(255, 255, 255, 0.02);
  }

  .admin__login form {
    display: grid;
    gap: 1.1rem;
  }

  .admin__login form label {
    display: grid;
    gap: 0.4rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .admin__login input {
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(9, 11, 19, 0.9);
    padding: 0.85rem 1.1rem;
    color: var(--color-text);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 35px rgba(5, 8, 15, 0.65);
    transition: border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease;
  }

  .admin__login input:focus {
    border-color: rgba(36, 192, 255, 0.6);
    box-shadow: 0 18px 40px rgba(18, 46, 94, 0.55);
    transform: translateY(-1px);
    outline: none;
  }

  .admin__attempt {
    margin-top: 1rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 1.1rem 1.25rem;
    background: rgba(12, 15, 22, 0.65);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }

  .admin__attempt--compact ul {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem 1rem;
  }

  .admin__attempt header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .admin__attempt ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }

  .admin__attempt li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
    gap: 0.5rem;
  }

  .admin__attempt li span {
    color: var(--color-muted);
  }

  .admin__pill {
    border-radius: 999px;
    padding: 0.15rem 0.9rem;
    font-size: 0.8rem;
    border: 1px solid currentColor;
  }

  .admin__pill--success {
    color: #5ef3c6;
    border-color: rgba(94, 243, 198, 0.5);
    background: rgba(94, 243, 198, 0.08);
  }

  .admin__pill--danger {
    color: #ff8b8b;
    border-color: rgba(255, 139, 139, 0.5);
    background: rgba(255, 139, 139, 0.08);
  }

  .admin__remember {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .admin__remember input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-accent);
  }

  .admin__error {
    color: #ff6868;
    margin: 0;
  }

  .admin__hint {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .admin__grid {
    display: grid;
    gap: 1.5rem;
    flex: 1 1 auto;
  }

  .admin__ai-panel {
    min-height: 520px;
  }

  .admin__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
  }

  .admin__stats article {
    padding: 1rem;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .admin__stats span {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  .admin__stats strong {
    display: block;
    font-size: 2rem;
    margin-top: 0.5rem;
  }

  .admin__quick {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .admin__quick button {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    color: var(--color-text);
    padding: 0.65rem 1.25rem;
    cursor: pointer;
  }

  .admin__panel-head {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .admin__form-grid {
    display: grid;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .admin__form-grid label {
    display: grid;
    gap: 0.35rem;
  }

  .admin__form-grid input,
  .admin__form-grid textarea,
  .admin__form-grid select {
    border-radius: 12px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.75rem 1rem;
  }

  .select-control {
    position: relative;
  }

  .select-control select {
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    padding-right: 2.75rem;
    line-height: 1.2;
  }

  .select-control::after {
    content: '';
    position: absolute;
    pointer-events: none;
    right: 1rem;
    top: 50%;
    width: 0.6rem;
    height: 0.35rem;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23cbd5f5' d='M1.41.59L6 5.17l4.59-4.58L12 1l-6 6-6-6z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-size: contain;
    transform: translateY(-50%);
    opacity: 0.8;
  }

  .select-control select:focus {
    outline: none;
    border-color: rgba(36, 192, 255, 0.6);
    box-shadow: 0 0 0 3px rgba(36, 192, 255, 0.16);
  }

  .select-control[data-visibility='public']::before,
  .select-control[data-visibility='private']::before {
    content: '';
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .select-control[data-visibility='public']::before {
    background: rgba(36, 192, 255, 0.85);
  }
  .select-control[data-visibility='private']::before {
    background: rgba(247, 215, 116, 0.9);
  }
  .select-control select { padding-left: 3.6rem; }

  .select-control .select-indicator {
    position: absolute;
    left: 2.25rem;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.85rem;
    color: var(--color-muted);
    pointer-events: none;
    text-transform: capitalize;
  }

  .admin__list {
    margin-top: 1.25rem;
    display: grid;
    gap: 1rem;
  }

  .admin__list--dual {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
  }

  .admin__list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    color: var(--color-muted);
  }

  .admin__list-head h4 {
    margin: 0;
    color: var(--color-text);
  }

  .admin__card {
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem;
    background: rgba(12, 15, 22, 0.6);
  }

  .admin__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .admin__icon-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: border-color 150ms ease, color 150ms ease, background 150ms ease;
  }

  .admin__icon-btn:hover {
    border-color: rgba(255, 255, 255, 0.25);
    color: var(--color-text);
    background: rgba(255, 255, 255, 0.04);
  }

  .admin__card p {
    margin: 0.4rem 0;
    color: var(--color-muted-soft);
  }

  .admin__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .admin__tags span {
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
  }

  .admin__panel-head--contacts {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .admin__panel-head--contacts > div:first-child {
    flex: 1;
    min-width: 220px;
  }

  .contact-panel__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .contact-panel__actions .btn--compact {
    font-size: 0.85rem;
    padding: 0.35rem 0.85rem;
    border-radius: 10px;
  }

  .contact-panel__sync {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--color-muted);
    margin: 0.5rem 0 1rem;
  }

  .contact-panel__sync small {
    color: var(--color-warning, #ffb347);
  }

  .contact-panel__sync[data-state='saving'] span {
    color: var(--color-accent);
  }

  .contact-panel__sync[data-state='error'] span {
    color: var(--color-error, #ff6b6b);
  }

  .admin__contact-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
  }

  .admin__contact-tabs button {
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.02);
    color: var(--color-muted);
    padding: 0.4rem 0.95rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    transition: border-color 200ms ease, color 200ms ease, background 200ms ease;
  }

  .admin__contact-tabs button.selected {
    border-color: rgba(36, 192, 255, 0.4);
    color: var(--color-text);
    background: rgba(36, 192, 255, 0.08);
  }

  .admin__contact-tabs small {
    font-size: 0.75rem;
    color: inherit;
  }

  .admin__contact-list {
    display: grid;
    gap: 1rem;
  }

  .admin__discord-panel {
    display: grid;
    gap: 1.5rem;
  }

  .discord__tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .discord__tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .discord__tabs button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 999px;
    padding: 0.4rem 1rem;
    color: var(--color-muted);
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
    flex: 1 1 0;
    min-width: 160px;
    text-align: center;
  }

  .discord__tabs button.selected {
    border-color: rgba(36, 192, 255, 0.4);
    background: rgba(36, 192, 255, 0.09);
    color: var(--color-text);
  }

  .discord__webhook,
  .discord__lookup,
  .discord__bot-panel {
    display: grid;
    gap: 1rem;
  }

  .discord__webhook-layout {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    align-items: stretch;
  }

  .webhook__composer,
  .webhook__embed,
  .webhook__preview,
  .discord__lookup {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    background: rgba(12, 16, 24, 0.6);
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .webhook__composer header,
  .webhook__embed header,
  .webhook__preview header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .webhook__mention {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .webhook__preview {
    position: sticky;
    top: 1rem;
    align-self: start;
  }

  .discord__grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .discord__lookup {
    max-width: 640px;
    margin: 0 auto;
  }

  .discord__lookup .discord__grid {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .discord__lookup .discord__grid button {
    min-width: 150px;
    height: auto;
    align-self: center;
    margin-top: 0;
  }

  .discord__webhook label,
  .discord__lookup label,
  .webhook__embed label {
    display: grid;
    gap: 0.35rem;
  }

  .discord__webhook textarea,
  .discord__webhook input,
  .webhook__embed textarea,
  .webhook__embed input,
  .discord__lookup input {
    border-radius: 14px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.75rem 1rem;
  }

  .webhook__embed textarea,
  .webhook__embed input {
    width: 100%;
  }

  .embed-fields {
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 14px;
    padding: 0.75rem;
    display: grid;
    gap: 0.75rem;
  }

  .embed-fields__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .embed-fields__empty {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .embed-field-row {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 0.75rem;
    display: grid;
    gap: 0.5rem;
    background: rgba(8, 11, 18, 0.7);
  }

  .embed-field-row__inputs {
    display: grid;
    gap: 0.5rem;
  }

  .embed-field-row__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .embed-field-row__meta label {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
  }

  .webhook__preview {
    background: rgba(6, 8, 14, 0.85);
  }

  .embed-preview-card {
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.03);
    overflow: hidden;
    background: rgba(13, 17, 26, 0.9);
  }

  .embed-preview-card__bar {
    height: 6px;
  }

  .embed-preview-card__body {
    padding: 1rem;
    display: grid;
    gap: 0.35rem;
  }

  .embed-preview-card__author,
  .embed-preview-card__title {
    margin: 0;
    font-weight: 600;
  }

  .embed-preview-card__description {
    margin: 0;
    color: var(--color-muted);
  }

  .embed-preview-card__fields {
    display: grid;
    gap: 0.5rem;
  }

  .embed-preview-card__fields article {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 0.5rem;
  }

  .embed-preview-card__fields article[data-inline='true'] {
    display: inline-block;
    width: calc(50% - 0.4rem);
    vertical-align: top;
  }

  .embed-preview-card__fields article strong {
    display: block;
    font-size: 0.85rem;
  }

  .embed-preview-card__fields article p {
    margin: 0.15rem 0 0;
    font-size: 0.8rem;
    color: var(--color-muted);
  }

  .embed-preview-card__thumb {
    justify-self: flex-end;
    max-width: 120px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  .embed-preview-card__footer {
    margin: 0;
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .discord__actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .discord__status {
    margin: 0;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .discord__status[data-state='ready'] {
    color: var(--color-accent);
  }

  .discord__status[data-state='error'] {
    color: var(--color-error, #ff6b6b);
  }

  .discord__history {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(12, 16, 24, 0.6);
  }

  .discord__history header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .discord__history ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }

  .discord__history li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .discord__bot-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 280px;
    gap: 1.5rem;
  }

  @media (max-width: 980px) {
    .discord__bot-panel {
      grid-template-columns: 1fr;
    }
  }

  .discord__bot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1rem;
  }

  .bot-card {
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(10, 13, 20, 0.7);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 100%;
  }

  .bot-card header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .bot-card__status {
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }

  .bot-card ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .bot-card ul li {
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
  }

  .bot-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: auto;
  }

  .bot-activity {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(12, 16, 24, 0.65);
  }

  .bot-activity ul {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.65rem;
  }

  .bot-activity li {
    display: grid;
    gap: 0.1rem;
  }

  .bot-activity li span {
    color: var(--color-text);
    font-weight: 600;
  }

  .bot-activity li small {
    color: var(--color-muted);
  }

  .bot-activity time {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .discord__lookup-result {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1rem;
  }

  .lookup--rich {
    align-items: start;
  }

  .lookup__profile {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  .lookup__banner {
    height: 90px;
    background-size: cover;
    background-position: center;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.03);
  }

  .lookup__avatar-wrap {
    display: flex;
    gap: 0.75rem;
    align-items: center;
  }

  .lookup__avatar {
    height: 64px;
    width: 64px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .lookup__avatar.placeholder {
    background: linear-gradient(120deg, rgba(36,192,255,0.16), rgba(247,215,116,0.12));
    border-radius: 999px;
  }

  .lookup__name-block {
    display: grid;
    gap: 0.1rem;
  }

  .lookup__display {
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .lookup__badges {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .lookup__badge {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.03);
  }

  .lookup__presence {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 999px;
    margin-right: 0.5rem;
    vertical-align: -0.15rem;
  }
  .presence-online { background: #43b581; }
  .presence-idle { background: #faa61a; }
  .presence-dnd { background: #f04747; }
  .presence-offline { background: rgba(255,255,255,0.12); }

  .lookup__details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .lookup__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.5rem;
  }

  .lookup__bio {
    border: 1px solid rgba(255,255,255,0.03);
    padding: 0.75rem;
    border-radius: 12px;
    background: rgba(10,11,14,0.6);
  }

  .discord__lookup-result article {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    padding: 1rem;
    background: rgba(10, 14, 22, 0.7);
  }

  .admin__misc-panel {
    display: grid;
    gap: 1.25rem;
  }

  .misc__tabs {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .misc__tabs button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.02);
    border-radius: 999px;
    padding: 0.4rem 1rem;
    color: var(--color-muted);
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
    flex: 1 1 0;
    min-width: 160px;
    text-align: center;
  }

  .misc__tabs button.selected {
    border-color: rgba(36, 192, 255, 0.4);
    background: rgba(36, 192, 255, 0.09);
    color: var(--color-text);
  }

  .misc__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.25rem;
    grid-auto-rows: 1fr;
    align-items: stretch;
  }

  .misc-card {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(12, 15, 23, 0.65);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    min-height: 100%;
  }

  .misc-card header {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .misc-card label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .misc-card input,
  .misc-card select {
    border-radius: 12px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.7rem 1rem;
  }

  .misc-card select {
    padding-right: 2.75rem;
  }

  .misc-card__hint {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .misc-card__actions {
    margin-top: auto;
  }

  .misc-card--full {
    grid-column: 1 / -1;
    display: grid;
    gap: 1rem;
  }

  .misc__cdn {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    align-items: end;
  }

  .misc__status {
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .misc__status span[data-state='ready'] {
    color: var(--color-accent);
  }

  .misc__status span[data-state='error'] {
    color: var(--color-error, #ff6b6b);
  }

  .misc__jobs {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(10, 13, 22, 0.65);
  }

  .misc__jobs header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.65rem;
  }

  .misc__jobs ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6rem;
  }

  .misc__jobs li {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.85rem;
    align-items: center;
  }

  .misc__job-details {
    display: grid;
    gap: 0.25rem;
  }

  .misc__job-details span {
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .misc__job-details small {
    color: var(--color-muted);
    word-break: break-all;
  }

  .misc__job-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .misc__job-status {
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }

  .misc__job-status[data-status='downloading'] {
    color: #f7d774;
  }

  .misc__job-status[data-status='complete'] {
    color: var(--color-accent);
  }

  .misc__cdn-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.78rem;
  }

  .misc__cdn-actions a {
    color: var(--color-accent);
  }

  .btn--wide {
    width: 100%;
  }

  .upload-control {
    display: grid;
    gap: 0.6rem;
    align-content: start;
  }

  .upload-control__input {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    border: 0;
  }

  .upload-control__button {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    border-radius: 16px;
    padding: 0.9rem 1.1rem;
    border: none;
    cursor: pointer;
    background: linear-gradient(120deg, rgba(36, 192, 255, 0.25), rgba(64, 119, 255, 0.35));
    color: var(--color-text);
    font: inherit;
    text-align: left;
  }

  .upload-control__button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .upload-control__icon {
    font-size: 1.5rem;
  }

  .upload-control__label {
    display: grid;
    gap: 0.15rem;
  }

  .upload-control__label strong {
    font-size: 1rem;
  }

  .upload-control__label small,
  .upload-control__details small {
    color: var(--color-muted);
    font-size: 0.82rem;
  }

  .upload-control__details {
    border: 1px dashed rgba(255, 255, 255, 0.12);
    border-radius: 14px;
    padding: 0.75rem 1rem;
    display: grid;
    gap: 0.2rem;
    background: rgba(8, 11, 18, 0.6);
    word-break: break-word;
  }

  .upload-control__details strong {
    font-size: 0.95rem;
  }

  .misc__cdn-submit {
    min-height: 52px;
  }

  .misc__notes {
    display: grid;
    gap: 1rem;
  }

  .notes-form,
  .notes-list {
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 18px;
    padding: 1rem;
    background: rgba(12, 16, 24, 0.7);
  }

  .notes-form {
    display: grid;
    gap: 0.75rem;
  }

  .notes-form header,
  .notes-list header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
  }

  .notes-form small,
  .notes-list small {
    color: var(--color-muted);
    font-size: 0.8rem;
  }

  .notes-form label {
    display: grid;
    gap: 0.35rem;
    font-size: 0.9rem;
  }

  .notes-form input,
  .notes-form textarea,
  .notes-form select {
    border-radius: 12px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.7rem 1rem;
  }

  .notes-form select {
    padding-right: 2.75rem;
  }

  .notes-form__status {
    display: flex;
    gap: 0.75rem;
    font-size: 0.85rem;
  }

  .notes-form__status span[data-state='ready'] {
    color: var(--color-accent);
  }

  .notes-form__status span[data-state='error'] {
    color: var(--color-error, #ff6b6b);
  }

  .notes-list {
    display: grid;
    gap: 1rem;
  }

  .notes-list__grid {
    display: grid;
    gap: 0.85rem;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }

  .note-card {
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    padding: 0.85rem;
    background: rgba(8, 11, 18, 0.7);
    display: grid;
    gap: 0.6rem;
  }

  .note-card header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .note-card small {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .note-card__tag {
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.04em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .note-card__tag[data-visibility='public'] {
    color: var(--color-accent);
    border-color: rgba(36, 192, 255, 0.4);
  }

  .note-card__tag[data-visibility='private'] {
    color: #f7d774;
    border-color: rgba(247, 215, 116, 0.4);
  }

  .note-card__actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  @keyframes floatOrb {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(25px, -20px, 0) scale(1.08);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

    @keyframes sidebarExpand {
      from {
        width: 96px;
      }
      to {
        width: 280px;
      }
    }

    @keyframes sidebarCollapse {
      from {
        width: 280px;
      }
      to {
        width: 96px;
      }
    }

  .contact-card {
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: rgba(8, 11, 18, 0.7);
    padding: 1rem 1.2rem;
    transition: border-color 200ms ease, background 200ms ease;
  }

  .contact-card[data-expanded='true'] {
    border-color: rgba(36, 192, 255, 0.35);
    background: rgba(12, 16, 24, 0.9);
  }

  .contact-card__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    gap: 1rem;
    width: 100%;
    border: none;
    background: none;
    padding: 0;
    color: inherit;
    text-align: left;
  }

  .contact-card__header:focus-visible {
    outline: 2px solid rgba(36, 192, 255, 0.6);
    border-radius: 999px;
  }

  .contact-card__header strong {
    font-size: 1.05rem;
  }

  .contact-card__header small {
    color: var(--color-muted);
  }

  .contact-card__meta {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: right;
  }

  .contact-card__badge {
    padding: 0.2rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.75rem;
  }

  .contact-card__chevron {
    width: 10px;
    height: 10px;
    border-right: 2px solid currentColor;
    border-bottom: 2px solid currentColor;
    transform: rotate(45deg);
    transition: transform 200ms ease;
  }

  .contact-card[data-expanded='true'] .contact-card__chevron {
    transform: rotate(-135deg);
  }

  .contact-card__body {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    display: grid;
    gap: 1rem;
  }

  .contact-card__body dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem 1.25rem;
    margin: 0;
  }

  .contact-card__body dt {
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }

  .contact-card__body dd {
    margin: 0.15rem 0 0;
  }

  .contact-card__message {
    grid-column: 1 / -1;
  }

  .contact-card__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .contact-card__actions label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .contact-card__actions select {
    border-radius: 12px;
    border: 1px solid var(--input-border);
    background: var(--input-bg);
    color: var(--color-text);
    padding: 0.5rem 0.75rem;
    padding-right: 2.5rem;
    min-width: 150px;
  }

  .admin__empty {
    color: var(--color-muted);
  }

  .admin__settings {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .admin__settings article {
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    padding: 1rem;
    background: rgba(12, 15, 22, 0.55);
  }

  .admin__settings span {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
    color: var(--color-muted);
  }

  @media (max-width: 960px) {
    .admin {
      grid-template-columns: 1fr;
    }

    .admin__sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      width: 240px;
      transform: translateX(0);
      z-index: 10;
      animation: none;
    }

    .admin[data-sidebar='collapsed'] .admin__sidebar {
      transform: translateX(-100%);
      animation: none;
    }

    .admin[data-sidebar='collapsed'] .admin__sidebar:hover {
      width: 240px;
    }

    .admin__content {
      padding-top: 4.5rem;
    }

    .contact-card__body dl {
      grid-template-columns: 1fr;
    }

    .admin__login-stage {
      min-height: auto;
      padding: 2.5rem 1rem;
    }

    .admin__login {
      padding: 2rem 1.75rem;
    }
  }

  @media (max-width: 560px) {
    .admin__login {
      padding: 1.5rem 1.25rem;
    }

    .admin__login-tags {
      gap: 0.35rem;
    }
  }
</style>

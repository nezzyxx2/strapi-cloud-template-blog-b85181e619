# FTR Digital stack

This repository now houses:

- `frontend/` – Svelte + Vite single page marketing/AI admin experience.
- Strapi backend (root) – headless CMS powering structured content and media.

Both apps run independently so you can iterate on either side without rebuilding the other.

## Quick start

| Service | Location | Install | Run |
| --- | --- | --- | --- |
| Strapi CMS | `./` | `npm install` | `npm run develop` |
| Svelte frontend | `./frontend` | `npm install` | `npm run dev` |

1. Open two terminals.
2. In the first, run the Strapi dev server (default: `http://localhost:1337`).
3. In the second, start the Svelte dev server (default: `http://localhost:5173` unless overridden in `vite.config.js`).

Update environment variables as needed (e.g., `VITE_AI_PROXY`, `VITE_AI_KEY`) before launching the frontend so its admin chat can reach your proxy/model of choice. See `frontend/README.md` for the full list plus Windows helper scripts.

## Backend (Strapi)

Common scripts:

- `npm run develop` – watch mode with autoReload. [Docs](https://docs.strapi.io/dev-docs/cli#strapi-develop)
- `npm run start` – production start without autoReload.
- `npm run build` – build the Strapi admin panel.
- `npm run seed:example` – load the sample content defined in `scripts/seed.js`.

### Deployment

Strapi supports a wide range of targets including [Strapi Cloud](https://cloud.strapi.io). Follow the [deployment guide](https://docs.strapi.io/dev-docs/deployment) appropriate for your host. The default CLI command is:

```
yarn strapi deploy
```

## Frontend (Svelte + Vite)

- Located under `frontend/` (migrated from the former `merge/` drop folder).
- Uses the scripts defined in `frontend/package.json` (`dev`, `build`, `preview`, `check`, `ai-proxy`, etc.).
- Editable site copy and theming live in `frontend/public/site.json` plus the `src/components/` tree.
- Helper Windows scripts (`installreq.bat`, `run.bat`) remain in the same folder.

Refer to `frontend/README.md` for design notes, data model tips, and AI proxy instructions.

## Helpful links

- [Resource center](https://strapi.io/resource-center)
- [Strapi documentation](https://docs.strapi.io)
- [Strapi tutorials](https://strapi.io/tutorials)
- [Strapi blog](https://strapi.io/blog)
- [Changelog](https://strapi.io/changelog)
- [Strapi GitHub repository](https://github.com/strapi/strapi)

Community channels: [Discord](https://discord.strapi.io), [Forum](https://forum.strapi.io/), [Awesome Strapi](https://github.com/strapi/awesome-strapi).

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>

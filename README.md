# Mivo Plugin Registry

This repository hosts the **Plugin Registry** for the Mivo Hotspot System.

## How it Works

This repository is a pnpm monorepo with a shared TypeScript registry package and two deployment options:

- **GitHub Pages (static)**: GitHub Actions scans the `mivodev` organization for repositories starting with `plugin-`, then generates `plugins.json` and `releases.json`.
- **Cloudflare Pages Functions (SSR)**: the same registry logic runs on request and serves those JSON endpoints dynamically.

## API Endpoints

- **Plugins Index**: `https://mivodev.github.io/registry/plugins.json`
- **Releases Index**: `https://mivodev.github.io/registry/releases.json`

## Automation

The GitHub Pages workflow is defined in `.github/workflows/deploy.yml`. It runs:
1.  **Daily** at midnight.
2.  **Manually** via Workflow Dispatch.
3.  **On Push** to the `main` branch.

## Local development

Requirements: Node.js 22+ and pnpm 12.

```sh
pnpm install
cp .env.example .env
pnpm generate
pnpm test
pnpm typecheck
```

Set `GH_PAT` in `.env` for higher GitHub API rate limits. The token should have read access to the repositories to be listed; do not commit `.env`.

## Cloudflare Pages SSR

Deploy the SSR app through the **Cloudflare Dashboard using Git integration**. Do not deploy this app with the Wrangler CLI.

1. Push this repository to GitHub and sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Open **Workers & Pages** and select **Create application** → **Pages** → **Connect to Git**.
3. Authorize GitHub if prompted, select this repository, and choose the production branch (normally `main`).
4. Configure the build:
   - **Root directory (advanced):** `apps/cloudflare-pages`
   - **Framework preset:** `None`
   - **Build command:** leave empty
   - **Build output directory:** `public`
5. Select **Save and Deploy**.
6. In the Pages project, open **Settings** → **Variables and Secrets**. Add `GH_PAT` as an encrypted secret for both **Production** and **Preview** environments, then trigger a new deployment so the Functions receive it.

`GH_PAT` is the secret name used by the Cloudflare Pages Functions and GitHub Actions static build (the latter falls back to the built-in `GITHUB_TOKEN`). Do not put a real token in `.env.example` or commit it. Configure a GitHub repository or organization Actions secret named `GH_PAT` separately if the static Pages workflow needs an authenticated token.

Cloudflare Pages will build and deploy on pushes to the connected branch. Pages detects the `functions` directory and bundles the Functions; no Wrangler configuration file or separate Rollup/Rolldown step is required. After deployment, verify the dynamic endpoints at `https://<your-pages-project>.pages.dev/plugins.json` and `https://<your-pages-project>.pages.dev/releases.json`. Both endpoints include edge-cache headers.

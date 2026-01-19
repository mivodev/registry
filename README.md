# Mivo Plugin Registry

This repository hosts the **Plugin Registry** for the Mivo Hotspot System.

## How it Works

This repository uses **GitHub Actions** to automatically scan the `mivodev` organization for repositories starting with `plugin-`. It then generates a JSON index (`plugins.json`) and a release archive (`releases.json`).

The generated artifacts are deployed to **GitHub Pages** and serve as the backend for the Mivo Plugin Store.

## API Endpoints

- **Plugins Index**: `https://mivodev.github.io/registry/plugins.json`
- **Releases Index**: `https://mivodev.github.io/registry/releases.json`

## Automation

The workflow is defined in `.github/workflows/deploy.yml`. It runs:
1.  **Daily** at midnight.
2.  **Manually** via Workflow Dispatch.
3.  **On Push** to the `main` branch.

**Requirements:**
- A valid `GH_PAT` (Personal Access Token) with `repo` and `read:org` scopes must be configured in the Organization Secrets to allow the script to fetch repository details.

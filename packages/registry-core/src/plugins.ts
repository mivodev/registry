import { getJson, getText, githubUrls } from "./github-client.ts";
import type { GitHubRelease, GitHubRepository, Plugin } from "./types.ts";

function parsePluginMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const pattern = /^\s*\*\s*([a-zA-Z0-9 ]+):\s*(.+)$/gm;

  for (const match of content.matchAll(pattern)) {
    metadata[match[1]!.trim().toLowerCase()] = match[2]!.trim();
  }

  return metadata;
}

export async function generatePlugins(token?: string): Promise<Plugin[]> {
  const repos =
    (await getJson<GitHubRepository[]>(githubUrls.organizationRepositories, token)) ?? [];
  const plugins: Plugin[] = [];

  for (const repo of repos) {
    if (!repo.name.startsWith("plugin-")) continue;

    const release = await getJson<GitHubRelease>(
      githubUrls.pluginLatestRelease(repo.name),
      token,
      true,
    );
    const ref = release?.tag_name ?? repo.default_branch;
    const pluginContent = await getText(githubUrls.pluginFile(repo.name, ref), token, true);

    if (pluginContent === null) {
      console.warn(`Warning: plugin.php not found in ${ref} for ${repo.name}. Skipping.`);
      continue;
    }

    const metadata = parsePluginMetadata(pluginContent);
    if (!metadata["plugin name"]) {
      console.warn(`Warning: 'Plugin Name' header missing in ${repo.name}. Skipping.`);
      continue;
    }

    const firstAsset = release?.assets[0];
    const version = metadata.version ?? (firstAsset ? release!.tag_name : "0.0.1");

    plugins.push({
      id: repo.name,
      name: metadata["plugin name"],
      description: metadata.description ?? repo.description ?? "",
      author: metadata.author ?? repo.owner.login,
      version,
      category: metadata.category ?? "Uncategorized",
      tags: (metadata.tags ?? "").split(",").map((tag) => tag.trim()).filter(Boolean),
      repo: repo.html_url,
      download:
        firstAsset?.browser_download_url ??
        `${repo.html_url}/archive/refs/heads/${repo.default_branch}.zip`,
      readme: githubUrls.pluginReadme(repo.name, ref),
      updated_at: repo.updated_at,
    });
  }

  return plugins;
}

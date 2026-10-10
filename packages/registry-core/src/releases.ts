import { getJson, githubUrls } from "./github-client.ts";
import type { MivoRelease, RegistryRelease } from "./types.ts";

export async function generateReleases(token?: string): Promise<RegistryRelease[]> {
  const releases =
    (await getJson<MivoRelease[]>(githubUrls.mivoReleases, token)) ?? [];
  let latestFound = false;

  return releases.filter((release) => !release.draft).map((release) => {
    let download = release.zipball_url;
    let size = 0;

    for (const asset of release.assets) {
      if (asset.content_type === "application/zip" || asset.name.endsWith(".zip")) {
        download = asset.browser_download_url;
        size = asset.size;
        break;
      }
    }

    const latest = !latestFound && !release.prerelease;
    if (latest) latestFound = true;

    return {
      version: release.tag_name,
      date: release.published_at?.slice(0, 10) ?? "",
      size,
      download,
      notes: release.html_url,
      prerelease: release.prerelease,
      latest,
    };
  });
}

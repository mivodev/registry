const ORGANIZATION = "mivodev";
const API_BASE = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";
const USER_AGENT = "Mivo-Registry-Bot";

export const githubUrls = {
  organizationRepositories: `${API_BASE}/orgs/${ORGANIZATION}/repos?per_page=100`,
  mivoReleases: `${API_BASE}/repos/${ORGANIZATION}/mivo/releases?per_page=100`,
  pluginLatestRelease: (repository: string) =>
    `${API_BASE}/repos/${ORGANIZATION}/${repository}/releases/latest`,
  pluginFile: (repository: string, ref: string) =>
    `${RAW_BASE}/${ORGANIZATION}/${repository}/${encodeURIComponent(ref)}/plugin.php`,
  pluginReadme: (repository: string, ref: string) =>
    `${RAW_BASE}/${ORGANIZATION}/${repository}/${encodeURIComponent(ref)}/README.md`,
};

export async function getText(
  url: string,
  token?: string,
  allowNotFound = false,
): Promise<string | null> {
  const headers = new Headers({ "User-Agent": USER_AGENT });
  if (token?.trim()) headers.set("Authorization", `Bearer ${token.trim()}`);

  const response = await fetch(url, { headers });
  if (allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`GitHub request failed (${response.status} ${response.statusText}): ${url}`);
  }
  return response.text();
}

export async function getJson<T>(
  url: string,
  token?: string,
  allowNotFound = false,
): Promise<T | null> {
  const body = await getText(url, token, allowNotFound);
  return body === null ? null : (JSON.parse(body) as T);
}

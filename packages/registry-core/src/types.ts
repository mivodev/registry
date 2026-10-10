export interface Plugin {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: string;
  tags: string[];
  repo: string;
  download: string;
  readme: string;
  updated_at: string;
}

export interface RegistryRelease {
  version: string;
  date: string;
  size: number;
  download: string;
  notes: string;
  prerelease: boolean;
  latest: boolean;
}

export interface GitHubRepository {
  name: string;
  description: string | null;
  html_url: string;
  default_branch: string;
  updated_at: string;
  owner: { login: string };
}

export interface GitHubAsset {
  name: string;
  content_type: string;
  size: number;
  browser_download_url: string;
}

export interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

export interface MivoRelease extends GitHubRelease {
  draft: boolean;
  prerelease: boolean;
  zipball_url: string;
  published_at: string | null;
  html_url: string;
}

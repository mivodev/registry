import assert from "node:assert/strict";
import { afterEach, it } from "node:test";
import { generatePlugins, generateReleases } from "./index.ts";

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

it("builds plugin metadata from the latest tagged plugin.php", async () => {
  const requested: string[] = [];
  const authorizationHeaders: (string | null)[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requested.push(url);
    authorizationHeaders.push(new Headers(init?.headers).get("Authorization"));

    if (url.includes("/orgs/mivodev/repos")) {
      return Response.json([
        {
          name: "plugin-demo",
          description: "Repo description",
          html_url: "https://github.com/mivodev/plugin-demo",
          default_branch: "main",
          updated_at: "2026-01-01T00:00:00Z",
          owner: { login: "mivodev" },
        },
      ]);
    }
    if (url.includes("/releases/latest")) {
      return Response.json({
        tag_name: "v2.0.0",
        assets: [{ browser_download_url: "https://example.test/plugin.zip" }],
      });
    }
    if (url.endsWith("/plugin.php")) {
      return new Response(
        "<?php\n/*\n * Plugin Name: Demo Plugin\n * Description: A demo\n * Author: Demo Author\n * Tags: one, two\n */",
      );
    }
    throw new Error(`Unexpected URL: ${url}`);
  };
  console.warn = () => {};

  const plugins = await generatePlugins("secret");

  assert.deepEqual(plugins, [
    {
      id: "plugin-demo",
      name: "Demo Plugin",
      description: "A demo",
      author: "Demo Author",
      version: "v2.0.0",
      category: "Uncategorized",
      tags: ["one", "two"],
      repo: "https://github.com/mivodev/plugin-demo",
      download: "https://example.test/plugin.zip",
      readme: "https://raw.githubusercontent.com/mivodev/plugin-demo/v2.0.0/README.md",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ]);
  assert.ok(requested.some((url) => url.endsWith("/v2.0.0/plugin.php")));
  assert.ok(authorizationHeaders.includes("Bearer secret"));
});

it("marks the first non-prerelease release as latest and skips drafts", async () => {
  globalThis.fetch = async () =>
    Response.json([
      {
        tag_name: "v3.0.0-beta",
        draft: false,
        prerelease: true,
        zipball_url: "https://example.test/beta.zip",
        published_at: "2026-01-03T00:00:00Z",
        html_url: "https://github.com/mivodev/mivo/releases/tag/v3.0.0-beta",
        assets: [],
      },
      {
        tag_name: "v2.0.0",
        draft: false,
        prerelease: false,
        zipball_url: "https://example.test/v2.zip",
        published_at: "2026-01-02T00:00:00Z",
        html_url: "https://github.com/mivodev/mivo/releases/tag/v2.0.0",
        assets: [
          {
            name: "mivo.zip",
            content_type: "application/zip",
            size: 42,
            browser_download_url: "https://example.test/mivo.zip",
          },
        ],
      },
      {
        tag_name: "v1.0.0",
        draft: true,
        prerelease: false,
        zipball_url: "https://example.test/draft.zip",
        published_at: "2026-01-01T00:00:00Z",
        html_url: "https://github.com/mivodev/mivo/releases/tag/v1.0.0",
        assets: [],
      },
    ]);

  assert.deepEqual(await generateReleases(), [
    {
      version: "v3.0.0-beta",
      date: "2026-01-03",
      size: 0,
      download: "https://example.test/beta.zip",
      notes: "https://github.com/mivodev/mivo/releases/tag/v3.0.0-beta",
      prerelease: true,
      latest: false,
    },
    {
      version: "v2.0.0",
      date: "2026-01-02",
      size: 42,
      download: "https://example.test/mivo.zip",
      notes: "https://github.com/mivodev/mivo/releases/tag/v2.0.0",
      prerelease: false,
      latest: true,
    },
  ]);
});

it("fails clearly when GitHub returns an error", async () => {
  globalThis.fetch = async () => new Response("rate limited", { status: 403 });
  await assert.rejects(generatePlugins(), /GitHub request failed \(403/);
});

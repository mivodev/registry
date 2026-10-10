import { config } from "dotenv";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { generatePlugins, generateReleases } from "@mivo/registry-core";

config({ path: join(import.meta.dirname, "../../.env") });

const outputDirectory = join(import.meta.dirname, "public");
const token = process.env.GH_PAT ?? process.env.GITHUB_TOKEN;

console.log("Starting Registry Generation...");
const plugins = await generatePlugins(token);
console.log(`Generated ${plugins.length} plugins.`);

const releases = await generateReleases(token);
console.log(`Generated ${releases.length} releases.`);

await mkdir(outputDirectory, { recursive: true });
await Promise.all([
  writeFile(join(outputDirectory, "plugins.json"), JSON.stringify(plugins)),
  writeFile(join(outputDirectory, "releases.json"), JSON.stringify(releases)),
]);

console.log(`Saved registry JSON files to ${outputDirectory}.`);

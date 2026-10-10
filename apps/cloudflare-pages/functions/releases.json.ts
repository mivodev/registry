import { generateReleases } from "@mivo/registry-core";

interface Env {
  GH_PAT?: string;
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  try {
    const releases = await generateReleases(env.GH_PAT);
    return Response.json(releases, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (error) {
    console.error("Failed to generate release archive:", error);
    return Response.json({ error: "Failed to generate release archive." }, { status: 502 });
  }
};

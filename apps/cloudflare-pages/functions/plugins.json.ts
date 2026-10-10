import { generatePlugins } from "@mivo/registry-core";

interface Env {
  GH_PAT?: string;
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  try {
    const plugins = await generatePlugins(env.GH_PAT);
    return Response.json(plugins, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" },
    });
  } catch (error) {
    console.error("Failed to generate plugin registry:", error);
    return Response.json({ error: "Failed to generate plugin registry." }, { status: 502 });
  }
};

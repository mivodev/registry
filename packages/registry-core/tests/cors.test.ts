import assert from "node:assert/strict";
import { it } from "node:test";
import { withCors } from "../src/lib/cors.ts";

const env = {
  CORS_ALLOWED_ORIGINS: "https://www.mivo.qd.je, https://preview.mivo.qd.je",
};

it("adds CORS headers to allowed origins and preserves the response", async () => {
  const response = await withCors(
    new Request("https://registry.mivo.qd.je/plugins.json", {
      headers: { Origin: "https://www.mivo.qd.je" },
    }),
    env,
    async () => Response.json({ plugins: [] }, { headers: { "Cache-Control": "max-age=300" } }),
  );

  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://www.mivo.qd.je");
  assert.equal(response.headers.get("Vary"), "Origin");
  assert.equal(response.headers.get("Cache-Control"), "max-age=300");
  assert.deepEqual(await response.json(), { plugins: [] });
});

it("does not grant access to unconfigured origins", async () => {
  const response = await withCors(
    new Request("https://registry.mivo.qd.je/plugins.json", {
      headers: { Origin: "https://untrusted.example" },
    }),
    env,
    async () => Response.json([]),
  );

  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
  assert.equal(response.headers.get("Vary"), "Origin");
});

it("answers valid preflight requests without running the endpoint", async () => {
  let handlerCalled = false;
  const response = await withCors(
    new Request("https://registry.mivo.qd.je/plugins.json", {
      method: "OPTIONS",
      headers: {
        Origin: "https://www.mivo.qd.je",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type",
      },
    }),
    env,
    async () => {
      handlerCalled = true;
      return Response.json([]);
    },
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://www.mivo.qd.je");
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, OPTIONS");
  assert.equal(response.headers.get("Access-Control-Allow-Headers"), "Content-Type, Authorization");
  assert.equal(response.headers.get("Access-Control-Max-Age"), "86400");
  assert.equal(response.headers.get("Vary"), "Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  assert.equal(handlerCalled, false);
});

it("rejects origins and methods not present in the configured policy", async () => {
  const response = await withCors(
    new Request("https://registry.mivo.qd.je/plugins.json", {
      method: "OPTIONS",
      headers: {
        Origin: "https://untrusted.example",
        "Access-Control-Request-Method": "DELETE",
      },
    }),
    env,
    async () => Response.json([]),
  );

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), null);
});

it("requires credentialed CORS to use an explicit allowed origin", async () => {
  await assert.rejects(
    withCors(new Request("https://registry.mivo.qd.je/plugins.json"), {
      CORS_ALLOWED_ORIGINS: "*",
      CORS_ALLOW_CREDENTIALS: "true",
    }, async () => Response.json([])),
    /cannot be enabled when CORS_ALLOWED_ORIGINS is '\*'/,
  );
});

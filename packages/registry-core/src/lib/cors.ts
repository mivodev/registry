export interface CorsEnv {
  CORS_ALLOWED_ORIGINS?: string;
  CORS_ALLOW_METHODS?: string;
  CORS_ALLOW_HEADERS?: string;
  CORS_ALLOW_CREDENTIALS?: string;
  CORS_MAX_AGE?: string;
}

interface CorsConfig {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: string;
}

function parseList(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function readConfig(env: CorsEnv): CorsConfig {
  const origins = parseList(env.CORS_ALLOWED_ORIGINS, "");
  const methods = parseList(env.CORS_ALLOW_METHODS, "GET, OPTIONS").map((method) =>
    method.toUpperCase(),
  );
  const headers = parseList(env.CORS_ALLOW_HEADERS, "Content-Type, Authorization");
  const credentialsValue = env.CORS_ALLOW_CREDENTIALS?.trim().toLowerCase() ?? "false";
  const maxAge = env.CORS_MAX_AGE?.trim() ?? "86400";

  if (credentialsValue !== "true" && credentialsValue !== "false") {
    throw new Error("CORS_ALLOW_CREDENTIALS must be 'true' or 'false'.");
  }
  if (!/^\d+$/.test(maxAge)) {
    throw new Error("CORS_MAX_AGE must be a non-negative integer.");
  }
  if (origins.includes("*") && origins.length !== 1) {
    throw new Error("CORS_ALLOWED_ORIGINS cannot combine '*' with specific origins.");
  }
  if (origins.includes("*") && credentialsValue === "true") {
    throw new Error("CORS credentials cannot be enabled when CORS_ALLOWED_ORIGINS is '*'.");
  }

  return {
    origins,
    methods,
    headers,
    credentials: credentialsValue === "true",
    maxAge,
  };
}

function addVary(headers: Headers, value: string): void {
  const existing = headers.get("Vary");
  if (!existing) {
    headers.set("Vary", value);
    return;
  }

  const values = existing.split(",").map((entry) => entry.trim());
  if (values.includes("*")) {
    return;
  }
  const varyValues = new Set(values.map((entry) => entry.toLowerCase()));
  for (const entry of value.split(",")) {
    const trimmed = entry.trim();
    if (!varyValues.has(trimmed.toLowerCase())) {
      values.push(trimmed);
      varyValues.add(trimmed.toLowerCase());
    }
  }
  headers.set("Vary", values.join(", "));
}

function isAllowedOrigin(origin: string, config: CorsConfig): boolean {
  return config.origins.includes("*") || config.origins.includes(origin);
}

function createCorsHeaders(request: Request, config: CorsConfig): Headers {
  const headers = new Headers();
  const origin = request.headers.get("Origin");
  addVary(
    headers,
    request.method === "OPTIONS"
      ? "Origin, Access-Control-Request-Method, Access-Control-Request-Headers"
      : "Origin",
  );

  if (origin && isAllowedOrigin(origin, config)) {
    headers.set("Access-Control-Allow-Origin", config.origins.includes("*") ? "*" : origin);
    if (config.credentials) {
      headers.set("Access-Control-Allow-Credentials", "true");
    }
  }

  return headers;
}

export async function withCors(
  request: Request,
  env: CorsEnv,
  handler: () => Promise<Response>,
): Promise<Response> {
  const config = readConfig(env);
  const headers = createCorsHeaders(request, config);

  if (request.method === "OPTIONS") {
    const origin = request.headers.get("Origin");
    const requestedMethod = request.headers.get("Access-Control-Request-Method");
    const requestedHeaders = parseList(
      request.headers.get("Access-Control-Request-Headers") ?? undefined,
      "",
    );
    const allowedHeaders = config.headers.map((header) => header.toLowerCase());
    const allowed =
      (!origin || isAllowedOrigin(origin, config)) &&
      (!requestedMethod || config.methods.includes(requestedMethod.toUpperCase())) &&
      (allowedHeaders.includes("*") ||
        requestedHeaders.every((header) => allowedHeaders.includes(header.toLowerCase())));

    if (!allowed) {
      return Response.json(
        { error: "CORS preflight request is not allowed." },
        { status: 403, headers },
      );
    }

    headers.set("Access-Control-Allow-Methods", config.methods.join(", "));
    if (config.headers.length > 0) {
      headers.set("Access-Control-Allow-Headers", config.headers.join(", "));
    }
    headers.set("Access-Control-Max-Age", config.maxAge);
    return new Response(null, { status: 204, headers });
  }

  const response = await handler();
  const responseHeaders = new Headers(response.headers);
  for (const [name, value] of headers) {
    if (name.toLowerCase() === "vary") {
      addVary(responseHeaders, value);
    } else {
      responseHeaders.set(name, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

type CorsConfig = {
  origins: string[];
  credentials: boolean;
};

export type AppConfig = {
  port: number;
  cors: CorsConfig;
};

export function validateEnvironment(
  env: NodeJS.ProcessEnv
): AppConfig {
  return {
    port: parsePort(env.PORT, 3000),
    cors: {
      origins: parseCorsOrigins(env.CORS_ORIGIN),
      credentials: parseBoolean(env.CORS_CREDENTIALS, false)
    }
  };
}

export function createCorsOptions(config: CorsConfig) {
  return {
    origin: config.origins.includes("*") ? true : config.origins,
    credentials: config.credentials
  };
}

function parsePort(value: string | undefined, fallback: number): number {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  if (!/^\d+$/.test(normalized)) {
    throw new Error("PORT must be an integer");
  }

  const parsed = Number(normalized);
  if (parsed < 1 || parsed > 65535) {
    throw new Error("PORT must be between 1 and 65535");
  }

  return parsed;
}

function parseCorsOrigins(value: string | undefined): string[] {
  const normalized = value?.trim();
  if (!normalized) {
    return ["*"];
  }

  const origins = normalized
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error("CORS_ORIGIN must contain at least one origin");
  }

  return origins;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error("CORS_CREDENTIALS must be either true or false");
}

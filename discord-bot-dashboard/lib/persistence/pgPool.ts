import { Pool, type PoolConfig } from "pg";

function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required when PERSISTENCE_DRIVER=postgres"
    );
  }

  const max = Number(process.env.PG_POOL_MAX ?? "10");
  const ssl = resolveSsl(connectionString);

  return {
    connectionString,
    max: Number.isFinite(max) && max > 0 ? max : 10,
    ...(ssl !== undefined ? { ssl } : {}),
  };
}

function resolveSsl(
  connectionString: string
): { rejectUnauthorized: boolean } | undefined {
  if (process.env.PG_SSL === "0" || process.env.PG_SSL === "false") {
    return undefined;
  }
  if (
    process.env.PG_SSL === "1" ||
    process.env.PG_SSL === "true" ||
    /sslmode=require|sslmode=verify-full|ssl=true/i.test(connectionString)
  ) {
    return {
      rejectUnauthorized:
        process.env.PG_SSL_REJECT_UNAUTHORIZED === "true",
    };
  }
  return undefined;
}

declare global {
  // eslint-disable-next-line no-var -- Next.js dev HMR: reuse single pool
  var __timbrabotPgPool: Pool | undefined;
}

/**
 * Пул соединений Postgres (singleton в dev/prod для Next.js server).
 */
export function getPool(): Pool {
  if (!globalThis.__timbrabotPgPool) {
    globalThis.__timbrabotPgPool = new Pool(buildPoolConfig());
  }
  return globalThis.__timbrabotPgPool;
}

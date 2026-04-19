const { Pool } = require("pg");

/**
 * @returns {import("pg").PoolConfig}
 */
function getPoolConfig() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required when PERSISTENCE_DRIVER=postgres"
    );
  }

  const max = Number(process.env.PG_POOL_MAX ?? "10");
  /** @type {import("pg").PoolConfig} */
  const cfg = {
    connectionString,
    max: Number.isFinite(max) && max > 0 ? max : 10,
  };

  if (
    process.env.PG_SSL === "1" ||
    process.env.PG_SSL === "true" ||
    /sslmode=require|sslmode=verify-full|ssl=true/i.test(connectionString)
  ) {
    cfg.ssl = {
      rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === "true",
    };
  }

  return cfg;
}

let pool = null;

/**
 * @returns {import("pg").Pool}
 */
function getPool() {
  if (!pool) {
    pool = new Pool(getPoolConfig());
  }
  return pool;
}

module.exports = { getPool };

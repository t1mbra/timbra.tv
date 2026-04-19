/**
 * @returns {"json" | "postgres"}
 */
function getPersistenceDriver() {
  const v = process.env.PERSISTENCE_DRIVER?.trim().toLowerCase();
  if (!v || v === "json") {
    return "json";
  }
  if (v === "postgres") {
    return "postgres";
  }
  throw new Error(
    `Unknown PERSISTENCE_DRIVER="${process.env.PERSISTENCE_DRIVER}". Use "json" or "postgres".`
  );
}

module.exports = { getPersistenceDriver };

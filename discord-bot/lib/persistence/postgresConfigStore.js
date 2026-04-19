function notImplemented() {
  throw new Error(
    "PERSISTENCE_DRIVER=postgres is not implemented yet. Use PERSISTENCE_DRIVER=json."
  );
}

module.exports = {
  readRawConfig: async () => notImplemented(),
  getGuildConfigById: async () => notImplemented(),
};

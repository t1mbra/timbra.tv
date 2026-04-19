function notImplemented() {
  throw new Error(
    "PERSISTENCE_DRIVER=postgres is not implemented yet. Use PERSISTENCE_DRIVER=json."
  );
}

module.exports = {
  writeBotStatePayload: async () => notImplemented(),
  getConnectedGuildIds: async () => notImplemented(),
  isBotConnected: async () => notImplemented(),
  writeConnectedGuildIds: async () => notImplemented(),
};

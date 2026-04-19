function notImplemented(): never {
  throw new Error(
    "PERSISTENCE_DRIVER=postgres is not implemented yet. Use PERSISTENCE_DRIVER=json."
  );
}

export async function getConnectedGuildIds(): Promise<Set<string>> {
  return notImplemented();
}

export async function isBotConnected(_guildId: string): Promise<boolean> {
  return notImplemented();
}

export async function writeConnectedGuildIds(
  _guildIds: readonly string[]
): Promise<void> {
  return notImplemented();
}

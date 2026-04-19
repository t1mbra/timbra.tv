/** Не секрет: последний выбранный дашборд для post-OAuth редиректа (читается на сервере). */
export const LAST_GUILD_COOKIE_NAME = "timbrabot_last_guild_id";

const MAX_AGE_SEC = 31536000;

/** Клиент: запомнить гильдию при входе на дашборд. localStorage на Home не трогаем. */
export function setLastGuildCookieClient(guildId: string): void {
  if (typeof document === "undefined") return;
  const id = guildId.trim();
  if (!id) return;
  const secure = globalThis.location?.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LAST_GUILD_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=${MAX_AGE_SEC}; SameSite=Lax${secure}`;
}

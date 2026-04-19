/**
 * Единая точка отображения версии (клиент и сервер).
 * Задаётся в .env как NEXT_PUBLIC_APP_VERSION при необходимости.
 */
export function getAppVersionDisplay(): string {
  const v = process.env.NEXT_PUBLIC_APP_VERSION;
  if (typeof v === "string" && v.trim()) return v.trim();
  return "0.3.1";
}

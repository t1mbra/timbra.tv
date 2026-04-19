/**
 * Публичный origin дашборда для абсолютных редиректов после OAuth.
 * На Railway/за reverse proxy `request.url` часто указывает на внутренний host (localhost:8080),
 * поэтому в production задают APP_ORIGIN.
 */
export function getPublicOrigin(request: Request): string {
  const raw = process.env.APP_ORIGIN?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return new URL(request.url).origin;
}

/** Абсолютный URL path (например `/servers`) на публичном origin. */
export function publicAbsoluteUrl(path: string, request: Request): URL {
  const origin = getPublicOrigin(request);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, origin);
}

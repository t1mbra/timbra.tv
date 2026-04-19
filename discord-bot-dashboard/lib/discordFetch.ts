const DISCORD_API_BASE = "https://discord.com/api";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Небольшой джиттер, чтобы не бить API синхронно при ретраях */
function backoffMs(attemptIndex: number) {
  const base = 250 * 2 ** attemptIndex;
  const capped = Math.min(base, 4000);
  const jitter = Math.floor(Math.random() * 120);
  return capped + jitter;
}

function parseRetryAfterSeconds(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

type DiscordFetchOptions = RequestInit & {
  /** Таймаут одной попытки (мс). По умолчанию 8000 */
  timeoutMs?: number;
  /**
   * Сколько раз повторить запрос после неудачи (ECONNRESET, таймаут, 5xx, 429).
   * 2 = всего до 3 попыток.
   */
  maxRetries?: number;
};

/**
 * Fetch к Discord API с таймаутом и ретраями с экспоненциальным бэкоффом.
 * На исчерпании ретраев бросает последнюю ошибку (сеть / abort).
 * HTTP-ответы 4xx (кроме ретраимых случаев) возвращаются как обычный Response.
 */
export async function discordFetch(
  path: string,
  init: DiscordFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 8000,
    maxRetries = 2,
    ...fetchInit
  } = init;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${DISCORD_API_BASE}${path}`, {
        ...fetchInit,
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        return res;
      }

      if (res.status === 429 && attempt < maxRetries) {
        const sec = parseRetryAfterSeconds(res);
        await sleep(sec != null ? sec * 1000 : backoffMs(attempt));
        continue;
      }

      if (res.status >= 500 && res.status < 600 && attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }

      return res;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }

  throw lastError ?? new Error("Discord fetch failed after retries");
}

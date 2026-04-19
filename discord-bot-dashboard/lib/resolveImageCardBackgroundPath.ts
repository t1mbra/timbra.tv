import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Безопасно собирает абсолютный путь к фону карточки из относительного пути в config.
 * Отклоняет `..` и пути вне `sharedDataRoot`.
 */
export function resolveImageCardBackgroundAbsolutePath(
  sharedDataRoot: string,
  relativePath: string | undefined | null
): string | null {
  if (!relativePath || typeof relativePath !== "string") return null;
  const r = relativePath.trim().replace(/\\/g, "/");
  if (!r || r.includes("..")) return null;
  const root = path.resolve(sharedDataRoot);
  const full = path.resolve(sharedDataRoot, r);
  const rel = path.relative(root, full);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  if (!existsSync(full)) return null;
  return full;
}

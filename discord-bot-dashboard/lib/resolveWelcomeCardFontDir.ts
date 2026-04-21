import { existsSync } from "node:fs";
import path from "node:path";

import { IMAGE_CARD_FONT_FILES, IMAGE_CARD_FONT_KEYS } from "./welcomeCardConstants";
import { resolveSharedDataDir } from "./resolveSharedDataDir";

function dirHasFontFile(dir: string, key: (typeof IMAGE_CARD_FONT_KEYS)[number]): boolean {
  return existsSync(path.join(dir, IMAGE_CARD_FONT_FILES[key]));
}

/** Есть ли в каталоге хотя бы один whitelist-шрифт (файл .ttf). */
export function welcomeCardFontDirHasAnyFont(dir: string): boolean {
  return IMAGE_CARD_FONT_KEYS.some((k) => dirHasFontFile(dir, k));
}

/**
 * Каталог TTF для карточки приветствия (дашборд превью + PNG + список в UI).
 * Порядок: WELCOME_CARD_FONT_DIR → бандл в репозитории → shared-data/fonts/welcome-card.
 */
export function resolveWelcomeCardFontDir(): string {
  const candidates: string[] = [];
  const env = process.env.WELCOME_CARD_FONT_DIR;
  if (env != null && String(env).trim() !== "") {
    candidates.push(path.resolve(String(env).trim()));
  }
  candidates.push(
    path.resolve(process.cwd(), "assets/fonts/welcome-card"),
    path.resolve(process.cwd(), "../assets/fonts/welcome-card"),
    path.resolve(process.cwd(), "shared-assets/fonts/welcome-card"),
    path.resolve(process.cwd(), "../shared-assets/fonts/welcome-card"),
    path.join(resolveSharedDataDir(), "fonts", "welcome-card")
  );

  const seen = new Set<string>();
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (welcomeCardFontDirHasAnyFont(resolved)) return resolved;
  }

  return path.resolve(process.cwd(), "assets/fonts/welcome-card");
}

/** Для превью/API: не показывать в списке шрифт, если нет файла в выбранном каталоге. */
export function welcomeCardFontDirHasFont(
  dir: string,
  key: (typeof IMAGE_CARD_FONT_KEYS)[number]
): boolean {
  return dirHasFontFile(dir, key);
}

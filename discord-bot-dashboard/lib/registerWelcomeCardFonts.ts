import { existsSync } from "node:fs";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";

import {
  IMAGE_CARD_CANVAS_FAMILY,
  IMAGE_CARD_FONT_FILES,
  IMAGE_CARD_FONT_KEYS,
  type ImageCardFontKey,
} from "./welcomeCardConstants";

const registeredDirs = new Set<string>();
const registrationStatusByDir = new Map<string, Map<ImageCardFontKey, boolean>>();

/**
 * Регистрирует TTF из `fontDir` для @napi-rs/canvas (идемпотентно по пути).
 * Разные каталоги обрабатываются отдельно; пустой каталог не блокирует следующий.
 */
export function ensureWelcomeCardFontsRegistered(fontDir: string): void {
  const key = path.resolve(fontDir);
  if (registeredDirs.has(key)) return;
  const status = new Map<ImageCardFontKey, boolean>();
  for (const fontKey of IMAGE_CARD_FONT_KEYS) {
    const file = IMAGE_CARD_FONT_FILES[fontKey];
    const full = path.join(fontDir, file);
    if (!existsSync(full)) {
      status.set(fontKey, false);
      continue;
    }
    try {
      GlobalFonts.registerFromPath(full, IMAGE_CARD_CANVAS_FAMILY[fontKey]);
      status.set(fontKey, true);
    } catch (e) {
      status.set(fontKey, false);
      console.warn("[welcomeCard] registerFromPath failed:", fontKey, e);
    }
  }
  registrationStatusByDir.set(key, status);
  registeredDirs.add(key);
}

export function didWelcomeCardFontRegister(fontDir: string, fontKey: ImageCardFontKey): boolean {
  const byKey = registrationStatusByDir.get(path.resolve(fontDir));
  if (!byKey) return false;
  return byKey.get(fontKey) === true;
}

export function canvasFontFamilyName(key: ImageCardFontKey): string {
  return IMAGE_CARD_CANVAS_FAMILY[key] ?? IMAGE_CARD_CANVAS_FAMILY.inter;
}

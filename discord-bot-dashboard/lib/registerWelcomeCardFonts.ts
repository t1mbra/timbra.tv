import { existsSync } from "node:fs";
import path from "node:path";
import { GlobalFonts } from "@napi-rs/canvas";

import {
  IMAGE_CARD_CANVAS_FAMILY,
  IMAGE_CARD_FONT_FILES,
  IMAGE_CARD_FONT_KEYS,
  type ImageCardFontKey,
} from "./welcomeCardConstants";

let registered = false;

/**
 * Регистрирует TTF из `fontDir` для @napi-rs/canvas (идемпотентно).
 * При ошибке отдельного файла — предупреждение, без throw.
 */
export function ensureWelcomeCardFontsRegistered(fontDir: string): void {
  if (registered) return;
  for (const key of IMAGE_CARD_FONT_KEYS) {
    const file = IMAGE_CARD_FONT_FILES[key];
    const full = path.join(fontDir, file);
    if (!existsSync(full)) {
      console.warn("[welcomeCard] font file missing:", full);
      continue;
    }
    try {
      GlobalFonts.registerFromPath(full, IMAGE_CARD_CANVAS_FAMILY[key]);
    } catch (e) {
      console.warn("[welcomeCard] registerFromPath failed:", key, e);
    }
  }
  registered = true;
}

export function canvasFontFamilyName(key: ImageCardFontKey): string {
  return IMAGE_CARD_CANVAS_FAMILY[key] ?? IMAGE_CARD_CANVAS_FAMILY.inter;
}

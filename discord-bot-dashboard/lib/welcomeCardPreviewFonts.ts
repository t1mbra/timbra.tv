import { IMAGE_CARD_CANVAS_FAMILY, type ImageCardFontKey } from "./welcomeCardConstants";

/** Те же имена семейств, что регистрируются в canvas и в @font-face (локальные TTF). */
export function welcomeCardPreviewFontStack(key: ImageCardFontKey): string {
  const name = IMAGE_CARD_CANVAS_FAMILY[key] ?? IMAGE_CARD_CANVAS_FAMILY.inter;
  return `"${name}", system-ui, sans-serif`;
}

/**
 * Общие константы карточки приветствия (дашборд + согласованность с ботом).
 * Для PNG: положите соответствующие .ttf в shared-data/fonts/welcome-card/ (см. IMAGE_CARD_FONT_FILES).
 */

export const IMAGE_CARD_FONT_KEYS = [
  "inter",
  "manrope",
  "montserrat",
  "nunito",
  "rubik",
  "roboto",
  "oswald",
  "open_sans",
  "play",
  "russo_one",
  "comfortaa",
  "cormorant_garamond",
  "alice",
  "marck_script",
  "underdog",
  "cinzel",
] as const;

export type ImageCardFontKey = (typeof IMAGE_CARD_FONT_KEYS)[number];

export function isImageCardFontKey(s: string): s is ImageCardFontKey {
  return (IMAGE_CARD_FONT_KEYS as readonly string[]).includes(s);
}

/** Имя семейства для canvas/CSS после registerFromPath и @font-face (локальный TTF) */
export const IMAGE_CARD_CANVAS_FAMILY: Record<ImageCardFontKey, string> = {
  inter: "Inter",
  manrope: "Manrope",
  montserrat: "Montserrat",
  nunito: "Nunito Sans",
  rubik: "Rubik",
  roboto: "Roboto",
  oswald: "Oswald",
  open_sans: "Open Sans",
  play: "Play",
  russo_one: "Russo One",
  comfortaa: "Comfortaa",
  cormorant_garamond: "Cormorant Garamond",
  alice: "Alice",
  marck_script: "Marck Script",
  underdog: "Underdog",
  cinzel: "Cinzel",
};

/** Короткие имена для списка шрифтов (совпадают с семейством в PNG) */
export const IMAGE_CARD_FONT_DISPLAY_NAME = IMAGE_CARD_CANVAS_FAMILY;

/** Ожидаемые имена файлов в shared-data/fonts/welcome-card/ */
export const IMAGE_CARD_FONT_FILES: Record<ImageCardFontKey, string> = {
  inter: "inter.ttf",
  manrope: "manrope.ttf",
  montserrat: "montserrat.ttf",
  nunito: "nunito.ttf",
  rubik: "rubik.ttf",
  roboto: "roboto.ttf",
  oswald: "oswald.ttf",
  open_sans: "open-sans.ttf",
  play: "play.ttf",
  russo_one: "russo-one.ttf",
  comfortaa: "comfortaa.ttf",
  cormorant_garamond: "cormorant-garamond.ttf",
  alice: "alice.ttf",
  marck_script: "marck-script.ttf",
  underdog: "underdog.ttf",
  cinzel: "cinzel.ttf",
};

export const DEFAULT_IMAGE_CARD_FONT: ImageCardFontKey = "inter";

export const DEFAULT_TEXT_COLOR = "#f4f4f5";
export const DEFAULT_OVERLAY_COLOR = "#09090b";
export const DEFAULT_OVERLAY_OPACITY = 0.35;

/** Относительный путь от shared-data; подставляется guildId при сохранении */
export function welcomeCardBackgroundRelativePath(guildId: string, ext: string): string {
  const safeExt = ext.replace(/^\./, "").toLowerCase();
  return `assets/guilds/${guildId}/welcome-card-background.${safeExt}`;
}

const { existsSync } = require("fs");
const path = require("path");

const { resolveSharedDataDir } = require("./resolveSharedDataDir");

const FONT_FILES = {
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

const FONT_KEYS = Object.keys(FONT_FILES);

function welcomeCardFontDirHasAnyFont(dir) {
  return FONT_KEYS.some((k) => existsSync(path.join(dir, FONT_FILES[k])));
}

/**
 * Должен совпадать по порядку с `discord-bot-dashboard/lib/resolveWelcomeCardFontDir.ts`.
 * @returns {string}
 */
function resolveWelcomeCardFontDir() {
  const candidates = [];
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

  const seen = new Set();
  for (const dir of candidates) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (welcomeCardFontDirHasAnyFont(resolved)) return resolved;
  }

  return path.resolve(process.cwd(), "assets/fonts/welcome-card");
}

module.exports = {
  resolveWelcomeCardFontDir,
  welcomeCardFontDirHasAnyFont,
};

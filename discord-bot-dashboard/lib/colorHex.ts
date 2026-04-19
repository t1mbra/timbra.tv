/** Нормализует ввод HEX (#fff, ffffff, …) в #rrggbb. При невалидном значении возвращает fallback. */
export function normalizeHexColor(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!t) return fallback;
  let s = t.replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(s)) {
    return `#${s
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  return fallback;
}

/** Строка готова к нормализации (3 или 6 hex-цифр, # опционально). */
export function isValidHexInput(raw: string): boolean {
  const s = raw.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{6}$/.test(s) || /^[0-9a-fA-F]{3}$/.test(s);
}

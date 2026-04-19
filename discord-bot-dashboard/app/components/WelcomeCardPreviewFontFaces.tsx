"use client";

import { useEffect, useMemo } from "react";

import { IMAGE_CARD_CANVAS_FAMILY, type ImageCardFontKey } from "@/lib/welcomeCardConstants";

const STYLE_ID = "welcome-card-dashboard-font-faces";

/**
 * Подключает те же локальные TTF, что и генератор PNG (@napi-rs/canvas), через @font-face.
 */
export function WelcomeCardPreviewFontFaces({ fontKeys }: { fontKeys: ImageCardFontKey[] }) {
  const dep = useMemo(() => [...fontKeys].sort().join(","), [fontKeys.join(",")]);

  useEffect(() => {
    if (!dep) {
      const existing = document.getElementById(STYLE_ID);
      if (existing) existing.textContent = "";
      return;
    }

    const sorted = dep.split(",").filter(Boolean) as ImageCardFontKey[];
    const el =
      (document.getElementById(STYLE_ID) as HTMLStyleElement | null) ??
      (() => {
        const s = document.createElement("style");
        s.id = STYLE_ID;
        document.head.appendChild(s);
        return s;
      })();

    el.textContent = sorted
      .map((k) => {
        const family = IMAGE_CARD_CANVAS_FAMILY[k];
        const url = `/api/fonts/welcome-card/${k}`;
        return `@font-face{font-family:${JSON.stringify(family)};src:url("${url}") format("truetype");font-display:swap;font-weight:100 900;font-style:normal italic;}`;
      })
      .join("\n");
  }, [dep]);

  return null;
}

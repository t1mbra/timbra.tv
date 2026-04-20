import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import {
  welcomeCardFontDirHasFont,
  resolveWelcomeCardFontDir,
} from "@/lib/resolveWelcomeCardFontDir";
import { IMAGE_CARD_FONT_FILES, isImageCardFontKey } from "@/lib/welcomeCardConstants";

export async function GET(
  _request: Request,
  context: { params: Promise<{ fontKey: string }> }
) {
  const { fontKey } = await context.params;
  if (!isImageCardFontKey(fontKey)) {
    return new NextResponse("Не найдено", { status: 404 });
  }
  const dir = resolveWelcomeCardFontDir();
  if (!welcomeCardFontDirHasFont(dir, fontKey)) {
    return new NextResponse("Не найдено", { status: 404 });
  }
  const filename = IMAGE_CARD_FONT_FILES[fontKey];
  const fullPath = path.join(dir, filename);
  try {
    const buf = await readFile(fullPath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "font/ttf",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Не найдено", { status: 404 });
  }
}

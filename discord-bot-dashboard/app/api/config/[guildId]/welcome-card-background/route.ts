import { cookies } from "next/headers";
import { readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";
import { mergeImageCard } from "@/lib/mergeImageCardConfig";
import type { GuildConfig } from "@/lib/persistence/configTypes";
import {
  readRawConfig,
  writeRawConfig,
} from "@/lib/persistence/configStore";
import { listAvailableWelcomeCardFontKeys } from "@/lib/resolveImageCardFont";
import { resolveWelcomeCardFontDir } from "@/lib/resolveWelcomeCardFontDir";
import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";
import {
  MAX_IMAGE_CARD_BACKGROUND_DATA_URL_CHARS,
  MAX_IMAGE_CARD_BACKGROUND_FILE_BYTES,
} from "@/lib/welcomeCardConstants";

const SNOWFLAKE_RE = /^\d{17,20}$/;

const MIME_TO_EXT: Record<string, "png" | "jpg" | "webp"> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
};

const CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

type DiscordGuild = { id: string };

async function fetchGuildsForUser(accessToken: string) {
  return discordFetch("/users/@me/guilds?limit=200", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

async function assertGuildAccess(
  guildId: string,
  accessToken: string
): Promise<Response | null> {
  const guildsRes = await fetchGuildsForUser(accessToken);
  if (!guildsRes.ok) {
    return NextResponse.json({ error: "Не удалось проверить доступ" }, { status: 502 });
  }
  const userGuilds = (await guildsRes.json()) as DiscordGuild[];
  if (!userGuilds.some((g) => g.id === guildId)) {
    return NextResponse.json({ error: "Нет доступа к серверу" }, { status: 403 });
  }
  return null;
}

function guildAssetsDir(guildId: string): string {
  return path.join(resolveSharedDataDir(), "assets", "guilds", guildId);
}

async function findBackgroundFile(guildId: string): Promise<{
  fullPath: string;
  ext: string;
} | null> {
  const dir = guildAssetsDir(guildId);
  const base = "welcome-card-background";
  for (const ext of ["png", "jpg", "jpeg", "webp"] as const) {
    const p = path.join(dir, `${base}.${ext}`);
    try {
      const s = await stat(p);
      if (s.isFile()) return { fullPath: p, ext };
    } catch {
      /* next */
    }
  }
  return null;
}

/** GET — фон для превью по legacy-пути на диске (без data URL в конфиге). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await context.params;
  if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
    return NextResponse.json({ error: "Некорректный guildId" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const deny = await assertGuildAccess(guildId, accessToken);
  if (deny) return deny;

  const found = await findBackgroundFile(guildId);
  if (!found) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  const buf = await readFile(found.fullPath);
  const ct = CONTENT_TYPE[found.ext] ?? "application/octet-stream";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": ct,
      "Cache-Control": "private, max-age=60",
    },
  });
}

/** POST — multipart: сохраняет фон в конфиг гильдии как data URL (Postgres/JSON). */
export async function POST(
  request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await context.params;
  if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
    return NextResponse.json({ error: "Некорректный guildId" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const deny = await assertGuildAccess(guildId, accessToken);
  if (deny) return deny;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Некорректные данные формы" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Нужен файл в поле file" }, { status: 400 });
  }

  if (file.size > MAX_IMAGE_CARD_BACKGROUND_FILE_BYTES) {
    return NextResponse.json(
      { error: "Файл слишком большой (макс. ~1,4 МБ)" },
      { status: 400 }
    );
  }

  const mime = file.type || "application/octet-stream";
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    return NextResponse.json(
      { error: "Допустимы только PNG, JPEG или WebP" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeForData = mime === "image/jpg" ? "image/jpeg" : mime;
  const dataUrl = `data:${mimeForData};base64,${buf.toString("base64")}`;

  if (dataUrl.length > MAX_IMAGE_CARD_BACKGROUND_DATA_URL_CHARS) {
    return NextResponse.json(
      {
        error:
          "Слишком большой объём данных после кодирования. Выберите файл меньшего размера.",
      },
      { status: 400 }
    );
  }

  const root = await readRawConfig();
  const prev = root.guilds[guildId];
  if (!prev || typeof prev !== "object") {
    return NextResponse.json(
      {
        error: "Сначала сохраните настройки сервера (кнопка «Сохранить»).",
      },
      { status: 400 }
    );
  }

  const prevIc = prev.imageCard;
  const avail = listAvailableWelcomeCardFontKeys(resolveWelcomeCardFontDir());
  const nextIc = mergeImageCard(
    {
      ...(prevIc && typeof prevIc === "object" ? prevIc : {}),
      backgroundImageDataUrl: dataUrl,
      backgroundMode: "image",
      backgroundImage: { enabled: true, path: "", filename: undefined },
    },
    { availableFontKeys: avail }
  );

  root.guilds[guildId] = { ...(prev as GuildConfig), imageCard: nextIc };

  await writeRawConfig(root);

  try {
    const dir = guildAssetsDir(guildId);
    const entries = await readdir(dir).catch(() => [] as string[]);
    for (const name of entries) {
      if (name.startsWith("welcome-card-background.")) {
        await unlink(path.join(dir, name)).catch(() => {});
      }
    }
  } catch {
    /* нет legacy-файлов */
  }

  return NextResponse.json({
    ok: true,
    backgroundImageDataUrl: dataUrl,
    path: "",
    filename: undefined,
  });
}

/** DELETE — убрать фон из конфига и legacy-файлы. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await context.params;
  if (!guildId || !SNOWFLAKE_RE.test(guildId)) {
    return NextResponse.json({ error: "Некорректный guildId" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("discord_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Требуется вход" }, { status: 401 });
  }

  const deny = await assertGuildAccess(guildId, accessToken);
  if (deny) return deny;

  const root = await readRawConfig();
  const prev = root.guilds[guildId];
  if (!prev || typeof prev !== "object") {
    return NextResponse.json({ ok: true });
  }

  const prevIc = prev.imageCard;
  const avail = listAvailableWelcomeCardFontKeys(resolveWelcomeCardFontDir());
  const nextIc = mergeImageCard(
    {
      ...(prevIc && typeof prevIc === "object" ? prevIc : {}),
      backgroundImageDataUrl: "",
      backgroundMode: "image",
      backgroundImage: { enabled: false, path: "", filename: undefined },
    },
    { availableFontKeys: avail }
  );

  root.guilds[guildId] = { ...(prev as GuildConfig), imageCard: nextIc };

  await writeRawConfig(root);

  try {
    const dir = guildAssetsDir(guildId);
    const entries = await readdir(dir);
    for (const name of entries) {
      if (name.startsWith("welcome-card-background.")) {
        await unlink(path.join(dir, name)).catch(() => {});
      }
    }
  } catch {
    /* нет папки */
  }

  return NextResponse.json({ ok: true });
}

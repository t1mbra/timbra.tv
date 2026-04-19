import { cookies } from "next/headers";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { discordFetch } from "@/lib/discordFetch";
import { welcomeCardBackgroundRelativePath } from "@/lib/welcomeCardConstants";
import { resolveSharedDataDir } from "@/lib/resolveSharedDataDir";

const SNOWFLAKE_RE = /^\d{17,20}$/;
const MAX_BYTES = 2_500_000;

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

/** GET — фон для превью (с cookie сессии) */
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

/** POST — multipart: поле `file` */
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

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Файл слишком большой (макс. 2,5 МБ)" }, { status: 400 });
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
  const dir = guildAssetsDir(guildId);
  await mkdir(dir, { recursive: true });

  try {
    const entries = await readdir(dir);
    for (const name of entries) {
      if (name.startsWith("welcome-card-background.")) {
        await unlink(path.join(dir, name)).catch(() => {});
      }
    }
  } catch {
    /* пустая папка */
  }

  const filename = `welcome-card-background.${ext}`;
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, buf);

  const relativePath = welcomeCardBackgroundRelativePath(guildId, ext);
  return NextResponse.json({
    ok: true,
    path: relativePath,
    filename,
  });
}

/** DELETE — удалить фон */
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

  const dir = guildAssetsDir(guildId);
  try {
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

"use client";

import { CircleCheck, Unplug } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UserMenu } from "../components/usermenu";

type DashboardBootstrap = {
  viewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  bot: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
  } | null;
  applicationId?: string | null;
  bootstrapWarnings?: string[];
};

type GuildSummary = {
  id: string;
  name: string;
  iconUrl: string | null;
  owner: boolean;
  permissions: string;
  botConnected: boolean;
};

const MODAL_POLL_MS = 2500;
const MODAL_POLL_MAX_MS = 90_000;

const BOT_INVITE_PERMISSIONS = "268553216";

/** Discord permission bits (same as API route checks where applicable). */
const PERM_ADMINISTRATOR = BigInt("0x8");
const PERM_MANAGE_GUILD = BigInt("0x20");

function getGuildRolePresentation(guild: GuildSummary): {
  shortLabel: string;
  fullLabel: string;
} {
  if (guild.owner) {
    return { shortLabel: "Вл.", fullLabel: "Владелец" };
  }
  try {
    const value = BigInt(guild.permissions);
    if ((value & PERM_ADMINISTRATOR) === PERM_ADMINISTRATOR) {
      return { shortLabel: "Адм.", fullLabel: "Администратор" };
    }
    if ((value & PERM_MANAGE_GUILD) === PERM_MANAGE_GUILD) {
      return { shortLabel: "Мод.", fullLabel: "Управление сервером" };
    }
  } catch {
    /* ignore */
  }
  return { shortLabel: "Адм.", fullLabel: "Администратор" };
}

function buildBotInviteUrl(applicationId: string, guildId: string) {
  const params = new URLSearchParams({
    client_id: applicationId,
    scope: "bot applications.commands",
    permissions: BOT_INVITE_PERMISSIONS,
    guild_id: guildId,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

/** Только для модалки и опроса после invite: подтверждение через API connection */
async function fetchGuildConnectionPoll(
  guildId: string
): Promise<"connected" | "not_connected"> {
  try {
    const res = await fetch(`/api/discord/guilds/${guildId}/connection`, {
      cache: "no-store",
    });
    if (!res.ok) return "not_connected";
    const data = (await res.json()) as {
      botConnected?: boolean;
      presence?: "member" | "not_in_guild" | "unknown";
    };
    if (data.presence === "member" || data.botConnected === true) {
      return "connected";
    }
    return "not_connected";
  } catch {
    return "not_connected";
  }
}

function Avatar({
  src,
  alt,
  fallback,
}: {
  src: string | null;
  alt: string;
  fallback: string;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className="h-10 w-10 rounded-full border border-[#8038CE]/35 object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#8038CE]/35 bg-zinc-800 text-sm font-semibold text-zinc-200">
      {fallback.slice(0, 1).toUpperCase()}
    </div>
  );
}

function GuildCardIcon({
  iconUrl,
  guildName,
}: {
  iconUrl: string | null;
  guildName: string;
}) {
  const [loadFailed, setLoadFailed] = useState(false);
  const letter = guildName.trim().slice(0, 1).toUpperCase() || "?";

  if (!iconUrl || loadFailed) {
    return (
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#8038CE]/35 bg-zinc-800 text-2xl font-semibold text-zinc-200"
        aria-hidden
      >
        {letter}
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt=""
      className="h-16 w-16 shrink-0 rounded-full border border-[#8038CE]/35 object-cover"
      onError={() => setLoadFailed(true)}
    />
  );
}

export default function ServersPage() {
  const router = useRouter();
  const [bootstrap, setBootstrap] = useState<DashboardBootstrap | null>(null);
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(true);
  const [guildsError, setGuildsError] = useState("");
  const [guildsRetryKey, setGuildsRetryKey] = useState(0);
  const [modalGuildId, setModalGuildId] = useState<string | null>(null);
  const [modalPhase, setModalPhase] = useState<
    "intro" | "polling" | "failed"
  >("intro");
  const [modalPollKey, setModalPollKey] = useState(0);
  const pollAbortRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/dashboard/bootstrap", { cache: "no-store" });
        if (cancelled || !res.ok) return;
        const data = (await res.json()) as DashboardBootstrap;
        if (cancelled) return;
        if (!data.viewer) {
          router.replace("/");
          return;
        }
        setBootstrap(data);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadGuilds = useCallback(async () => {
    setGuildsLoading(true);
    setGuildsError("");

    try {
      const guildsRes = await fetch("/api/discord/guilds", { cache: "no-store" });

      if (guildsRes.status === 401) {
        router.replace("/");
        return;
      }

      if (!guildsRes.ok) {
        setGuilds([]);
        setGuildsError("Не удалось загрузить список серверов");
        return;
      }

      const guildsData = (await guildsRes.json()) as {
        guilds: (GuildSummary & { botConnected?: boolean })[];
      };
      const list = (guildsData.guilds ?? []).map((g) => ({
        ...g,
        botConnected: Boolean(g.botConnected),
      }));
      setGuilds(list);
    } catch {
      setGuilds([]);
      setGuildsError("Не удалось загрузить список серверов");
    } finally {
      setGuildsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadGuilds();
  }, [loadGuilds, guildsRetryKey]);

  const retryGuilds = () => setGuildsRetryKey((k) => k + 1);

  const botName = bootstrap?.bot?.name || "Bot";
  const viewerName = bootstrap?.viewer?.name || "Неизвестный пользователь";
  const viewerAvatarUrl = bootstrap?.viewer?.avatarUrl ?? null;

  const rememberLastGuild = (guild: GuildSummary) => {
    try {
      localStorage.setItem("lastGuildId", guild.id);
      localStorage.setItem("lastGuildName", guild.name);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!modalGuildId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModalGuildId(null);
        setModalPhase("intro");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalGuildId]);

  const sortedGuilds = useMemo(() => {
    return [...guilds].sort((a, b) => {
      if (a.botConnected !== b.botConnected) {
        return a.botConnected ? -1 : 1;
      }
      return a.name.localeCompare(b.name, "ru", { sensitivity: "base" });
    });
  }, [guilds]);

  const modalGuild = modalGuildId
    ? guilds.find((g) => g.id === modalGuildId)
    : undefined;
  const inviteModalUrl =
    modalGuild && bootstrap?.applicationId
      ? buildBotInviteUrl(bootstrap.applicationId, modalGuild.id)
      : null;

  const markGuildConnected = useCallback((guildId: string) => {
    setGuilds((prev) =>
      prev.map((g) =>
        g.id === guildId ? { ...g, botConnected: true } : g
      )
    );
  }, []);

  useEffect(() => {
    pollAbortRef.current = false;
    if (!modalGuildId || modalPhase !== "polling") return;

    const guildId = modalGuildId;
    const started = Date.now();

    const runOnce = async () => {
      if (pollAbortRef.current) return;
      const status = await fetchGuildConnectionPoll(guildId);
      if (pollAbortRef.current) return;
      if (status === "connected") {
        markGuildConnected(guildId);
        const g = guilds.find((x) => x.id === guildId);
        if (g) rememberLastGuild(g);
        setModalGuildId(null);
        setModalPhase("intro");
        router.push(`/dashboard/${guildId}`);
        return;
      }
      if (Date.now() - started >= MODAL_POLL_MAX_MS) {
        setModalPhase("failed");
      }
    };

    void runOnce();
    const id = window.setInterval(() => void runOnce(), MODAL_POLL_MS);
    return () => {
      pollAbortRef.current = true;
      window.clearInterval(id);
    };
  }, [
    modalGuildId,
    modalPhase,
    modalPollKey,
    markGuildConnected,
    guilds,
    router,
  ]);

  const openConnectModal = (guildId: string) => {
    setModalGuildId(guildId);
    setModalPhase("intro");
  };

  const closeModal = () => {
    pollAbortRef.current = true;
    setModalGuildId(null);
    setModalPhase("intro");
  };

  const startDiscordPolling = () => {
    if (inviteModalUrl) {
      window.open(inviteModalUrl, "_blank", "noopener,noreferrer");
    }
    setModalPhase("polling");
    setModalPollKey((k) => k + 1);
  };

  const retryModalPoll = () => {
    setModalPhase("polling");
    setModalPollKey((k) => k + 1);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col p-5 text-white md:p-7">
      <div className="app-shell-container">
        <header className="ds-header-bar mb-7 flex flex-col gap-4 rounded-[1.35rem] p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="На главную страницу"
              className="cursor-pointer"
            >
              <Avatar
                src={bootstrap?.bot?.avatarUrl ?? null}
                alt={botName}
                fallback={botName}
              />
            </Link>
            <div>
              <h1 className="ds-heading text-2xl">{botName}</h1>
            </div>
          </div>
          <UserMenu
            viewerName={viewerName}
            avatarUrl={viewerAvatarUrl}
            idPrefix="servers"
            className="relative flex items-center gap-3 self-start md:self-auto"
          />
        </header>

        <section
          className="ds-card rounded-[1.35rem] p-6"
          aria-labelledby="servers-heading"
        >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 id="servers-heading" className="ds-heading text-2xl">
              Выберите сервер
            </h2>
            <Link
              href="/"
              className="ds-btn-secondary cursor-pointer rounded-xl px-4 py-2 text-sm font-medium"
            >
              На главную
            </Link>
          </div>

          {guildsLoading ? <p className="ds-status-muted">Загрузка серверов...</p> : null}

          {guildsError ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-950/15 px-4 py-3">
              <p className="text-sm text-rose-300">{guildsError}</p>
              <button
                type="button"
                onClick={retryGuilds}
                className="mt-3 cursor-pointer rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-zinc-100 transition hover:bg-white/[0.1]"
              >
                Повторить
              </button>
            </div>
          ) : null}

          {!guildsLoading && !guildsError ? (
            guilds.length > 0 ? (
              <div
                className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
                role="list"
                aria-label="Доступные серверы"
              >
                {sortedGuilds.map((guild) => {
                  const role = getGuildRolePresentation(guild);
                  return (
                    <div
                      key={guild.id}
                      role="listitem"
                      className="flex h-full flex-col rounded-2xl bg-white/[0.03] p-4 shadow-sm ring-1 ring-white/[0.05] transition hover:bg-white/[0.04] hover:ring-white/[0.08]"
                    >
                      <div className="flex min-h-0 flex-1 gap-3">
                        <div className="shrink-0 self-start">
                          <GuildCardIcon
                            iconUrl={guild.iconUrl}
                            guildName={guild.name}
                          />
                        </div>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                            <p className="min-w-0 max-w-full truncate font-medium text-zinc-100">
                              {guild.name}
                            </p>
                            <span
                              className="inline-flex shrink-0 items-center"
                              title={
                                guild.botConnected
                                  ? "Бот на сервере"
                                  : "Бот не подключён"
                              }
                              aria-label={
                                guild.botConnected
                                  ? "Бот подключён к этому серверу"
                                  : "Бот не подключён к этому серверу"
                              }
                            >
                              {guild.botConnected ? (
                                <CircleCheck
                                  className="h-4 w-4 text-emerald-400/90"
                                  aria-hidden
                                  strokeWidth={2}
                                />
                              ) : (
                                <Unplug
                                  className="h-4 w-4 text-zinc-500"
                                  aria-hidden
                                  strokeWidth={2}
                                />
                              )}
                            </span>
                            <span
                              className="inline-flex shrink-0 items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-zinc-400"
                              title={role.fullLabel}
                            >
                              {role.shortLabel}
                            </span>
                          </div>
                          <div className="mt-auto w-full pt-3.5">
                            {guild.botConnected ? (
                              <Link
                                href={`/dashboard/${guild.id}`}
                                onClick={() => rememberLastGuild(guild)}
                                className="ds-btn-primary inline-flex w-full cursor-pointer justify-center rounded-xl px-4 py-2.5 text-sm font-medium no-underline sm:w-auto"
                              >
                                Управление
                              </Link>
                            ) : (
                              <button
                                type="button"
                                className="ds-btn-secondary w-full cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium sm:w-auto"
                                onClick={() => openConnectModal(guild.id)}
                                title="Добавить бота на сервер через Discord"
                              >
                                Подключить
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="ds-status-muted">Нет доступных серверов.</p>
            )
          ) : null}
        </section>
      </div>

      {modalGuildId && modalGuild ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-pointer bg-black/50 backdrop-blur-[1px]"
            aria-label="Закрыть"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-bot-title"
            className="relative z-[1] w-full max-w-md rounded-[1.35rem] bg-zinc-900/96 p-5 shadow-[0_24px_64px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.08]"
          >
            <h2
              id="connect-bot-title"
              className="ds-heading text-lg font-semibold text-zinc-100"
            >
              Подключить бота
            </h2>

            {modalPhase === "intro" ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Чтобы управление заработало, добавьте Рогатика на этот сервер
                  через Discord и выдайте ему нужные права.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="ds-btn-secondary cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium"
                    onClick={closeModal}
                  >
                    Отмена
                  </button>
                  {inviteModalUrl ? (
                    <button
                      type="button"
                      className="ds-btn-primary cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium"
                      onClick={startDiscordPolling}
                    >
                      Открыть Discord
                    </button>
                  ) : (
                    <p className="py-2.5 text-center text-sm text-zinc-500 sm:text-right">
                      Приглашение недоступно
                    </p>
                  )}
                </div>
              </>
            ) : null}

            {modalPhase === "polling" ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Окно Discord открыто в новой вкладке. Когда добавите бота,
                  мы автоматически продолжим.
                </p>
                <div
                  className="mt-5 flex cursor-default items-center gap-2 text-sm text-zinc-500 select-none"
                  aria-live="polite"
                >
                  <span
                    className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-zinc-500/30 border-t-zinc-400 motion-safe:animate-spin"
                    aria-hidden
                  />
                  Проверяем подключение…
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="ds-btn-secondary cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium"
                    onClick={closeModal}
                  >
                    Отмена
                  </button>
                </div>
              </>
            ) : null}

            {modalPhase === "failed" ? (
              <>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  Бота на этом сервере пока не видно. Если вы уже добавили его,
                  подождите минуту или проверьте права, затем попробуйте снова.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                  <button
                    type="button"
                    className="ds-btn-secondary cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium"
                    onClick={closeModal}
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    className="ds-btn-primary cursor-pointer rounded-xl px-4 py-2.5 text-sm font-medium"
                    onClick={retryModalPoll}
                  >
                    Попробовать ещё
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}

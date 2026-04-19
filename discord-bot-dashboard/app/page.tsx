"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { UserMenu } from "./components/usermenu";
import { homeCopy } from "@/lib/copy/home";

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
        className="h-32 w-32 rounded-full border-4 border-[#8038CE]/70 object-cover shadow-[0_0_64px_rgba(128,56,206,0.45)] transition-transform duration-500 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:hover:scale-100"
      />
    );
  }

  return (
    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#8038CE]/70 bg-zinc-800 text-4xl font-semibold text-zinc-200 shadow-[0_0_64px_rgba(128,56,206,0.45)]">
      {fallback.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function LandingPage() {
  const [bootstrap, setBootstrap] = useState<DashboardBootstrap | null>(null);
  const [guilds, setGuilds] = useState<GuildSummary[]>([]);
  const [guildsLoading, setGuildsLoading] = useState(false);
  const [guildsError, setGuildsError] = useState("");
  const [guildsRetryKey, setGuildsRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadBootstrap = async () => {
      try {
        const res = await fetch("/api/dashboard/bootstrap", {
          cache: "no-store",
        });

        if (cancelled) return;
        if (!res.ok) {
          setBootstrap({ viewer: null, bot: null, applicationId: null });
          return;
        }
        const data = (await res.json()) as DashboardBootstrap;
        if (!cancelled) setBootstrap(data);
      } catch {
        if (!cancelled) setBootstrap({ viewer: null, bot: null, applicationId: null });
      }
    };

    void loadBootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadGuilds = useCallback(async () => {
    if (!bootstrap?.viewer) {
      setGuilds([]);
      setGuildsError("");
      setGuildsLoading(false);
      return;
    }

    setGuildsLoading(true);
    setGuildsError("");

    try {
      const guildsRes = await fetch("/api/discord/guilds", { cache: "no-store" });

      if (guildsRes.status === 401) {
        const boot = await fetch("/api/dashboard/bootstrap", { cache: "no-store" });
        if (boot.ok) {
          setBootstrap((await boot.json()) as DashboardBootstrap);
        } else {
          setBootstrap({ viewer: null, bot: null, applicationId: null });
        }
        setGuilds([]);
        return;
      }

      if (!guildsRes.ok) {
        setGuilds([]);
        setGuildsError(homeCopy.guildsLoadError);
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
      setGuildsError(homeCopy.guildsLoadError);
    } finally {
      setGuildsLoading(false);
    }
  }, [bootstrap?.viewer]);

  useEffect(() => {
    if (!bootstrap?.viewer) {
      setGuilds([]);
      setGuildsError("");
      setGuildsLoading(false);
      return;
    }
    void loadGuilds();
  }, [bootstrap?.viewer, guildsRetryKey, loadGuilds]);

  const connectedGuilds = useMemo(
    () => guilds.filter((g) => g.botConnected),
    [guilds]
  );

  /** Куда вести по кнопке «Панель управления»: lastGuildId только если бот подключён и гильдия в списке. */
  const targetDashboardGuildId = useMemo(() => {
    if (connectedGuilds.length === 0) return null;
    let lastId: string | null = null;
    try {
      lastId = localStorage.getItem("lastGuildId");
    } catch {
      /* ignore */
    }
    if (lastId && connectedGuilds.some((g) => g.id === lastId)) {
      return lastId;
    }
    return [...connectedGuilds].sort((a, b) =>
      a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
    )[0]!.id;
  }, [connectedGuilds]);

  const targetDashboardGuildName = useMemo(() => {
    if (!targetDashboardGuildId) return null;
    return connectedGuilds.find((g) => g.id === targetDashboardGuildId)?.name ?? null;
  }, [connectedGuilds, targetDashboardGuildId]);

  const botName = bootstrap?.bot?.name || "Timbra Bot";
  const viewerName = bootstrap?.viewer?.name ?? null;
  const bootstrapLoading = bootstrap === null;

  const ctaBlock = (() => {
    if (bootstrapLoading) {
      return (
        <div
          className="ds-btn-primary inline-flex cursor-wait items-center justify-center rounded-xl px-6 py-3 font-semibold opacity-80"
          aria-busy="true"
        >
          {homeCopy.loading}
        </div>
      );
    }

    if (!viewerName) {
      return (
        <Link
          href="/api/auth/discord/login"
          className="ds-btn-primary rounded-xl px-6 py-3 font-semibold"
        >
          {homeCopy.ctaLogin}
        </Link>
      );
    }

    if (guildsLoading) {
      return (
        <div
          className="ds-btn-primary inline-flex cursor-wait items-center justify-center rounded-xl px-6 py-3 font-semibold opacity-80"
          aria-busy="true"
        >
          {homeCopy.loading}
        </div>
      );
    }

    if (guildsError) {
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-sm text-sm text-rose-300/95">{guildsError}</p>
          <button
            type="button"
            className="ds-btn-primary rounded-xl px-6 py-3 font-semibold"
            onClick={() => setGuildsRetryKey((k) => k + 1)}
          >
            {homeCopy.retry}
          </button>
        </div>
      );
    }

    if (connectedGuilds.length > 0 && targetDashboardGuildId) {
      return (
        <Link
          href={`/dashboard/${targetDashboardGuildId}`}
          className="ds-btn-primary rounded-xl px-6 py-3 font-semibold"
        >
          {homeCopy.ctaDashboard}
        </Link>
      );
    }

    return (
      <Link href="/servers" className="ds-btn-primary rounded-xl px-6 py-3 font-semibold">
        {homeCopy.ctaPickServer}
      </Link>
    );
  })();

  return (
    <main className="landing-page-root relative flex min-h-0 w-full flex-1 flex-col text-white">
      <div className="landing-ambient pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-[clamp(1.25rem,5vw,5rem)] pb-6 pt-6">
        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-[min(100%,34rem)]">
            {viewerName ? (
              <div className="mb-4 flex justify-end">
                <UserMenu
                  viewerName={viewerName}
                  avatarUrl={bootstrap?.viewer?.avatarUrl ?? null}
                  idPrefix="landing"
                />
              </div>
            ) : null}

            <section
              className="ds-card rounded-3xl px-8 py-10 text-center backdrop-blur"
              aria-labelledby="landing-title"
            >
              <div className="mb-8 flex flex-col items-center justify-center gap-6">
                <Link href="/" aria-label="На главную страницу">
                  <Avatar
                    src={bootstrap?.bot?.avatarUrl ?? null}
                    alt={botName}
                    fallback={botName}
                  />
                </Link>
                <div>
                  <p className="ds-kicker">{homeCopy.brandKicker}</p>
                  <h1 id="landing-title" className="ds-heading mt-2 text-3xl">
                    {botName}
                  </h1>
                </div>
              </div>

              <p className="mx-auto mb-8 max-w-prose text-zinc-300">{homeCopy.tagline}</p>

              <div className="flex flex-col items-center gap-3">
                {ctaBlock}
                {viewerName &&
                !bootstrapLoading &&
                !guildsLoading &&
                !guildsError &&
                targetDashboardGuildId &&
                targetDashboardGuildName ? (
                  <p className="text-sm text-zinc-400/85">{homeCopy.serverLine(targetDashboardGuildName)}</p>
                ) : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

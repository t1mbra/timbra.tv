"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserMenu } from "./components/usermenu";

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
  const [lastGuildId, setLastGuildId] = useState<string | null>(null);
  const [lastGuildName, setLastGuildName] = useState<string | null>(null);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        const res = await fetch("/api/dashboard/bootstrap", {
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = (await res.json()) as DashboardBootstrap;
        setBootstrap(data);
      } catch {
        // no-op: landing still renders login button
      }
    };

    loadBootstrap();
  }, []);

  useEffect(() => {
    if (!bootstrap?.viewer) {
      setLastGuildId(null);
      setLastGuildName(null);
      return;
    }
    try {
      setLastGuildId(localStorage.getItem("lastGuildId"));
      setLastGuildName(localStorage.getItem("lastGuildName"));
    } catch {
      setLastGuildId(null);
      setLastGuildName(null);
    }
  }, [bootstrap?.viewer]);

  const botName = bootstrap?.bot?.name || "Timbra Bot";
  const viewerName = bootstrap?.viewer?.name ?? null;

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden p-6 text-white">
      <div className="respect-motion-reduce pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#8038CE]/24 blur-3xl animate-pulse" />
      <div className="respect-motion-reduce pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-[#8038CE]/18 blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

      <div className="app-container">
        {viewerName ? (
          <div className="mb-4 flex justify-end">
            <UserMenu
              viewerName={viewerName}
              avatarUrl={bootstrap?.viewer?.avatarUrl ?? null}
              idPrefix="landing"
            />
          </div>
        ) : null}

        <section className="ds-card w-full rounded-3xl p-10 text-center backdrop-blur" aria-labelledby="landing-title">
          <div className="mb-8 flex flex-col items-center justify-center gap-6">
            <Link href="/" aria-label="На главную страницу">
              <Avatar
                src={bootstrap?.bot?.avatarUrl ?? null}
                alt={botName}
                fallback={botName}
              />
            </Link>
            <div>
              <p className="ds-kicker">Панель Discord-бота</p>
              <h1 id="landing-title" className="ds-heading mt-2 text-3xl">
                {botName}
              </h1>
            </div>
          </div>

          <p className="mx-auto mb-8 max-w-2xl text-zinc-300">
            Твой маленький рогатый помощник
          </p>

          <div className="flex flex-col items-center gap-3">
            {viewerName ? (
              <>
                {lastGuildId ? (
                  <>
                    <Link
                      href={`/dashboard/${lastGuildId}`}
                      className="ds-btn-primary rounded-xl px-6 py-3 font-semibold"
                    >
                      Панель управления
                    </Link>
                    {lastGuildName ? (
                      <p className="text-sm text-zinc-400">
                        Сервер: {lastGuildName}
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <Link
                href="/api/auth/discord/login"
                className="ds-btn-primary rounded-xl px-6 py-3 font-semibold"
              >
                Войти через Discord
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

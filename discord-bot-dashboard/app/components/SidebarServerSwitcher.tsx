"use client";

import type { ConnectedGuildForDashboard } from "@/lib/getUserManageableGuildsWithBotState";
import {
  dashboardMenuPanelClass,
  dashboardMenuPanelMaxHeightClass,
  dashboardMenuPanelStyle,
  dashboardMenuRowClass,
  dashboardMenuScrollRegionClass,
  dashboardMenuSeparatorClass,
} from "./dashboardMenuTokens";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type SidebarServerSwitcherProps = {
  currentGuildId: string;
  currentGuildName: string;
  currentGuildIconUrl: string | null;
  connectedGuilds: ConnectedGuildForDashboard[];
  /** Как `triggerUnsavedGuard` в дашборде: `true` — отменить переход */
  triggerUnsavedGuard: () => boolean;
  idPrefix: string;
  className?: string;
};

function GuildChipIcon({
  iconUrl,
  name,
  size = "sm",
}: {
  iconUrl: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);
  const letter = name.trim().slice(0, 1).toUpperCase() || "?";
  const box = size === "md" ? "h-8 w-8 text-xs" : "h-7 w-7 text-[11px]";

  if (!iconUrl || failed) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-zinc-800/90 font-semibold text-zinc-200 ${box}`}
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
      className={`shrink-0 rounded-full border border-white/[0.12] object-cover ${box}`}
      onError={() => setFailed(true)}
    />
  );
}

export function SidebarServerSwitcher({
  currentGuildId,
  currentGuildName,
  currentGuildIconUrl,
  connectedGuilds,
  triggerUnsavedGuard,
  idPrefix,
  className,
}: SidebarServerSwitcherProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const btnId = `${idPrefix}-server-switcher-btn`;
  const menuId = `${idPrefix}-server-switcher-menu`;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (
        open &&
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const navigateToDashboard = (id: string) => {
    if (id === currentGuildId) {
      setOpen(false);
      return;
    }
    if (triggerUnsavedGuard()) return;
    setOpen(false);
    router.push(`/dashboard/${id}`);
  };

  const goConnectServer = () => {
    if (triggerUnsavedGuard()) return;
    setOpen(false);
    router.push("/servers");
  };

  return (
    <div
      ref={wrapRef}
      className={`relative w-full min-w-0 max-w-full overflow-x-clip ${className ?? ""}`}
    >
      <button
        type="button"
        id={btnId}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`Сервер: ${currentGuildName}. Открыть список серверов`}
        title={currentGuildName}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full min-w-0 max-w-full cursor-pointer items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-2.5 py-2 text-left transition hover:bg-white/[0.06] active:opacity-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]"
      >
        <GuildChipIcon
          iconUrl={currentGuildIconUrl}
          name={currentGuildName}
          size="md"
        />
        <span
          className="min-w-0 flex-1 truncate text-sm font-medium leading-tight text-zinc-100"
          title={currentGuildName}
        >
          {currentGuildName}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 ease-out ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={btnId}
          className={`absolute left-0 right-0 top-[calc(100%+6px)] flex w-full min-h-0 min-w-0 max-w-full flex-col ${dashboardMenuPanelMaxHeightClass} ${dashboardMenuPanelClass}`}
          style={dashboardMenuPanelStyle}
        >
          <div className={`${dashboardMenuScrollRegionClass} px-0.5`}>
            {connectedGuilds.map((g) => {
              const isCurrent = g.id === currentGuildId;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="menuitem"
                  aria-current={isCurrent ? "true" : undefined}
                  title={g.name}
                  aria-label={
                    isCurrent
                      ? `Текущий сервер: ${g.name}`
                      : `Открыть панель сервера ${g.name}`
                  }
                  onClick={() => navigateToDashboard(g.id)}
                  className={dashboardMenuRowClass}
                >
                  <GuildChipIcon iconUrl={g.iconUrl} name={g.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {g.name}
                  </span>
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                    {isCurrent ? (
                      <Check
                        className="h-4 w-4 text-emerald-400/90"
                        aria-hidden
                        strokeWidth={2}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="shrink-0">
            <div className={dashboardMenuSeparatorClass} role="separator" />
            <button
              type="button"
              role="menuitem"
              onClick={goConnectServer}
              className={dashboardMenuRowClass}
            >
              <Plus
                className="h-4 w-4 shrink-0 text-zinc-500"
                strokeWidth={2}
                aria-hidden
              />
              <span className="min-w-0 truncate">Подключить сервер</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { LogOut, Server } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  dashboardMenuPanelBodyClass,
  dashboardMenuPanelStyle,
  dashboardMenuRowClass,
  dashboardMenuUserPanelMaxHeightClass,
} from "./dashboardMenuTokens";

type UserMenuProps = {
  viewerName: string;
  avatarUrl: string | null;
  idPrefix: string;
  className?: string;
  onGoServers?: () => void;
  onLogout?: () => void;
};

function UserAvatar({
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

export function UserMenu({
  viewerName,
  avatarUrl,
  idPrefix,
  className,
  onGoServers,
  onLogout,
}: UserMenuProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const buttonId = `${idPrefix}-user-menu-button`;
  const menuId = `${idPrefix}-user-account-menu`;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (isOpen && menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      className={`relative min-w-0 max-w-full overflow-visible ${className ?? ""}`}
    >
      <button
        type="button"
        id={buttonId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Меню аккаунта: ${viewerName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-xl border-0 bg-transparent px-1 py-1.5 shadow-none backdrop-blur-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]"
      >
        <div className="min-w-0 max-w-[min(12rem,50vw)] text-right">
          <p className="truncate text-sm font-medium" title={viewerName}>
            {viewerName}
          </p>
        </div>
        <span className="rounded-full p-0.5 ring-1 ring-transparent transition-[box-shadow,opacity] duration-200 ease-out group-hover:opacity-[0.96] group-hover:shadow-[0_0_0_1px_rgba(255,255,255,0.12)] group-hover:brightness-[1.05] group-active:opacity-90 group-active:brightness-[0.98]">
          <UserAvatar src={avatarUrl} alt={viewerName} fallback={viewerName} />
        </span>
      </button>

      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          className={`absolute right-0 top-[calc(100%+8px)] ${dashboardMenuPanelBodyClass} ${dashboardMenuUserPanelMaxHeightClass} flex min-w-[12.5rem] max-w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-y-auto overflow-x-hidden`}
          style={dashboardMenuPanelStyle}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              if (onGoServers) {
                onGoServers();
                return;
              }
              router.push("/servers");
            }}
            className={dashboardMenuRowClass}
          >
            <Server
              className="h-4 w-4 shrink-0 text-zinc-500"
              strokeWidth={2}
              aria-hidden
            />
            <span>Серверы</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              if (onLogout) {
                onLogout();
                return;
              }
              window.location.assign("/api/auth/logout");
            }}
            className={`${dashboardMenuRowClass} text-rose-300/95 hover:text-rose-200`}
          >
            <LogOut
              className="h-4 w-4 shrink-0 text-rose-400/70"
              strokeWidth={2}
              aria-hidden
            />
            <span>Выйти</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

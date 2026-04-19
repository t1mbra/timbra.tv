"use client";

import Link from "next/link";
import { useState } from "react";
import { navItems } from "@/lib/site";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="focus-ring inline-flex items-center justify-center rounded-full border border-border bg-background-elevated/80 px-3 py-2 text-sm text-foreground"
        aria-expanded={open}
        aria-controls="mobile-nav"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Закрыть" : "Меню"}
      </button>
      {open ? (
        <nav
          id="mobile-nav"
          className="absolute left-0 right-0 top-16 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-xl"
          aria-label="Мобильная навигация"
        >
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="focus-ring block rounded-lg px-3 py-2 text-foreground-muted transition hover:bg-accent-soft/35 hover:text-foreground"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

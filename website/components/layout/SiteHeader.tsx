import Link from "next/link";
import { navItems, site } from "@/lib/site";
import { MobileNav } from "@/components/layout/MobileNav";

export function SiteHeader() {
  return (
    <header className="relative sticky top-0 z-50 border-b border-border/80 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="focus-ring group flex items-baseline gap-2 rounded-md py-1"
        >
          <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
            {site.name}
          </span>
          <span className="hidden text-sm text-foreground-muted sm:inline">
            {site.tagline}
          </span>
        </Link>
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Основная навигация"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring rounded-full px-3 py-1.5 text-sm text-foreground-muted transition hover:bg-accent-soft/40 hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <MobileNav />
      </div>
    </header>
  );
}

import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-border/80 bg-background-elevated/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-serif text-lg text-foreground">{site.name}</p>
          <p className="mt-1 max-w-md text-sm text-foreground-muted">
            Уютный уголок в сети: стримы, животные и спокойная атмосфера без
            суеты.
          </p>
        </div>
        <p className="text-sm text-foreground-subtle">
          © {year}{" "}
          <Link href="/" className="focus-ring rounded underline-offset-4 hover:underline">
            {site.name}
          </Link>
        </p>
      </div>
    </footer>
  );
}

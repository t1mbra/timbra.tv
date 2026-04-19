import Link from "next/link";
import type { ReactElement } from "react";
import { Container } from "@/components/layout/Container";

type NavIcon = (props: { className?: string }) => ReactElement;

const items: readonly {
  href: string;
  label: string;
  hint: string;
  Icon: NavIcon;
}[] = [
  {
    href: "/streams",
    label: "Стримы",
    hint: "эфир · архив",
    Icon: IconStreams,
  },
  {
    href: "/calendar",
    label: "Календарь",
    hint: "слоты · подписка",
    Icon: IconCalendar,
  },
  {
    href: "/news",
    label: "Новости",
    hint: "заметки",
    Icon: IconNews,
  },
  {
    href: "/about",
    label: "О себе",
    hint: "кто я",
    Icon: IconAbout,
  },
];

export function HomeQuickNav() {
  return (
    <section className="py-12 sm:py-16" aria-label="Разделы сайта">
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ href, label, hint, Icon }) => (
            <Link
              key={href}
              href={href}
              className="focus-ring group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background-elevated/50 p-6 shadow-[var(--shadow-soft)] transition duration-300 hover:border-border-strong hover:bg-background-elevated/80"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-accent-soft/20 blur-2xl transition group-hover:bg-accent-soft/30"
              />
              <Icon className="relative h-9 w-9 text-accent" />
              <div className="relative mt-4">
                <p className="font-serif text-xl font-semibold text-foreground">
                  {label}
                </p>
                <p className="mt-1 text-xs text-foreground-subtle">{hint}</p>
              </div>
              <span
                className="relative mt-4 text-xs font-medium text-accent opacity-80 group-hover:opacity-100"
                aria-hidden
              >
                Перейти →
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}

function IconStreams({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M10 9.5v5l4.5-2.5L10 9.5z"
        fill="currentColor"
        fillOpacity="0.85"
      />
    </svg>
  );
}

function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="4"
        y="5.5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M4 9.5h16" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 3.5v4M16 3.5v4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="9" cy="14" r="1" fill="currentColor" fillOpacity="0.6" />
      <circle cx="15" cy="14" r="1" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

function IconNews({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 4.5h9a2 2 0 012 2v13H6a2 2 0 01-2-2v-11a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path d="M8 8.5h6M8 12h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function IconAbout({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.5" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M6.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

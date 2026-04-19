import Link from "next/link";
import { HomeSection } from "@/components/home/HomeSection";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

const items = [
  { title: "Сайт: первый каркас", date: "скоро" },
  { title: "Анонсы без шума", date: "в планах" },
] as const;

export function NewsPreview() {
  return (
    <HomeSection variant="muted" id="news" className="!py-16 sm:!py-20">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">
        <SectionHeading
          compact
          className="!mb-0"
          eyebrow="Лента"
          title="Новости"
          description="Коротко, по делу."
        />
        <ButtonLink href="/news" variant="ghost" className="self-start sm:self-auto">
          Вся лента
        </ButtonLink>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {items.map((n) => (
          <li key={n.title}>
            <Link
              href="/news"
              className="focus-ring flex items-center justify-between gap-4 py-5 transition hover:bg-background-elevated/30"
            >
              <span className="font-medium text-foreground">{n.title}</span>
              <span className="shrink-0 text-xs uppercase tracking-wider text-foreground-subtle">
                {n.date}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </HomeSection>
  );
}

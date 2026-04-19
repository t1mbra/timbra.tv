import { HomeSection } from "@/components/home/HomeSection";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { platformLinks } from "@/lib/placeholders";

export function SocialsPreview() {
  return (
    <HomeSection variant="glow" id="links" className="!py-20 sm:!py-28">
      <div className="mb-8 flex flex-col justify-between gap-6 sm:mb-10 sm:flex-row sm:items-end">
        <SectionHeading
          compact
          className="!mb-0"
          eyebrow="Связь"
          title="Сообщество"
          description="Стрим, чат, соцсети — один список."
        />
        <ButtonLink href="/links" className="self-start sm:self-auto">
          Все ссылки
        </ButtonLink>
      </div>
      <div className="flex flex-wrap gap-2">
        {platformLinks.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background-elevated/60 px-4 py-2 text-xs font-medium text-foreground-muted"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft/35 text-[10px] font-semibold text-accent"
              aria-hidden
            >
              {p.abbr}
            </span>
            {p.name}
          </span>
        ))}
      </div>
    </HomeSection>
  );
}

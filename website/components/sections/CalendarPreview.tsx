import { CalendarPlaceholder } from "@/components/calendar/CalendarPlaceholder";
import { HomeSection } from "@/components/home/HomeSection";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function CalendarPreview() {
  return (
    <HomeSection id="calendar" className="!py-24 sm:!py-32">
      <div className="mb-10 flex flex-col justify-between gap-6 sm:mb-12 sm:flex-row sm:items-end">
        <SectionHeading
          compact
          className="!mb-0"
          eyebrow="Слоты"
          title="Календарь"
          description="Когда эфир — без угадываний. Подписка в Google / Apple / Microsoft — после интеграции."
        />
        <ButtonLink href="/calendar" className="shrink-0 self-start sm:self-auto">
          Полное расписание
        </ButtonLink>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <CalendarPlaceholder compact />
        <aside className="flex flex-col justify-center gap-6 rounded-[var(--radius-lg)] border border-border bg-background-elevated/40 p-6 sm:p-8">
          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
              Сейчас
            </p>
            <p className="text-sm text-foreground-muted">
              Демо-сетка. Данные подключим отдельно.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-foreground-muted">
            <li className="flex gap-2">
              <span className="text-accent" aria-hidden>
                ·
              </span>
              ближайшие эфиры здесь же
            </li>
            <li className="flex gap-2">
              <span className="text-accent" aria-hidden>
                ·
              </span>
              переносы и темы слотов
            </li>
          </ul>
        </aside>
      </div>
    </HomeSection>
  );
}

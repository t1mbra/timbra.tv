import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";

/** Без бэкенда: статусы и слоты — визуальные якоря для действий */
export function HomeUtilityStrip() {
  return (
    <section
      className="border-b border-border/40 bg-background-elevated/30 py-8 sm:py-10"
      aria-label="Быстрый статус и действия"
    >
      <Container>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[var(--radius-lg)] border border-border bg-background/60 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
              Следующий эфир
            </p>
            <p className="mt-2 font-serif text-lg text-foreground">Слот скоро</p>
            <Link
              href="/calendar"
              className="focus-ring mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              К расписанию
              <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-background/60 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
              Эфир
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className="relative flex h-2.5 w-2.5 shrink-0 rounded-full bg-foreground-subtle"
                aria-hidden
              />
              <span className="text-sm font-medium text-foreground-muted">
                Не в эфире
              </span>
            </div>
            <p className="mt-2 text-xs text-foreground-subtle">
              Статус обновится с интеграцией
            </p>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-background/60 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
              Календарь
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Подписка с сайта — позже
            </p>
            <div className="mt-4">
              <ButtonLink
                href="/calendar"
                variant="outline"
                className="w-full justify-center px-4 py-2 text-xs"
              >
                Открыть сетку
              </ButtonLink>
            </div>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-border bg-background/60 p-5 backdrop-blur-sm">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
              Сообщество
            </p>
            <p className="mt-2 text-sm text-foreground-muted">
              Discord и остальное — в одном списке
            </p>
            <div className="mt-4">
              <ButtonLink
                href="/links"
                variant="outline"
                className="w-full justify-center px-4 py-2 text-xs"
              >
                Ссылки
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

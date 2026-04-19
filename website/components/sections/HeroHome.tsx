import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

export function HeroHome() {
  return (
    <section
      className="relative min-h-[72vh] overflow-hidden border-b border-border/40 pb-16 pt-14 sm:min-h-0 sm:pb-24 sm:pt-20"
      aria-labelledby="hero-title"
    >
      <div
        className="hero-stars pointer-events-none absolute inset-0 opacity-50"
        aria-hidden
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-1/2 h-[min(90vw,28rem)] w-[min(90vw,28rem)] -translate-y-1/2 rounded-full bg-accent-soft/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-accent-2-soft/15 blur-[100px]"
      />

      <Container className="relative">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-xl space-y-8">
            <div className="space-y-5">
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-accent">
                {site.name}
              </p>
              <h1
                id="hero-title"
                className="font-serif text-[2.35rem] font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]"
              >
                Козочка в эфире.
                <span className="mt-2 block text-[0.58em] font-normal leading-tight text-foreground-muted sm:text-[0.52em]">
                  Спокойные игры · животные · уют
                </span>
              </h1>
              <p className="max-w-sm text-sm leading-relaxed text-foreground-muted">
                Один хаб: эфир, расписание, заметки и ссылки — без лишних
                вкладок.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ButtonLink href="/streams" className="min-w-[8.5rem] justify-center">
                Смотреть эфиры
              </ButtonLink>
              <ButtonLink href="/calendar" variant="outline">
                Расписание
              </ButtonLink>
            </div>
          </div>

          <div
            className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-lg"
            aria-hidden
          >
            <div className="surface-gradient-ring aspect-[4/5] max-h-[min(52vh,420px)] w-full sm:aspect-[5/6]">
              <div className="surface-gradient-ring__inner relative flex h-full min-h-[280px] flex-col items-center justify-center overflow-hidden p-8">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklab,var(--accent)_25%,transparent),transparent_55%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,color-mix(in_oklab,var(--accent-2)_18%,transparent),transparent_50%)]" />
                <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-border-strong/60 bg-background/40 shadow-[0_0_80px_-20px_var(--glow)] backdrop-blur-md sm:h-44 sm:w-44">
                  <div className="text-center">
                    <p
                      className="font-serif text-6xl font-semibold leading-none text-foreground/90 sm:text-7xl"
                      aria-hidden
                    >
                      T
                    </p>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.28em] text-foreground-subtle">
                      timbra
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

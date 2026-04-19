import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { PageIntro } from "@/components/ui/PageIntro";
import { platformLinks } from "@/lib/placeholders";

export const metadata: Metadata = {
  title: "Ссылки и соцсети",
  description:
    "Официальные ссылки Timbra: стримы, Discord, соцсети — хаб в разработке.",
};

export default function LinksPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="Ссылки и соцсети"
        subtitle="Один спокойный хаб для официальных точек входа: эфир, чат, короткие новости. Ссылки пока не активны — откроем их, когда всё будет готово."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {platformLinks.map((p) => (
              <li key={p.id} className="h-full min-h-[260px]">
                <div className="surface-gradient-ring flex h-full min-h-[inherit] flex-col">
                  <div className="surface-gradient-ring__inner flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-accent-soft/35 text-sm font-semibold text-accent"
                        aria-hidden
                      >
                        {p.abbr}
                      </span>
                      <span className="rounded-full border border-dashed border-border-strong px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground-subtle">
                        скоро
                      </span>
                    </div>
                    <h2 className="mt-5 font-serif text-xl text-foreground">
                      {p.name}
                    </h2>
                    <p className="mt-2 flex-1 text-sm text-foreground-muted">
                      {p.hint}
                    </p>
                    <button
                      type="button"
                      disabled
                      className="focus-ring mt-6 w-full rounded-full border border-border bg-background/50 py-2.5 text-sm font-medium text-foreground-subtle"
                    >
                      Перейти (позже)
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>
    </main>
  );
}

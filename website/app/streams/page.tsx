import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { StreamBlockCard } from "@/components/streams/StreamBlockCard";
import { Card } from "@/components/ui/Card";
import { PageIntro } from "@/components/ui/PageIntro";
import { recentStreams, upcomingStreams } from "@/lib/placeholders";

export const metadata: Metadata = {
  title: "Стримы",
  description:
    "Стримы Timbra: расписание, просмотр эфира и архив — раздел готовится к интеграции с платформами.",
};

export default function StreamsPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="Стримы"
        subtitle="Здесь будет расписание, зона просмотра эфира и архив записей. Пока — только структура и демо-карточки без подключения к стриминговым API."
      />
      <section className="space-y-16 py-16 sm:py-20">
        <Container>
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
                Ближайшие стримы
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
                Карточки-заглушки под будущее расписание и анонсы слотов.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {upcomingStreams.map((s) => (
                <StreamBlockCard
                  key={s.title}
                  title={s.title}
                  when={s.when}
                  note={s.note}
                  tag={s.tag}
                />
              ))}
            </div>
          </div>
        </Container>

        <Container>
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-2xl text-foreground sm:text-3xl">
                Недавние эфиры
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-foreground-muted">
                Место под VOD, таймкоды и короткие описания — после первых
                записей.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {recentStreams.map((s) => (
                <StreamBlockCard
                  key={s.title}
                  title={s.title}
                  when={s.when}
                  note={s.note}
                  tag={s.tag}
                />
              ))}
            </div>
          </div>
        </Container>

        <Container>
          <Card glow className="p-0">
            <div className="border-b border-border px-6 py-4 sm:px-8">
              <h2 className="font-serif text-xl text-foreground">
                Просмотр эфира
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Сюда ляжет встраиваемый плеер или ссылка на активный эфир — когда
                будет готова интеграция.
              </p>
            </div>
            <div className="flex min-h-[220px] items-center justify-center px-6 py-16 sm:px-8">
              <p className="max-w-md text-center text-sm text-foreground-subtle">
                Плейсхолдер: без iframe и без embed — только визуальная зона под
                будущий плеер.
              </p>
            </div>
          </Card>
        </Container>
      </section>
    </main>
  );
}

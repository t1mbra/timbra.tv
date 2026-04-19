import type { Metadata } from "next";
import { CalendarPlaceholder } from "@/components/calendar/CalendarPlaceholder";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Календарь",
  description:
    "Календарь стримов Timbra: визуальная заготовка и будущие подписки Google, Apple и Microsoft.",
};

export default function CalendarPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="Календарь стримов"
        subtitle="Единое расписание и спокойные напоминания. Ниже — визуальный макет сетки месяца; данные и синхронизация подключатся на этапе бэкенда."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.85fr)] lg:items-start">
            <CalendarPlaceholder />
            <div className="space-y-6">
              <Card glow>
                <h2 className="font-serif text-xl text-foreground">
                  Как это задумано
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                  На сайте появится актуальное расписание эфиров и короткие
                  описания слотов. Источник данных и способ редактирования
                  выберем при интеграции — важно сохранить простоту поддержки.
                </p>
              </Card>
              <Card>
                <h2 className="font-serif text-xl text-foreground">
                  Подписки на календарь
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                  Планируется возможность подписаться на расписание через{" "}
                  <span className="text-foreground">Google</span>,{" "}
                  <span className="text-foreground">Apple</span> и{" "}
                  <span className="text-foreground">Microsoft</span> — чтобы
                  добавить события в привычное приложение календаря с сайта.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-foreground-subtle">
                  Сейчас без API и без учётных записей: только фронтенд под будущую
                  связку.
                </p>
              </Card>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}

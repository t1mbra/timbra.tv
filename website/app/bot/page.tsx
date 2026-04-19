import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Discord-бот",
  description:
    "Discord-бот Timbra — часть экосистемы сообщества. Панель входа появится позже.",
};

export default function BotPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="Discord-бот"
        subtitle="У Timbra есть бот для Discord — не главный герой сайта, а спокойный помощник для сообщества: напоминания, команды и полезные сценарии вокруг эфиров."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5 text-foreground-muted leading-relaxed">
              <p>
                Сайт остаётся про человека, стримы и истории. Бот же помогает
                серверу дышать ровнее: меньше рутины, больше ясности для зрителей
                и модераторов.
              </p>
              <p>
                Здесь позже появятся описание команд, правила использования и
                ссылки на поддержку — всё в том же мягком тоне, без «техно-агрессии».
              </p>
            </div>
            <Card glow>
              <h2 className="font-serif text-xl text-foreground">
                Панель и вход
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                Отдельный дашборд и безопасная авторизация — на этапе интеграции
                с API. Кнопка ниже имитирует будущий вход.
              </p>
              <div className="mt-6">
                <Button type="button" disabled className="w-full sm:w-auto">
                  Войти в панель бота (скоро)
                </Button>
              </div>
              <p className="mt-4 text-xs text-foreground-subtle">
                Заглушка: OAuth и сервер не подключены.
              </p>
            </Card>
          </div>
        </Container>
      </section>
    </main>
  );
}

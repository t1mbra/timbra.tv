import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "Новости",
  description:
    "Новости и анонсы Timbra: лента постов готовится; позже — деликатная синдикация в мессенджеры.",
};

const draftPosts = [
  {
    title: "Первый пост в ленте",
    date: "Черновик",
    excerpt:
      "Когда появится редакторский контур, здесь окажутся заметки об обновлениях сайта и эфирах.",
  },
  {
    title: "Анонсы без спама",
    date: "План",
    excerpt:
      "Хочется доносить важное аккуратно — в том числе в выбранные каналы связи.",
  },
  {
    title: "Мини-дайджесты",
    date: "Идея",
    excerpt:
      "Короткие сводки для тех, кто не может часто заглядывать на сайт.",
  },
] as const;

export default function NewsPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="Новости"
        subtitle="Лента постов и анонсов — в спокойной типографике. Интеграции с внешними сервисами пока не подключены."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <h2 className="font-serif text-xl text-foreground">
                Архитектура ленты
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                Предполагаются записи с датой, тегами и спокойным чтением на
                тёмном фоне. Формат хранения (файлы в репозитории, headless CMS
                и т.д.) определим при подключении бэкенда.
              </p>
            </Card>
            <Card>
              <h2 className="font-serif text-xl text-foreground">
                Синдикация (будущее)
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-foreground-muted">
                В перспективе — аккуратные анонсы в Discord и Telegram через
                вебхуки: заголовок, ссылка на пост, без лавины сообщений.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-foreground-subtle">
                Сейчас это только описание направления, не реализация.
              </p>
            </Card>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {draftPosts.map((post) => (
              <Card key={post.title} as="article" hover>
                <p className="text-xs uppercase tracking-[0.14em] text-foreground-subtle">
                  {post.date}
                </p>
                <h3 className="mt-3 font-serif text-lg text-foreground">
                  {post.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  {post.excerpt}
                </p>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}

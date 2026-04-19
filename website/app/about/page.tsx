import type { Metadata } from "next";
import { Container } from "@/components/layout/Container";
import { Card } from "@/components/ui/Card";
import { PageIntro } from "@/components/ui/PageIntro";

export const metadata: Metadata = {
  title: "О себе",
  description:
    "Timbra — фурри стример и блогер: уютные игровые стримы, любовь к животным и доброжелательное сообщество.",
};

export default function AboutPage() {
  return (
    <main id="main-content">
      <PageIntro
        title="О себе"
        subtitle="Timbra - фурри-стример и блогер: спокойная харизма, атмосферные игры и уютный вайб. Здесь нет места суете ради хайпа - чистый кайф и теплый чилл."
      />
      <section className="py-16 sm:py-20">
        <Container>
          <div className="space-y-12">
            <div className="max-w-3xl space-y-6 text-foreground-muted leading-relaxed">
              <p>
                Привет. Я создаю стримы в спокойном темпе: чтобы можно было
                расслабиться, посмеяться и иногда поговорить о том, что
                действительно важно — от сюжета игры до заботы о братьях наших
                меньших.
              </p>
              <p>
                Мне близка атмосферная подача: когда игра дышит, а чат звучит
                уважительно. Я люблю животных и стараюсь, чтобы это чувствовалось
                не в рекламных слоганах, а в том, как я выбираю темы, партнёров и
                тон общения.
              </p>
              <p>
                Я верю в доброго создателя: того, кто может быть усталым,
                вдохновлённым или немного капризным — и всё равно остаётся
                внимательным к людям на другой стороне экрана.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card glow>
                <h2 className="font-serif text-lg text-foreground">
                  Спокойствие
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  Эфир как уютная комната: без токсичности и давления «быть
                  идеальной».
                </p>
              </Card>
              <Card glow>
                <h2 className="font-serif text-lg text-foreground">
                  Животные
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  Забота и уважение — часть моей личности, не аксессуар для
                  имиджа.
                </p>
              </Card>
              <Card glow>
                <h2 className="font-serif text-lg text-foreground">
                  Игры
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground-muted">
                  От сюжетных приключений до спокойных «песочниц» — в ритме, который
                  не выжигает.
                </p>
              </Card>
            </div>

            <Card as="aside" className="h-fit border-dashed">
              <h2 className="font-serif text-xl text-foreground">
                Скоро на странице
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-foreground-muted">
                <li>• любимые жанры и игры;</li>
                <li>• оборудование и настрой эфира (если захочется поделиться);</li>
                <li>• принципы модерации и общения;</li>
                <li>• этичные способы поддержки.</li>
              </ul>
            </Card>
          </div>
        </Container>
      </section>
    </main>
  );
}

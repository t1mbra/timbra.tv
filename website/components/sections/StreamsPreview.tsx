import { HomeSection } from "@/components/home/HomeSection";
import { ButtonLink } from "@/components/ui/Button";
import { StreamBlockCard } from "@/components/streams/StreamBlockCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { upcomingStreams } from "@/lib/placeholders";

export function StreamsPreview() {
  return (
    <HomeSection variant="glow" id="streams" className="!py-24 sm:!py-32">
      <div className="mb-10 flex flex-col justify-between gap-6 sm:mb-12 sm:flex-row sm:items-end">
        <SectionHeading
          compact
          className="!mb-0"
          eyebrow="Эфир"
          title="Стримы"
          description="Атмосферные игры и чат без давления."
        />
        <ButtonLink href="/streams" variant="outline" className="shrink-0 self-start sm:self-auto">
          Все эфиры
        </ButtonLink>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
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
    </HomeSection>
  );
}

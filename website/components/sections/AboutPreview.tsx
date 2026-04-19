import { HomeSection } from "@/components/home/HomeSection";
import { ButtonLink } from "@/components/ui/Button";

export function AboutPreview() {
  return (
    <HomeSection id="about" className="!py-16 sm:!py-24">
      <div className="flex flex-col gap-8 border border-border/80 bg-background-elevated/35 p-8 sm:flex-row sm:items-center sm:justify-between sm:gap-12 sm:p-10">
        <div className="max-w-lg space-y-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-accent">
            Timbra
          </p>
          <p className="font-serif text-xl leading-snug text-foreground sm:text-2xl">
            Козочка-стример: игры, животные, спокойный чат.
          </p>
          <p className="text-sm text-foreground-subtle">
            Подробности — на странице «О себе».
          </p>
        </div>
        <ButtonLink href="/about" variant="outline" className="shrink-0">
          Профиль
        </ButtonLink>
      </div>
    </HomeSection>
  );
}

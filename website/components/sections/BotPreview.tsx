import { HomeSection } from "@/components/home/HomeSection";
import { Button, ButtonLink } from "@/components/ui/Button";

export function BotPreview() {
  return (
    <HomeSection variant="muted" dense id="bot" className="!py-12 sm:!py-16">
      <div className="flex flex-col gap-6 border border-dashed border-border-strong/80 bg-background-elevated/25 p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
        <div className="min-w-0 space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-foreground-subtle">
            Экосистема
          </p>
          <p className="font-medium text-foreground">Discord-бот</p>
          <p className="text-sm text-foreground-muted">
            Помощник для сервера — не главная сцена.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" disabled variant="outline" className="text-xs">
            Панель (скоро)
          </Button>
          <ButtonLink href="/bot" variant="ghost" className="text-xs">
            О боте
          </ButtonLink>
        </div>
      </div>
    </HomeSection>
  );
}

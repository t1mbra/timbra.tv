/**
 * Визуальная заглушка календаря месяца — без данных и API, только вёрстка под будущую интеграцию.
 */

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

/** Апрель 2026: 1-е — среда → 2 пустые ячейки в начале, 30 дней */
const APRIL_2026_LEADING_EMPTY = 2;
const DAYS_IN_MONTH = 30;
/** Дни с «событием»-меткой (визуальный плейсхолдер) */
const EVENT_DAYS = new Set([3, 9, 17, 24]);

type CalendarPlaceholderProps = {
  className?: string;
  monthLabel?: string;
  compact?: boolean;
};

export function CalendarPlaceholder({
  className = "",
  monthLabel = "Апрель 2026",
  compact = false,
}: CalendarPlaceholderProps) {
  const cells: (number | null)[] = [];
  for (let i = 0; i < APRIL_2026_LEADING_EMPTY; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const cellPad = compact ? "py-1.5 text-xs" : "py-2.5 text-sm";

  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-border bg-background-elevated/60 p-4 shadow-[0_0_60px_-12px_var(--glow)] backdrop-blur-sm sm:p-6 ${className}`}
      role="img"
      aria-label={`Предпросмотр календаря: ${monthLabel}, демонстрационная сетка без реальных событий`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-serif text-lg text-foreground sm:text-xl">{monthLabel}</p>
        <span className="rounded-full border border-dashed border-border-strong px-3 py-1 text-xs text-foreground-subtle">
          демо-сетка
        </span>
      </div>
      <div className="grid grid-cols-7 gap-px rounded-[var(--radius-md)] border border-border/80 bg-border/60 p-px">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className={`bg-background/90 px-1 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-foreground-subtle sm:text-xs`}
          >
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={`bg-background-elevated/80 ${cellPad} text-center ${compact ? "min-h-[2rem] sm:min-h-[2.5rem]" : "min-h-[2.5rem] sm:min-h-[3.25rem]"}`}
          >
            {day != null ? (
              <div className="flex h-full flex-col items-center justify-center gap-1">
                <span
                  className={`tabular-nums ${day === 17 ? "font-medium text-accent" : "text-foreground-muted"}`}
                >
                  {day}
                </span>
                {EVENT_DAYS.has(day) ? (
                  <span
                    className="h-1 w-1 rounded-full bg-accent/80 shadow-[0_0_8px_var(--accent-soft)]"
                    title="место под событие"
                  />
                ) : null}
              </div>
            ) : (
              <span className="text-foreground-subtle/40">·</span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-foreground-subtle">
        События и подписки на календарь подключатся на этапе интеграции.
      </p>
    </div>
  );
}

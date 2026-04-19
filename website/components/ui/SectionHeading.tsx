import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  align?: "left" | "center";
  /** Узкая шапка для хаба: меньше отступ, короче подзаголовок */
  compact?: boolean;
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  compact = false,
  className = "",
}: SectionHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";
  const mb = compact ? "mb-6 sm:mb-8" : "mb-12 sm:mb-14";
  const titleSize = compact
    ? "text-2xl sm:text-3xl"
    : "text-3xl sm:text-4xl";
  return (
    <div
      className={`${mb} max-w-2xl space-y-3 sm:space-y-4 ${alignClass} ${className}`}
    >
      {eyebrow ? (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </p>
          <div
            className="h-px w-12 bg-gradient-to-r from-accent/80 to-accent-2/50"
            aria-hidden
          />
        </div>
      ) : null}
      <h2
        className={`font-serif font-semibold tracking-tight text-foreground ${titleSize}`}
      >
        {title}
      </h2>
      {description ? (
        <div
          className={`max-w-xl text-foreground-muted ${compact ? "text-sm leading-snug" : "text-base leading-relaxed"}`}
        >
          {description}
        </div>
      ) : null}
    </div>
  );
}

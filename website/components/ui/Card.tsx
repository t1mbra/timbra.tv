import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "section" | "aside";
  /** Лёгкая тень с акцентным свечением */
  glow?: boolean;
  /** Подъём при наведении (для интерактивных карточек) */
  hover?: boolean;
};

export function Card({
  children,
  className = "",
  as: Tag = "div",
  glow = false,
  hover = false,
}: CardProps) {
  const shadow = glow
    ? "shadow-[var(--shadow-soft),0_0_50px_-18px_var(--glow)]"
    : "shadow-[var(--shadow-soft)]";
  const motion = hover
    ? "transition duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-soft),0_0_40px_-20px_var(--glow)]"
    : "";
  return (
    <Tag
      className={`rounded-[var(--radius-lg)] border border-border bg-background-elevated/70 p-6 backdrop-blur-sm ${shadow} ${motion} ${className}`}
    >
      {children}
    </Tag>
  );
}

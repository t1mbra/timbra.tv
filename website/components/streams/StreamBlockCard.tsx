import type { ReactNode } from "react";

type StreamBlockCardProps = {
  title: string;
  when: string;
  note: string;
  tag: string;
  footer?: ReactNode;
};

export function StreamBlockCard({
  title,
  when,
  note,
  tag,
  footer,
}: StreamBlockCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background-elevated/75 shadow-[var(--shadow-soft)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[var(--shadow-soft),0_0_36px_-16px_var(--glow)]">
      <div
        className="h-1.5 bg-gradient-to-r from-[color-mix(in_oklab,var(--accent)_70%,transparent)] via-[color-mix(in_oklab,var(--accent-2)_55%,transparent)] to-[color-mix(in_oklab,var(--accent)_40%,transparent)]"
        aria-hidden
      />
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-background/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
            {tag}
          </span>
          <span className="text-xs text-foreground-subtle">{when}</span>
        </div>
        <h3 className="mt-4 font-serif text-xl text-foreground">{title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground-muted">
          {note}
        </p>
        {footer}
      </div>
    </article>
  );
}

import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";

type PageIntroProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export function PageIntro({
  title,
  subtitle,
  children,
  className = "",
}: PageIntroProps) {
  return (
    <section
      className={`border-b border-border/60 bg-[radial-gradient(800px_400px_at_20%_-30%,color-mix(in_oklab,var(--accent)_12%,transparent),transparent_55%)] bg-background-elevated/25 py-16 sm:py-20 ${className}`}
    >
      <Container>
        <div className="max-w-3xl space-y-4">
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-lg leading-relaxed text-foreground-muted">
              {subtitle}
            </p>
          ) : null}
          {children}
        </div>
      </Container>
    </section>
  );
}

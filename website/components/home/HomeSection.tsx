import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";

type Variant = "default" | "muted" | "glow";

const variantClass: Record<Variant, string> = {
  default: "",
  muted: "border-y border-border/50 bg-background-elevated/25",
  glow:
    "relative border-y border-border/40 bg-[radial-gradient(900px_420px_at_50%_-20%,color-mix(in_oklab,var(--accent)_14%,transparent),transparent_55%)]",
};

type HomeSectionProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  id?: string;
  /** Extra vertical padding for hero-adjacent sections */
  dense?: boolean;
};

export function HomeSection({
  children,
  variant = "default",
  className = "",
  id,
  dense = false,
}: HomeSectionProps) {
  const py = dense ? "py-16 sm:py-20" : "py-24 sm:py-32";
  return (
    <section id={id} className={`${variantClass[variant]} ${py} ${className}`}>
      <Container>{children}</Container>
    </section>
  );
}

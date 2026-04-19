import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline";

const variantClass: Record<Variant, string> = {
  primary:
    "border border-border-strong bg-accent-soft/35 text-foreground shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)] hover:bg-accent-soft/55",
  ghost:
    "border border-transparent bg-transparent text-foreground-muted hover:bg-accent-soft/30 hover:text-foreground",
  outline:
    "border border-border bg-background-elevated/60 text-foreground hover:border-border-strong hover:bg-background-elevated",
};

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
  ...rest
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`focus-ring inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

type ButtonProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
} & ComponentProps<"button">;

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`focus-ring inline-flex cursor-pointer items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";

/**
 * Те же inline-стили и слои, что у выпадающей панели CustomSelect (portal).
 * Единственная реализация «стекла» для дашборд-выпадашек — без дублирования.
 */
export const dashboardDropdownSurfaceStyle: CSSProperties = {
  background: "rgba(18, 22, 36, 0.42)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
  borderRadius: "20px",
};

type DashboardDropdownSurfaceProps = {
  children: ReactNode;
  /** false — ширина по контенту (поповер Aa); true — на всю ширину якоря (CustomSelect) */
  fullWidth?: boolean;
  className?: string;
  innerClassName?: string;
};

export function DashboardDropdownSurface({
  children,
  fullWidth = true,
  className = "",
  innerClassName = "",
}: DashboardDropdownSurfaceProps) {
  const outer = [
    "rounded-[20px]",
    fullWidth ? "w-full" : "w-max min-w-[10.5rem]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = ["overflow-hidden rounded-[20px]", innerClassName].filter(Boolean).join(" ");

  return (
    <div className={outer} style={dashboardDropdownSurfaceStyle}>
      <div className={inner}>{children}</div>
    </div>
  );
}

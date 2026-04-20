"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

export type CompactSwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "role" | "onClick" | "children"
> & {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** default — карточки; sidebar — компактный ряд навигации */
  size?: "default" | "sidebar";
};

/** После p-0.5 внутренний ряд ~40px (w-11) / ~32px (w-10); бегунок у правого края при translate-x-[18px] */
const KNOB_ON = "translate-x-[18px]";

/**
 * Компактный переключатель (macOS-like): трек и бегунок с фиксированной геометрией, акцент — var(--brand) / #8038CE.
 */
export const CompactSwitch = forwardRef<HTMLButtonElement, CompactSwitchProps>(
  function CompactSwitch(
    {
      checked,
      onCheckedChange,
      size = "default",
      disabled,
      className = "",
      "aria-label": ariaLabel,
      title,
      ...rest
    },
    ref
  ) {
    const s = size;
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) onCheckedChange(!checked);
        }}
        className={[
          "relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 align-middle transition-[background-color,box-shadow,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none",
          s === "default" ? "h-6 w-11" : "h-5 w-10",
          checked
            ? "bg-[var(--brand)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] ring-1 ring-[#8038CE]/50"
            : "bg-zinc-700 ring-1 ring-black/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        <span
          aria-hidden
          className={[
            "pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] ring-1 ring-black/12 transition-transform duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
            s === "default" ? "h-5 w-5" : "h-4 w-4",
            checked ? KNOB_ON : "translate-x-0.5",
          ].join(" ")}
        />
      </button>
    );
  }
);

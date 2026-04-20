"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type GlassSegmentOption<T extends string = string> = {
  value: T;
  label: ReactNode;
};

export type GlassSegmentedControlProps<T extends string = string> = {
  value: T;
  onValueChange: (next: T) => void;
  options: readonly GlassSegmentOption<T>[];
  ariaLabel: string;
  className?: string;
};

/**
 * Стеклянный сегментный контроль (как «Текст / Embed / Карточка»): общий фон, плавающий активный сегмент.
 */
export function GlassSegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
}: GlassSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const wrap = containerRef.current;
    const activeEl = itemRefs.current.get(value);
    if (!wrap || !activeEl) return;
    const wr = wrap.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    setIndicator({ left: r.left - wr.left, width: r.width });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, options.length]);

  useLayoutEffect(() => {
    const w = containerRef.current;
    if (!w) return;
    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(w);
    window.addEventListener("resize", updateIndicator);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator]);

  const labelMotion =
    "transition-[color] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none";

  return (
    <div
      ref={containerRef}
      className={[
        "relative flex w-full flex-wrap gap-0.5 rounded-full bg-black/[0.26] p-0.5 sm:w-auto sm:flex-nowrap",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0.5 top-0.5 z-0 rounded-full bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-[left,width,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
        style={{
          left: indicator.width > 0 ? indicator.left : 0,
          width: indicator.width > 0 ? indicator.width : 0,
          opacity: indicator.width > 0 ? 1 : 0,
        }}
      />
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) itemRefs.current.set(opt.value, el);
              else itemRefs.current.delete(opt.value);
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            className={[
              "relative z-[1] min-h-9 flex-1 rounded-full px-3.5 py-2 text-center text-xs font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]",
              labelMotion,
              selected
                ? "cursor-default text-zinc-50"
                : "cursor-pointer text-zinc-500 hover:text-zinc-300",
              "sm:flex-initial",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

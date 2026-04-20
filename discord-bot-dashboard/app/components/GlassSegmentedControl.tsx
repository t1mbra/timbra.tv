"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Единая кривая и длительность для сегментов и «стеклянных» кнопок Welcome. */
const GLASS_EASE_CLASS = "ease-[cubic-bezier(0.2,0.8,0.2,1)]";
const GLASS_DURATION_CLASS = "duration-200";

export const GLASS_SEGMENT_INDICATOR_MOTION = `${GLASS_DURATION_CLASS} ${GLASS_EASE_CLASS} motion-reduce:transition-none`;

/** Кнопки тулбаров, Bold/Italic, пикеры — без «плавающей» капсулы. */
export const GLASS_TOOLBAR_HIT_TRANSITION = [
  "transition-[background-color,box-shadow,color,ring-color,opacity,transform]",
  GLASS_DURATION_CLASS,
  GLASS_EASE_CLASS,
  "motion-reduce:transition-none",
].join(" ");

const INDICATOR_PILL_CLASS = [
  "pointer-events-none absolute bottom-0.5 top-0.5 z-0 rounded-full bg-white/14 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  "transition-[left,width,opacity]",
  GLASS_SEGMENT_INDICATOR_MOTION,
].join(" ");

function useSlidingSegmentIndicator<T extends string>(
  value: T,
  itemRefs: React.MutableRefObject<Map<T, HTMLButtonElement>>,
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemCount: number
) {
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const wrap = containerRef.current;
    const activeEl = itemRefs.current.get(value);
    if (!wrap || !activeEl) return;
    const wr = wrap.getBoundingClientRect();
    const r = activeEl.getBoundingClientRect();
    setIndicator({ left: r.left - wr.left, width: r.width });
  }, [value, containerRef, itemRefs]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, itemCount]);

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

  return indicator;
}

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
  /** Доп. классы трека (фон, border, flex). По умолчанию — как у доставки/стиля. */
  trackClassName?: string;
  /** Компактный ряд (S/M/L в попапе карточки). */
  dense?: boolean;
};

/**
 * Стеклянный сегментный контроль: общий фон, плавающий активный сегмент.
 */
export function GlassSegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
  trackClassName,
  dense = false,
}: GlassSegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const indicator = useSlidingSegmentIndicator(
    value,
    itemRefs,
    containerRef,
    options.length
  );

  const labelMotion = [
    "transition-[color,opacity]",
    GLASS_DURATION_CLASS,
    GLASS_EASE_CLASS,
    "motion-reduce:transition-none",
  ].join(" ");

  const defaultTrack = dense
    ? "w-full flex-nowrap justify-center border border-white/[0.08] bg-black/25"
    : "w-full flex-wrap bg-black/[0.26] sm:w-auto sm:flex-nowrap";

  return (
    <div
      ref={containerRef}
      className={[
        "relative flex gap-0.5 rounded-full p-0.5",
        trackClassName ?? defaultTrack,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      <div
        aria-hidden
        className={INDICATOR_PILL_CLASS}
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
              "relative z-[1] flex-1 rounded-full text-center font-medium",
              dense
                ? "min-h-[1.5rem] px-2 py-1 text-[11px]"
                : "min-h-9 px-3.5 py-2 text-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]",
              labelMotion,
              selected
                ? "cursor-default text-zinc-50"
                : "cursor-pointer text-zinc-500 hover:text-zinc-300",
              dense ? "min-w-0" : "sm:flex-initial",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export type GlassIconSegmentOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  title?: string;
  ariaLabel?: string;
};

export type GlassIconSegmentedGroupProps<T extends string = string> = {
  value: T;
  onValueChange: (next: T) => void;
  options: readonly GlassIconSegmentOption<T>[];
  ariaLabel: string;
  className?: string;
  trackClassName?: string;
  /** tablist+aria-selected (Превью/Raw) или group+aria-pressed (фон карточки). */
  variant?: "tabs" | "toolbar";
};

/**
 * Иконочные сегменты с той же плавающей капсулой, что и у текстовых сегментов.
 */
export function GlassIconSegmentedGroup<T extends string>({
  value,
  onValueChange,
  options,
  ariaLabel,
  className = "",
  trackClassName = "bg-black/[0.26]",
  variant = "tabs",
}: GlassIconSegmentedGroupProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const indicator = useSlidingSegmentIndicator(
    value,
    itemRefs,
    containerRef,
    options.length
  );

  const iconLabelMotion = [
    "transition-[color,opacity,transform]",
    GLASS_DURATION_CLASS,
    GLASS_EASE_CLASS,
    "motion-reduce:transition-none",
  ].join(" ");

  const isTabs = variant === "tabs";

  return (
    <div
      ref={containerRef}
      className={[
        "relative inline-flex shrink-0 items-center gap-0.5 self-start rounded-full p-0.5",
        trackClassName,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role={isTabs ? "tablist" : "group"}
      aria-label={ariaLabel}
    >
      <div
        aria-hidden
        className={INDICATOR_PILL_CLASS}
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
            title={opt.title}
            aria-label={opt.ariaLabel ?? opt.title}
            {...(isTabs
              ? { role: "tab" as const, "aria-selected": selected, tabIndex: selected ? 0 : -1 }
              : { "aria-pressed": selected })}
            onClick={() => onValueChange(opt.value)}
            className={[
              "relative z-[1] inline-flex size-8 shrink-0 items-center justify-center rounded-full",
              iconLabelMotion,
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              isTabs ? "focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]" : "",
              selected
                ? "cursor-default text-zinc-50"
                : "cursor-pointer text-zinc-500 hover:text-zinc-300",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

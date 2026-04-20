"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Layers } from "lucide-react";
import { createPortal } from "react-dom";
import { HexColorPicker } from "react-colorful";

import { isValidHexInput, normalizeHexColor } from "@/lib/colorHex";

const PRESETS = [
  "#FFFFFF",
  "#111827",
  "#8B5CF6",
  "#EC4899",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#38BDF8",
];

export type ColorPopoverProps = {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  /** Подсказка для кнопки-триггера */
  triggerTitle?: string;
  /** swatch — круг с цветом; overlay — иконка слоёв (цвет оверлея карточки) */
  triggerAppearance?: "swatch" | "overlay";
  /** Доп. строка в title (через « — ») */
  titleExtra?: string;
  /** Область карточки: поповер старается не перекрывать (например, зона заголовка/подзаголовка) */
  avoidRect?: DOMRect | null;
  /** z-index панели */
  zIndex?: number;
};

const POPOVER_EST_HEIGHT = 340;
const POPOVER_WIDTH = 280;

export function ColorPopover({
  value,
  onChange,
  label,
  triggerTitle,
  triggerAppearance = "swatch",
  titleExtra,
  avoidRect,
  zIndex = 250,
}: ColorPopoverProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  /** Локальный цвет во время работы пикера — не затирается из props при drag */
  const [pickerHex, setPickerHex] = useState(() =>
    isValidHexInput(value) ? normalizeHexColor(value, "#888888") : "#888888"
  );
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(false);
  const rafOnChangeRef = useRef<number | null>(null);
  const pendingHexRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const fallback = "#888888";

  const flushParentOnChange = useCallback(() => {
    const h = pendingHexRef.current;
    pendingHexRef.current = null;
    rafOnChangeRef.current = null;
    if (h != null) onChangeRef.current(h);
  }, []);

  const scheduleParentOnChange = useCallback((hex: string) => {
    pendingHexRef.current = hex;
    if (rafOnChangeRef.current != null) return;
    rafOnChangeRef.current = requestAnimationFrame(() => {
      rafOnChangeRef.current = null;
      flushParentOnChange();
    });
  }, [flushParentOnChange]);

  useEffect(() => {
    if (!open) {
      if (rafOnChangeRef.current != null) {
        window.cancelAnimationFrame(rafOnChangeRef.current);
        rafOnChangeRef.current = null;
      }
      flushParentOnChange();
    } else if (!openRef.current) {
      const v = isValidHexInput(value) ? normalizeHexColor(value, fallback) : fallback;
      setDraft(value);
      setPickerHex(v);
    }
    openRef.current = open;
  }, [open, value, fallback, flushParentOnChange]);

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const tr = triggerRef.current;
      if (!tr) return;

      const gap = 10;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;
      const tw = tr.getBoundingClientRect();
      const pw = Math.min(POPOVER_WIDTH, vw - pad * 2);
      const ph = POPOVER_EST_HEIGHT;

      const intersects = (top: number, left: number) => {
        if (!avoidRect) return false;
        const pr = { left, top, right: left + pw, bottom: top + ph };
        return !(
          pr.right < avoidRect.left ||
          pr.left > avoidRect.right ||
          pr.bottom < avoidRect.top ||
          pr.top > avoidRect.bottom
        );
      };

      let top = tw.top - gap - ph;
      let left = tw.left + tw.width / 2 - pw / 2;

      if (top < pad) {
        top = tw.bottom + gap;
      }
      if (intersects(top, left)) {
        left = tw.right + gap;
        top = tw.top + tw.height / 2 - ph / 2;
      }
      if (intersects(top, left)) {
        left = tw.left - gap - pw;
        top = tw.top + tw.height / 2 - ph / 2;
      }
      if (intersects(top, left)) {
        top = tw.bottom + gap;
        left = tw.left + tw.width / 2 - pw / 2;
      }

      left = Math.min(Math.max(left, pad), vw - pad - pw);
      top = Math.min(Math.max(top, pad), vh - pad - ph);
      setPos({ top, left });
    };

    const idr = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(update);
    });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.cancelAnimationFrame(idr);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, avoidRect]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  useEffect(
    () => () => {
      if (rafOnChangeRef.current != null) window.cancelAnimationFrame(rafOnChangeRef.current);
    },
    []
  );

  const applyHex = useCallback(
    (raw: string) => {
      const n = normalizeHexColor(raw, value);
      setPickerHex(n);
      setDraft(n);
      onChangeRef.current(n);
    },
    [value]
  );

  const onPickerChange = useCallback(
    (hex: string) => {
      const n = normalizeHexColor(hex, pickerHex);
      setPickerHex(n);
      setDraft(n);
      scheduleParentOnChange(n);
    },
    [pickerHex, scheduleParentOnChange]
  );

  const pickerColor = isValidHexInput(draft)
    ? normalizeHexColor(draft, value)
    : isValidHexInput(pickerHex)
      ? pickerHex
      : isValidHexInput(value)
        ? normalizeHexColor(value, fallback)
        : fallback;

  const panel = open && pos && (
    <div
      ref={panelRef}
      data-color-popover=""
      className="fixed w-[min(280px,calc(100vw-16px))] rounded-2xl border border-white/[0.12] p-3 shadow-[0_16px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl will-change-transform"
      style={{
        top: pos.top,
        left: pos.left,
        zIndex,
        background: "rgba(18, 22, 36, 0.72)",
      }}
      role="dialog"
      aria-label={label}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="welcome-card-hex-picker mb-3">
        <HexColorPicker color={pickerColor} onChange={onPickerChange} />
      </div>
      <div className="mb-2.5 flex items-center gap-2">
        <div
          className="size-10 shrink-0 rounded-xl ring-1 ring-white/15"
          style={{ backgroundColor: isValidHexInput(draft) ? normalizeHexColor(draft, value) : value }}
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="sr-only">
            {label}
          </label>
          <input
            id={id}
            type="text"
            value={draft}
            onChange={(e) => {
              const v = e.target.value;
              setDraft(v);
              if (isValidHexInput(v)) {
                const n = normalizeHexColor(v, value);
                setPickerHex(n);
                scheduleParentOnChange(n);
              }
            }}
            onBlur={() => {
              if (isValidHexInput(draft)) {
                applyHex(draft);
              } else {
                setDraft(value);
                setPickerHex(isValidHexInput(value) ? normalizeHexColor(value, fallback) : fallback);
              }
            }}
            onPaste={(e) => {
              const t = e.clipboardData.getData("text");
              if (isValidHexInput(t)) {
                e.preventDefault();
                applyHex(t);
              }
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder="Например #f4f4f5"
            className={`ds-input w-full font-mono text-sm ${
              draft.trim() && !isValidHexInput(draft) ? "ring-1 ring-rose-500/50" : ""
            }`}
            aria-invalid={draft.trim() ? !isValidHexInput(draft) : undefined}
          />
          {draft.trim() && !isValidHexInput(draft) ? (
            <p className="mt-1 text-[11px] text-rose-300/90">Неверный формат HEX</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5" role="list" aria-label="Готовые цвета">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            title={`Готовый цвет ${p}`}
            className="size-7 rounded-lg ring-1 ring-white/15 transition hover:ring-white/35 hover:brightness-110"
            style={{ backgroundColor: p }}
            onClick={() => applyHex(p)}
          />
        ))}
      </div>
    </div>
  );

  const triggerTitleMerged = [triggerTitle ?? label, titleExtra].filter(Boolean).join(" — ");

  const swatchTrigger: ReactNode = (
    <span
      className="block size-5 rounded-full ring-1 ring-black/40"
      style={{ backgroundColor: isValidHexInput(value) ? normalizeHexColor(value, fallback) : fallback }}
    />
  );

  const overlayTrigger: ReactNode = (
    <span className="relative inline-flex items-center justify-center">
      <Layers className="size-[18px] text-zinc-200/95" strokeWidth={1.75} aria-hidden />
      <span
        className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-1 ring-white/45"
        style={{
          backgroundColor: isValidHexInput(value) ? normalizeHexColor(value, fallback) : fallback,
        }}
        aria-hidden
      />
    </span>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={triggerTitleMerged}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((o) => !o);
        }}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.08] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm transition hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {triggerAppearance === "overlay" ? overlayTrigger : swatchTrigger}
      </button>
      {typeof document !== "undefined" && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

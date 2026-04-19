"use client";

import { useCallback, useId, useState, type ReactNode } from "react";

export type CollapsibleSettingsSectionProps = {
  /** Префикс для стабильных id панели и кнопки */
  sectionId: string;
  /** id для `<h2>` (например `section-heading` и `aria-labelledby` у `<section>`) */
  headingDomId?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

function DisclosureChevron({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.25 6.25 8 9.75 11.75 6.25" />
    </svg>
  );
}

export function CollapsibleSettingsSection({
  sectionId,
  headingDomId,
  title,
  subtitle,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className = "",
}: CollapsibleSettingsSectionProps) {
  const rid = useId().replace(/:/g, "");
  const panelId = `${sectionId}-panel-${rid}`;
  const headingId = headingDomId ?? `${sectionId}-heading-${rid}`;

  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const toggle = useCallback(() => setOpen(!open), [open, setOpen]);

  return (
    <div className={className.trim() || undefined}>
      <div className={open ? "border-b border-white/10 pb-5" : "pb-0.5"}>
        <h2 id={headingId} className="ds-heading m-0 text-xl sm:text-2xl">
          <button
            type="button"
            className="m-0 flex w-full cursor-pointer items-start gap-2 border-0 bg-transparent p-0 text-left font-[inherit] leading-[inherit] tracking-[inherit] text-inherit [-webkit-tap-highlight-color:transparent] shadow-none outline-none ring-0 transition-colors duration-150 ease-out hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] active:opacity-90"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={toggle}
          >
            <span className="min-w-0 flex-1 pr-1">
              <span className="block font-medium tracking-[-0.02em] text-zinc-100">{title}</span>
              {subtitle != null && subtitle !== "" ? (
                <span className="mt-2 block max-w-2xl text-sm font-normal leading-relaxed tracking-normal text-zinc-400">
                  {subtitle}
                </span>
              ) : null}
            </span>
            <DisclosureChevron
              className={`mt-[0.35rem] h-4 w-4 shrink-0 text-zinc-500/65 transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:duration-75 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </h2>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none motion-reduce:duration-75 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            id={panelId}
            role="region"
            aria-labelledby={headingId}
            inert={!open ? true : undefined}
            className="pt-4"
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

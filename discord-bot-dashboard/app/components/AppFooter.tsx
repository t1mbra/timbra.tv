import { homeCopy } from "@/lib/copy/home";
import { getAppVersionDisplay } from "@/lib/appVersion";

export function AppFooter() {
  const version = getAppVersionDisplay();
  const versionLine = `${homeCopy.versionProductName} v${version}`;

  return (
    <footer
      className="shrink-0 bg-transparent text-[rgb(255_255_255/0.42)]"
      role="contentinfo"
      aria-label="Нижний колонтитул"
    >
      <div className="app-shell-container px-6 py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <p className="text-[11px] font-medium leading-none tracking-[0.01em]">
            {homeCopy.copyrightLine}
          </p>
          <p
            className="text-[11px] font-medium leading-none tabular-nums tracking-[0.02em] sm:text-right"
            aria-label={`Версия ${version}`}
          >
            {versionLine}
          </p>
        </div>
      </div>
    </footer>
  );
}

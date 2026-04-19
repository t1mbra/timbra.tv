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
        <div className="hidden grid-cols-[1fr_auto_1fr] items-end gap-x-8 gap-y-3 md:grid">
          <p className="justify-self-start text-left text-[11px] font-medium leading-none tracking-[0.01em]">
            {homeCopy.copyrightLine}
          </p>
          <div className="flex justify-center">
            <img
              src="/timbra-logo.svg"
              alt=""
              width={64}
              height={22}
              decoding="async"
              className="h-auto w-16 object-contain opacity-90"
            />
          </div>
          <p
            className="justify-self-end text-right text-[11px] font-medium leading-none tabular-nums tracking-[0.02em]"
            aria-label={`Версия ${version}`}
          >
            {versionLine}
          </p>
        </div>
      </div>
    </footer>
  );
}

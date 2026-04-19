export function AppFooter() {
  return (
    <footer
      className="shrink-0 text-[rgb(255_255_255/0.38)]"
      role="contentinfo"
      aria-label="Нижний колонтитул"
    >
      <div className="app-container mx-auto flex justify-center px-6 py-3">
        <div className="flex items-center gap-2.5 leading-none">
          <img
            src="/timbra-logo.svg"
            alt=""
            width={32}
            height={32}
            decoding="async"
            className="h-[32px] w-[32px] shrink-0 opacity-[0.72]"
          />
          <p className="m-0 text-[11px] font-medium leading-none tracking-[0.01em]">
            © 2026 timbra.tv
          </p>
        </div>
      </div>
    </footer>
  );
}

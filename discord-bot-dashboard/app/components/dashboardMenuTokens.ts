/**
 * Общие визуальные токены для выпадающих меню дашборда (UserMenu, SidebarServerSwitcher).
 */

export const dashboardMenuPanelStyle = {
  background: "rgba(18, 22, 36, 0.52)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
} as const;

/** Оболочка панели (радиус, отступы); без overflow — для панели с общей прокруткой (UserMenu). */
export const dashboardMenuPanelBodyClass =
  "z-[240] rounded-2xl p-1.5 isolation-isolate";

/** Внешний контейнер с overflow:hidden — для колонки flex + внутренний скролл (серверный список). */
export const dashboardMenuPanelClass = `${dashboardMenuPanelBodyClass} overflow-hidden`;

/**
 * Ограничение высоты выпадашки относительно окна (короткий экран, длинный список).
 * dvh учитывает мобильные панели браузера.
 */
export const dashboardMenuPanelMaxHeightClass =
  "max-h-[min(85dvh,28rem)]";

/** Панель UserMenu: тот же принцип, без тяжёлого визуала при 2 пунктах */
export const dashboardMenuUserPanelMaxHeightClass =
  "max-h-[min(70dvh,18rem)]";

/**
 * Прокручиваемая область списка (серверы); футер меню остаётся вне скролла.
 */
export const dashboardMenuScrollRegionClass =
  "min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain";

/**
 * Интерактивная строка меню (пункты списка серверов, «Подключить сервер», пункты UserMenu).
 */
export const dashboardMenuRowClass =
  "flex w-full min-h-[2.25rem] min-w-0 cursor-pointer items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-1.5 text-left text-sm text-zinc-200/95 transition hover:bg-white/[0.06] active:bg-white/[0.05] active:opacity-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]";

export const dashboardMenuSeparatorClass = "mx-1.5 my-1 h-px shrink-0 bg-white/[0.08]";

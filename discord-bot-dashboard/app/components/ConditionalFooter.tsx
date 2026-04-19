"use client";

import { usePathname } from "next/navigation";
import { AppFooter } from "./AppFooter";

/** На главной подпись и логотип перенесены в тело страницы, чтобы не резать градиент. */
export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <AppFooter />;
}

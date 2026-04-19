import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ConditionalFooter } from "./components/ConditionalFooter";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Панель бота",
  description: "Управление настройками Discord-бота",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-screen flex-col">
        <div className="app-bg flex min-h-screen w-full flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          <ConditionalFooter />
        </div>
      </body>
    </html>
  );
}

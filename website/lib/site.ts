export const site = {
  name: "Timbra",
  tagline: "Стрим · уют · козочка",
  description:
    "Timbra — козочка-стример и блогер: атмосферные игры, тёплый эфир и любовь к животным. Личный сайт — расписание, заметки и ссылки в одном спокойном месте.",
} as const;

export type NavItem = { href: string; label: string };

export const navItems: NavItem[] = [
  { href: "/", label: "Главная" },
  { href: "/about", label: "О себе" },
  { href: "/streams", label: "Стримы" },
  { href: "/calendar", label: "Календарь" },
  { href: "/news", label: "Новости" },
  { href: "/bot", label: "Бот" },
  { href: "/links", label: "Ссылки" },
];

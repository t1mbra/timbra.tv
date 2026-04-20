"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  ArrowDownRight,
  Bold,
  CircleDot,
  Droplets,
  Image as ImageIcon,
  Italic,
  Layers,
  PaintBucket,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import { DashboardDropdownSurface } from "@/app/components/DashboardDropdownSurface";
import { welcomeCardPreviewFontStack } from "@/lib/welcomeCardPreviewFonts";
import type { ConnectedGuildForDashboard } from "@/lib/getUserManageableGuildsWithBotState";
import {
  imageCardsEqual as imageCardConfigsEqual,
  mergeImageCard,
  type ImageCardFieldStyleMerged,
  type ImageCardGuildConfigMerged,
} from "@/lib/mergeImageCardConfig";
import {
  IMAGE_CARD_FONT_DISPLAY_NAME,
  type ImageCardFontKey,
} from "@/lib/welcomeCardConstants";
import {
  IMAGE_CARD_RADIUS_PX,
  IMAGE_CARD_W,
  imageCardPreviewScaledMetrics,
} from "@/lib/welcomeImageCardLayout";
import { setLastGuildCookieClient } from "@/lib/lastGuildCookie";
import { ColorPopover } from "../../components/ColorPopover";
import { WelcomeCardPreviewFontFaces } from "../../components/WelcomeCardPreviewFontFaces";
import { CollapsibleSettingsSection } from "../../components/CollapsibleSettingsSection";
import { CompactSwitch } from "../../components/CompactSwitch";
import { SidebarServerSwitcher } from "../../components/SidebarServerSwitcher";
import { UserMenu } from "../../components/usermenu";
import { welcomeModuleCopy } from "@/lib/copy/welcomeModule";

type PickerType = "emoji" | "channel" | "role" | "variable" | null;
type PickerKind = Exclude<PickerType, null>;

type VariablePickerIconKind = "mention" | "username" | "server" | "members" | "calendar";

type PickerItem = {
  id: string;
  label: string;
  insert: string;
  preview?: string;
  imageUrl?: string;
  meta?: string;
  /** Discord role color (RGB int); только для отображения в пикере */
  roleColor?: number;
  /** Пикер переменных: подзаголовок и иконка слева */
  variableSubtitle?: string;
  variableIcon?: VariablePickerIconKind;
};

type DashboardBootstrap = {
  viewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  bot: {
    id: string | null;
    name: string;
    avatarUrl: string | null;
  } | null;
  applicationId?: string | null;
  bootstrapWarnings?: string[];
};

/** View Channel, Send, Embed, Attach, Read History, Manage Roles */
const BOT_INVITE_PERMISSIONS = "268553216";

function buildBotInviteUrl(applicationId: string, guildId: string) {
  const params = new URLSearchParams({
    client_id: applicationId,
    scope: "bot applications.commands",
    permissions: BOT_INVITE_PERMISSIONS,
    guild_id: guildId,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

type GuildChannel = {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  mention: string;
};

type GuildRole = {
  id: string;
  name: string;
  managed: boolean;
  mention: string;
  /** Integer цвета роли Discord (0 = цвет по умолчанию) */
  color: number;
};

type GuildEmoji = {
  id: string | null;
  name: string;
  animated: boolean;
  mention: string;
};

type GuildResourcesResponse = {
  channels: GuildChannel[];
  roles: GuildRole[];
  emojis: GuildEmoji[];
  /** Ошибки отдельных запросов к Discord (частичный успех) */
  errors?: {
    channels?: string;
    roles?: string;
    emojis?: string;
  };
};

type EmbedFieldPersisted = {
  name: string;
  value: string;
  inline: boolean;
};

type EmbedFieldRow = EmbedFieldPersisted & { id: string };

type ImageCardConfig = ImageCardGuildConfigMerged;

type DashboardConfig = {
  welcomeEnabled: boolean;
  channelId: string;
  humanRoleId: string;
  botRoleId: string;
  skipBotAccounts: boolean;
  welcomeStyle: "text" | "embed" | "imageCard";
  textImageDataUrl: string;
  message: string;
  title: string;
  description: string;
  color: string;
  embedAuthorName: string;
  embedAuthorAvatar: boolean;
  embedAuthorAvatarUrl: string;
  embedFooter: string;
  embedImageDataUrl: string;
  embedFields: EmbedFieldPersisted[];
  imageCard?: ImageCardConfig;
};

type CustomSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  title?: string;
};

type DirtyConfig = {
  welcomeEnabled: boolean;
  channelId: string;
  humanRoleId: string;
  botRoleId: string;
  skipBotAccounts: boolean;
  message: string;
  title: string;
  description: string;
  color: string;
  embedAuthorName: string;
  embedAuthorAvatar: boolean;
  embedAuthorAvatarUrl: string;
  embedFooter: string;
  embedImageDataUrl: string;
  embedFields: EmbedFieldRow[];
  welcomeStyle: DashboardConfig["welcomeStyle"];
  textImageDataUrl: string;
  imageCard: ImageCardConfig;
  // Флаги показывают, присутствовали ли поля в загруженном config.json.
  // Если поле отсутствовало, изменения в соответствующем UI не должны считаться "dirty".
  welcomeStyleExists: boolean;
  textImageDataUrlExists: boolean;
  imageCardExists: boolean;
};

function configsEqual(a: DirtyConfig, b: DirtyConfig): boolean {
  if (a.welcomeEnabled !== b.welcomeEnabled) return false;
  if (a.channelId !== b.channelId) return false;
  if (a.humanRoleId !== b.humanRoleId) return false;
  if (a.botRoleId !== b.botRoleId) return false;
  if (a.skipBotAccounts !== b.skipBotAccounts) return false;
  if (a.message !== b.message) return false;
  if (a.title !== b.title) return false;
  if (a.description !== b.description) return false;
  if (a.color !== b.color) return false;
  if (a.embedAuthorName !== b.embedAuthorName) return false;
  if (a.embedAuthorAvatar !== b.embedAuthorAvatar) return false;
  if (a.embedAuthorAvatarUrl !== b.embedAuthorAvatarUrl) return false;
  if (a.embedFooter !== b.embedFooter) return false;
  if (a.embedImageDataUrl !== b.embedImageDataUrl) return false;
  if (!embedFieldsEqual(a.embedFields, b.embedFields)) return false;

  if (b.welcomeStyleExists && a.welcomeStyle !== b.welcomeStyle) return false;
  if (b.textImageDataUrlExists && a.textImageDataUrl !== b.textImageDataUrl) return false;
  if (b.imageCardExists && !imageCardConfigsEqual(a.imageCard, b.imageCard)) return false;

  return true;
}

function newEmbedFieldRow(): EmbedFieldRow {
  const id =
    typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `embed-field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return { id, name: "", value: "", inline: false };
}

function parseEmbedFieldsFromConfig(raw: unknown): EmbedFieldRow[] {
  if (!Array.isArray(raw)) return [];
  const out: EmbedFieldRow[] = [];
  let i = 0;
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const id =
      typeof globalThis !== "undefined" && globalThis.crypto && "randomUUID" in globalThis.crypto
        ? globalThis.crypto.randomUUID()
        : `embed-field-${i}-${Date.now()}`;
    i += 1;
    out.push({
      id,
      name: typeof o.name === "string" ? o.name : "",
      value: typeof o.value === "string" ? o.value : "",
      inline: Boolean(o.inline),
    });
  }
  return out;
}

function embedFieldsToPersisted(rows: EmbedFieldRow[]): EmbedFieldPersisted[] {
  return rows.map(({ name, value, inline }) => ({ name, value, inline }));
}

function embedFieldsEqual(a: EmbedFieldRow[], b: EmbedFieldRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].name !== b[i].name || a[i].value !== b[i].value || a[i].inline !== b[i].inline) {
      return false;
    }
  }
  return true;
}

const variableOptions: PickerItem[] = [
  {
    id: "user",
    label: "Участник (упоминание)",
    insert: "{user}",
    variableSubtitle: "Как настоящее упоминание нового участника в Discord",
    variableIcon: "mention",
  },
  {
    id: "username",
    label: "Имя участника",
    insert: "{username}",
    variableSubtitle: "Только отображаемое имя, без формата упоминания",
    variableIcon: "username",
  },
  {
    id: "server",
    label: "Название сервера",
    insert: "{server}",
    variableSubtitle: "Подставляет имя этого сервера",
    variableIcon: "server",
  },
  {
    id: "memberCount",
    label: "Число участников",
    insert: "{memberCount}",
    variableSubtitle: "Текущее количество участников на сервере",
    variableIcon: "members",
  },
  {
    id: "date",
    label: "Дата",
    insert: "{date}",
    variableSubtitle: "Текущая дата на момент отправки",
    variableIcon: "calendar",
  },
];

function VariablePickerIcon({ kind }: { kind: VariablePickerIconKind }) {
  const cls = "h-[18px] w-[18px] shrink-0 text-zinc-500";
  switch (kind) {
    case "mention":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path
            d="M15.5 9.5v4.5a3.5 3.5 0 1 1-3.5-3.5 1 1 0 0 0 5 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "username":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M6.5 19c0-3.5 3-5.5 5.5-5.5s5.5 2 5.5 5.5" strokeLinecap="round" />
        </svg>
      );
    case "server":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M4 10.5 12 5l8 5.5V19a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8.5Z" strokeLinejoin="round" />
        </svg>
      );
    case "members":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M7 10V8a5 5 0 0 1 10 0v2" strokeLinecap="round" />
          <rect x="5" y="10" width="14" height="10" rx="2" strokeLinejoin="round" />
          <path d="M9 14h6" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <rect x="4" y="5" width="16" height="16" rx="2" strokeLinejoin="round" />
          <path d="M8 3v4M16 3v4M4 11h16" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

const SECTION_ITEMS = [
  {
    id: "welcome" as const,
    navLabel: "Приветствие",
    heading: "Сообщения приветствия",
    subtitle:
      "Идеальные привествия новых участников, только прибывших на сервер!",
  },
  {
    id: "autoRoles" as const,
    navLabel: "Авто-роли",
    heading: "Авто-роли",
    subtitle:
      "Автоматическая выдача ролей новым участникам при входе на сервер.",
  },
] as const;

type SectionId = (typeof SECTION_ITEMS)[number]["id"];
type SectionItem = (typeof SECTION_ITEMS)[number];

type WelcomeMessageEditorMode = "raw" | "preview";

type WelcomeEditorHistoryEntry = {
  message: string;
  caret: number;
  editorMode: WelcomeMessageEditorMode;
};

const WELCOME_HISTORY_MAX = 80;
const WELCOME_HISTORY_DEBOUNCE_MS = 550;

/** Подпись сервера в превью без запроса списка гильдий */
const PREVIEW_SERVER_LABEL = "Панель сервера";
const PREVIEW_USERNAME = "Timbra";
const PREVIEW_USER_AT = "@Timbra";
const PREVIEW_MEMBER_COUNT = "128";

function previewLightenHex(hex: string): string {
  const s = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(s)) return "#2a2b38";
  const n = Number.parseInt(s, 16);
  const r = Math.min(255, ((n >> 16) & 255) + 28);
  const g = Math.min(255, ((n >> 8) & 255) + 28);
  const b = Math.min(255, (n & 255) + 28);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

/** Плейсхолдеры для превью карточки (согласовано с тестовой отправкой) */
function applyWelcomeImageCardPreviewPlaceholders(text: string): string {
  const dateStr = new Date().toLocaleDateString();
  return text
    .replaceAll("{user}", PREVIEW_USER_AT)
    .replaceAll("{username}", PREVIEW_USERNAME)
    .replaceAll("{server}", PREVIEW_SERVER_LABEL)
    .replaceAll("{memberCount}", PREVIEW_MEMBER_COUNT)
    .replaceAll("{date}", dateStr);
}

const DEFAULT_WELCOME_MESSAGE = "Добро пожаловать, {user}! ✨\nЗагляни в {channel:rules}";
const DEFAULT_WELCOME_DESCRIPTION = "Очень рады тебя видеть на сервере {server} 💜";

function getTitleByType(type: PickerType): string {
  switch (type) {
    case "emoji":
      return "Эмодзи";
    case "channel":
      return "Канал";
    case "role":
      return "Роль";
    case "variable":
      return "Переменные";
    default:
      return "";
  }
}

function getSectionItem(id: SectionId): SectionItem {
  const item = SECTION_ITEMS.find((s) => s.id === id);
  return item ?? SECTION_ITEMS[0];
}

function SectionSidebarIcon({ id, className }: { id: SectionId; className?: string }) {
  const cls = className ?? "h-[18px] w-[18px] shrink-0 opacity-90";
  if (id === "welcome") {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" aria-hidden>
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" aria-hidden>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 8v6M22 11h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWelcomeImagePlaceholder(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="m21 15-4.35-4.35a.5.5 0 0 0-.7 0l-6.3 6.3a.5.5 0 0 1-.70L6 13" />
    </svg>
  );
}

function imageCardGradientPreviewLayerStyle(ic: ImageCardGuildConfigMerged): CSSProperties {
  const o = ic.backgroundOpacity;
  if (ic.backgroundGradientMode === "radial") {
    return {
      background: `radial-gradient(circle at center, ${ic.backgroundGradientStartColor}, ${ic.backgroundGradientEndColor})`,
      opacity: o,
    };
  }
  return {
    background: `linear-gradient(135deg, ${ic.backgroundGradientStartColor}, ${ic.backgroundGradientEndColor})`,
    opacity: o,
  };
}

/** Только превью сплошного фона: подложка под непрозрачность слоя (не в PNG) */
const IMAGE_CARD_SOLID_PREVIEW_BACKING: CSSProperties = {
  backgroundColor: "#1a1a1f",
  backgroundImage: `
    linear-gradient(45deg, rgba(255,255,255,0.045) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.045) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.045) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.045) 75%)`,
  backgroundSize: "11px 11px",
  backgroundPosition: "0 0, 0 5.5px, 5.5px -5.5px, -5.5px 0px",
};

function IconTrashCompact(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14ZM10 11v6M14 11v6" />
    </svg>
  );
}

function getChannelTypeLabel(type: number): string {
  switch (type) {
    case 0:
      return "Text";
    case 5:
      return "Announcement";
    case 15:
      return "Forum";
    case 16:
      return "Media";
    default:
      return "Channel";
  }
}

const WELCOME_STYLE_LABELS: Record<DashboardConfig["welcomeStyle"], string> = {
  text: "Текст",
  embed: "Embed",
  imageCard: "Карточка",
};

function IconWelcomePreviewMode(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconWelcomeRawMode(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconInsertSmile(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c1.2 1.6 2.6 2.5 3.5 2.5s2.3-.9 3.5-2.5" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconInsertHash(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}

function IconInsertShield(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    </svg>
  );
}

function IconInsertBraces(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 6a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2 2 2 0 0 1 2 2v2a2 2 0 0 0 2 2" />
      <path d="M15 18a2 2 0 0 0 2-2v-2a2 2 0 0 1 2-2 2 2 0 0 1-2-2V8a2 2 0 0 0-2-2" />
    </svg>
  );
}

function IconEmbedAuthorAvatar(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 20.25c.85-3.1 3.45-5.25 6.5-5.25s5.65 2.15 6.5 5.25" />
    </svg>
  );
}

function insertToolbarIcon(type: Exclude<PickerType, null>) {
  const cls = "h-[1.05rem] w-[1.05rem]";
  switch (type) {
    case "emoji":
      return <IconInsertSmile className={cls} />;
    case "channel":
      return <IconInsertHash className={cls} />;
    case "role":
      return <IconInsertShield className={cls} />;
    case "variable":
      return <IconInsertBraces className={cls} />;
    default:
      return null;
  }
}

type WelcomePreviewToken =
  | { kind: "text"; value: string }
  | { kind: "cemoji"; animated: boolean; name: string; id: string }
  | { kind: "channel"; id: string }
  | { kind: "role"; id: string }
  | { kind: "userVar" }
  | { kind: "usernameVar" }
  | { kind: "serverVar" }
  | { kind: "memberCountVar" }
  | { kind: "dateVar" };

const WELCOME_PREVIEW_TOKEN_RE =
  /<a:([^:>]+):(\d+)>|<:([^:>]+):(\d+)>|<#(\d+)>|<@&(\d+)>|\{user\}|\{username\}|\{server\}|\{memberCount\}|\{date\}/g;

function tokenizeWelcomePreview(input: string): WelcomePreviewToken[] {
  const re = new RegExp(WELCOME_PREVIEW_TOKEN_RE.source, "g");
  const tokens: WelcomePreviewToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    const idx = m.index;
    if (idx > last) tokens.push({ kind: "text", value: input.slice(last, idx) });
    if (m[1] !== undefined && m[2] !== undefined) {
      tokens.push({ kind: "cemoji", animated: true, name: m[1], id: m[2] });
    } else if (m[3] !== undefined && m[4] !== undefined) {
      tokens.push({ kind: "cemoji", animated: false, name: m[3], id: m[4] });
    } else if (m[5] !== undefined) {
      tokens.push({ kind: "channel", id: m[5] });
    } else if (m[6] !== undefined) {
      tokens.push({ kind: "role", id: m[6] });
    } else if (m[0] === "{user}") {
      tokens.push({ kind: "userVar" });
    } else if (m[0] === "{username}") {
      tokens.push({ kind: "usernameVar" });
    } else if (m[0] === "{server}") {
      tokens.push({ kind: "serverVar" });
    } else if (m[0] === "{memberCount}") {
      tokens.push({ kind: "memberCountVar" });
    } else if (m[0] === "{date}") {
      tokens.push({ kind: "dateVar" });
    }
    last = idx + m[0].length;
  }
  if (last < input.length) tokens.push({ kind: "text", value: input.slice(last) });
  return tokens;
}

const WELCOME_SRC_ATTR = "data-welcome-src";
/** Интерактивные токены Preview: канал, роль, emoji, переменные */
const WELCOME_INTERACTIVE_TOKEN = "welcome-interactive-token";
const WELCOME_TOKEN_SELECTED = "welcome-interactive-token--selected";

function clearWelcomeTokenSelection(root: HTMLElement) {
  root.querySelectorAll(`.${WELCOME_TOKEN_SELECTED}`).forEach((n) =>
    n.classList.remove(WELCOME_TOKEN_SELECTED)
  );
}

/** Цвет точки в пикере ролей из нативного integer Discord */
function discordRoleDotFill(color: number | undefined): string {
  if (color == null || color === 0) return "rgba(161, 161, 170, 0.65)";
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return `rgb(${r}, ${g}, ${b})`;
}

type WelcomeRichDomContext = {
  channelById: Map<string, GuildChannel>;
  roleById: Map<string, GuildRole>;
  emojiMetaById: Map<string, boolean>;
  previewDateStr: string;
};

function serializeWelcomeFlatNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as HTMLElement;
  if (el.tagName === "BR") return "\n";
  const src = el.getAttribute(WELCOME_SRC_ATTR);
  if (src !== null) return src;
  let s = "";
  for (let i = 0; i < el.childNodes.length; i++) {
    s += serializeWelcomeFlatNode(el.childNodes[i]);
  }
  return s;
}

function serializeWelcomeRichEditorRoot(root: HTMLElement): string {
  let s = "";
  for (let i = 0; i < root.childNodes.length; i++) {
    s += serializeWelcomeFlatNode(root.childNodes[i]);
  }
  return s;
}

function normalizeWelcomeRichDivs(root: HTMLElement) {
  const flatten = (parent: HTMLElement) => {
    let node = parent.firstChild;
    while (node) {
      const next = node.nextSibling;
      if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "DIV") {
        const div = node as HTMLElement;
        if (div.previousSibling) parent.insertBefore(document.createElement("br"), div);
        while (div.firstChild) parent.insertBefore(div.firstChild, div);
        parent.removeChild(div);
      }
      node = next;
    }
  };
  flatten(root);
}

function getWelcomePlainCaretOffset(root: HTMLElement): number {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return serializeWelcomeRichEditorRoot(root).length;
  const range = sel.getRangeAt(0);
  let offset = 0;
  let found = false;

  const walk = (node: Node): void => {
    if (found) return;
    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += range.startOffset;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const src = el.getAttribute(WELCOME_SRC_ATTR);
        if (src !== null) {
          offset += range.startOffset >= 1 ? src.length : 0;
        }
      }
      found = true;
      return;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent ?? "").length;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      offset += 1;
      return;
    }
    const src = el.getAttribute(WELCOME_SRC_ATTR);
    if (src !== null) {
      if (el.contains(range.startContainer)) {
        offset += src.length;
        found = true;
        return;
      }
      offset += src.length;
      return;
    }
    for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
  };

  for (let i = 0; i < root.childNodes.length; i++) walk(root.childNodes[i]);
  return found ? offset : serializeWelcomeRichEditorRoot(root).length;
}

function setWelcomePlainCaretOffset(root: HTMLElement, target: number): void {
  const sel = window.getSelection();
  let acc = 0;

  const walk = (node: Node): boolean => {
    if (node.nodeType === Node.TEXT_NODE) {
      const len = (node.textContent ?? "").length;
      if (acc + len >= target) {
        const r = document.createRange();
        r.setStart(node, Math.max(0, Math.min(len, target - acc)));
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
        return true;
      }
      acc += len;
      return false;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return false;
    const el = node as HTMLElement;
    if (el.tagName === "BR") {
      if (acc + 1 >= target) {
        const r = document.createRange();
        r.setStartBefore(el);
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
        return true;
      }
      acc += 1;
      return false;
    }
    const src = el.getAttribute(WELCOME_SRC_ATTR);
    if (src !== null) {
      if (acc + src.length >= target) {
        const r = document.createRange();
        r.setStartAfter(el);
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
        return true;
      }
      acc += src.length;
      return false;
    }
    for (let i = 0; i < el.childNodes.length; i++) {
      if (walk(el.childNodes[i])) return true;
    }
    return false;
  };

  for (let i = 0; i < root.childNodes.length; i++) {
    if (walk(root.childNodes[i])) return;
  }
  const r = document.createRange();
  r.selectNodeContents(root);
  r.collapse(false);
  sel?.removeAllRanges();
  sel?.addRange(r);
}

function buildWelcomeDomForToken(tok: WelcomePreviewToken, ctx: WelcomeRichDomContext): Node {
  const mentionPillBase =
    "inline-flex max-w-full items-center rounded-md px-1.5 py-px align-baseline text-sm font-medium";

  if (tok.kind === "text") return document.createTextNode(tok.value);
  if (tok.kind === "cemoji") {
    const useGif = tok.animated || ctx.emojiMetaById.get(tok.id) === true;
    const ext = useGif ? "gif" : "png";
    const srcMention = tok.animated ? `<a:${tok.name}:${tok.id}>` : `<:${tok.name}:${tok.id}>`;
    const img = document.createElement("img");
    img.setAttribute(WELCOME_SRC_ATTR, srcMention);
    img.setAttribute("alt", "");
    img.setAttribute("draggable", "false");
    img.className =
      "mx-0.5 inline-block h-[1.25em] w-[1.25em] align-text-bottom object-contain";
    img.src = `https://cdn.discordapp.com/emojis/${tok.id}.${ext}?size=48&quality=lossless`;
    img.loading = "lazy";
    img.title = `:${tok.name}:`;
    img.onerror = () => {
      const fallback = document.createElement("span");
      fallback.setAttribute(WELCOME_SRC_ATTR, srcMention);
      fallback.textContent = `:${tok.name}:`;
      fallback.className = "text-sm text-zinc-400";
      img.replaceWith(fallback);
    };
    return img;
  }
  if (tok.kind === "channel") {
    const ch = ctx.channelById.get(tok.id);
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, `<#${tok.id}>`);
    span.contentEditable = "false";
    span.className = `${mentionPillBase} ${WELCOME_INTERACTIVE_TOKEN} welcome-token-channel bg-[#5865F2]/28 text-[#c9d4ff]`;
    span.title = ch ? `Канал: ${ch.name}` : "Канал";
    span.textContent = ch ? `#${ch.name}` : "#канал";
    return span;
  }
  if (tok.kind === "role") {
    const role = ctx.roleById.get(tok.id);
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, `<@&${tok.id}>`);
    span.contentEditable = "false";
    const style = rolePreviewPillStyle(role?.color);
    const neutral = !style || Object.keys(style).length === 0;
    span.className = neutral
      ? `${mentionPillBase} ${WELCOME_INTERACTIVE_TOKEN} welcome-token-role bg-white/12 text-zinc-200`
      : `${mentionPillBase} ${WELCOME_INTERACTIVE_TOKEN} welcome-token-role`;
    if (!neutral) Object.assign(span.style, style);
    span.title = role ? `Роль: ${role.name}` : "Роль";
    span.textContent = role ? `@${role.name}` : "@role";
    return span;
  }
  if (tok.kind === "userVar") {
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, "{user}");
    span.contentEditable = "false";
    span.className = `${mentionPillBase} ${WELCOME_INTERACTIVE_TOKEN} welcome-token-variable-user`;
    span.title = "Плейсхолдер {user}";
    span.textContent = PREVIEW_USER_AT;
    return span;
  }
  if (tok.kind === "usernameVar") {
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, "{username}");
    span.contentEditable = "false";
    span.className = "";
    span.title = "{username}";
    span.textContent = PREVIEW_USERNAME;
    return span;
  }
  if (tok.kind === "serverVar") {
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, "{server}");
    span.contentEditable = "false";
    span.className = "";
    span.title = "{server}";
    span.textContent = PREVIEW_SERVER_LABEL;
    return span;
  }
  if (tok.kind === "memberCountVar") {
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, "{memberCount}");
    span.contentEditable = "false";
    span.className = "tabular-nums";
    span.title = "{memberCount}";
    span.textContent = PREVIEW_MEMBER_COUNT;
    return span;
  }
  if (tok.kind === "dateVar") {
    const span = document.createElement("span");
    span.setAttribute(WELCOME_SRC_ATTR, "{date}");
    span.contentEditable = "false";
    span.className = "tabular-nums";
    span.title = "{date}";
    span.textContent = ctx.previewDateStr;
    return span;
  }
  return document.createTextNode("");
}

function fillWelcomeRichEditor(el: HTMLElement, message: string, ctx: WelcomeRichDomContext) {
  el.textContent = "";
  const lines = message.split("\n");
  lines.forEach((line, lineIdx) => {
    if (lineIdx > 0) el.appendChild(document.createElement("br"));
    const tokens = tokenizeWelcomePreview(line);
    for (const t of tokens) el.appendChild(buildWelcomeDomForToken(t, ctx));
  });
}

function createWelcomeInsertNode(insert: string, ctx: WelcomeRichDomContext): Node {
  const tokens = tokenizeWelcomePreview(insert);
  if (
    tokens.length === 1 &&
    tokens[0].kind !== "text" &&
    insert.length > 0
  ) {
    return buildWelcomeDomForToken(tokens[0], ctx);
  }
  return document.createTextNode(insert);
}

function insertWelcomeNodesAtCaret(editor: HTMLElement, nodes: Node[]) {
  editor.focus();
  const sel = window.getSelection();
  if (!sel) return;
  let range: Range;
  if (sel.rangeCount === 0 || !sel.anchorNode || !editor.contains(sel.anchorNode)) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  } else {
    range = sel.getRangeAt(0);
  }
  if (!editor.contains(range.commonAncestorContainer)) {
    range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
  }
  range.deleteContents();
  const frag = document.createDocumentFragment();
  let lastInserted: Node | null = null;
  for (const n of nodes) {
    lastInserted = frag.appendChild(n);
  }
  range.insertNode(frag);
  const r = document.createRange();
  if (lastInserted) {
    r.setStartAfter(lastInserted);
    r.collapse(true);
  } else {
    r.selectNodeContents(editor);
    r.collapse(false);
  }
  sel.removeAllRanges();
  sel.addRange(r);
}

type TextAreaInsertAnchor = { start: number; end: number; valueLen: number };

/** Вставка с приоритетом нативного undo: execCommand → setRangeText → slice. */
function insertTextIntoTextAreaControlled(
  el: HTMLTextAreaElement,
  text: string,
  saved: TextAreaInsertAnchor | null,
  syncValue: (next: string, caretAfter: number) => void
): void {
  el.focus();
  const len = el.value.length;
  const focused = document.activeElement === el;
  let start: number;
  let end: number;
  if (focused) {
    start = Math.min(el.selectionStart ?? 0, len);
    end = Math.min(el.selectionEnd ?? start, len);
  } else {
    const stale =
      !saved || (typeof saved.valueLen === "number" && saved.valueLen !== len);
    if (stale) {
      start = end = len;
    } else {
      start = Math.min(saved.start, len);
      end = Math.min(saved.end, len);
    }
    el.setSelectionRange(start, end);
  }

  const caretExpected = start + text.length;

  let usedExec = false;
  try {
    usedExec = document.execCommand("insertText", false, text);
  } catch {
    usedExec = false;
  }

  if (usedExec) {
    const next = el.value;
    const caret = Math.min(el.selectionStart ?? caretExpected, next.length);
    syncValue(next, caret);
    requestAnimationFrame(() => {
      el.setSelectionRange(caret, caret);
    });
    return;
  }

  if (typeof el.setRangeText === "function") {
    el.setRangeText(text, start, end, "end");
    try {
      el.dispatchEvent(
        new InputEvent("input", { bubbles: true, cancelable: true, inputType: "insertText", data: text })
      );
    } catch {
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const next = el.value;
    syncValue(next, Math.min(el.selectionStart ?? caretExpected, next.length));
    return;
  }

  const v = el.value;
  const next = v.slice(0, start) + text + v.slice(end);
  syncValue(next, Math.min(caretExpected, next.length));
  requestAnimationFrame(() => {
    el.setSelectionRange(Math.min(caretExpected, next.length), Math.min(caretExpected, next.length));
  });
}

function resolveWelcomePreviewInsertRange(editor: HTMLElement, saved: Range | null): Range {
  const sel = window.getSelection();
  if (
    sel &&
    sel.rangeCount > 0 &&
    editor.contains(sel.anchorNode) &&
    document.activeElement === editor
  ) {
    return sel.getRangeAt(0).cloneRange();
  }
  if (saved) {
    try {
      if (editor.contains(saved.commonAncestorContainer)) {
        return saved.cloneRange();
      }
    } catch {
      /* stale */
    }
  }
  const r = document.createRange();
  r.selectNodeContents(editor);
  r.collapse(false);
  return r;
}

function rolePreviewPillStyle(color: number | undefined): CSSProperties {
  if (color === undefined || color === 0) return {};
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.22)`,
    boxShadow: `inset 0 0 0 1px rgba(${r}, ${g}, ${b}, 0.35)`,
    color: "#f4f4f5",
  };
}

function Avatar({
  src,
  alt,
  fallback,
  size = "default",
}: {
  src: string | null;
  alt: string;
  fallback: string;
  size?: "default" | "lg";
}) {
  const box =
    size === "lg"
      ? "h-14 w-14 text-xl"
      : "h-10 w-10 text-sm";

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${box} rounded-full border border-[#8038CE]/35 object-cover`}
      />
    );
  }

  return (
    <div
      className={`flex ${box} items-center justify-center rounded-full border border-[#8038CE]/35 bg-zinc-800 font-semibold text-zinc-200`}
    >
      {fallback.slice(0, 1).toUpperCase()}
    </div>
  );
}

function CustomSelect({
  value,
  options,
  placeholder,
  disabled = false,
  onChange,
  ariaLabel,
  compact = false,
  hideSearch = false,
  minimal = false,
}: {
  value: string;
  options: CustomSelectOption[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  ariaLabel: string;
  compact?: boolean;
  hideSearch?: boolean;
  /** Компактный «тулбарный» вид без тяжёлого ds-select */
  minimal?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const selectedOption = options.find((option) => option.value === value) ?? null;
  const filteredOptions = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalized));
  }, [options, searchQuery]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current) return;
      if (rootRef.current.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      if (!rootRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const updatePanelPosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const viewportPadding = 12;
      const panelGap = 8;
      const minimumPanelHeight = 160;
      const rect = trigger.getBoundingClientRect();
      const availableViewportWidth = Math.max(window.innerWidth - viewportPadding * 2, 0);
      const width = Math.min(rect.width, availableViewportWidth);
      const left = Math.min(
        Math.max(rect.left + window.scrollX, viewportPadding + window.scrollX),
        Math.max(window.scrollX + window.innerWidth - viewportPadding - width, viewportPadding + window.scrollX)
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - panelGap;
      const spaceAbove = rect.top - viewportPadding - panelGap;
      const shouldOpenUpward = spaceBelow < minimumPanelHeight && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        shouldOpenUpward ? spaceAbove : spaceBelow,
        Math.min(minimumPanelHeight, window.innerHeight - viewportPadding * 2)
      );

      setPanelPosition({
        top: shouldOpenUpward
          ? Math.max(rect.top + window.scrollY - panelGap - maxHeight, viewportPadding + window.scrollY)
          : rect.bottom + window.scrollY + panelGap,
        left,
        width,
        maxHeight,
      });
    };

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
      setSearchQuery("");
    }
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <div ref={rootRef} className="relative overflow-visible">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        className={
          minimal
            ? "flex h-8 w-full max-h-8 min-h-[2rem] cursor-pointer items-center justify-between gap-1 rounded-full border border-white/[0.12] bg-white/[0.06] px-2.5 py-0 text-left text-[11px] font-medium text-zinc-100 shadow-none outline-none transition hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-60"
            : `ds-select ds-liquid-btn flex cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                compact ? "min-h-[2rem] px-2.5 py-1.5 text-xs" : ""
              }`
        }
      >
        <span
          className={`min-w-0 flex-1 truncate ${selectedOption ? "text-zinc-100" : "text-zinc-400"}`}
        >
          {selectedOption?.label ?? placeholder}
        </span>
        <span
          className={`${minimal ? "text-[10px]" : "text-xs"} shrink-0 text-zinc-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isMounted && panelPosition
        ? createPortal(
            <div
              ref={panelRef}
              data-dashboard-select-portal=""
              className={`absolute z-[240] origin-top isolation-isolate transition-all duration-200 ${
                isOpen
                  ? "pointer-events-auto translate-y-0 scale-y-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-y-95 opacity-0"
              }`}
              style={{
                top: `${panelPosition.top}px`,
                left: `${panelPosition.left}px`,
                width: `${panelPosition.width}px`,
              }}
            >
              <DashboardDropdownSurface>
                <ul
                  role="listbox"
                  aria-label={ariaLabel}
                  className="divide-y divide-white/10 overflow-y-auto"
                  style={{ maxHeight: `${panelPosition.maxHeight}px` }}
                >
                  {!hideSearch ? (
                    <li className="px-2 py-2">
                      <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Поиск..."
                        className={`ds-input ${minimal || compact ? "text-xs" : "text-sm"}`}
                        aria-label={`${ariaLabel}: поиск`}
                      />
                    </li>
                  ) : null}
                  {filteredOptions.length === 0 ? (
                    <li
                      className={`px-3 py-2.5 text-zinc-400 ${minimal || compact ? "text-xs" : "text-sm"}`}
                    >
                      Нет данных
                    </li>
                  ) : (
                    filteredOptions.map((option) => (
                      <li key={option.value}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={option.value === value}
                          disabled={option.disabled}
                          title={option.title}
                          onClick={() => {
                            if (option.disabled) return;
                            onChange(option.value);
                            setIsOpen(false);
                          }}
                          className={`ds-liquid-list-item flex w-full items-center text-left ${
                            minimal
                              ? "min-h-[1.5rem] px-2 py-1 text-[11px]"
                              : compact
                                ? "min-h-[2rem] px-2.5 py-2 text-xs"
                                : "min-h-[2.5rem] px-3 py-2.5 text-sm"
                          } ${
                            option.disabled
                              ? "cursor-not-allowed opacity-45"
                              : option.value === value
                                ? "bg-[var(--brand)]/24 text-zinc-100"
                                : "text-zinc-300 hover:bg-white/[0.08]"
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </DashboardDropdownSurface>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

export type DashboardGuildPageClientProps = {
  guildId: string;
  initialGuildName: string;
  initialGuildIconUrl: string | null;
  connectedGuilds: ConnectedGuildForDashboard[];
  /** Шрифты с локальным .ttf в shared-data/fonts/welcome-card (совпадает с PNG) */
  availableWelcomeCardFontKeys: ImageCardFontKey[];
};

export function DashboardGuildPageClient({
  guildId,
  initialGuildName,
  initialGuildIconUrl,
  connectedGuilds,
  availableWelcomeCardFontKeys,
}: DashboardGuildPageClientProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickerAreaRef = useRef<HTMLDivElement | null>(null);
  const embedPickerAreaRef = useRef<HTMLDivElement | null>(null);
  const pickerPanelRef = useRef<HTMLDivElement | null>(null);

  const [bootstrap, setBootstrap] = useState<DashboardBootstrap | null>(null);
  const [resources, setResources] = useState<GuildResourcesResponse>({
    channels: [],
    roles: [],
    emojis: [],
    errors: undefined,
  });
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [resourcesError, setResourcesError] = useState("");
  const [message, setMessage] = useState(DEFAULT_WELCOME_MESSAGE);
  const [channelId, setChannelId] = useState("");
  const [humanRoleId, setHumanRoleId] = useState("");
  const [botRoleId, setBotRoleId] = useState("");
  const [welcomeStyle, setWelcomeStyle] = useState<DashboardConfig["welcomeStyle"]>("text");
  const [textImageDataUrl, setTextImageDataUrl] = useState("");
  const [title, setTitle] = useState("Добро пожаловать");
  const [description, setDescription] = useState(DEFAULT_WELCOME_DESCRIPTION);
  const [color, setColor] = useState("#8b5cf6");
  const [embedAuthorName, setEmbedAuthorName] = useState("");
  const [embedAuthorAvatar, setEmbedAuthorAvatar] = useState(false);
  const [embedFooter, setEmbedFooter] = useState("");
  const [embedImageDataUrl, setEmbedImageDataUrl] = useState("");
  const [embedFields, setEmbedFields] = useState<EmbedFieldRow[]>([]);
  const [imageCard, setImageCard] = useState<ImageCardConfig>(() =>
    mergeImageCard(undefined, { availableFontKeys: availableWelcomeCardFontKeys })
  );
  const imageCardAspectRef = useRef<HTMLDivElement | null>(null);
  const imageCardTextBandRef = useRef<HTMLDivElement | null>(null);
  const [imageCardPreviewScale, setImageCardPreviewScale] = useState(1);
  const [imageCardPreviewMaxPx, setImageCardPreviewMaxPx] = useState(0);
  const [imageCardTextBandRect, setImageCardTextBandRect] = useState<DOMRect | null>(null);
  const imageCardTitleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const imageCardSubtitleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const imageCardTitleFieldWrapRef = useRef<HTMLDivElement | null>(null);
  const imageCardSubtitleFieldWrapRef = useRef<HTMLDivElement | null>(null);
  const imageCardTextToolbarRef = useRef<HTMLDivElement | null>(null);
  const imageCardTypographyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [imageCardTypographyPopoverPos, setImageCardTypographyPopoverPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const imageCardBgFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageCardTitleInsertCaretRef = useRef<TextAreaInsertAnchor | null>(null);
  const imageCardSubtitleInsertCaretRef = useRef<TextAreaInsertAnchor | null>(null);
  const imageCardToolbarPickerAnchorRefs = useRef<Partial<Record<PickerKind, HTMLDivElement | null>>>(
    {}
  );
  const [imageCardActiveField, setImageCardActiveField] = useState<"title" | "subtitle" | null>(null);
  const [imageCardTextToolbarPos, setImageCardTextToolbarPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [imageCardBgUploadBusy, setImageCardBgUploadBusy] = useState(false);
  const [imageCardTypographyOpen, setImageCardTypographyOpen] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(true);
  const [skipBotAccounts, setSkipBotAccounts] = useState(true);
  const [messageEditorMode, setMessageEditorMode] = useState<WelcomeMessageEditorMode>("preview");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState<DirtyConfig | null>(null);
  /** Увеличивается только при срабатывании guard несохранённых изменений (не при каждом редактировании). */
  const [unsavedGuardAttentionCounter, setUnsavedGuardAttentionCounter] = useState(0);
  const unsavedBarAnimRef = useRef<HTMLDivElement | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSendStatus, setTestSendStatus] = useState("");
  const [testSendStatusTone, setTestSendStatusTone] = useState<
    "success" | "error" | ""
  >("");
  const [openPicker, setOpenPicker] = useState<PickerType>(null);
  const [search, setSearch] = useState("");
  const [pickerPortalReady, setPickerPortalReady] = useState(false);
  const [pickerPanelLayout, setPickerPanelLayout] = useState<{
    left: number;
    bottom: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("welcome");
  const textImageInputRef = useRef<HTMLInputElement | null>(null);
  const textImageDragDepthRef = useRef(0);
  const [textImageZoneActive, setTextImageZoneActive] = useState(false);
  const embedDescriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const embedDescInsertCaretRef = useRef<TextAreaInsertAnchor | null>(null);
  const embedColorInputRef = useRef<HTMLInputElement | null>(null);
  const embedImageInputRef = useRef<HTMLInputElement | null>(null);
  const embedImageDragDepthRef = useRef(0);
  const [embedImageZoneActive, setEmbedImageZoneActive] = useState(false);
  const guildName = initialGuildName;
  const guildIconUrl = initialGuildIconUrl;

  useEffect(() => {
    setLastGuildCookieClient(guildId);
  }, [guildId]);

  /** Инкрементируется при смене гильдии / отмене запроса ресурсов — чтобы finally не снимал loading с чужого запроса */
  const resourcesFetchGenerationRef = useRef(0);
  const welcomePickerAnchorRefs = useRef<Partial<Record<PickerKind, HTMLDivElement | null>>>(
    {}
  );
  const embedPickerAnchorRefs = useRef<Partial<Record<PickerKind, HTMLDivElement | null>>>(
    {}
  );
  const [insertPickerSurface, setInsertPickerSurface] = useState<
    "welcome" | "embed" | "imageCardTitle" | "imageCardSubtitle"
  >("welcome");
  const previewEditorRef = useRef<HTMLDivElement | null>(null);
  const welcomeRichComposeRef = useRef(false);
  const rawInsertCaretRef = useRef<TextAreaInsertAnchor | null>(null);
  const previewInsertRangeRef = useRef<Range | null>(null);
  /** Сериализация превью на момент mousedown тулбара вставки; если текст изменился — якорь не применяем. */
  const previewInsertMessageSnapshotRef = useRef<string | null>(null);
  const [richEditorBootstrap, setRichEditorBootstrap] = useState(0);
  const [previewEditorSyncSeq, setPreviewEditorSyncSeq] = useState(0);

  const messageRef = useRef(message);
  const messageEditorModeRef = useRef(messageEditorMode);
  const welcomeStyleRef = useRef(welcomeStyle);
  messageRef.current = message;
  messageEditorModeRef.current = messageEditorMode;
  welcomeStyleRef.current = welcomeStyle;

  const welcomeHistRef = useRef<{ entries: WelcomeEditorHistoryEntry[]; index: number }>({
    entries: [
      {
        message: DEFAULT_WELCOME_MESSAGE,
        caret: 0,
        editorMode: "preview",
      },
    ],
    index: 0,
  });
  const welcomeHistoryFlushTimerRef = useRef<number | null>(null);
  const welcomeHistoryApplyingRef = useRef(false);
  const pendingWelcomeCaretRef = useRef<number | null>(null);
  const pendingRawCaretRef = useRef<number | null>(null);

  const captureWelcomeHistorySnapshot = useCallback((): WelcomeEditorHistoryEntry => {
    const mode = messageEditorModeRef.current;
    if (mode === "raw") {
      const ta = textareaRef.current;
      const msg = messageRef.current;
      return {
        message: msg,
        caret: Math.min(ta?.selectionStart ?? msg.length, msg.length),
        editorMode: "raw",
      };
    }
    const ed = previewEditorRef.current;
    if (ed && mode === "preview") {
      return {
        message: serializeWelcomeRichEditorRoot(ed),
        caret: getWelcomePlainCaretOffset(ed),
        editorMode: "preview",
      };
    }
    const msg = messageRef.current;
    return { message: msg, caret: msg.length, editorMode: "preview" };
  }, []);

  const welcomeHistoryCommitIfChanged = useCallback((snap: WelcomeEditorHistoryEntry) => {
    if (welcomeHistoryApplyingRef.current) return;
    const { entries, index } = welcomeHistRef.current;
    const top = entries[index];
    if (top && top.message === snap.message && top.editorMode === snap.editorMode) return;
    entries.splice(index + 1);
    entries.push(snap);
    welcomeHistRef.current.index = entries.length - 1;
    while (entries.length > WELCOME_HISTORY_MAX) {
      entries.shift();
      welcomeHistRef.current.index--;
    }
    if (welcomeHistRef.current.index < 0) welcomeHistRef.current.index = 0;
  }, []);

  const flushWelcomeHistoryDebouncedNow = useCallback(() => {
    if (welcomeHistoryFlushTimerRef.current !== null) {
      window.clearTimeout(welcomeHistoryFlushTimerRef.current);
      welcomeHistoryFlushTimerRef.current = null;
    }
    welcomeHistoryCommitIfChanged(captureWelcomeHistorySnapshot());
  }, [captureWelcomeHistorySnapshot, welcomeHistoryCommitIfChanged]);

  const scheduleWelcomeHistoryDebounced = useCallback(() => {
    if (welcomeHistoryApplyingRef.current) return;
    if (welcomeHistoryFlushTimerRef.current !== null) {
      window.clearTimeout(welcomeHistoryFlushTimerRef.current);
    }
    welcomeHistoryFlushTimerRef.current = window.setTimeout(() => {
      welcomeHistoryFlushTimerRef.current = null;
      welcomeHistoryCommitIfChanged(captureWelcomeHistorySnapshot());
    }, WELCOME_HISTORY_DEBOUNCE_MS);
  }, [captureWelcomeHistorySnapshot, welcomeHistoryCommitIfChanged]);

  const applyWelcomeHistorySnapshot = useCallback((entry: WelcomeEditorHistoryEntry) => {
    welcomeHistoryApplyingRef.current = true;
    if (welcomeHistoryFlushTimerRef.current !== null) {
      window.clearTimeout(welcomeHistoryFlushTimerRef.current);
      welcomeHistoryFlushTimerRef.current = null;
    }
    const c = Math.min(entry.caret, entry.message.length);
    if (entry.editorMode === "preview") {
      pendingWelcomeCaretRef.current = c;
      pendingRawCaretRef.current = null;
    } else {
      pendingRawCaretRef.current = c;
      pendingWelcomeCaretRef.current = null;
    }
    setMessage(entry.message);
    setMessageEditorMode(entry.editorMode);
    if (entry.editorMode === "preview") {
      setPreviewEditorSyncSeq((n) => n + 1);
    }
    window.queueMicrotask(() => {
      welcomeHistoryApplyingRef.current = false;
    });
  }, []);

  const welcomeUndo = useCallback(() => {
    if (messageEditorModeRef.current !== "preview" || welcomeRichComposeRef.current) return;
    flushWelcomeHistoryDebouncedNow();
    const { entries, index } = welcomeHistRef.current;
    if (index <= 0) return;
    welcomeHistRef.current.index = index - 1;
    const i = welcomeHistRef.current.index;
    applyWelcomeHistorySnapshot(entries[i]);
  }, [applyWelcomeHistorySnapshot, flushWelcomeHistoryDebouncedNow]);

  const welcomeRedo = useCallback(() => {
    if (messageEditorModeRef.current !== "preview" || welcomeRichComposeRef.current) return;
    flushWelcomeHistoryDebouncedNow();
    const { entries, index } = welcomeHistRef.current;
    if (index >= entries.length - 1) return;
    welcomeHistRef.current.index = index + 1;
    const i = welcomeHistRef.current.index;
    applyWelcomeHistorySnapshot(entries[i]);
  }, [applyWelcomeHistorySnapshot, flushWelcomeHistoryDebouncedNow]);

  const captureWelcomeInsertAnchor = useCallback(() => {
    if (messageEditorMode === "raw") {
      previewInsertRangeRef.current = null;
      previewInsertMessageSnapshotRef.current = null;
      const ta = textareaRef.current;
      if (ta) {
        const v = ta.value;
        rawInsertCaretRef.current = {
          start: ta.selectionStart,
          end: ta.selectionEnd,
          valueLen: v.length,
        };
      }
      return;
    }
    if (messageEditorMode === "preview") {
      rawInsertCaretRef.current = null;
      const ed = previewEditorRef.current;
      const sel = window.getSelection();
      if (ed) {
        previewInsertMessageSnapshotRef.current = serializeWelcomeRichEditorRoot(ed);
      }
      if (ed && sel && sel.rangeCount > 0 && sel.anchorNode && ed.contains(sel.anchorNode)) {
        previewInsertRangeRef.current = sel.getRangeAt(0).cloneRange();
      } else if (ed) {
        const r = document.createRange();
        r.selectNodeContents(ed);
        r.collapse(false);
        previewInsertRangeRef.current = r.cloneRange();
      }
    }
  }, [messageEditorMode]);

  const captureEmbedDescriptionInsertAnchor = useCallback(() => {
    const ta = embedDescriptionTextareaRef.current;
    if (ta) {
      const v = ta.value;
      embedDescInsertCaretRef.current = {
        start: ta.selectionStart,
        end: ta.selectionEnd,
        valueLen: v.length,
      };
    }
  }, []);

  const captureImageCardInsertAnchor = useCallback(() => {
    if (imageCardActiveField === "title") {
      const inp = imageCardTitleInputRef.current;
      if (inp) {
        const v = inp.value;
        imageCardTitleInsertCaretRef.current = {
          start: inp.selectionStart ?? 0,
          end: inp.selectionEnd ?? 0,
          valueLen: v.length,
        };
      }
    } else if (imageCardActiveField === "subtitle") {
      const inp = imageCardSubtitleInputRef.current;
      if (inp) {
        const v = inp.value;
        imageCardSubtitleInsertCaretRef.current = {
          start: inp.selectionStart ?? 0,
          end: inp.selectionEnd ?? 0,
          valueLen: v.length,
        };
      }
    }
  }, [imageCardActiveField]);

  const blurImageCardTextField = useCallback(() => {
    requestAnimationFrame(() => {
      const a = document.activeElement;
      if (a === imageCardTitleInputRef.current || a === imageCardSubtitleInputRef.current) return;
      if (imageCardTextToolbarRef.current?.contains(a)) return;
      if (pickerPanelRef.current?.contains(a)) return;
      if (a && (a as Element).closest?.("[data-dashboard-select-portal]")) return;
      if (a && (a as Element).closest?.("[data-color-popover]")) return;
      if (a && (a as Element).closest?.("[data-image-card-typography-popover]")) return;
      setImageCardActiveField(null);
      setImageCardTypographyOpen(false);
    });
  }, []);

  useEffect(() => {
    if (messageEditorMode !== "preview") return;
    const syncPreviewInsertRange = () => {
      const el = previewEditorRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0 || !sel.anchorNode) return;
      if (!el.contains(sel.anchorNode)) return;
      previewInsertRangeRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", syncPreviewInsertRange);
    return () => document.removeEventListener("selectionchange", syncPreviewInsertRange);
  }, [messageEditorMode]);

  useEffect(() => {
    const controller = new AbortController();

    const loadConfig = async () => {
      try {
        setLastSavedConfig(null);
        const res = await fetch(`/api/config/${guildId}`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        if (!res.ok) {
          console.error("Не удалось загрузить config.json");
          return;
        }
        const data = (await res.json()) as Partial<DashboardConfig> & Record<string, unknown>;
        const welcomeStyleExists = Object.prototype.hasOwnProperty.call(data, "welcomeStyle");
        const textImageDataUrlExists = Object.prototype.hasOwnProperty.call(data, "textImageDataUrl");
        const imageCardExists = Object.prototype.hasOwnProperty.call(data, "imageCard");

        const welcomeStyleResolved = (data.welcomeStyle ?? "text") as DashboardConfig["welcomeStyle"];
        const textImageDataUrlResolved = (data.textImageDataUrl ?? "") as string;

        const snapshot: DirtyConfig = {
          welcomeEnabled: data.welcomeEnabled !== false,
          channelId: data.channelId ?? "",
          humanRoleId: data.humanRoleId ?? "",
          botRoleId: data.botRoleId ?? "",
          skipBotAccounts: data.skipBotAccounts ?? true,
          message: data.message ?? DEFAULT_WELCOME_MESSAGE,
          title: data.title ?? "Добро пожаловать",
          description: data.description ?? DEFAULT_WELCOME_DESCRIPTION,
          color: data.color ?? "#8b5cf6",
          embedAuthorName: typeof data.embedAuthorName === "string" ? data.embedAuthorName : "",
          embedAuthorAvatar: Boolean(data.embedAuthorAvatar),
          embedAuthorAvatarUrl:
            typeof data.embedAuthorAvatarUrl === "string" ? data.embedAuthorAvatarUrl : "",
          embedFooter: typeof data.embedFooter === "string" ? data.embedFooter : "",
          embedImageDataUrl: typeof data.embedImageDataUrl === "string" ? data.embedImageDataUrl : "",
          embedFields: parseEmbedFieldsFromConfig(data.embedFields),
          welcomeStyle: welcomeStyleResolved,
          textImageDataUrl: textImageDataUrlResolved,
          imageCard: mergeImageCard(data.imageCard, {
            availableFontKeys: availableWelcomeCardFontKeys,
          }),
          welcomeStyleExists,
          textImageDataUrlExists,
          imageCardExists,
        };

        setChannelId(snapshot.channelId);
        setHumanRoleId(snapshot.humanRoleId);
        setBotRoleId(snapshot.botRoleId);
        setWelcomeEnabled(snapshot.welcomeEnabled);
        setSkipBotAccounts(snapshot.skipBotAccounts);
        setWelcomeStyle(snapshot.welcomeStyle);
        setTextImageDataUrl(snapshot.textImageDataUrl);
        setMessage(snapshot.message);
        setTitle(snapshot.title);
        setDescription(snapshot.description);
        setColor(snapshot.color);
        setEmbedAuthorName(snapshot.embedAuthorName);
        setEmbedAuthorAvatar(snapshot.embedAuthorAvatar);
        setEmbedFooter(snapshot.embedFooter);
        setEmbedImageDataUrl(snapshot.embedImageDataUrl);
        setEmbedFields(snapshot.embedFields);
        setImageCard(snapshot.imageCard);
        setLastSavedConfig(snapshot);
        setRichEditorBootstrap((n) => n + 1);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Не удалось загрузить config.json");
      }
    };
    loadConfig();
    return () => controller.abort();
  }, [guildId, availableWelcomeCardFontKeys]);

  useEffect(() => {
    if (!lastSavedConfig) return;
    welcomeHistRef.current = {
      entries: [
        {
          message: lastSavedConfig.message,
          caret: 0,
          editorMode: messageEditorModeRef.current,
        },
      ],
      index: 0,
    };
  }, [lastSavedConfig]);

  useEffect(() => {
    return () => {
      if (welcomeHistoryFlushTimerRef.current !== null) {
        window.clearTimeout(welcomeHistoryFlushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadBootstrap = async () => {
      try {
        if (process.env.NODE_ENV === "development") {
          console.debug("[dashboard bootstrap] fetch start", { guildId });
        }
        const res = await fetch("/api/dashboard/bootstrap", {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const data = (await res.json()) as DashboardBootstrap;
        if (!data.viewer) {
          router.replace("/");
          return;
        }
        setBootstrap(data);
        if (process.env.NODE_ENV === "development") {
          console.debug("[dashboard bootstrap] viewer ok", { guildId, viewerId: data.viewer.id });
        }
      } catch (error) {
        console.error("Не удалось загрузить bootstrap данные", error);
      }
    };
    loadBootstrap();
  }, [router, guildId]);

  useEffect(() => {
    if (!guildId) {
      if (process.env.NODE_ENV === "development") {
        console.debug("[dashboard resources] skip: no guildId");
      }
      return;
    }

    const reqId = ++resourcesFetchGenerationRef.current;
    const controller = new AbortController();

    setResources({ channels: [], roles: [], emojis: [], errors: undefined });
    setResourcesError("");
    setResourcesLoading(true);

    console.log("[dashboard resources] fetch start", { guildId, reqId });

    const loadResources = async () => {
      try {
        const res = await fetch(`/api/discord/guilds/${guildId}/resources`, {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });

        if (reqId !== resourcesFetchGenerationRef.current) return;

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);

          if (reqId !== resourcesFetchGenerationRef.current) return;

          setResourcesError(
            errorData?.error ?? "Не удалось загрузить ресурсы сервера"
          );
          setResources({ channels: [], roles: [], emojis: [], errors: undefined });
          return;
        }

        const data = (await res.json()) as GuildResourcesResponse & {
          errors?: GuildResourcesResponse["errors"];
        };

        if (reqId !== resourcesFetchGenerationRef.current) return;

        setResources({
          channels: Array.isArray(data.channels) ? data.channels : [],
          roles: Array.isArray(data.roles) ? data.roles : [],
          emojis: Array.isArray(data.emojis) ? data.emojis : [],
          errors:
            data.errors && typeof data.errors === "object"
              ? data.errors
              : undefined,
        });
        setResourcesError("");
        console.log("[dashboard resources] ok", {
          guildId,
          reqId,
          channels: Array.isArray(data.channels) ? data.channels.length : 0,
          roles: Array.isArray(data.roles) ? data.roles.length : 0,
          emojis: Array.isArray(data.emojis) ? data.emojis.length : 0,
        });
      } catch (err) {
        if (reqId !== resourcesFetchGenerationRef.current) return;
        if (controller.signal.aborted) return;

        console.warn("[dashboard resources] fetch failed", { guildId, reqId, err });
        setResourcesError("Не удалось загрузить ресурсы сервера");
        setResources({ channels: [], roles: [], emojis: [], errors: undefined });
      } finally {
        if (reqId === resourcesFetchGenerationRef.current) {
          setResourcesLoading(false);
        }
      }
    };

    void loadResources();

    return () => {
      controller.abort();
      resourcesFetchGenerationRef.current += 1;
    };
  }, [guildId]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!openPicker) return;
  
      const target = event.target as Node;
  
      if (pickerAreaRef.current?.contains(target)) return;
      if (embedPickerAreaRef.current?.contains(target)) return;
      if (imageCardTextToolbarRef.current?.contains(target)) return;
      if (pickerPanelRef.current?.contains(target)) return;

      setOpenPicker(null);
      setSearch("");
    };
  
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [openPicker]);

  const emojiPickerItems = useMemo<PickerItem[]>(
    () =>
      resources.emojis.map((emoji) => ({
        id: emoji.id ?? emoji.name,
        label: emoji.name,
        insert: emoji.mention,
        imageUrl: emoji.id
          ? `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=48&quality=lossless`
          : undefined,
        meta: emoji.animated ? "GIF" : "EMOJI",
      })),
    [resources.emojis]
  );
  const channelPickerItems = useMemo<PickerItem[]>(
    () =>
      resources.channels.map((item) => ({
        id: item.id,
        label: item.name,
        insert: item.mention,
        meta: getChannelTypeLabel(item.type),
      })),
    [resources.channels]
  );
  const rolePickerItems = useMemo<PickerItem[]>(
    () =>
      resources.roles
        .filter((role) => !role.managed)
        .map((item) => ({
          id: item.id,
          label: item.name,
          insert: item.mention,
          roleColor: item.color,
        })),
    [resources.roles]
  );
  const pickerItems = useMemo<PickerItem[]>(() => {
    const items =
      openPicker === "emoji"
        ? emojiPickerItems
        : openPicker === "channel"
          ? channelPickerItems
          : openPicker === "role"
            ? rolePickerItems
            : openPicker === "variable"
              ? variableOptions
              : [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item) => {
      const byLabel = item.label.toLowerCase().includes(q);
      const byInsert = item.insert.toLowerCase().includes(q);
      const byVarSub =
        openPicker === "variable" &&
        (item.variableSubtitle?.toLowerCase().includes(q) ?? false);
      const byHash =
        openPicker === "channel" && `#${item.label}`.toLowerCase().includes(q);
      const byAt = openPicker === "role" && `@${item.label}`.toLowerCase().includes(q);
      if (openPicker === "variable") return byLabel || byInsert || byVarSub;
      return byLabel || byInsert || byHash || byAt;
    });
  }, [openPicker, search, emojiPickerItems, channelPickerItems, rolePickerItems, variableOptions]);

  useEffect(() => {
    setSearch("");
  }, [openPicker, insertPickerSurface]);

  useEffect(() => {
    setPickerPortalReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!openPicker) {
      setPickerPanelLayout(null);
      return;
    }

    const updateLayout = () => {
      let anchor: HTMLDivElement | null | undefined;
      if (insertPickerSurface === "embed") {
        anchor = embedPickerAnchorRefs.current[openPicker!];
      } else if (
        (insertPickerSurface === "imageCardTitle" || insertPickerSurface === "imageCardSubtitle") &&
        openPicker
      ) {
        anchor = imageCardToolbarPickerAnchorRefs.current[openPicker] ?? undefined;
      } else {
        anchor = welcomePickerAnchorRefs.current[openPicker!];
      }
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = 320;
      const viewportPadding = 12;
      const gap = 8;
      const left = Math.min(
        Math.max(rect.right - panelWidth, viewportPadding),
        window.innerWidth - viewportPadding - panelWidth
      );
      const spaceAbove = rect.top - viewportPadding - gap;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - gap;
      const maxHeight = Math.min(340, Math.max(120, Math.max(spaceAbove, spaceBelow)));
      const bottom = window.innerHeight - rect.top + gap;
      setPickerPanelLayout({ left, bottom, width: panelWidth, maxHeight });
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    window.addEventListener("scroll", updateLayout, true);
    return () => {
      window.removeEventListener("resize", updateLayout);
      window.removeEventListener("scroll", updateLayout, true);
    };
  }, [openPicker, insertPickerSurface, imageCardTextToolbarPos]);

  useLayoutEffect(() => {
    if (welcomeStyle !== "imageCard") {
      setImageCardTextToolbarPos(null);
      return;
    }
    if (imageCardActiveField !== "title" && imageCardActiveField !== "subtitle") {
      setImageCardTextToolbarPos(null);
      return;
    }
    const wrap =
      imageCardActiveField === "title"
        ? imageCardTitleFieldWrapRef.current
        : imageCardSubtitleFieldWrapRef.current;
    if (!wrap) {
      setImageCardTextToolbarPos(null);
      return;
    }
    const update = () => {
      const r = wrap.getBoundingClientRect();
      setImageCardTextToolbarPos({ left: r.left + r.width / 2, top: r.top });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [
    activeSection,
    welcomeStyle,
    imageCardActiveField,
    imageCard.title,
    imageCard.subtitle,
    imageCard.titleStyle,
    imageCard.subtitleStyle,
    imageCard.fontFamily,
    imageCard.textColor,
  ]);

  useLayoutEffect(() => {
    if (!imageCardTypographyOpen) {
      setImageCardTypographyPopoverPos(null);
      return;
    }
    const update = () => {
      const btn = imageCardTypographyTriggerRef.current;
      if (!btn) {
        setImageCardTypographyPopoverPos(null);
        return;
      }
      const r = btn.getBoundingClientRect();
      setImageCardTypographyPopoverPos({
        left: r.left + r.width / 2,
        top: r.top,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [imageCardTypographyOpen]);

  useLayoutEffect(() => {
    if (welcomeStyle !== "imageCard") {
      setImageCardTextBandRect(null);
      return;
    }
    const aspect = imageCardAspectRef.current;
    const band = imageCardTextBandRef.current;
    const sync = () => {
      if (aspect) {
        const w = aspect.getBoundingClientRect().width;
        setImageCardPreviewScale(w / IMAGE_CARD_W);
        setImageCardPreviewMaxPx(w);
      }
      if (band) {
        setImageCardTextBandRect(band.getBoundingClientRect());
      }
    };
    sync();
    const roA = aspect ? new ResizeObserver(sync) : null;
    const roB = band ? new ResizeObserver(sync) : null;
    if (aspect && roA) roA.observe(aspect);
    if (band && roB) roB.observe(band);
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      roA?.disconnect();
      roB?.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [
    activeSection,
    welcomeStyle,
    imageCard.title,
    imageCard.subtitle,
    imageCard.titleStyle,
    imageCard.subtitleStyle,
    imageCardTextToolbarPos,
  ]);

  useEffect(() => {
    if (welcomeStyle !== "imageCard") return;
    if (imageCardActiveField !== "title" && imageCardActiveField !== "subtitle") {
      setOpenPicker(null);
    }
  }, [welcomeStyle, imageCardActiveField]);

  useEffect(() => {
    setOpenPicker(null);
    setSearch("");
    if (welcomeStyle === "imageCard") {
      setImageCardActiveField(null);
    }
    setImageCardTypographyOpen(false);
  }, [welcomeStyle]);

  const channelOptions = useMemo<CustomSelectOption[]>(
    () =>
      resources.channels.map((item) => ({
        value: item.id,
        label: `#${item.name}`,
      })),
    [resources.channels]
  );
  const imageCardFontSelectOptions = useMemo<CustomSelectOption[]>(
    () =>
      availableWelcomeCardFontKeys.map((k) => ({
        value: k,
        label: IMAGE_CARD_FONT_DISPLAY_NAME[k],
      })),
    [availableWelcomeCardFontKeys]
  );

  const patchImageCardFieldStyle = useCallback(
    (field: "title" | "subtitle", patch: Partial<ImageCardFieldStyleMerged>) => {
      setImageCard((c) => {
        if (field === "title") {
          const titleStyle = { ...c.titleStyle, ...patch };
          return {
            ...c,
            titleStyle,
            textSize: titleStyle.textSize,
            fontWeight: titleStyle.fontWeight,
            fontStyle: titleStyle.fontStyle,
          };
        }
        return { ...c, subtitleStyle: { ...c.subtitleStyle, ...patch } };
      });
    },
    []
  );

  const patchImageCardGlobalText = useCallback(
    (patch: Partial<Pick<ImageCardConfig, "fontFamily" | "textColor">>) => {
      setImageCard((c) => ({ ...c, ...patch }));
    },
    []
  );
  const roleOptions = useMemo(
    () =>
      resources.roles
        .filter((role) => !role.managed)
        .map((role) => ({
          value: role.id,
          label: `@${role.name}`,
        })),
    [resources.roles]
  );

  const previewDateStr = useMemo(() => new Date().toLocaleDateString(), []);
  const welcomeRichCtx = useMemo<WelcomeRichDomContext>(
    () => ({
      channelById: new Map(resources.channels.map((c) => [c.id, c])),
      roleById: new Map(resources.roles.map((r) => [r.id, r])),
      emojiMetaById: new Map(
        resources.emojis.filter((e) => e.id).map((e) => [e.id as string, e.animated])
      ),
      previewDateStr,
    }),
    [resources.channels, resources.roles, resources.emojis, previewDateStr]
  );

  useLayoutEffect(() => {
    if (messageEditorMode !== "preview") return;
    const runFill = () => {
      const el = previewEditorRef.current;
      if (!el) return;
      fillWelcomeRichEditor(el, message, welcomeRichCtx);
      if (pendingWelcomeCaretRef.current !== null) {
        const c = pendingWelcomeCaretRef.current;
        pendingWelcomeCaretRef.current = null;
        setWelcomePlainCaretOffset(el, Math.min(c, message.length));
      }
    };
    runFill();
    queueMicrotask(runFill);
    // message намеренно не в deps: обычный ввод синхронизирует только React state, DOM остаётся источником истины.
    // activeSection: при возврате в «Приветствие» превью-редактор монтируется заново — нужно восстановить DOM из state.
  }, [
    messageEditorMode,
    richEditorBootstrap,
    welcomeRichCtx,
    previewEditorSyncSeq,
    activeSection,
  ]);

  useEffect(() => {
    if (activeSection === "welcome") return;
    previewInsertRangeRef.current = null;
    previewInsertMessageSnapshotRef.current = null;
  }, [activeSection]);

  useLayoutEffect(() => {
    if (pendingRawCaretRef.current === null) return;
    if (messageEditorMode !== "raw") return;
    const ta = textareaRef.current;
    if (!ta) return;
    const c = pendingRawCaretRef.current;
    pendingRawCaretRef.current = null;
    ta.focus();
    ta.setSelectionRange(c, c);
  }, [message, messageEditorMode]);

  const handleWelcomeRichInput = () => {
    if (welcomeRichComposeRef.current) return;
    const el = previewEditorRef.current;
    if (!el) return;
    previewInsertRangeRef.current = null;
    previewInsertMessageSnapshotRef.current = null;
    normalizeWelcomeRichDivs(el);
    const caret = getWelcomePlainCaretOffset(el);
    const next = serializeWelcomeRichEditorRoot(el);
    setMessage(next);
    setWelcomePlainCaretOffset(el, Math.min(caret, next.length));
    scheduleWelcomeHistoryDebounced();
  };

  const handleWelcomeRichPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const plain = event.clipboardData.getData("text/plain");
    const sel = window.getSelection();
    if (!sel?.rangeCount || !previewEditorRef.current) return;
    const range = sel.getRangeAt(0);
    if (!previewEditorRef.current.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    range.insertNode(document.createTextNode(plain));
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
    handleWelcomeRichInput();
    flushWelcomeHistoryDebouncedNow();
  };

  const handleWelcomeRichKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const ed = previewEditorRef.current;
    if (!ed) return;

    /** Физические клавиши (QWERTY): на русской раскладке `event.key` даёт «я»/«н», а не «z»/«y». */
    if (
      messageEditorModeRef.current === "preview" &&
      !welcomeRichComposeRef.current &&
      !event.nativeEvent.isComposing
    ) {
      const mod = event.metaKey || event.ctrlKey;
      const undo =
        mod && event.code === "KeyZ" && !event.shiftKey;
      const redo =
        (mod && event.code === "KeyZ" && event.shiftKey) ||
        (event.ctrlKey &&
          !event.metaKey &&
          !event.shiftKey &&
          event.code === "KeyY");
      if (undo) {
        event.preventDefault();
        welcomeUndo();
        return;
      }
      if (redo) {
        event.preventDefault();
        welcomeRedo();
        return;
      }
    }

    if (event.key === "Backspace" || event.key === "Delete") {
      const selected = ed.querySelector(`.${WELCOME_TOKEN_SELECTED}`);
      if (selected) {
        event.preventDefault();
        flushWelcomeHistoryDebouncedNow();
        selected.remove();
        handleWelcomeRichInput();
        flushWelcomeHistoryDebouncedNow();
        return;
      }
    }

    if (event.key !== "Enter") return;
    event.preventDefault();
    insertWelcomeNodesAtCaret(ed, [document.createElement("br")]);
    handleWelcomeRichInput();
  };

  const handlePreviewTokenMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    const ed = previewEditorRef.current;
    if (!ed) return;
    const target = event.target as HTMLElement;
    const token = target.closest(`.${WELCOME_INTERACTIVE_TOKEN}`) as HTMLElement | null;
    if (token && ed.contains(token)) {
      event.preventDefault();
      ed.focus();
      clearWelcomeTokenSelection(ed);
      token.classList.add(WELCOME_TOKEN_SELECTED);
      const sel = window.getSelection();
      if (sel) {
        const r = document.createRange();
        r.selectNodeContents(token);
        sel.removeAllRanges();
        sel.addRange(r);
      }
      return;
    }
    clearWelcomeTokenSelection(ed);
  };

  const handleWelcomeRichCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    const ed = previewEditorRef.current;
    if (!ed) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!ed.contains(range.commonAncestorContainer)) return;

    const a = sel.anchorNode;
    const f = sel.focusNode;
    if (!a || !f || !ed.contains(a) || !ed.contains(f)) return;
    const tokenRoot = (n: Node | null) => {
      const el =
        n?.nodeType === Node.TEXT_NODE ? (n.parentElement as HTMLElement | null) : (n as HTMLElement | null);
      return el?.closest(`.${WELCOME_INTERACTIVE_TOKEN}`) ?? null;
    };
    const t1 = tokenRoot(a);
    const t2 = tokenRoot(f);
    if (t1 && t1 === t2 && ed.contains(t1)) {
      const src = t1.getAttribute(WELCOME_SRC_ATTR);
      if (src) {
        event.clipboardData?.setData("text/plain", src);
        event.preventDefault();
      }
      return;
    }

    if (!range.collapsed) {
      const holder = document.createElement("div");
      holder.appendChild(range.cloneContents());
      const plain = serializeWelcomeRichEditorRoot(holder);
      if (plain.length > 0) {
        event.clipboardData?.setData("text/plain", plain);
        event.preventDefault();
      }
    }
  };

  const handlePick = (item: PickerItem) => {
    const insert = item.insert;
    if (insertPickerSurface === "imageCardTitle") {
      const inp = imageCardTitleInputRef.current;
      if (inp) {
        const saved = imageCardTitleInsertCaretRef.current;
        imageCardTitleInsertCaretRef.current = null;
        insertTextIntoTextAreaControlled(inp, insert, saved, (next, _caret) =>
          setImageCard((c) => ({ ...c, title: next }))
        );
        previewInsertRangeRef.current = null;
        previewInsertMessageSnapshotRef.current = null;
        setOpenPicker(null);
        setSearch("");
        return;
      }
    }
    if (insertPickerSurface === "imageCardSubtitle") {
      const inp = imageCardSubtitleInputRef.current;
      if (inp) {
        const saved = imageCardSubtitleInsertCaretRef.current;
        imageCardSubtitleInsertCaretRef.current = null;
        insertTextIntoTextAreaControlled(inp, insert, saved, (next, _caret) =>
          setImageCard((c) => ({ ...c, subtitle: next }))
        );
        previewInsertRangeRef.current = null;
        previewInsertMessageSnapshotRef.current = null;
        setOpenPicker(null);
        setSearch("");
        return;
      }
    }
    if (welcomeStyleRef.current === "embed") {
      const ta = embedDescriptionTextareaRef.current;
      if (ta) {
        const saved = embedDescInsertCaretRef.current;
        embedDescInsertCaretRef.current = null;
        previewInsertRangeRef.current = null;
        rawInsertCaretRef.current = null;
        insertTextIntoTextAreaControlled(ta, insert, saved, (next, _c) => setDescription(next));
        previewInsertRangeRef.current = null;
        previewInsertMessageSnapshotRef.current = null;
        setOpenPicker(null);
        setSearch("");
        return;
      }
    }
    if (messageEditorMode === "preview" && previewEditorRef.current) {
      flushWelcomeHistoryDebouncedNow();
      const editor = previewEditorRef.current;
      const snap = previewInsertMessageSnapshotRef.current;
      previewInsertMessageSnapshotRef.current = null;
      const savedRange = previewInsertRangeRef.current;
      previewInsertRangeRef.current = null;
      const currentSerialized = serializeWelcomeRichEditorRoot(editor);
      const useSaved =
        snap !== null && snap === currentSerialized && savedRange !== null;
      let range: Range;
      try {
        range = resolveWelcomePreviewInsertRange(editor, useSaved ? savedRange : null);
      } catch {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      editor.focus();
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(range);
      }
      const caretBefore = getWelcomePlainCaretOffset(editor);
      const node = createWelcomeInsertNode(insert, welcomeRichCtx);
      insertWelcomeNodesAtCaret(editor, [node]);
      normalizeWelcomeRichDivs(editor);
      const next = serializeWelcomeRichEditorRoot(editor);
      const nextCaret = Math.min(caretBefore + insert.length, next.length);
      setMessage(next);
      setWelcomePlainCaretOffset(editor, nextCaret);
      welcomeHistoryCommitIfChanged({
        message: next,
        caret: nextCaret,
        editorMode: "preview",
      });
      previewInsertRangeRef.current = null;
      previewInsertMessageSnapshotRef.current = null;
      rawInsertCaretRef.current = null;
      setOpenPicker(null);
      setSearch("");
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      setMessage((prev) => prev + insert);
      previewInsertRangeRef.current = null;
      previewInsertMessageSnapshotRef.current = null;
      rawInsertCaretRef.current = null;
      setOpenPicker(null);
      setSearch("");
      return;
    }
    flushWelcomeHistoryDebouncedNow();
    const savedCaret = rawInsertCaretRef.current;
    rawInsertCaretRef.current = null;
    previewInsertRangeRef.current = null;
    previewInsertMessageSnapshotRef.current = null;
    insertTextIntoTextAreaControlled(textarea, insert, savedCaret, (nextValue, caretAfter) => {
      setMessage(nextValue);
      welcomeHistoryCommitIfChanged({
        message: nextValue,
        caret: Math.min(caretAfter, nextValue.length),
        editorMode: "raw",
      });
    });
    setOpenPicker(null);
    setSearch("");
  };

  const currentConfig = useMemo<DirtyConfig>(
    () => ({
      welcomeEnabled,
      channelId,
      humanRoleId,
      botRoleId,
      skipBotAccounts,
      message,
      title,
      description,
      color,
      embedAuthorName,
      embedAuthorAvatar,
      embedAuthorAvatarUrl: embedAuthorAvatar
        ? (bootstrap?.viewer?.avatarUrl ?? "").trim()
        : "",
      embedFooter,
      embedImageDataUrl,
      embedFields,
      welcomeStyle,
      textImageDataUrl,
      imageCard,
      // Для сравнения "dirty" используются флаги из lastSavedConfig.
      welcomeStyleExists: true,
      textImageDataUrlExists: true,
      imageCardExists: true,
    }),
    [
      welcomeEnabled,
      channelId,
      humanRoleId,
      botRoleId,
      skipBotAccounts,
      message,
      title,
      description,
      color,
      embedAuthorName,
      embedAuthorAvatar,
      embedFooter,
      embedImageDataUrl,
      embedFields,
      welcomeStyle,
      textImageDataUrl,
      imageCard,
      bootstrap?.viewer?.avatarUrl,
    ]
  );

  const isDirty = lastSavedConfig ? !configsEqual(currentConfig, lastSavedConfig) : false;

  useEffect(() => {
    if (!isDirty) setUnsavedGuardAttentionCounter(0);
  }, [isDirty]);

  useLayoutEffect(() => {
    if (unsavedGuardAttentionCounter === 0) return;
    const el = unsavedBarAnimRef.current;
    if (!el) return;
    el.classList.remove("unsaved-bar-attention");
    void el.offsetWidth;
    el.classList.add("unsaved-bar-attention");
  }, [unsavedGuardAttentionCounter]);

  const imageCardBackgroundPreviewUrl = useMemo(() => {
    if (imageCard.backgroundMode !== "image") return null;
    const dataUrl = imageCard.backgroundImageDataUrl?.trim();
    if (dataUrl?.startsWith("data:image/")) return dataUrl;
    if (!imageCard.backgroundImage.enabled || !imageCard.backgroundImage.path.trim()) {
      return null;
    }
    return `/api/config/${guildId}/welcome-card-background`;
  }, [
    guildId,
    imageCard.backgroundMode,
    imageCard.backgroundImageDataUrl,
    imageCard.backgroundImage.enabled,
    imageCard.backgroundImage.path,
  ]);

  const imageCardHasBackgroundAsset = useMemo(() => {
    const d = imageCard.backgroundImageDataUrl?.trim();
    if (d?.startsWith("data:image/")) return true;
    return (
      imageCard.backgroundImage.enabled && Boolean(imageCard.backgroundImage.path?.trim())
    );
  }, [
    imageCard.backgroundImageDataUrl,
    imageCard.backgroundImage.enabled,
    imageCard.backgroundImage.path,
  ]);

  const imageCardPreviewLayout = useMemo(
    () =>
      imageCardPreviewScaledMetrics(
        imageCardPreviewScale,
        imageCard.titleStyle.textSize,
        imageCard.subtitleStyle.textSize
      ),
    [imageCardPreviewScale, imageCard.titleStyle.textSize, imageCard.subtitleStyle.textSize]
  );

  const imageCardToolbarMaxStyle = useMemo(() => {
    const px = imageCardPreviewMaxPx > 0 ? imageCardPreviewMaxPx : undefined;
    return px ? { maxWidth: `${px}px` } : undefined;
  }, [imageCardPreviewMaxPx]);

  const handleImageCardBgFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setImageCardBgUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/config/${guildId}/welcome-card-background`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        backgroundImageDataUrl?: string;
        path?: string;
        filename?: string;
        error?: string;
      };
      if (res.ok && data.backgroundImageDataUrl) {
        const next: ImageCardConfig = {
          ...imageCard,
          backgroundMode: "image",
          backgroundImageDataUrl: data.backgroundImageDataUrl,
          backgroundImage: {
            enabled: true,
            path: data.path ?? "",
            filename: data.filename,
          },
        };
        setImageCard(next);
        setLastSavedConfig((ls) => (ls ? { ...ls, imageCard: next } : ls));
      }
    } catch {
      /* сеть */
    } finally {
      setImageCardBgUploadBusy(false);
    }
  };

  const handleImageCardBgRemove = () => {
    const next: ImageCardConfig = {
      ...imageCard,
      backgroundMode: "solid",
      backgroundImageDataUrl: "",
      backgroundImage: { enabled: false, path: "", filename: undefined },
    };
    setImageCard(next);
    setLastSavedConfig((ls) => (ls ? { ...ls, imageCard: next } : ls));
    void fetch(`/api/config/${guildId}/welcome-card-background`, {
      method: "DELETE",
      credentials: "include",
    }).catch(() => {});
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const pingUnsavedChangesPanel = useCallback(() => {
    setUnsavedGuardAttentionCounter((c) => c + 1);
  }, []);

  const triggerUnsavedGuard = () => {
    if (!isDirty) return false;
    pingUnsavedChangesPanel();
    return true;
  };

  const handleSendTestWelcome = async () => {
    if (!channelId.trim()) {
      setTestSendStatus("Выберите канал для приветствия");
      setTestSendStatusTone("error");
      return;
    }

    setIsSendingTest(true);
    setTestSendStatus("");
    setTestSendStatusTone("");

    try {
      const res = await fetch(`/api/discord/guilds/${guildId}/send-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channelId.trim(),
          welcomeStyle,
          message,
          title,
          description,
          color,
          textImageDataUrl,
          embedAuthorName,
          embedAuthorAvatar,
          embedFooter,
          embedImageDataUrl,
          embedFields: embedFieldsToPersisted(embedFields),
          viewerAvatarUrl: bootstrap?.viewer?.avatarUrl ?? null,
          ...(welcomeStyle === "imageCard" ? { imageCard } : {}),
        }),
      });

      let data: {
        success?: boolean;
        message?: string;
        error?: string;
        discordError?: string;
      } = {};

      try {
        data = (await res.json()) as typeof data;
      } catch {
        setTestSendStatus(
          res.ok ? "Не удалось разобрать ответ сервера" : `Ответ ${res.status}`
        );
        setTestSendStatusTone("error");
        return;
      }

      if (res.ok && data.success) {
        setTestSendStatus(
          data.message?.trim() || "Тестовое сообщение отправлено"
        );
        setTestSendStatusTone("success");
        return;
      }

      const base =
        data.message?.trim() ||
        data.error?.trim() ||
        "Не удалось отправить тест";
      const discord = data.discordError?.trim();
      setTestSendStatus(
        discord ? `${base} · ${discord}` : base
      );
      setTestSendStatusTone("error");
    } catch {
      setTestSendStatus("Ошибка сети");
      setTestSendStatusTone("error");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleRevertChanges = () => {
    if (!lastSavedConfig) return;
    setChannelId(lastSavedConfig.channelId);
    setHumanRoleId(lastSavedConfig.humanRoleId);
    setBotRoleId(lastSavedConfig.botRoleId);
    setWelcomeEnabled(lastSavedConfig.welcomeEnabled);
    setSkipBotAccounts(lastSavedConfig.skipBotAccounts);
    setWelcomeStyle(lastSavedConfig.welcomeStyle);
    setTextImageDataUrl(lastSavedConfig.textImageDataUrl);
    setMessage(lastSavedConfig.message);
    setTitle(lastSavedConfig.title);
    setDescription(lastSavedConfig.description);
    setColor(lastSavedConfig.color);
    setEmbedAuthorName(lastSavedConfig.embedAuthorName);
    setEmbedAuthorAvatar(lastSavedConfig.embedAuthorAvatar);
    setEmbedFooter(lastSavedConfig.embedFooter);
    setEmbedImageDataUrl(lastSavedConfig.embedImageDataUrl);
    setEmbedFields(lastSavedConfig.embedFields.map((r) => ({ ...r })));
    setImageCard({ ...lastSavedConfig.imageCard });
    welcomeHistRef.current = {
      entries: [
        {
          message: lastSavedConfig.message,
          caret: 0,
          editorMode: messageEditorModeRef.current,
        },
      ],
      index: 0,
    };
    setRichEditorBootstrap((n) => n + 1);
  };

  const handleSave = async () => {
    if (!isDirty) return;
    setIsSaving(true);
    const data = {
      welcomeEnabled,
      channelId,
      humanRoleId,
      botRoleId,
      skipBotAccounts,
      welcomeStyle,
      textImageDataUrl,
      message,
      title,
      description,
      color,
      embedAuthorName,
      embedAuthorAvatar,
      embedAuthorAvatarUrl: currentConfig.embedAuthorAvatarUrl,
      embedFooter,
      embedImageDataUrl,
      embedFields: embedFieldsToPersisted(embedFields),
      imageCard,
    };
    try {
      const res = await fetch(`/api/config/${guildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        // После успешного сохранения обновляем baseline.
        const savedSnapshot: DirtyConfig = {
          ...currentConfig,
          welcomeStyleExists: true,
          textImageDataUrlExists: true,
          imageCardExists: true,
        };
        setLastSavedConfig(savedSnapshot);
      }
    } catch {
      // ошибка сети при сохранении
    } finally {
      setIsSaving(false);
    }
  };

  const processImageFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setTextImageDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTextImageInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processImageFile(file);
    event.target.value = "";
  };

  const handleTextImageDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    textImageDragDepthRef.current = 0;
    setTextImageZoneActive(false);
    processImageFile(event.dataTransfer.files?.[0]);
  };

  const onWelcomeTextImageDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    textImageDragDepthRef.current += 1;
    setTextImageZoneActive(true);
  };

  const onWelcomeTextImageDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    textImageDragDepthRef.current -= 1;
    if (textImageDragDepthRef.current <= 0) {
      textImageDragDepthRef.current = 0;
      setTextImageZoneActive(false);
    }
  };

  const onWelcomeTextImageDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {
      /* ignore */
    }
  };

  const processEmbedImageFile = (file: File | null | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setEmbedImageDataUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEmbedImageInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    processEmbedImageFile(file);
    event.target.value = "";
  };

  const handleEmbedImageDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    embedImageDragDepthRef.current = 0;
    setEmbedImageZoneActive(false);
    processEmbedImageFile(event.dataTransfer.files?.[0]);
  };

  const onEmbedImageDragEnter = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!Array.from(e.dataTransfer.types).includes("Files")) return;
    embedImageDragDepthRef.current += 1;
    setEmbedImageZoneActive(true);
  };

  const onEmbedImageDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    embedImageDragDepthRef.current -= 1;
    if (embedImageDragDepthRef.current <= 0) {
      embedImageDragDepthRef.current = 0;
      setEmbedImageZoneActive(false);
    }
  };

  const onEmbedImageDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {
      /* ignore */
    }
  };

  const activeSectionMeta = useMemo(() => getSectionItem(activeSection), [activeSection]);
  const botName = bootstrap?.bot?.name || "Bot";
  const viewerName = bootstrap?.viewer?.name || "Пользователь";
  const viewerAvatarUrl = bootstrap?.viewer?.avatarUrl ?? null;
  const toolbarButtonClass = (type: PickerType) =>
    `inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition ${
      openPicker === type
        ? "bg-white/14 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
        : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
    }`;

  return (
    <main className="flex min-h-0 min-w-0 flex-1 flex-col p-6 pb-28 text-white">
      <WelcomeCardPreviewFontFaces fontKeys={availableWelcomeCardFontKeys} />
      <div className="app-shell-container">
        <header className="ds-header-bar mb-6 flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <button
              type="button"
              aria-label="На главную страницу"
              className="shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 transition-opacity hover:opacity-95 active:opacity-90"
              onClick={() => {
                if (triggerUnsavedGuard()) return;
                router.push("/");
              }}
            >
              <Avatar
                size="lg"
                src={bootstrap?.bot?.avatarUrl ?? null}
                alt={botName}
                fallback={botName}
              />
            </button>
            <div className="min-w-0">
              <h1 className="ds-heading truncate text-2xl">{botName}</h1>
            </div>
          </div>
          <div className="flex shrink-0 justify-end self-end md:self-auto">
            <UserMenu
              viewerName={viewerName}
              avatarUrl={bootstrap?.viewer?.avatarUrl ?? null}
              idPrefix="dashboard"
              className="relative flex items-center gap-3"
              onGoServers={() => {
                if (triggerUnsavedGuard()) return;
                router.push("/servers");
              }}
              onLogout={() => {
                if (triggerUnsavedGuard()) return;
                window.location.assign("/api/auth/logout");
              }}
            />
          </div>
        </header>

            <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,272px)_1fr]">
          <div className="flex min-h-0 min-w-0 w-full max-w-full flex-col gap-2">
            <SidebarServerSwitcher
              currentGuildId={guildId}
              currentGuildName={guildName}
              currentGuildIconUrl={guildIconUrl}
              connectedGuilds={connectedGuilds}
              triggerUnsavedGuard={triggerUnsavedGuard}
              idPrefix="dashboard"
            />
            <aside
              className="h-fit w-full min-w-0 max-w-full self-start rounded-xl border border-white/[0.09] bg-[rgba(15,16,24,0.58)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:p-1.5"
              aria-label="Разделы настроек"
            >
            <nav className="flex flex-col gap-0.5" aria-label="Навигация по разделам">
              {SECTION_ITEMS.map(({ id, navLabel }) =>
                id === "welcome" ? (
                  <div
                    key={id}
                    className={`flex w-full items-center gap-1 rounded-lg pr-1.5 transition focus-within:outline-none ${
                      activeSection === id
                        ? "bg-white/[0.14] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                        : "text-zinc-200/95 hover:bg-white/[0.06]"
                    }`}
                  >
                    <button
                      type="button"
                      aria-current={activeSection === id ? "page" : undefined}
                      onClick={() => {
                        if (activeSection === id) return;
                        setActiveSection(id);
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-normal leading-[1.35] tracking-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]"
                    >
                      <SectionSidebarIcon
                        id={id}
                        className={`h-[18px] w-[18px] shrink-0 ${activeSection === id ? "text-zinc-100" : "text-zinc-300"}`}
                      />
                      <span className="min-w-0">{navLabel}</span>
                    </button>
                    <CompactSwitch
                      size="sidebar"
                      checked={welcomeEnabled}
                      onCheckedChange={(next) => {
                        setWelcomeEnabled(next);
                        setActiveSection("welcome");
                      }}
                      title={welcomeModuleCopy.sidebarWelcomeToggleAria}
                      aria-label={welcomeModuleCopy.sidebarWelcomeToggleAria}
                      className="self-center motion-reduce:transition-none"
                    />
                  </div>
                ) : (
                  <button
                    key={id}
                    type="button"
                    aria-current={activeSection === id ? "page" : undefined}
                    onClick={() => {
                      if (activeSection === id) return;
                      setActiveSection(id);
                    }}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] font-normal leading-[1.35] tracking-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] ${
                      activeSection === id
                        ? "bg-white/[0.14] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                        : "text-zinc-200/95 hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    <SectionSidebarIcon
                      id={id}
                      className={`h-[18px] w-[18px] shrink-0 ${activeSection === id ? "text-zinc-100" : "text-zinc-300"}`}
                    />
                    <span className="min-w-0">{navLabel}</span>
                  </button>
                )
              )}
            </nav>
          </aside>
          </div>

          <section className="min-w-0 space-y-4" aria-labelledby="section-heading">
            <div className="grid gap-6">
              <div className="ds-card rounded-2xl p-4 sm:p-5">
                {activeSection === "welcome" ? (
                  <CollapsibleSettingsSection
                    sectionId="welcome-settings"
                    headingDomId="section-heading"
                    title={activeSectionMeta.heading}
                    subtitle={activeSectionMeta.subtitle}
                    defaultOpen
                  >
                    <div className="relative overflow-hidden rounded-2xl">
                      <div
                        className={`welcome-settings-stack${
                          !welcomeEnabled
                            ? " pointer-events-none opacity-[0.5] saturate-[0.55] brightness-[0.72]"
                            : ""
                        }`}
                      >
                    <section
                      data-welcome-block="delivery"
                      className="welcome-settings-module px-4 py-4 sm:px-5 sm:py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="ds-kicker">{welcomeModuleCopy.deliverySectionTitle}</p>
                          <p className="welcome-help-text mt-1.5 max-w-prose">
                            {welcomeModuleCopy.deliveryChannelSelectHint}
                          </p>
                        </div>
                        <div
                          className="flex w-full shrink-0 flex-wrap gap-0.5 rounded-full bg-black/[0.26] p-0.5 sm:w-auto sm:flex-nowrap"
                          role="tablist"
                          aria-label={welcomeModuleCopy.deliveryModeTablistAria}
                        >
                          <button
                            type="button"
                            role="tab"
                            aria-selected
                            tabIndex={-1}
                            className="min-h-9 flex-1 cursor-default rounded-full px-3.5 py-2 text-center text-xs font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] sm:flex-initial bg-[var(--brand)]"
                          >
                            {welcomeModuleCopy.deliveryChannelLabel}
                          </button>
                          <button
                            type="button"
                            role="tab"
                            aria-selected={false}
                            disabled
                            title={welcomeModuleCopy.deliveryDmUnavailableTitle}
                            aria-label={`${welcomeModuleCopy.deliveryDmTab}: ${welcomeModuleCopy.deliveryDmUnavailableTitle}`}
                            className="min-h-9 flex-1 cursor-not-allowed rounded-full px-3.5 py-2 text-center text-xs font-medium text-zinc-500 opacity-50 focus-visible:outline-none sm:flex-initial"
                          >
                            {welcomeModuleCopy.deliveryDmTab}
                          </button>
                        </div>
                      </div>
                      <div className="mt-4">
                        <CustomSelect
                          value={channelId}
                          options={channelOptions}
                          placeholder={resourcesLoading ? "Загрузка каналов..." : "Не выбран"}
                          disabled={resourcesLoading}
                          onChange={setChannelId}
                          ariaLabel="Канал для приветствия"
                        />
                      </div>
                      {!resourcesLoading && resourcesError ? (
                        <p className="mt-2.5 text-sm text-rose-400">{resourcesError}</p>
                      ) : null}
                      {!resourcesLoading &&
                      !resourcesError &&
                      resources.errors?.channels ? (
                        <p
                          className="mt-2.5 text-xs text-amber-400/90"
                          title={resources.errors.channels}
                          role="status"
                        >
                          Каналы не загрузились
                        </p>
                      ) : null}
                      {!resourcesLoading && resources.errors?.emojis ? (
                        <p
                          className="mt-2.5 text-xs text-amber-400/90"
                          title={resources.errors.emojis}
                          role="status"
                        >
                          Эмодзи не загрузились
                        </p>
                      ) : null}
                    </section>

                    <section
                      data-welcome-block="composer"
                      className="welcome-settings-module overflow-hidden rounded-2xl ring-1 ring-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                    >
                      <div
                        ref={pickerAreaRef}
                        className="relative overflow-visible border-b border-white/[0.06] bg-white/[0.02]"
                        role="group"
                        aria-labelledby="welcome-message-label"
                      >
                        <div className="flex flex-col gap-2.5 px-3 pb-2 pt-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-3.5 sm:pb-2.5 sm:pt-3.5">
                          <div className="min-w-0 pr-2">
                            <p className="ds-kicker" id="welcome-message-label">
                              Сообщение приветствия
                            </p>
                            <p className="welcome-help-text mt-0.5">
                              Будет отправлено над стилем приветствия
                            </p>
                          </div>
                          <div
                            className="inline-flex shrink-0 self-start rounded-full bg-black/[0.26] p-0.5 sm:mt-0.5"
                            role="tablist"
                            aria-label="Режим редактора: визуальный или исходный текст"
                          >
                            <button
                              type="button"
                              role="tab"
                              aria-selected={messageEditorMode === "preview"}
                              aria-label="Визуальный редактор"
                              title="Визуальный редактор"
                              onClick={() => setMessageEditorMode("preview")}
                              className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] ${
                                messageEditorMode === "preview"
                                  ? "bg-white/[0.16] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <IconWelcomePreviewMode className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              role="tab"
                              aria-selected={messageEditorMode === "raw"}
                              aria-label="Исходный текст"
                              title="Исходный текст"
                              onClick={() => setMessageEditorMode("raw")}
                              className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] ${
                                messageEditorMode === "raw"
                                  ? "bg-white/[0.16] text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              <IconWelcomeRawMode className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <div className="relative min-h-28 px-3 pb-3 sm:px-3.5 sm:pb-3.5">
                          {messageEditorMode === "raw" ? (
                            <textarea
                              ref={textareaRef}
                              value={message}
                              onChange={(e) => {
                                rawInsertCaretRef.current = null;
                                setMessage(e.target.value);
                                scheduleWelcomeHistoryDebounced();
                              }}
                              onBlur={() => flushWelcomeHistoryDebouncedNow()}
                              className="min-h-28 w-full resize-y rounded-none border-0 bg-transparent px-0.5 py-2 pb-12 text-[15px] leading-relaxed text-zinc-200 shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                              aria-labelledby="welcome-message-label"
                              spellCheck={false}
                            />
                          ) : (
                            <div
                              ref={previewEditorRef}
                              role="textbox"
                              aria-multiline="true"
                              aria-labelledby="welcome-message-label"
                              contentEditable
                              suppressContentEditableWarning
                              spellCheck={false}
                              className="min-h-28 w-full whitespace-pre-wrap break-words px-0.5 py-2 pb-12 text-[15px] leading-relaxed text-zinc-200 outline-none [&_.welcome-interactive-token]:select-all"
                              onMouseDown={handlePreviewTokenMouseDown}
                              onCopy={handleWelcomeRichCopy}
                              onInput={handleWelcomeRichInput}
                              onCompositionStart={() => {
                                welcomeRichComposeRef.current = true;
                              }}
                              onCompositionEnd={() => {
                                welcomeRichComposeRef.current = false;
                                handleWelcomeRichInput();
                              }}
                              onPaste={handleWelcomeRichPaste}
                              onKeyDown={handleWelcomeRichKeyDown}
                              onBlur={() => flushWelcomeHistoryDebouncedNow()}
                            />
                          )}
                          <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-10 flex justify-end">
                            <div
                              className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/[0.09] bg-zinc-950/40 px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-2xl backdrop-saturate-150"
                              role="toolbar"
                              aria-label="Вставка в сообщение"
                            >
                              {(["emoji", "channel", "role", "variable"] as const).map((type) => (
                                <div
                                  key={type}
                                  ref={(el) => {
                                    welcomePickerAnchorRefs.current[type] = el;
                                  }}
                                  className="relative"
                                >
                                  <button
                                    type="button"
                                    aria-label={getTitleByType(type)}
                                    title={getTitleByType(type)}
                                    aria-pressed={openPicker === type}
                                    onMouseDown={(e) => {
                                      captureWelcomeInsertAnchor();
                                      e.preventDefault();
                                    }}
                                    onClick={() => {
                                      setInsertPickerSurface("welcome");
                                      setOpenPicker((prev) => (prev === type ? null : type));
                                    }}
                                    className={toolbarButtonClass(type)}
                                  >
                                    {insertToolbarIcon(type)}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/[0.05] bg-white/[0.015] px-3 py-3 sm:px-3.5 sm:py-3.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="ds-kicker">Стиль приветствия</p>
                          <p className="welcome-help-text mt-0.5">Оформление в Discord</p>
                        </div>
                        <div
                          className="flex w-full flex-wrap gap-0.5 rounded-full bg-black/[0.26] p-0.5 sm:w-auto sm:flex-nowrap"
                          role="tablist"
                          aria-label="Стиль приветствия"
                        >
                          {(["text", "embed", "imageCard"] as DashboardConfig["welcomeStyle"][]).map((style) => (
                            <button
                              key={style}
                              type="button"
                              role="tab"
                              aria-selected={welcomeStyle === style}
                              onClick={() => setWelcomeStyle(style)}
                              className={`min-h-9 flex-1 cursor-pointer rounded-full px-3.5 py-2 text-center text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] sm:flex-initial ${
                                welcomeStyle === style
                                  ? "bg-white/14 text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                  : "text-zinc-500 hover:text-zinc-300"
                              }`}
                            >
                              {WELCOME_STYLE_LABELS[style]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div
                        className="mt-3.5 rounded-xl bg-black/[0.18] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.045] sm:px-3.5 sm:py-3.5"
                        role="region"
                        aria-label={`Параметры: ${WELCOME_STYLE_LABELS[welcomeStyle]}`}
                      >
                        <div className="space-y-3.5">
                    {welcomeStyle === "text" ? (
                      <div>
                        <p className="ds-kicker">Изображение к сообщению (опционально)</p>
                        <input
                          ref={textImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleTextImageInput}
                          className="hidden"
                        />
                        {!textImageDataUrl ? (
                          <button
                            type="button"
                            onClick={() => textImageInputRef.current?.click()}
                            onDragEnter={onWelcomeTextImageDragEnter}
                            onDragLeave={onWelcomeTextImageDragLeave}
                            onDragOver={onWelcomeTextImageDragOver}
                            onDrop={handleTextImageDrop}
                            className={`relative mt-2.5 flex aspect-video w-full max-h-[148px] min-h-[6.5rem] flex-col items-center justify-center overflow-hidden rounded-xl px-4 py-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] ${
                              textImageZoneActive
                                ? "bg-black/[0.2] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ring-2 ring-white/[0.14] ring-inset"
                                : "bg-black/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06] hover:bg-black/[0.17]"
                            }`}
                          >
                            <div className="relative flex flex-col items-center">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] ring-1 ring-white/[0.07]">
                                <IconWelcomeImagePlaceholder className="h-5 w-5 text-zinc-400/90" />
                              </div>
                              <p className="welcome-help-text mt-2 max-w-[16rem] text-center">
                                Перетащите или нажмите для выбора
                              </p>
                            </div>
                          </button>
                        ) : (
                          <div
                            className={`group relative mt-2.5 aspect-video w-full max-h-[148px] min-h-[6.5rem] overflow-hidden rounded-xl bg-black/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.06] transition ${
                              textImageZoneActive ? "ring-2 ring-white/[0.14] ring-inset" : ""
                            }`}
                            onDragEnter={onWelcomeTextImageDragEnter}
                            onDragLeave={onWelcomeTextImageDragLeave}
                            onDragOver={onWelcomeTextImageDragOver}
                            onDrop={handleTextImageDrop}
                          >
                            <div className="relative flex h-full min-h-[6.5rem] w-full cursor-default items-center justify-center p-2 sm:p-3">
                              <img
                                src={textImageDataUrl}
                                alt="Превью изображения для приветствия"
                                className="max-h-full w-full max-w-full object-contain drop-shadow-sm"
                              />
                            </div>
                            <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-2.5 sm:p-3">
                              <div className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/[0.09] bg-zinc-950/40 px-1.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-2xl backdrop-saturate-150 transition">
                                <button
                                  type="button"
                                  aria-label="Удалить изображение"
                                  title="Удалить изображение"
                                  onClick={() => setTextImageDataUrl("")}
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/[0.12] hover:text-zinc-100"
                                >
                                  <IconTrashCompact className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {welcomeStyle === "embed" ? (
                      <div
                        ref={embedPickerAreaRef}
                        className="overflow-hidden rounded-xl bg-[#111214]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ring-1 ring-white/[0.055]"
                      >
                        <div className="flex min-h-[3rem]">
                          <div
                            className="w-1 shrink-0 self-stretch"
                            style={{ backgroundColor: color }}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1 px-3 py-3 sm:px-3.5 sm:py-3.5">
                            <div className="mb-3.5 flex flex-col gap-2.5 border-b border-white/[0.04] pb-3 sm:flex-row sm:items-center sm:gap-3">
                              <div className="flex shrink-0 items-center gap-1">
                                <input
                                  ref={embedColorInputRef}
                                  id="embed-side-color"
                                  type="color"
                                  value={color}
                                  onChange={(e) => setColor(e.target.value)}
                                  className="sr-only"
                                  aria-label="Цвет полосы слева"
                                />
                                <button
                                  type="button"
                                  onClick={() => embedColorInputRef.current?.click()}
                                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-white/[0.04] transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214]"
                                  aria-label="Цвет полосы слева"
                                >
                                  <span
                                    className="block size-5 rounded-full ring-1 ring-black/35"
                                    style={{ backgroundColor: color }}
                                  />
                                </button>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={embedAuthorAvatar}
                                  aria-label="Показывать ваш аватар у автора"
                                  onClick={() => setEmbedAuthorAvatar((v) => !v)}
                                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214] ${
                                    embedAuthorAvatar
                                      ? "bg-white/[0.11] text-zinc-100"
                                      : "bg-white/[0.04] text-[#7c828b] hover:bg-white/[0.07] hover:text-[#b8bcc3]"
                                  }`}
                                >
                                  <IconEmbedAuthorAvatar className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
                                <div className="min-w-0 flex-1">
                                  <label htmlFor="embed-author-name" className="sr-only">
                                    Имя автора
                                  </label>
                                  <input
                                    id="embed-author-name"
                                    value={embedAuthorName}
                                    onChange={(e) => setEmbedAuthorName(e.target.value)}
                                    className="w-full border-0 bg-transparent p-0 text-[13px] font-medium leading-5 text-[#b5bac1] placeholder:text-[#6d7480] outline-none focus-visible:ring-0"
                                    placeholder="Имя автора — по желанию"
                                    autoComplete="off"
                                  />
                                </div>
                                {embedAuthorAvatar ? (
                                  viewerAvatarUrl ? (
                                    <img
                                      src={viewerAvatarUrl}
                                      alt=""
                                      className="size-10 shrink-0 rounded-full object-cover opacity-95 ring-1 ring-white/[0.06]"
                                    />
                                  ) : (
                                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-xs font-medium text-[#949ba4] ring-1 ring-white/[0.05]">
                                      {(bootstrap?.viewer?.name || "?").slice(0, 1).toUpperCase()}
                                    </div>
                                  )
                                ) : null}
                              </div>
                            </div>

                            <div className="mb-0.5">
                              <label htmlFor="embed-title" className="sr-only">
                                Заголовок
                              </label>
                              <input
                                id="embed-title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border-0 bg-transparent p-0 text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em] text-[#f5f6f7] placeholder:text-[#6d7480] outline-none focus-visible:ring-0 sm:text-lg"
                                placeholder="Заголовок"
                                autoComplete="off"
                              />
                            </div>

                            <div className="mt-3.5">
                              <label htmlFor="embed-description" className="sr-only">
                                Текст
                              </label>
                              <div className="relative min-h-[8.5rem] rounded-lg bg-black/18 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]">
                                <textarea
                                  ref={embedDescriptionTextareaRef}
                                  id="embed-description"
                                  value={description}
                                  onChange={(e) => {
                                    embedDescInsertCaretRef.current = null;
                                    setDescription(e.target.value);
                                  }}
                                  onSelect={captureEmbedDescriptionInsertAnchor}
                                  onKeyUp={captureEmbedDescriptionInsertAnchor}
                                  onMouseUp={captureEmbedDescriptionInsertAnchor}
                                  className="min-h-[9.5rem] w-full resize-y rounded-lg border-0 bg-transparent px-2.5 py-2 pb-11 text-[14px] leading-[1.55] text-[#dcddde] shadow-none outline-none placeholder:text-[#6d7480] focus-visible:ring-0"
                                  placeholder="Основной текст встраиваемого сообщения…"
                                  spellCheck={false}
                                />
                                <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 flex justify-end">
                                  <div
                                    className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-[#1a1c1f]/75 px-1 py-1 shadow-sm backdrop-blur-xl"
                                    role="toolbar"
                                    aria-label="Вставка в текст"
                                  >
                                    {(["emoji", "channel", "role", "variable"] as const).map((type) => (
                                      <div
                                        key={type}
                                        ref={(el) => {
                                          embedPickerAnchorRefs.current[type] = el;
                                        }}
                                        className="relative"
                                      >
                                        <button
                                          type="button"
                                          aria-label={getTitleByType(type)}
                                          title={getTitleByType(type)}
                                          aria-pressed={openPicker === type}
                                          onMouseDown={(e) => {
                                            captureEmbedDescriptionInsertAnchor();
                                            e.preventDefault();
                                          }}
                                          onClick={() => {
                                            setInsertPickerSurface("embed");
                                            setOpenPicker((prev) => (prev === type ? null : type));
                                          }}
                                          className={toolbarButtonClass(type)}
                                        >
                                          {insertToolbarIcon(type)}
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3.5">
                              <p className="welcome-nested-kicker mb-1.5 pl-0.5">Поля</p>
                              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
                                {embedFields.map((field) => (
                                  <div
                                    key={field.id}
                                    className={`rounded-lg bg-white/[0.02] px-2.5 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.045)] ${
                                      field.inline ? "sm:col-span-1" : "sm:col-span-3"
                                    }`}
                                  >
                                    <label htmlFor={`embed-field-name-${field.id}`} className="sr-only">
                                      Заголовок поля
                                    </label>
                                    <input
                                      id={`embed-field-name-${field.id}`}
                                      value={field.name}
                                      onChange={(e) =>
                                        setEmbedFields((prev) =>
                                          prev.map((f) =>
                                            f.id === field.id ? { ...f, name: e.target.value } : f
                                          )
                                        )
                                      }
                                      className="mb-1 w-full border-0 bg-transparent p-0 text-[11px] font-medium leading-snug text-[#e3e5e8] placeholder:text-[#5c6370] outline-none focus-visible:ring-0"
                                      placeholder="Заголовок поля"
                                      autoComplete="off"
                                    />
                                    <label htmlFor={`embed-field-value-${field.id}`} className="sr-only">
                                      Содержимое поля
                                    </label>
                                    <textarea
                                      id={`embed-field-value-${field.id}`}
                                      value={field.value}
                                      onChange={(e) =>
                                        setEmbedFields((prev) =>
                                          prev.map((f) =>
                                            f.id === field.id ? { ...f, value: e.target.value } : f
                                          )
                                        )
                                      }
                                      className="mb-1.5 min-h-[2.75rem] w-full resize-y border-0 bg-transparent p-0 text-[12px] leading-relaxed text-[#c9ccd1] placeholder:text-[#5c6370] outline-none focus-visible:ring-0"
                                      placeholder="Содержимое поля"
                                      spellCheck={false}
                                    />
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                                      <label className="flex cursor-pointer items-center gap-1.5">
                                        <input
                                          type="checkbox"
                                          checked={field.inline}
                                          onChange={(e) =>
                                            setEmbedFields((prev) =>
                                              prev.map((f) =>
                                                f.id === field.id ? { ...f, inline: e.target.checked } : f
                                              )
                                            )
                                          }
                                          className="size-3 rounded border-white/15 bg-black/25 text-[var(--brand)] focus:ring-1 focus:ring-[var(--ring)]"
                                        />
                                        <span className="welcome-help-text text-[#8e929b]">
                                          Отображать в одну строку
                                        </span>
                                      </label>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEmbedFields((prev) => prev.filter((f) => f.id !== field.id))
                                        }
                                        className="inline-flex size-7 items-center justify-center rounded-full text-[#6d7480] transition hover:bg-white/[0.06] hover:text-[#b5bac1]"
                                        aria-label="Удалить поле"
                                        title="Удалить поле"
                                      >
                                        <IconTrashCompact className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <button
                                type="button"
                                onClick={() => setEmbedFields((prev) => [...prev, newEmbedFieldRow()])}
                                className="welcome-help-text mt-2 inline-flex items-center gap-1.5 pl-0.5 text-[#8e929b] transition hover:text-[#b5bac1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214] rounded-sm"
                              >
                                <span className="text-[#6d7480]" aria-hidden>
                                  +
                                </span>
                                Добавить поле
                              </button>
                            </div>

                            <div className="mt-3.5">
                              <p className="sr-only">Изображение</p>
                              <input
                                ref={embedImageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleEmbedImageInput}
                                className="hidden"
                              />
                              {!embedImageDataUrl ? (
                                <button
                                  type="button"
                                  onClick={() => embedImageInputRef.current?.click()}
                                  onDragEnter={onEmbedImageDragEnter}
                                  onDragLeave={onEmbedImageDragLeave}
                                  onDragOver={onEmbedImageDragOver}
                                  onDrop={handleEmbedImageDrop}
                                  className={`flex w-full max-h-[100px] min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-lg text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111214] ${
                                    embedImageZoneActive
                                      ? "bg-white/[0.05] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                                      : "bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)] hover:bg-white/[0.035]"
                                  }`}
                                >
                                  <IconWelcomeImagePlaceholder className="h-4 w-4 text-[#5c6370]" />
                                  <span className="welcome-nested-kicker font-normal leading-tight text-[#6d7480]">
                                    Изображение — перетащите или нажмите
                                  </span>
                                </button>
                              ) : (
                                <div
                                  className={`group relative overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] ${
                                    embedImageZoneActive
                                      ? "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
                                      : ""
                                  }`}
                                  onDragEnter={onEmbedImageDragEnter}
                                  onDragLeave={onEmbedImageDragLeave}
                                  onDragOver={onEmbedImageDragOver}
                                  onDrop={handleEmbedImageDrop}
                                >
                                  <img
                                    src={embedImageDataUrl}
                                    alt=""
                                    className="max-h-36 w-full object-cover"
                                  />
                                  <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-1.5">
                                    <button
                                      type="button"
                                      aria-label="Удалить изображение"
                                      title="Удалить изображение"
                                      onClick={() => setEmbedImageDataUrl("")}
                                      className="pointer-events-auto inline-flex size-7 items-center justify-center rounded-full bg-black/45 text-[#c9ccd1] backdrop-blur-sm ring-1 ring-white/[0.08] hover:bg-black/55"
                                    >
                                      <IconTrashCompact className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="mt-3.5 border-t border-white/[0.04] pt-3">
                              <label htmlFor="embed-footer" className="sr-only">
                                Текст футера
                              </label>
                              <input
                                id="embed-footer"
                                value={embedFooter}
                                onChange={(e) => setEmbedFooter(e.target.value)}
                                className="w-full border-0 bg-transparent p-0 text-[11px] leading-relaxed text-[#72767d] placeholder:text-[#5c6370] outline-none focus-visible:ring-0"
                                placeholder="Текст футера — по желанию"
                                autoComplete="off"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {welcomeStyle === "imageCard" ? (
                      <div className="space-y-3">
                        {pickerPortalReady &&
                          imageCardTextToolbarPos &&
                          (imageCardActiveField === "title" || imageCardActiveField === "subtitle") &&
                          createPortal(
                            <div
                              ref={imageCardTextToolbarRef}
                              role="toolbar"
                              aria-label="Текст карточки"
                              className="fixed z-[235] flex flex-nowrap items-center gap-1 rounded-full border border-white/[0.12] px-1.5 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                              style={{
                                left: imageCardTextToolbarPos.left,
                                top: imageCardTextToolbarPos.top,
                                transform: "translate(-50%, calc(-100% - 10px))",
                                background: "rgba(18, 22, 36, 0.55)",
                                ...imageCardToolbarMaxStyle,
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              <div className="w-[8.25rem] min-w-0 shrink">
                                <CustomSelect
                                  value={imageCard.fontFamily}
                                  options={imageCardFontSelectOptions}
                                  placeholder="Шрифт"
                                  ariaLabel="Шрифт"
                                  compact
                                  minimal
                                  hideSearch
                                  disabled={availableWelcomeCardFontKeys.length === 0}
                                  onChange={(v) =>
                                    patchImageCardGlobalText({ fontFamily: v as ImageCardFontKey })
                                  }
                                />
                              </div>
                              <ColorPopover
                                label="Цвет текста"
                                triggerTitle="Цвет текста"
                                value={imageCard.textColor}
                                onChange={(hex) => patchImageCardGlobalText({ textColor: hex })}
                                avoidRect={imageCardTextBandRect}
                                zIndex={260}
                              />
                              <div className="relative shrink-0">
                                <button
                                  ref={imageCardTypographyTriggerRef}
                                  type="button"
                                  title="Оформление текста"
                                  aria-expanded={imageCardTypographyOpen}
                                  aria-haspopup="true"
                                  onClick={() => setImageCardTypographyOpen((o) => !o)}
                                  className={`inline-flex size-8 items-center justify-center rounded-full text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                    imageCardTypographyOpen
                                      ? "bg-white/[0.14] text-zinc-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                                      : "text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200"
                                  }`}
                                >
                                  <Type className="size-3.5" strokeWidth={2} aria-hidden />
                                </button>
                              </div>
                              <div
                                className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/[0.09] bg-zinc-950/40 px-0.5 py-0.5"
                                role="group"
                                aria-label="Вставка в текст карточки"
                              >
                                {(["emoji", "channel", "role", "variable"] as const).map((type) => (
                                  <div
                                    key={type}
                                    ref={(el) => {
                                      imageCardToolbarPickerAnchorRefs.current[type] = el;
                                    }}
                                    className="relative"
                                  >
                                    <button
                                      type="button"
                                      aria-label={getTitleByType(type)}
                                      title={getTitleByType(type)}
                                      aria-pressed={openPicker === type}
                                      onMouseDown={(e) => {
                                        captureImageCardInsertAnchor();
                                        e.preventDefault();
                                      }}
                                      onClick={() => {
                                        const surf =
                                          imageCardActiveField === "title"
                                            ? "imageCardTitle"
                                            : "imageCardSubtitle";
                                        setInsertPickerSurface(surf);
                                        setOpenPicker((prev) => (prev === type ? null : type));
                                      }}
                                      className={toolbarButtonClass(type)}
                                    >
                                      {insertToolbarIcon(type)}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>,
                            document.body
                          )}
                        {pickerPortalReady &&
                          imageCardTypographyOpen &&
                          imageCardTypographyPopoverPos &&
                          (imageCardActiveField === "title" || imageCardActiveField === "subtitle") &&
                          createPortal(
                            <div
                              data-image-card-typography-popover=""
                              className="pointer-events-auto fixed z-[240] isolation-isolate"
                              style={{
                                left: `${imageCardTypographyPopoverPos.left}px`,
                                top: `${imageCardTypographyPopoverPos.top}px`,
                                transform: "translate(-50%, calc(-100% - 6px))",
                              }}
                              onMouseDown={(e) => e.preventDefault()}
                            >
                              <DashboardDropdownSurface fullWidth={false}>
                                <ul className="divide-y divide-white/10">
                                  <li className="px-2 py-2">
                                    <p className="px-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                                      {imageCardActiveField === "title" ? "Заголовок" : "Подзаголовок"}
                                    </p>
                                  </li>
                                  <li className="px-2 py-2">
                                    <div
                                      className="inline-flex w-full items-center justify-center gap-0.5 rounded-full border border-white/[0.08] bg-black/25 p-0.5"
                                      role="group"
                                      aria-label="Размер текста"
                                    >
                                      {(
                                        [
                                          { id: "s" as const, label: "S" },
                                          { id: "m" as const, label: "M" },
                                          { id: "l" as const, label: "L" },
                                        ] as const
                                      ).map((sz) => {
                                        const cur =
                                          imageCardActiveField === "title"
                                            ? imageCard.titleStyle.textSize
                                            : imageCard.subtitleStyle.textSize;
                                        return (
                                          <button
                                            key={sz.id}
                                            type="button"
                                            title={`Размер: ${sz.label}`}
                                            aria-pressed={cur === sz.id}
                                            onClick={() =>
                                              patchImageCardFieldStyle(imageCardActiveField, {
                                                textSize: sz.id,
                                              })
                                            }
                                            className={`ds-liquid-list-item min-h-[1.5rem] min-w-[1.5rem] flex-1 rounded-full px-2 py-1 text-center text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                              cur === sz.id
                                                ? "bg-[var(--brand)]/24 text-zinc-100"
                                                : "text-zinc-300 hover:bg-white/[0.08]"
                                            }`}
                                          >
                                            {sz.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </li>
                                  <li className="px-2 py-2">
                                    <div
                                      className="flex justify-center gap-1"
                                      role="group"
                                      aria-label="Начертание"
                                    >
                                      <button
                                        type="button"
                                        title="Жирный"
                                        aria-pressed={
                                          (imageCardActiveField === "title"
                                            ? imageCard.titleStyle.fontWeight
                                            : imageCard.subtitleStyle.fontWeight) === "bold"
                                        }
                                        onClick={() => {
                                          const st =
                                            imageCardActiveField === "title"
                                              ? imageCard.titleStyle
                                              : imageCard.subtitleStyle;
                                          patchImageCardFieldStyle(imageCardActiveField, {
                                            fontWeight: st.fontWeight === "bold" ? "regular" : "bold",
                                          });
                                        }}
                                        className={`ds-liquid-list-item inline-flex size-8 items-center justify-center rounded-full border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                          (imageCardActiveField === "title"
                                            ? imageCard.titleStyle.fontWeight
                                            : imageCard.subtitleStyle.fontWeight) === "bold"
                                            ? "bg-[var(--brand)]/24 text-zinc-100"
                                            : "text-zinc-300 hover:bg-white/[0.08]"
                                        }`}
                                      >
                                        <Bold className="size-3.5" strokeWidth={2} aria-hidden />
                                      </button>
                                      <button
                                        type="button"
                                        title="Курсив"
                                        aria-pressed={
                                          (imageCardActiveField === "title"
                                            ? imageCard.titleStyle.fontStyle
                                            : imageCard.subtitleStyle.fontStyle) === "italic"
                                        }
                                        onClick={() => {
                                          const st =
                                            imageCardActiveField === "title"
                                              ? imageCard.titleStyle
                                              : imageCard.subtitleStyle;
                                          patchImageCardFieldStyle(imageCardActiveField, {
                                            fontStyle: st.fontStyle === "italic" ? "normal" : "italic",
                                          });
                                        }}
                                        className={`ds-liquid-list-item inline-flex size-8 items-center justify-center rounded-full border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                          (imageCardActiveField === "title"
                                            ? imageCard.titleStyle.fontStyle
                                            : imageCard.subtitleStyle.fontStyle) === "italic"
                                            ? "bg-[var(--brand)]/24 text-zinc-100"
                                            : "text-zinc-300 hover:bg-white/[0.08]"
                                        }`}
                                      >
                                        <Italic className="size-3.5" strokeWidth={2} aria-hidden />
                                      </button>
                                    </div>
                                  </li>
                                </ul>
                              </DashboardDropdownSurface>
                            </div>,
                            document.body
                          )}
                        <div
                          className="min-h-[44px] rounded-[24px] border border-white/[0.08] bg-white/[0.035] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md"
                          role="toolbar"
                          aria-label="Фон карточки приветствия"
                        >
                          <div className="flex flex-nowrap items-center gap-2 overflow-x-auto [scrollbar-width:thin]">
                            <div
                              className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/[0.22] p-0.5"
                              role="group"
                              aria-label="Режим фона"
                            >
                              <button
                                type="button"
                                aria-label="Сплошной"
                                title="Сплошной"
                                aria-pressed={imageCard.backgroundMode === "solid"}
                                onClick={() =>
                                  setImageCard((c) => ({ ...c, backgroundMode: "solid" }))
                                }
                                className={`inline-flex size-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                  imageCard.backgroundMode === "solid"
                                    ? "bg-white/[0.16] text-zinc-50"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                <PaintBucket className="size-4" strokeWidth={1.75} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label="Градиент"
                                title="Градиент"
                                aria-pressed={imageCard.backgroundMode === "gradient"}
                                onClick={() =>
                                  setImageCard((c) => ({ ...c, backgroundMode: "gradient" }))
                                }
                                className={`inline-flex size-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                  imageCard.backgroundMode === "gradient"
                                    ? "bg-white/[0.16] text-zinc-50"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                <Sparkles className="size-4" strokeWidth={1.75} aria-hidden />
                              </button>
                              <button
                                type="button"
                                aria-label="Изображение"
                                title="Изображение"
                                aria-pressed={imageCard.backgroundMode === "image"}
                                onClick={() =>
                                  setImageCard((c) => ({ ...c, backgroundMode: "image" }))
                                }
                                className={`inline-flex size-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                  imageCard.backgroundMode === "image"
                                    ? "bg-white/[0.16] text-zinc-50"
                                    : "text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                <ImageIcon className="size-4" strokeWidth={1.75} aria-hidden />
                              </button>
                            </div>

                            {imageCard.backgroundMode === "solid" ? (
                              <>
                                <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden />
                                <ColorPopover
                                  label="Цвет фона"
                                  triggerTitle="Цвет фона"
                                  value={imageCard.backgroundColor}
                                  onChange={(hex) =>
                                    setImageCard((c) => ({ ...c, backgroundColor: hex }))
                                  }
                                  avoidRect={imageCardTextBandRect}
                                  zIndex={260}
                                />
                                <label htmlFor="ic-bg-op-solid" className="sr-only">
                                  Непрозрачность фона
                                </label>
                                <span
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-300"
                                  title="Непрозрачность фона"
                                  aria-hidden
                                >
                                  <Droplets className="size-4" strokeWidth={1.8} />
                                </span>
                                <input
                                  id="ic-bg-op-solid"
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Math.round(imageCard.backgroundOpacity * 100)}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setImageCard((c) => ({
                                      ...c,
                                      backgroundOpacity: Math.min(1, Math.max(0, v / 100)),
                                    }));
                                  }}
                                  title={`Непрозрачность фона: ${Math.round(imageCard.backgroundOpacity * 100)}%. Влияет только на слой фона.`}
                                  aria-valuetext={`${Math.round(imageCard.backgroundOpacity * 100)} процентов`}
                                  className="h-1 w-24 shrink-0 cursor-pointer accent-[var(--brand)]"
                                />
                              </>
                            ) : null}

                            {imageCard.backgroundMode === "gradient" ? (
                              <>
                                <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden />
                                <ColorPopover
                                  label="Первый цвет"
                                  triggerTitle="Первый цвет"
                                  value={imageCard.backgroundGradientStartColor}
                                  onChange={(hex) =>
                                    setImageCard((c) => ({
                                      ...c,
                                      backgroundGradientStartColor: hex,
                                      backgroundColor: hex,
                                    }))
                                  }
                                  avoidRect={imageCardTextBandRect}
                                  zIndex={260}
                                />
                                <ColorPopover
                                  label="Второй цвет"
                                  triggerTitle="Второй цвет"
                                  value={imageCard.backgroundGradientEndColor}
                                  onChange={(hex) =>
                                    setImageCard((c) => ({
                                      ...c,
                                      backgroundGradientEndColor: hex,
                                      accentColor: hex,
                                    }))
                                  }
                                  avoidRect={imageCardTextBandRect}
                                  zIndex={260}
                                />
                                <div
                                  className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-black/[0.22] p-0.5"
                                  role="group"
                                  aria-label="Стиль градиента"
                                >
                                  <button
                                    type="button"
                                    aria-pressed={imageCard.backgroundGradientMode === "diagonal"}
                                    aria-label="Наискось"
                                    title="Наискось"
                                    onClick={() =>
                                      setImageCard((c) => ({
                                        ...c,
                                        backgroundGradientMode: "diagonal",
                                      }))
                                    }
                                    className={`inline-flex size-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                      imageCard.backgroundGradientMode === "diagonal"
                                        ? "bg-white/[0.14] text-zinc-50 ring-1 ring-white/20"
                                        : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                                  >
                                    <ArrowDownRight className="size-4" strokeWidth={1.85} aria-hidden />
                                  </button>
                                  <button
                                    type="button"
                                    aria-pressed={imageCard.backgroundGradientMode === "radial"}
                                    aria-label="От центра"
                                    title="От центра"
                                    onClick={() =>
                                      setImageCard((c) => ({
                                        ...c,
                                        backgroundGradientMode: "radial",
                                      }))
                                    }
                                    className={`inline-flex size-8 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
                                      imageCard.backgroundGradientMode === "radial"
                                        ? "bg-white/[0.14] text-zinc-50 ring-1 ring-white/20"
                                        : "text-zinc-400 hover:text-zinc-200"
                                    }`}
                                  >
                                    <CircleDot className="size-4" strokeWidth={1.85} aria-hidden />
                                  </button>
                                </div>
                                <label htmlFor="ic-bg-op-grad" className="sr-only">
                                  Непрозрачность фона
                                </label>
                                <span
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-300"
                                  title="Непрозрачность фона"
                                  aria-hidden
                                >
                                  <Droplets className="size-4" strokeWidth={1.8} />
                                </span>
                                <input
                                  id="ic-bg-op-grad"
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Math.round(imageCard.backgroundOpacity * 100)}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setImageCard((c) => ({
                                      ...c,
                                      backgroundOpacity: Math.min(1, Math.max(0, v / 100)),
                                    }));
                                  }}
                                  title={`Непрозрачность фона: ${Math.round(imageCard.backgroundOpacity * 100)}%`}
                                  aria-valuetext={`${Math.round(imageCard.backgroundOpacity * 100)} процентов`}
                                  className="h-1 w-24 shrink-0 cursor-pointer accent-[var(--brand)]"
                                />
                              </>
                            ) : null}

                            {imageCard.backgroundMode === "image" ? (
                              <>
                                <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden />
                                <ColorPopover
                                  label="Цвет оверлея"
                                  triggerTitle="Цвет оверлея"
                                  value={imageCard.overlayColor}
                                  onChange={(hex) =>
                                    setImageCard((c) => ({ ...c, overlayColor: hex }))
                                  }
                                  avoidRect={imageCardTextBandRect}
                                  zIndex={260}
                                />
                                <label htmlFor="ic-overlay-op" className="sr-only">
                                  Сила оверлея
                                </label>
                                <span
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-300"
                                  title="Сила оверлея"
                                  aria-hidden
                                >
                                  <Layers className="size-4" strokeWidth={1.8} />
                                </span>
                                <input
                                  id="ic-overlay-op"
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Math.round(imageCard.overlayOpacity * 100)}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setImageCard((c) => ({
                                      ...c,
                                      overlayOpacity: Math.min(1, Math.max(0, v / 100)),
                                    }));
                                  }}
                                  title={`Сила оверлея: ${Math.round(imageCard.overlayOpacity * 100)}%`}
                                  aria-valuetext={`${Math.round(imageCard.overlayOpacity * 100)} процентов`}
                                  className="h-1 w-24 shrink-0 cursor-pointer accent-[var(--brand)]"
                                />
                                <label htmlFor="ic-img-op" className="sr-only">
                                  Непрозрачность фона
                                </label>
                                <span
                                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-zinc-300"
                                  title="Непрозрачность фона"
                                  aria-hidden
                                >
                                  <Droplets className="size-4" strokeWidth={1.8} />
                                </span>
                                <input
                                  id="ic-img-op"
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={Math.round(imageCard.backgroundOpacity * 100)}
                                  onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setImageCard((c) => ({
                                      ...c,
                                      backgroundOpacity: Math.min(1, Math.max(0, v / 100)),
                                    }));
                                  }}
                                  title={`Непрозрачность фона: ${Math.round(imageCard.backgroundOpacity * 100)}%`}
                                  aria-valuetext={`${Math.round(imageCard.backgroundOpacity * 100)} процентов`}
                                  className="h-1 w-24 shrink-0 cursor-pointer accent-[var(--brand)]"
                                />
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div
                          className="overflow-hidden bg-zinc-950 shadow-[0_16px_56px_rgba(0,0,0,0.38)] ring-1 ring-white/[0.09]"
                          style={{ borderRadius: IMAGE_CARD_RADIUS_PX }}
                          aria-label="Карточка приветствия"
                        >
                          <div
                            ref={imageCardAspectRef}
                            className="relative aspect-[1200/515] w-full min-h-[140px] overflow-hidden"
                          >
                            {imageCard.backgroundMode === "image" ? (
                              <>
                                <input
                                  ref={imageCardBgFileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={handleImageCardBgFile}
                                />
                                <button
                                  type="button"
                                  disabled={imageCardBgUploadBusy}
                                  title={imageCardHasBackgroundAsset ? "Удалить фон" : "Загрузить фон"}
                                  aria-label={imageCardHasBackgroundAsset ? "Удалить фон" : "Загрузить фон"}
                                  onClick={() => {
                                    if (imageCardHasBackgroundAsset) {
                                      handleImageCardBgRemove();
                                      return;
                                    }
                                    imageCardBgFileInputRef.current?.click();
                                  }}
                                  className="absolute left-2 top-2 z-30 inline-flex size-8 items-center justify-center rounded-full border border-white/[0.14] bg-[rgba(14,14,18,0.55)] text-white/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-[rgba(24,24,32,0.62)] hover:text-white disabled:opacity-45"
                                >
                                  {imageCardBgUploadBusy ? (
                                    <span
                                      className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white/90"
                                      aria-hidden
                                    />
                                  ) : imageCardHasBackgroundAsset ? (
                                    <Trash2 className="size-4" strokeWidth={1.85} aria-hidden />
                                  ) : (
                                    <Upload className="size-4" strokeWidth={1.85} aria-hidden />
                                  )}
                                </button>
                              </>
                            ) : null}
                            <div
                              className="absolute inset-0 z-0"
                              style={IMAGE_CARD_SOLID_PREVIEW_BACKING}
                              aria-hidden
                            />
                            {imageCard.backgroundMode === "image" && imageCardBackgroundPreviewUrl ? (
                              <img
                                src={imageCardBackgroundPreviewUrl}
                                alt=""
                                className="absolute inset-0 z-[1] h-full w-full object-cover"
                                style={{ opacity: imageCard.backgroundOpacity }}
                              />
                            ) : imageCard.backgroundMode === "gradient" ? (
                              <div
                                className="absolute inset-0 z-[1]"
                                style={imageCardGradientPreviewLayerStyle(imageCard)}
                              />
                            ) : (
                              <div
                                className="absolute inset-0 z-[1]"
                                style={{
                                  backgroundColor: imageCard.backgroundColor,
                                  opacity: imageCard.backgroundOpacity,
                                }}
                              />
                            )}
                            {imageCard.backgroundMode === "image" ? (
                              <div
                                className="absolute inset-0 z-[2]"
                                style={{
                                  backgroundColor: imageCard.overlayColor,
                                  opacity: imageCard.overlayOpacity,
                                }}
                                aria-hidden
                              />
                            ) : null}
                            <div className="relative z-10 flex h-full min-h-0 flex-col items-center justify-center px-[4%] py-[3%] text-center">
                              <div
                                ref={imageCardTextBandRef}
                                className="flex w-full flex-col items-center"
                                style={{
                                  maxWidth: imageCardPreviewLayout.textBandMaxWidthPx,
                                  gap: imageCardPreviewLayout.gapAvatarToTextPx,
                                }}
                              >
                                <div
                                  className="shrink-0 overflow-hidden rounded-full ring-2 ring-white/18 shadow-lg shadow-black/30"
                                  style={{
                                    width: imageCardPreviewLayout.avatarDiameterPx,
                                    height: imageCardPreviewLayout.avatarDiameterPx,
                                  }}
                                >
                                  {viewerAvatarUrl ? (
                                    <img
                                      src={viewerAvatarUrl}
                                      alt=""
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="flex h-full w-full items-center justify-center bg-white/[0.12] font-semibold text-zinc-200"
                                      style={{
                                        fontSize: Math.max(
                                          14,
                                          imageCardPreviewLayout.avatarDiameterPx * 0.38
                                        ),
                                      }}
                                    >
                                      {viewerName.slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                                <div
                                  className="flex w-full flex-col"
                                  style={{ gap: imageCardPreviewLayout.gapTitleToSubtitlePx }}
                                >
                                  <div
                                    ref={imageCardTitleFieldWrapRef}
                                    className="group/title w-full max-w-full rounded-xl px-1 py-0.5 transition-[box-shadow,background-color] duration-150 hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] focus-within:bg-white/[0.06] focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                                  >
                                    <textarea
                                      ref={imageCardTitleInputRef}
                                      id="image-card-title-inline"
                                      value={imageCard.title}
                                      onChange={(e) => {
                                        imageCardTitleInsertCaretRef.current = null;
                                        setImageCard((c) => ({ ...c, title: e.target.value }));
                                      }}
                                      onFocus={() => {
                                        setImageCardTypographyOpen(false);
                                        setImageCardActiveField("title");
                                      }}
                                      onBlur={blurImageCardTextField}
                                      rows={1}
                                      spellCheck={false}
                                      className="w-full max-w-full min-w-0 cursor-text resize-none border-0 bg-transparent text-center tracking-[-0.02em] outline-none ring-0 placeholder:text-zinc-500/80 focus:outline-none focus-visible:ring-0"
                                      style={
                                        {
                                          fontFamily: welcomeCardPreviewFontStack(imageCard.fontFamily),
                                          color: imageCard.textColor,
                                          fontSize: imageCardPreviewLayout.titleFontPx,
                                          lineHeight: `${imageCardPreviewLayout.titleLineHeightPx}px`,
                                          fontWeight:
                                            imageCard.titleStyle.fontWeight === "bold" ? 700 : 400,
                                          fontStyle:
                                            imageCard.titleStyle.fontStyle === "italic"
                                              ? "italic"
                                              : "normal",
                                          fieldSizing: "content",
                                        } satisfies CSSProperties
                                      }
                                      placeholder="Заголовок"
                                      autoComplete="off"
                                    />
                                  </div>
                                  <div
                                    ref={imageCardSubtitleFieldWrapRef}
                                    className="group/sub w-full max-w-full rounded-xl px-1 py-0.5 transition-[box-shadow,background-color] duration-150 hover:bg-white/[0.04] hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] focus-within:bg-white/[0.06] focus-within:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]"
                                  >
                                    <textarea
                                      ref={imageCardSubtitleInputRef}
                                      id="image-card-subtitle-inline"
                                      value={imageCard.subtitle}
                                      onChange={(e) => {
                                        imageCardSubtitleInsertCaretRef.current = null;
                                        setImageCard((c) => ({ ...c, subtitle: e.target.value }));
                                      }}
                                      onFocus={() => {
                                        setImageCardTypographyOpen(false);
                                        setImageCardActiveField("subtitle");
                                      }}
                                      onBlur={blurImageCardTextField}
                                      rows={1}
                                      spellCheck={false}
                                      className="w-full max-w-full min-w-0 cursor-text resize-none border-0 bg-transparent text-center outline-none ring-0 placeholder:text-zinc-500/70 focus:outline-none focus-visible:ring-0"
                                      style={{
                                        fontFamily: welcomeCardPreviewFontStack(imageCard.fontFamily),
                                        color: imageCard.textColor,
                                        fontSize: imageCardPreviewLayout.subtitleFontPx,
                                        lineHeight: `${imageCardPreviewLayout.subtitleLineHeightPx}px`,
                                        fontWeight:
                                          imageCard.subtitleStyle.fontWeight === "bold"
                                            ? 700
                                            : 400,
                                        fontStyle:
                                          imageCard.subtitleStyle.fontStyle === "italic"
                                            ? "italic"
                                            : "normal",
                                        fieldSizing: "content",
                                      } satisfies CSSProperties}
                                      placeholder="Подзаголовок"
                                      autoComplete="off"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section
                      data-welcome-block="skip-bots"
                      className="welcome-settings-module px-4 py-4 sm:px-5 sm:py-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="ds-kicker">{welcomeModuleCopy.skipBotAccountsTitle}</p>
                          <p className="welcome-help-text mt-0.5">
                            {welcomeModuleCopy.skipBotAccountsHelp}
                          </p>
                        </div>
                        <CompactSwitch
                          checked={skipBotAccounts}
                          onCheckedChange={setSkipBotAccounts}
                          aria-label={welcomeModuleCopy.skipBotAccountsTitle}
                          title={welcomeModuleCopy.skipBotAccountsTitle}
                        />
                      </div>
                    </section>

                    <div
                      data-welcome-block="test-actions"
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                      role="group"
                      aria-label="Проверка приветствия в канале"
                    >
                      <button
                        type="button"
                        onClick={handleSendTestWelcome}
                        disabled={isSendingTest}
                        aria-label={
                          isSendingTest
                            ? "Отправка тестового сообщения"
                            : "Отправить тестовое приветствие в выбранный канал"
                        }
                        className="inline-flex w-fit shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-[12px] font-medium leading-tight text-zinc-400 shadow-none transition hover:border-white/[0.11] hover:bg-white/[0.05] hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3 shrink-0 opacity-70"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.65"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
                        </svg>
                        {isSendingTest ? "Отправка…" : "Отправить тест"}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:items-end sm:text-right">
                        <p className="text-[11px] font-normal leading-snug text-zinc-500">
                          Проверить, как сообщение выглядит в Discord
                        </p>
                        {testSendStatus ? (
                          <p
                            role="status"
                            className={`max-w-prose text-[11px] font-normal leading-snug sm:ml-auto ${
                              testSendStatusTone === "success"
                                ? "text-emerald-500/85"
                                : testSendStatusTone === "error"
                                  ? "text-rose-400/85"
                                  : "text-zinc-500"
                            }`}
                          >
                            {testSendStatus}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    </div>

                    {pickerPortalReady &&
                      openPicker &&
                      pickerPanelLayout &&
                      (welcomeStyle === "text" ||
                        welcomeStyle === "embed" ||
                        welcomeStyle === "imageCard")
                      ? createPortal(
                          <div
                            className="fixed z-[270] isolation-isolate"
                            style={{
                              left: `${pickerPanelLayout.left}px`,
                              bottom: `${pickerPanelLayout.bottom}px`,
                              width: `${pickerPanelLayout.width}px`,
                            }}
                          >
                            <div
                              ref={pickerPanelRef}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="ds-liquid-list w-full rounded-xl p-2"
                              style={{
                                background: "rgba(18, 22, 36, 0.42)",
                                backdropFilter: "blur(20px)",
                                WebkitBackdropFilter: "blur(20px)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
                              }}
                            >
                              <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={`Поиск: ${getTitleByType(openPicker)}`}
                                className="ds-input mb-2.5 text-sm"
                                aria-label={`Поиск: ${getTitleByType(openPicker)}`}
                              />
                              {openPicker === "emoji" ? (
                                resourcesLoading ? (
                                  <p className="py-8 text-center text-[13px] text-zinc-500">Загрузка…</p>
                                ) : resources.errors?.emojis ? (
                                  <p
                                    className="py-8 text-center text-[13px] text-amber-400/90"
                                    title={resources.errors.emojis}
                                    role="status"
                                  >
                                    Эмодзи не загрузились
                                  </p>
                                ) : pickerItems.length === 0 ? (
                                  <p className="py-8 text-center text-[13px] text-zinc-500">Нет эмодзи</p>
                                ) : (
                                  <div
                                    className="grid grid-cols-7 gap-1 overflow-y-auto p-0.5 pr-1"
                                    style={{
                                      maxHeight: Math.max(
                                        96,
                                        pickerPanelLayout.maxHeight - 80
                                      ),
                                    }}
                                  >
                                    {pickerItems.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        title={item.label}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handlePick(item)}
                                        className="ds-liquid-list-item flex h-9 w-9 items-center justify-center rounded-md text-zinc-200 hover:bg-white/[0.08]"
                                      >
                                        {item.imageUrl ? (
                                          <img
                                            src={item.imageUrl}
                                            alt=""
                                            aria-hidden="true"
                                            className="h-6 w-6 rounded-sm object-cover"
                                          />
                                        ) : (
                                          <span className="text-lg leading-none">{item.label}</span>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )
                              ) : openPicker === "variable" ? (
                                pickerItems.length === 0 ? (
                                  <p className="py-8 text-center text-[13px] text-zinc-500">
                                    Нет переменных
                                  </p>
                                ) : (
                                  <div
                                    className="space-y-0.5 overflow-y-auto p-0.5 pr-0.5"
                                    style={{
                                      maxHeight: Math.max(
                                        96,
                                        pickerPanelLayout.maxHeight - 80
                                      ),
                                    }}
                                    role="listbox"
                                    aria-label="Переменные сообщения"
                                  >
                                    {pickerItems.map((item) => (
                                      <button
                                        key={item.id}
                                        type="button"
                                        role="option"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handlePick(item)}
                                        className="ds-liquid-list-item flex min-h-[2.75rem] w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.08]"
                                      >
                                        {item.variableIcon ? (
                                          <VariablePickerIcon kind={item.variableIcon} />
                                        ) : null}
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[13px] font-normal leading-snug text-zinc-100">
                                            {item.label}
                                          </div>
                                          {item.variableSubtitle ? (
                                            <p className="welcome-help-text mt-0.5">{item.variableSubtitle}</p>
                                          ) : null}
                                        </div>
                                        <code className="mt-0.5 shrink-0 self-start rounded-md border border-white/10 bg-zinc-950/45 px-2 py-1 font-mono text-[10px] leading-none tracking-wide text-zinc-400">
                                          {item.insert}
                                        </code>
                                      </button>
                                    ))}
                                  </div>
                                )
                              ) : resourcesLoading ? (
                                <p className="py-8 text-center text-[13px] text-zinc-500">Загрузка…</p>
                              ) : pickerItems.length === 0 ? (
                                <p className="py-8 text-center text-[13px] text-zinc-500">
                                  {openPicker === "channel" ? "Нет каналов" : "Нет ролей"}
                                </p>
                              ) : (
                                <div
                                  className="space-y-0.5 overflow-y-auto p-0.5"
                                  style={{
                                    maxHeight: Math.max(
                                      96,
                                      pickerPanelLayout.maxHeight - 80
                                    ),
                                  }}
                                >
                                  {pickerItems.map((item) => (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handlePick(item)}
                                      className="ds-liquid-list-item flex min-h-[2.75rem] w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/[0.08]"
                                    >
                                      {openPicker === "channel" ? (
                                        <>
                                          <span className="min-w-0 truncate font-medium text-zinc-100">
                                            #{item.label}
                                          </span>
                                          {item.meta ? (
                                            <span className="welcome-help-text shrink-0 tabular-nums">
                                              {item.meta}
                                            </span>
                                          ) : null}
                                        </>
                                      ) : (
                                        <span className="flex min-w-0 items-center gap-2.5">
                                          <span
                                            className="h-2 w-2 shrink-0 rounded-full ring-1 ring-white/25"
                                            style={{
                                              backgroundColor: discordRoleDotFill(item.roleColor),
                                            }}
                                            aria-hidden
                                          />
                                          <span className="truncate text-zinc-100">{item.label}</span>
                                        </span>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>,
                          document.body
                        )
                      : null}

                    {!welcomeEnabled ? (
                      <>
                        <button
                          type="button"
                          className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(9,9,15,0.96)]"
                          aria-label={welcomeModuleCopy.welcomeDisabledOverlayHint}
                          onClick={() => setWelcomeEnabled(true)}
                        />
                        <div
                          className="pointer-events-none absolute left-1/2 top-1/2 z-[6] max-w-[min(92%,17.5rem)] -translate-x-1/2 -translate-y-1/2 px-3"
                          role="status"
                        >
                          <p
                            className="rounded-2xl px-3 py-1.5 text-center text-[12px] font-medium leading-snug tracking-[-0.01em] text-zinc-100/90"
                            style={{
                              background: "rgba(28, 26, 36, 0.42)",
                              backdropFilter: "blur(14px) saturate(150%)",
                              WebkitBackdropFilter: "blur(14px) saturate(150%)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                            }}
                          >
                            {welcomeModuleCopy.welcomeDisabledOverlayHint}
                          </p>
                        </div>
                      </>
                    ) : null}
                    </div>
                  </CollapsibleSettingsSection>
                ) : activeSection === "autoRoles" ? (
                  <CollapsibleSettingsSection
                    sectionId="autoroles-settings"
                    headingDomId="section-heading"
                    title={activeSectionMeta.heading}
                    subtitle={activeSectionMeta.subtitle}
                    defaultOpen
                  >
                    <div className="space-y-5">
                      {!resourcesLoading && resources.errors?.roles ? (
                        <p
                          className="text-xs text-amber-400/90"
                          title={resources.errors.roles}
                          role="status"
                        >
                          Роли не загрузились
                        </p>
                      ) : null}
                      <div>
                        <p className="ds-kicker mb-2">Роль для участников</p>
                        <CustomSelect
                          value={humanRoleId}
                          options={roleOptions}
                          placeholder="Не выбрана"
                          onChange={setHumanRoleId}
                          ariaLabel="Роль для участников"
                        />
                      </div>
                      <div>
                        <p className="ds-kicker mb-2">Роль для ботов</p>
                        <CustomSelect
                          value={botRoleId}
                          options={roleOptions}
                          placeholder="Не выбрана"
                          onChange={setBotRoleId}
                          ariaLabel="Роль для ботов"
                        />
                      </div>
                    </div>
                  </CollapsibleSettingsSection>
                ) : null}
              </div>
            </div>
          </section>
        </div>

      </div>

      {isDirty ? (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-5 z-[220] flex justify-center px-3"
          role="presentation"
        >
          <div
            role="region"
            aria-label="Есть несохранённые изменения"
            className="pointer-events-auto max-w-[calc(100vw-1.5rem)]"
          >
            <div
              ref={unsavedBarAnimRef}
              className="inline-flex items-center gap-3 rounded-full px-3.5 py-2 sm:gap-4 sm:px-4 sm:py-2.5"
              style={{
                background: "rgba(22, 22, 28, 0.78)",
                backdropFilter: "blur(18px) saturate(140%)",
                WebkitBackdropFilter: "blur(18px) saturate(140%)",
                border: "1px solid rgba(255,255,255,0.11)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.12), 0 10px 28px rgba(0,0,0,0.35)",
                borderRadius: "9999px",
              }}
            >
      <p className="shrink-0 text-sm font-medium text-zinc-300/95">
        Есть несохранённые изменения
      </p>

      <div className="flex items-center gap-2.5">
      <button
  type="button"
  onClick={handleRevertChanges}
  disabled={isSaving}
  aria-label="Отменить изменения"
  title="Отменить изменения"
  className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/6 text-zinc-300 transition hover:bg-white/10 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
>
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    className="h-4 w-4"
    fill="none"
  >
    <path
      d="M4.25 4.25 11.75 11.75M11.75 4.25 4.25 11.75"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
  </svg>
</button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-label={isSaving ? "Сохранение..." : "Сохранить"}
          title={isSaving ? "Сохранение..." : "Сохранить"}
          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-400/22 text-white transition hover:bg-emerald-400/32 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="h-4 w-4"
            fill="none"
          >
            <path
              d="M3.5 8.25 6.5 11.25 12.5 5.25"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

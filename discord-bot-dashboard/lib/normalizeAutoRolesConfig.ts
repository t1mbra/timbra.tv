import type { AutoRoleDelayUnit, GuildConfig } from "@/lib/persistence/configTypes";

const SNOWFLAKE_RE = /^\d{17,20}$/;

function isDelayUnit(raw: string): raw is AutoRoleDelayUnit {
  return raw === "seconds" || raw === "minutes" || raw === "hours" || raw === "days";
}

function parseSnowflakeList(raw: unknown, guildId: string): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const t = x.trim();
    if (!SNOWFLAKE_RE.test(t) || t === guildId) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function nonEmptySnowflake(raw: unknown): raw is string {
  return typeof raw === "string" && SNOWFLAKE_RE.test(raw.trim());
}

/**
 * Нормализация полей авто-ролей для ответа API и единообразного UI.
 * Совместимость: humanRoleId / botRoleId → массивы, если массивы пусты.
 */
export function normalizeAutoRolesOnRead(
  gc: Partial<GuildConfig> | undefined,
  guildId: string
): Pick<
  GuildConfig,
  | "autoRolesEnabled"
  | "memberRoleIds"
  | "waitForMembershipScreening"
  | "memberDelayEnabled"
  | "memberDelayValue"
  | "memberDelayUnit"
  | "botAutoRolesEnabled"
  | "botUseSeparateRoles"
  | "botRoleIds"
  | "botDelayEnabled"
  | "botDelayValue"
  | "botDelayUnit"
> {
  let memberRoleIds = parseSnowflakeList(gc?.memberRoleIds, guildId);
  if (memberRoleIds.length === 0 && nonEmptySnowflake(gc?.humanRoleId)) {
    const h = gc!.humanRoleId!.trim();
    if (h !== guildId) memberRoleIds = [h];
  }

  let botRoleIds = parseSnowflakeList(gc?.botRoleIds, guildId);
  if (botRoleIds.length === 0 && nonEmptySnowflake(gc?.botRoleId)) {
    const b = gc!.botRoleId!.trim();
    if (b !== guildId) botRoleIds = [b];
  }

  const hasLegacyHuman =
    nonEmptySnowflake(gc?.humanRoleId) && gc!.humanRoleId!.trim() !== guildId;
  const hasLegacyBot =
    nonEmptySnowflake(gc?.botRoleId) && gc!.botRoleId!.trim() !== guildId;

  const autoRolesEnabled =
    gc?.autoRolesEnabled === false
      ? false
      : gc?.autoRolesEnabled === true
        ? true
        : Boolean(hasLegacyHuman || memberRoleIds.length > 0);

  // Важно: роли ботов из legacy остаются в данных, но не включают авто-выдачу сами по себе.
  const botAutoRolesEnabled = gc?.botAutoRolesEnabled === true;

  const botUseSeparateRoles =
    gc && "botUseSeparateRoles" in gc
      ? gc.botUseSeparateRoles === true
      : memberRoleIds.length === 0 && botRoleIds.length > 0
        ? true
        : Boolean(
            hasLegacyBot &&
              hasLegacyHuman &&
              gc?.humanRoleId?.trim() !== gc?.botRoleId?.trim()
          );

  const memberDelayUnitRaw =
    typeof gc?.memberDelayUnit === "string" ? gc.memberDelayUnit.trim().toLowerCase() : "";
  const memberDelayUnit: AutoRoleDelayUnit = isDelayUnit(memberDelayUnitRaw)
    ? memberDelayUnitRaw
    : "seconds";

  const botDelayUnitRaw =
    typeof gc?.botDelayUnit === "string" ? gc.botDelayUnit.trim().toLowerCase() : "";
  const botDelayUnit: AutoRoleDelayUnit = isDelayUnit(botDelayUnitRaw)
    ? botDelayUnitRaw
    : "seconds";

  let memberDelayValue =
    typeof gc?.memberDelayValue === "number" && Number.isFinite(gc.memberDelayValue)
      ? Math.max(1, Math.floor(gc.memberDelayValue))
      : 1;
  let botDelayValue =
    typeof gc?.botDelayValue === "number" && Number.isFinite(gc.botDelayValue)
      ? Math.max(1, Math.floor(gc.botDelayValue))
      : 1;

  return {
    autoRolesEnabled,
    memberRoleIds,
    waitForMembershipScreening: gc?.waitForMembershipScreening === true,
    memberDelayEnabled: gc?.memberDelayEnabled === true,
    memberDelayValue,
    memberDelayUnit,
    botAutoRolesEnabled,
    botUseSeparateRoles,
    botRoleIds,
    botDelayEnabled: gc?.botDelayEnabled === true,
    botDelayValue,
    botDelayUnit,
  };
}

import type { Tables } from "./database.types";

type Profile = Tables<"profiles">;

export function isAppOwner(profile: Profile | null | undefined): boolean {
  return profile?.role === "owner";
}

/** Coach und Owner nutzen dieselbe Coach-Oberfläche und -Berechtigungen. */
export function isCoachRole(profile: Profile | null | undefined): boolean {
  return profile?.role === "coach" || profile?.role === "owner";
}

export function hasCoachAccess(profile: Profile | null | undefined): boolean {
  return isCoachRole(profile) || profile?.coach_enabled === true;
}

export function displayRoleLabel(role: Profile["role"] | undefined): string {
  if (role === "owner") return "Owner";
  if (role === "coach") return "Coach";
  if (role === "athlet") return "Athlet";
  return "User";
}

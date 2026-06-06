import type { Tables } from "./database.types";

type Profile = Tables<"profiles">;

export function isAppOwner(profile: Profile | null | undefined): boolean {
  return profile?.role === "owner";
}

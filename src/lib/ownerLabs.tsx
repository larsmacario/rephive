import { useCallback, useEffect, useState } from "react";
import type { Tables } from "./database.types";
import {
  type OwnerLabFlags,
  patchOwnerLabFlags,
  readOwnerLabFlags,
  writeOwnerLabFlags,
} from "./ownerLabs";

export function useOwnerLabs(_profile: Tables<"profiles"> | null | undefined) {
  const [flags, setFlags] = useState<OwnerLabFlags>(() => readOwnerLabFlags());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("rephive:labs:")) setFlags(readOwnerLabFlags());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateFlags = useCallback((patch: Partial<OwnerLabFlags>) => {
    const next = patchOwnerLabFlags(patch);
    setFlags(next);
    return next;
  }, []);

  const resetFlags = useCallback(() => {
    writeOwnerLabFlags({ frictionKillerTurbo: false });
    setFlags(readOwnerLabFlags());
  }, []);

  return { flags, updateFlags, resetFlags };
}

import { useCallback, useEffect, useState } from "react";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { getSyncPendingCount, processSyncQueue } from "../lib/db";
import { useNetwork } from "../lib/offline/networkStatus";
import { MButton } from "./MButton";
import { SyncStatusSheet } from "./SyncStatusSheet";

export function OfflineBanner() {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const refreshPending = useCallback(async () => {
    if (!user) {
      setPending(0);
      return;
    }
    setPending(await getSyncPendingCount(user.id));
  }, [user]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending, isOnline]);

  const handleSync = async () => {
    if (!user || !isOnline || syncing) return;
    setSyncing(true);
    try {
      await processSyncQueue(user.id);
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  };

  if (!user) return null;
  if (isOnline && pending === 0) return null;

  const label = !isOnline
    ? pending > 0
      ? `Offline · ${pending} ausstehend`
      : "Offline · Nur Lesen & Tracken"
    : `${pending} ausstehende Sync${pending === 1 ? "" : "s"}`;

  return (
    <>
      <div
        style={{
          margin: "0 22px 8px",
          padding: "8px 12px",
          borderRadius: 10,
          background: M.card,
          border: `1px solid ${M.line2}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          style={{
            flex: 1,
            textAlign: "left",
            background: "none",
            border: "none",
            padding: 0,
            color: M.mut,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {label}
        </button>
        {isOnline && pending > 0 && (
          <MButton variant="ghost" size="sm" onClick={() => void handleSync()} loading={syncing}>
            Sync
          </MButton>
        )}
      </div>
      <SyncStatusSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        pendingCount={pending}
        onSynced={() => void refreshPending()}
      />
    </>
  );
}

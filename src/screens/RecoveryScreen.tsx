import { useMemo, useState } from "react";
import { M } from "../theme";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { ProductLogSheet } from "../components/ProductLogSheet";
import { ProteinPresetLogSheet } from "../components/ProteinPresetLogSheet";
import { ManualProteinLogSheet } from "../components/ManualProteinLogSheet";
import { useAuth } from "../lib/auth";
import {
  deleteProteinLog,
  sumProteinToday,
  useProteinLogsToday,
  useRecentFoodProducts,
  type ProteinLog,
} from "../lib/db";
import { RECOVERY_FOOD_PRESETS, type RecoveryFoodPreset } from "../lib/recoveryEngine";
import { useRecoveryTarget } from "../lib/recoveryTarget";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { ScreenBackHeader } from "../components/ScreenScroll";

export interface RecoveryScreenProps {
  onBack: () => void;
}

function formatTimeDe(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatLogLine(log: ProteinLog): string {
  const proteinPart = `${log.proteinG} g Protein`;
  if (log.amountG && log.amountG > 0) {
    return `${log.label ?? "Protein"} · ${proteinPart} (${Math.round(log.amountG)} g)`;
  }
  return `${log.label ?? "Protein"} · ${proteinPart}`;
}

function ProgressRing({ logged, target }: { logged: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((logged / target) * 100)) : 0;
  const size = 160;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={M.line2}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={M.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
      </svg>
      <div
        style={{
          marginTop: -size + 8,
          height: size - 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: M.disp, fontSize: 36, fontWeight: 700, lineHeight: 1 }}>
          {logged}
        </div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 600, marginTop: 4 }}>
          von ~{target} g
        </div>
      </div>
    </div>
  );
}

export function RecoveryScreen({ onBack }: RecoveryScreenProps) {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const { data: logs, loading, error, reload } = useProteinLogsToday(refreshKey);
  const { data: recentProducts } = useRecentFoodProducts(refreshKey);
  const { proteinTargetG, needsWeightHint, loading: targetLoading } = useRecoveryTarget();
  const [deleteTarget, setDeleteTarget] = useState<ProteinLog | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{ title: string; message: string } | null>(null);
  const [activePreset, setActivePreset] = useState<RecoveryFoodPreset | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [productSheetEan, setProductSheetEan] = useState<string | undefined>();

  const loggedToday = useMemo(() => sumProteinToday(logs ?? []), [logs]);
  const remainingG = Math.max(0, proteinTargetG - loggedToday);

  const handleReload = () => {
    setRefreshKey((k) => k + 1);
    reload();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteProteinLog(deleteTarget.id);
      setDeleteTarget(null);
      handleReload();
    } catch (e) {
      setAlertSheet({
        title: "Fehler",
        message: e instanceof Error ? e.message : "Eintrag konnte nicht gelöscht werden.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title="RECOVERY" />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: `0 22px ${SCROLL_BOTTOM_PADDING}px`,
        }}
      >
        {loading || targetLoading ? (
          <div style={{ color: M.mut, fontSize: 14, padding: "24px 0" }}>Laden…</div>
        ) : error ? (
          <div style={{ color: "#ef4444", fontSize: 14, padding: "24px 0" }}>{error}</div>
        ) : (
          <>
            <div style={{ padding: "8px 0 20px", display: "flex", justifyContent: "center" }}>
              <ProgressRing logged={loggedToday} target={proteinTargetG} />
            </div>

            <p style={{ margin: "0 0 16px", fontSize: 14, color: M.mut, textAlign: "center", lineHeight: 1.5 }}>
              Dein Ziel: ~{proteinTargetG} g Protein pro Tag
              {remainingG > 0 ? ` · noch ~${remainingG} g offen` : " · Ziel erreicht"}
            </p>

            {needsWeightHint ? (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut2, textAlign: "center" }}>
                Tipp: Gewicht in Körperwerten eintragen für ein genaueres Ziel.
              </p>
            ) : null}

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              <MButton
                type="button"
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  setProductSheetEan(undefined);
                  setProductSheetOpen(true);
                }}
                style={{ borderRadius: 14 }}
              >
                Produkt scannen
              </MButton>
              <MButton
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setManualOpen(true)}
                style={{ borderRadius: 14 }}
              >
                Protein manuell
              </MButton>
            </div>

            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              HÄUFIG
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: recentProducts?.length ? 16 : 20 }}>
              {RECOVERY_FOOD_PRESETS.map((preset) => (
                <MButton
                  key={preset.id}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setActivePreset(preset)}
                  style={{ borderRadius: 999, padding: "8px 14px" }}
                >
                  {preset.label}
                </MButton>
              ))}
            </div>

            {recentProducts?.length ? (
              <>
                <div
                  style={{
                    fontSize: 13,
                    letterSpacing: 1.2,
                    color: M.mut,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  ZULETZT
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                  {recentProducts.map((product) => (
                    <MButton
                      key={product.ean}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setProductSheetEan(product.ean);
                        setProductSheetOpen(true);
                      }}
                      style={{ borderRadius: 999, padding: "8px 14px" }}
                    >
                      {product.name}
                    </MButton>
                  ))}
                </div>
              </>
            ) : null}

            <div
              style={{
                fontSize: 13,
                letterSpacing: 1.2,
                color: M.mut,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              HEUTE
            </div>

            {!logs?.length ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 14,
                  background: M.card,
                  border: "1px solid " + M.line2,
                  fontSize: 14,
                  color: M.mut,
                  lineHeight: 1.5,
                }}
              >
                Noch nichts geloggt — nach dem Training erinnert dich RepHive.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: M.card,
                      border: "1px solid " + M.line2,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{formatLogLine(log)}</div>
                      <div style={{ fontSize: 13, color: M.mut, marginTop: 2 }}>
                        {formatTimeDe(log.loggedAt)}
                      </div>
                    </div>
                    <MButton
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Eintrag löschen"
                      onClick={() => setDeleteTarget(log)}
                      style={{ width: 36, height: 36, borderRadius: 10 }}
                    >
                      <Icon name="trash" size={16} color={M.mut} stroke={2} />
                    </MButton>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen?"
        message={deleteTarget ? `${formatLogLine(deleteTarget)} wirklich entfernen?` : ""}
        busy={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <AlertSheet
        open={!!alertSheet}
        title={alertSheet?.title ?? ""}
        message={alertSheet?.message ?? ""}
        onClose={() => setAlertSheet(null)}
      />
      {user ? (
        <>
          <ProductLogSheet
            open={productSheetOpen}
            onClose={() => setProductSheetOpen(false)}
            onSaved={handleReload}
            userId={user.id}
            initialEan={productSheetEan}
          />
          <ProteinPresetLogSheet
            open={!!activePreset}
            preset={activePreset}
            onClose={() => setActivePreset(null)}
            onSaved={handleReload}
            userId={user.id}
            logSource="quick"
          />
          <ManualProteinLogSheet
            open={manualOpen}
            onClose={() => setManualOpen(false)}
            onSaved={handleReload}
            userId={user.id}
          />
        </>
      ) : null}
    </div>
  );
}

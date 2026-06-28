import { useMemo, useState } from "react";
import { AlertSheet } from "../components/AlertSheet";
import { DeleteConfirmDialog } from "../components/DeleteConfirmDialog";
import { Icon } from "../components/Icon";
import { MButton } from "../components/MButton";
import { ManualProteinLogSheet } from "../components/ManualProteinLogSheet";
import { ProteinPresetLogSheet } from "../components/ProteinPresetLogSheet";
import { ScreenBackHeader } from "../components/ScreenScroll";
import { WaterAmountSheet } from "../components/WaterAmountSheet";
import { WaterQuickAmountsSheet } from "../components/WaterQuickAmountsSheet";
import { WaterTargetSheet } from "../components/WaterTargetSheet";
import { useAuth } from "../lib/auth";
import {
  createWaterLog,
  deleteProteinLog,
  deleteWaterLog,
  sumProteinToday,
  sumWaterToday,
  useProteinLogsToday,
  useWaterLogsLastSevenDays,
  useWaterLogsToday,
  type ProteinLog,
  type WaterLog,
} from "../lib/db";
import {
  aggregateWaterLastSevenDays,
  formatWaterAmount,
} from "../lib/hydration";
import { usePreferences } from "../lib/preferences";
import { RECOVERY_FOOD_PRESETS, type RecoveryFoodPreset } from "../lib/recoveryEngine";
import { useRecoveryTargets } from "../lib/recoveryTarget";
import { SCROLL_BOTTOM_PADDING } from "../lib/responsive";
import { M } from "../theme";

export type RecoverySection = "protein" | "water";

export interface RecoveryScreenProps {
  onBack: () => void;
  initialSection?: RecoverySection;
}

type DeleteTarget =
  | { kind: "protein"; log: ProteinLog }
  | { kind: "water"; log: WaterLog };

function formatTimeDe(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function formatProteinLog(log: ProteinLog): string {
  const proteinPart = `${log.proteinG} g Protein`;
  return log.amountG && log.amountG > 0
    ? `${log.label ?? "Protein"} · ${proteinPart} (${Math.round(log.amountG)} g)`
    : `${log.label ?? "Protein"} · ${proteinPart}`;
}

function ProgressRing({
  logged,
  target,
  valueLabel,
  targetLabel,
}: {
  logged: number;
  target: number;
  valueLabel: string;
  targetLabel: string;
}) {
  const pct = target > 0 ? Math.min(100, (logged / target) * 100) : 0;
  const size = 160;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={M.line2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={M.brand}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (pct / 100) * circumference}
          style={{ transition: "stroke-dashoffset 0.35s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontFamily: M.disp, fontSize: 34, fontWeight: 700, lineHeight: 1 }}>{valueLabel}</div>
        <div style={{ fontSize: 13, color: M.mut, fontWeight: 600, marginTop: 4 }}>
          von {targetLabel}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700, marginBottom: 10 }}>
      {children}
    </div>
  );
}

export function RecoveryScreen({ onBack, initialSection = "protein" }: RecoveryScreenProps) {
  const { user } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const [section, setSection] = useState<RecoverySection>(initialSection);
  const [proteinRefreshKey, setProteinRefreshKey] = useState(0);
  const [waterRefreshKey, setWaterRefreshKey] = useState(0);
  const proteinQuery = useProteinLogsToday(proteinRefreshKey);
  const waterTodayQuery = useWaterLogsToday(waterRefreshKey);
  const waterWeekQuery = useWaterLogsLastSevenDays(waterRefreshKey);
  const targets = useRecoveryTargets();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [quickBusy, setQuickBusy] = useState(false);
  const [alertSheet, setAlertSheet] = useState<{ title: string; message: string } | null>(null);
  const [activePreset, setActivePreset] = useState<RecoveryFoodPreset | null>(null);
  const [manualProteinOpen, setManualProteinOpen] = useState(false);
  const [manualWaterOpen, setManualWaterOpen] = useState(false);
  const [waterTargetOpen, setWaterTargetOpen] = useState(false);
  const [quickAmountsOpen, setQuickAmountsOpen] = useState(false);

  const proteinToday = useMemo(() => sumProteinToday(proteinQuery.data ?? []), [proteinQuery.data]);
  const waterToday = useMemo(() => sumWaterToday(waterTodayQuery.data ?? []), [waterTodayQuery.data]);
  const waterDays = useMemo(
    () => aggregateWaterLastSevenDays(waterWeekQuery.data ?? []),
    [waterWeekQuery.data],
  );

  const reloadProtein = () => {
    setProteinRefreshKey((key) => key + 1);
    proteinQuery.reload();
  };

  const reloadWater = () => {
    setWaterRefreshKey((key) => key + 1);
    waterTodayQuery.reload();
    waterWeekQuery.reload();
  };

  const addWater = async (amountMl: number) => {
    if (!user || quickBusy) return;
    setQuickBusy(true);
    try {
      await createWaterLog(user.id, { amountMl, source: "quick" });
      reloadWater();
    } catch (cause) {
      setAlertSheet({
        title: "Speichern fehlgeschlagen",
        message: cause instanceof Error ? cause.message : "Wasser konnte nicht gespeichert werden.",
      });
    } finally {
      setQuickBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (deleteTarget.kind === "protein") {
        await deleteProteinLog(deleteTarget.log.id);
        reloadProtein();
      } else {
        await deleteWaterLog(deleteTarget.log.id);
        reloadWater();
      }
      setDeleteTarget(null);
    } catch (cause) {
      setAlertSheet({
        title: "Fehler",
        message: cause instanceof Error ? cause.message : "Eintrag konnte nicht gelöscht werden.",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  const selectedLoading =
    targets.loading ||
    (section === "protein" ? proteinQuery.loading : waterTodayQuery.loading || waterWeekQuery.loading);
  const selectedError = section === "protein" ? proteinQuery.error : waterTodayQuery.error || waterWeekQuery.error;
  const proteinRemaining = Math.max(0, targets.proteinTargetG - proteinToday);
  const waterRemaining = Math.max(0, targets.waterTargetMl - waterToday);
  const maxWaterChart = Math.max(targets.waterTargetMl, ...waterDays.map((day) => day.amountMl), 1);

  const deleteMessage = deleteTarget
    ? deleteTarget.kind === "protein"
      ? `${formatProteinLog(deleteTarget.log)} wirklich entfernen?`
      : `${formatWaterAmount(deleteTarget.log.amountMl)} wirklich entfernen?`
    : "";

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <ScreenBackHeader onBack={onBack} title="RECOVERY" />
      <div style={{ padding: "0 22px 16px", flexShrink: 0 }}>
        <div role="tablist" aria-label="Recovery-Bereich" style={{ display: "flex", gap: 4, padding: 4, borderRadius: 14, background: M.card }}>
          {(["protein", "water"] as const).map((item) => (
            <MButton
              key={item}
              type="button"
              role="tab"
              aria-selected={section === item}
              variant={section === item ? "primary" : "ghost"}
              size="sm"
              onClick={() => setSection(item)}
              style={{ flex: 1, borderRadius: 10 }}
            >
              <Icon name={item === "protein" ? "flame" : "droplet"} size={15} stroke={2} />
              {item === "protein" ? "Protein" : "Wasser"}
            </MButton>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: `0 22px ${SCROLL_BOTTOM_PADDING}px` }}>
        {selectedLoading ? (
          <div style={{ color: M.mut, fontSize: 14, padding: "24px 0" }}>Laden…</div>
        ) : selectedError ? (
          <div style={{ color: "#ef4444", fontSize: 14, padding: "24px 0" }}>{selectedError}</div>
        ) : section === "protein" ? (
          <>
            <div style={{ padding: "8px 0 20px", display: "flex", justifyContent: "center" }}>
              <ProgressRing logged={proteinToday} target={targets.proteinTargetG} valueLabel={String(proteinToday)} targetLabel={`${targets.proteinTargetG} g`} />
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: M.mut, textAlign: "center", lineHeight: 1.5 }}>
              Dein Ziel: ~{targets.proteinTargetG} g Protein pro Tag
              {proteinRemaining > 0 ? ` · noch ~${proteinRemaining} g offen` : " · Ziel erreicht"}
            </p>
            {targets.needsWeightHint ? (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut2, textAlign: "center" }}>
                Tipp: Gewicht in Körperwerten eintragen für ein genaueres Ziel.
              </p>
            ) : null}
            <MButton type="button" variant="primary" size="md" fullWidth onClick={() => setManualProteinOpen(true)} style={{ borderRadius: 14, marginBottom: 20 }}>
              Protein tracken
            </MButton>
            <SectionLabel>HÄUFIG</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {RECOVERY_FOOD_PRESETS.map((preset) => (
                <MButton key={preset.id} type="button" variant="secondary" size="sm" onClick={() => setActivePreset(preset)} style={{ borderRadius: 999, padding: "8px 14px" }}>
                  {preset.label}
                </MButton>
              ))}
            </div>
            <SectionLabel>HEUTE</SectionLabel>
            {!proteinQuery.data?.length ? (
              <div style={{ padding: 16, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, fontSize: 14, color: M.mut, lineHeight: 1.5 }}>
                Noch nichts geloggt — nach dem Training erinnert dich RepHive.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {proteinQuery.data.map((log) => (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{formatProteinLog(log)}</div>
                      <div style={{ fontSize: 13, color: M.mut, marginTop: 2 }}>{formatTimeDe(log.loggedAt)}</div>
                    </div>
                    <MButton type="button" variant="ghost" size="icon" aria-label="Protein-Eintrag löschen" onClick={() => setDeleteTarget({ kind: "protein", log })} style={{ width: 36, height: 36, borderRadius: 10 }}>
                      <Icon name="trash" size={16} color={M.mut} stroke={2} />
                    </MButton>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ padding: "8px 0 20px", display: "flex", justifyContent: "center" }}>
              <ProgressRing logged={waterToday} target={targets.waterTargetMl} valueLabel={formatWaterAmount(waterToday)} targetLabel={formatWaterAmount(targets.waterTargetMl)} />
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 16 }}>
              <span style={{ fontSize: 14, color: M.mut }}>
                {waterRemaining > 0 ? `Noch ${formatWaterAmount(waterRemaining)} offen` : "Tagesziel erreicht"}
              </span>
              <MButton type="button" variant="ghost" size="sm" onClick={() => setWaterTargetOpen(true)} style={{ padding: "4px 7px", color: M.brand }}>
                Ziel ändern
              </MButton>
            </div>
            {targets.waterNeedsWeightHint ? (
              <p style={{ margin: "0 0 16px", fontSize: 13, color: M.mut2, textAlign: "center" }}>
                2,5-l-Fallback aktiv · Gewicht eintragen für ein genaueres Ziel.
              </p>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 13, letterSpacing: 1.2, color: M.mut, fontWeight: 700 }}>
                SCHNELL HINZUFÜGEN
              </div>
              <MButton type="button" variant="ghost" size="sm" onClick={() => setQuickAmountsOpen(true)} style={{ padding: "4px 7px", color: M.brand }}>
                Anpassen
              </MButton>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 10 }}>
              {preferences.waterQuickAmountsMl.map((amountMl, index) => (
                <MButton key={`${index}-${amountMl}`} type="button" variant="secondary" size="md" disabled={quickBusy} onClick={() => void addWater(amountMl)}>
                  +{amountMl} ml
                </MButton>
              ))}
            </div>
            <MButton type="button" variant="primary" size="md" fullWidth onClick={() => setManualWaterOpen(true)} style={{ borderRadius: 14, marginBottom: 22 }}>
              Andere Menge
            </MButton>
            <SectionLabel>LETZTE 7 TAGE</SectionLabel>
            <div style={{ padding: "14px 12px 12px", borderRadius: 16, background: M.card, border: `1px solid ${M.line2}`, marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 96 }}>
                {waterDays.map((day) => {
                  const reached = day.amountMl >= targets.waterTargetMl;
                  return (
                    <div key={day.dateKey} style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div title={formatWaterAmount(day.amountMl)} style={{ width: "100%", height: 70, display: "flex", alignItems: "flex-end" }}>
                        <div style={{ width: "100%", height: `${day.amountMl ? Math.max(6, (day.amountMl / maxWaterChart) * 70) : 3}px`, borderRadius: 5, background: reached ? M.brand : day.amountMl ? M.brandSoft : M.line }} />
                      </div>
                      <span style={{ fontSize: 12, color: day.dateKey === waterDays[6]?.dateKey ? M.fg : M.mut2, fontWeight: 700 }}>{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <SectionLabel>HEUTE</SectionLabel>
            {!waterTodayQuery.data?.length ? (
              <div style={{ padding: 16, borderRadius: 14, background: M.card, border: `1px solid ${M.line2}`, fontSize: 14, color: M.mut }}>
                Noch kein Wasser eingetragen.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {waterTodayQuery.data.map((log) => (
                  <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: M.card, border: `1px solid ${M.line2}` }}>
                    <Icon name="droplet" size={18} color={M.brand} stroke={2} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: M.fg }}>{formatWaterAmount(log.amountMl)}</div>
                      <div style={{ fontSize: 13, color: M.mut, marginTop: 2 }}>{formatTimeDe(log.loggedAt)}</div>
                    </div>
                    <MButton type="button" variant="ghost" size="icon" aria-label="Wasser-Eintrag löschen" onClick={() => setDeleteTarget({ kind: "water", log })} style={{ width: 36, height: 36, borderRadius: 10 }}>
                      <Icon name="trash" size={16} color={M.mut} stroke={2} />
                    </MButton>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <DeleteConfirmDialog open={!!deleteTarget} title="Eintrag löschen?" message={deleteMessage} busy={deleteBusy} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
      <AlertSheet open={!!alertSheet} title={alertSheet?.title ?? ""} message={alertSheet?.message ?? ""} onClose={() => setAlertSheet(null)} />
      {user ? (
        <>
          <ProteinPresetLogSheet open={!!activePreset} preset={activePreset} onClose={() => setActivePreset(null)} onSaved={reloadProtein} userId={user.id} logSource="quick" />
          <ManualProteinLogSheet open={manualProteinOpen} onClose={() => setManualProteinOpen(false)} onSaved={reloadProtein} userId={user.id} />
          <WaterAmountSheet open={manualWaterOpen} onClose={() => setManualWaterOpen(false)} onSaved={reloadWater} userId={user.id} />
          <WaterTargetSheet
            open={waterTargetOpen}
            targetMl={targets.waterTargetMl}
            onClose={() => setWaterTargetOpen(false)}
            onSave={(waterTargetMl) => updatePreferences({ waterTargetMl }, true)}
          />
          <WaterQuickAmountsSheet
            open={quickAmountsOpen}
            amountsMl={preferences.waterQuickAmountsMl}
            onClose={() => setQuickAmountsOpen(false)}
            onSave={(waterQuickAmountsMl) => updatePreferences({ waterQuickAmountsMl }, true)}
          />
        </>
      ) : null}
    </div>
  );
}

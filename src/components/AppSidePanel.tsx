import { AnimatePresence, motion } from "framer-motion";
import { M } from "../theme";
import { useAuth } from "../lib/auth";
import { useBreakpoint } from "../lib/responsive";
import { Icon } from "./Icon";
import { MButton } from "./MButton";

export interface AppSidePanelProps {
  open: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenHistory: () => void;
  onOpenStats: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onOpenSupport: () => void;
  onOpenExercises?: () => void;
}

type PanelItem = { label: string; onClick: () => void; external?: boolean };

export function AppSidePanel({
  open,
  onClose,
  onOpenProfile,
  onOpenHistory,
  onOpenStats,
  onOpenSettings,
  onOpenAbout,
  onOpenSupport,
  onOpenExercises,
}: AppSidePanelProps) {
  const { profile, signOut } = useAuth();
  const breakpoint = useBreakpoint();
  const isDesktop = breakpoint === "desktop";
  const displayName = profile?.display_name ?? "Athlet";

  const runFromMenu = (action: () => void) => {
    onClose();
    action();
  };

  const legalBaseUrl = (import.meta.env.VITE_LEGAL_BASE_URL ?? "https://rephive.app").replace(/\/$/, "");

  const openExternalLegal = (path: string) => {
    onClose();
    window.open(`${legalBaseUrl}${path}`, "_blank", "noopener,noreferrer");
  };

  const panelSections: { title: string; items: PanelItem[] }[] = [
    {
      title: "KONTO",
      items: [
        { label: "Profil", onClick: () => runFromMenu(onOpenProfile) },
        { label: "Verlauf", onClick: () => runFromMenu(onOpenHistory) },
        { label: "Übungen", onClick: () => onOpenExercises && runFromMenu(onOpenExercises) },
        { label: "Statistik", onClick: () => runFromMenu(onOpenStats) },
        { label: "Einstellungen", onClick: () => runFromMenu(onOpenSettings) },
      ],
    },
    {
      title: "UEBERBLICK",
      items: [{ label: "Ueber rephive", onClick: () => runFromMenu(onOpenAbout) }],
    },
    {
      title: "HILFE",
      items: [{ label: "Support", onClick: () => runFromMenu(onOpenSupport) }],
    },
    {
      title: "RECHTLICHES",
      items: [
        {
          label: "Impressum",
          onClick: () => openExternalLegal("/impressum"),
          external: true,
        },
        {
          label: "AGB",
          onClick: () => openExternalLegal("/agb"),
          external: true,
        },
        {
          label: "Datenschutz",
          onClick: () => openExternalLegal("/datenschutz"),
          external: true,
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Menü schließen"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              position: "fixed",
              inset: 0,
              border: "none",
              background: "rgba(0, 0, 0, 0.45)",
              zIndex: 60,
              cursor: "pointer",
            }}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            initial={{ x: "100%" }}
            animate={{ x: "0%" }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: isDesktop ? "40vw" : "100vw",
              background: M.panel,
              borderLeft: "1px solid " + M.line,
              zIndex: 61,
              display: "flex",
              flexDirection: "column",
              boxShadow: "-10px 0 26px rgba(0, 0, 0, 0.32)",
            }}
          >
            <div
              style={{
                padding: "calc(env(safe-area-inset-top, 0px) + 20px) 20px 14px",
                borderBottom: "1px solid " + M.line2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 13, letterSpacing: 1.3, color: M.mut, fontWeight: 700 }}>KONTO</div>
                <div
                  style={{
                    marginTop: 4,
                    color: M.fg,
                    fontFamily: M.disp,
                    fontWeight: 700,
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  {displayName}
                </div>
              </div>
              <MButton onClick={onClose} variant="secondary" size="icon" aria-label="Menü schließen">
                <Icon name="x" size={16} stroke={2.3} color={M.mut} />
              </MButton>
            </div>
            <div
              style={{
                padding: "10px 12px calc(16px + env(safe-area-inset-bottom, 0px))",
                display: "grid",
                gap: 18,
                overflowY: "auto",
              }}
            >
              {panelSections.map((section) => (
                <section key={section.title}>
                  <div
                    style={{
                      marginBottom: 6,
                      padding: "0 13px",
                      fontSize: 13,
                      letterSpacing: 1.4,
                      color: M.mut,
                      fontWeight: 700,
                    }}
                  >
                    {section.title}
                  </div>
                  <div style={{ display: "grid", gap: 4 }}>
                    {section.items.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        aria-label={item.external ? `${item.label} (öffnet externe Seite)` : undefined}
                        style={{
                          width: "60%",
                          padding: "16px 13px",
                          border: "none",
                          borderRadius: 10,
                          background: "transparent",
                          color: M.fg,
                          fontFamily: M.disp,
                          fontSize: "clamp(30px, 3.8vw, 42px)",
                          lineHeight: 1,
                          fontWeight: 700,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <span>{item.label}</span>
                        {item.external ? (
                          <Icon name="externalLink" size={14} stroke={2} color={M.mut2} />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
              <div
                style={{
                  padding: "2px 13px",
                  fontSize: 13,
                  color: M.mut2,
                  fontWeight: 500,
                  letterSpacing: 0.2,
                }}
              >
                Version {__APP_VERSION__}
              </div>
            </div>
            <div style={{ marginTop: "auto", padding: "10px 12px 18px", borderTop: "1px solid " + M.line2 }}>
              <button
                type="button"
                onClick={() => runFromMenu(signOut)}
                style={{
                  width: "60%",
                  padding: "16px 13px",
                  border: "none",
                  borderRadius: 10,
                  background: "transparent",
                  color: M.fg,
                  fontFamily: M.disp,
                  fontSize: "clamp(30px, 3.8vw, 42px)",
                  lineHeight: 1,
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                Abmelden
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

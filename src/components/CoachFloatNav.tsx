import { M } from "../theme";
import { Icon } from "./Icon";

export type CoachTab = "clients" | "invites" | "profile";

export interface CoachFloatNavProps {
  tab: CoachTab;
  onTab: (tab: CoachTab) => void;
  unreadCount?: number;
}

const TABS: { id: CoachTab; label: string; icon: string }[] = [
  { id: "clients", label: "Klienten", icon: "users" },
  { id: "invites", label: "Einladen", icon: "mail" },
  { id: "profile", label: "Profil", icon: "user" },
];

export function CoachFloatNav({ tab, onTab, unreadCount = 0 }: CoachFloatNavProps) {
  return (
    <nav
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "center",
        padding: "10px 22px calc(10px + env(safe-area-inset-bottom))",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "flex",
          gap: 6,
          background: M.panel,
          border: "1px solid " + M.line,
          borderRadius: 20,
          padding: "8px 10px",
          boxShadow: "0 8px 32px rgba(0,0,0,.35)",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onTab(t.id)}
              style={{
                position: "relative",
                border: "none",
                background: active ? M.accSoft : "transparent",
                borderRadius: 14,
                padding: "10px 16px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                minWidth: 72,
              }}
            >
              <Icon name={t.icon} size={20} color={active ? M.acc : M.mut} />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  color: active ? M.acc : M.mut,
                }}
              >
                {t.label}
              </span>
              {t.id === "clients" && unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 8,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    background: M.acc,
                    color: M.brandInk,
                    fontSize: 10,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function coachNavContentInset(): string {
  return "calc(88px + env(safe-area-inset-bottom))";
}

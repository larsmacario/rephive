import { useState } from "react";
import { PhoneShell } from "./components/PhoneShell";
import { CoachFloatNav, coachNavContentInset, type CoachTab } from "./components/CoachFloatNav";
import { CoachClientsScreen } from "./screens/coach/CoachClientsScreen";
import { CoachClientDetailScreen } from "./screens/coach/CoachClientDetailScreen";
import { CoachInviteAthleteScreen } from "./screens/coach/CoachInviteAthleteScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { useUnreadCoachingCount } from "./lib/coaching";
import type { CoachingRelationship } from "./lib/coaching";
import { M } from "./theme";
import { useCoachMode } from "./lib/coachMode";
import { MButton } from "./components/MButton";

type CoachRoute =
  | { kind: "client"; relationship: CoachingRelationship }
  | null;

export function CoachPhoneApp() {
  const [tab, setTab] = useState<CoachTab>("clients");
  const [route, setRoute] = useState<CoachRoute>(null);
  const [refreshKey] = useState(0);
  const unread = useUnreadCoachingCount(refreshKey);
  const { setMode, canAccessAthlete } = useCoachMode();

  let body: React.ReactNode;

  if (route?.kind === "client") {
    body = (
      <CoachClientDetailScreen
        relationship={route.relationship}
        onBack={() => setRoute(null)}
      />
    );
  } else if (tab === "clients") {
    body = (
      <div>
        <div style={{ padding: "16px 22px 0" }}>
          <div style={{ fontFamily: M.disp, fontWeight: 700, fontSize: 28 }}>Coach</div>
          <div style={{ color: M.mut, fontSize: 14, marginTop: 4 }}>Deine Klienten</div>
        </div>
        <CoachClientsScreen
          refreshKey={refreshKey}
          onOpenClient={(relationship) => setRoute({ kind: "client", relationship })}
        />
      </div>
    );
  } else if (tab === "invites") {
    body = <CoachInviteAthleteScreen refreshKey={refreshKey} />;
  } else {
    body = (
      <div>
        {canAccessAthlete && (
          <div style={{ padding: "16px 22px 0" }}>
            <MButton size="sm" variant="secondary" onClick={() => setMode("athlete")}>
              Zum Athleten-Modus
            </MButton>
          </div>
        )}
        <ProfileScreen onBack={() => setTab("clients")} />
      </div>
    );
  }

  const showNav = route === null;

  return (
    <PhoneShell reserveBottomSafeArea={showNav}>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          paddingBottom: showNav ? coachNavContentInset() : 0,
        }}
      >
        {body}
      </div>
      {showNav && (
        <CoachFloatNav tab={tab} onTab={setTab} unreadCount={unread} />
      )}
    </PhoneShell>
  );
}

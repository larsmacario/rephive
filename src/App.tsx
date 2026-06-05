import { useCallback, useState } from "react";
import { M } from "./theme";
import { PhoneApp } from "./PhoneApp";
import { CoachPhoneApp } from "./CoachPhoneApp";
import { useCoachMode } from "./lib/coachMode";
import { useAuth } from "./lib/auth";
import { ResponsiveProvider } from "./lib/responsive";
import { hasSeenWelcome, markWelcomeSeen } from "./lib/welcome";
import { AuthFlow, type AuthStep } from "./screens/auth/AuthFlow";
import { WelcomeScreen, type WelcomeExit } from "./screens/WelcomeScreen";
import { AppLogo } from "./components/AppLogo";

function Splash() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: M.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <AppLogo size={96} alt="rephive" />
    </div>
  );
}

function MainApp() {
  const { isCoachView } = useCoachMode();
  return (
    <div style={{ width: "100%", height: "100%" }}>
      {isCoachView ? <CoachPhoneApp /> : <PhoneApp />}
    </div>
  );
}

function UnauthenticatedGate() {
  const [welcomeDone, setWelcomeDone] = useState(hasSeenWelcome);
  const [authInitialStep, setAuthInitialStep] = useState<AuthStep>("login");

  const handleWelcomeContinue = useCallback((target: WelcomeExit) => {
    markWelcomeSeen();
    setAuthInitialStep(target);
    setWelcomeDone(true);
  }, []);

  if (!welcomeDone) {
    return <WelcomeScreen onContinue={handleWelcomeContinue} />;
  }

  return <AuthFlow initialStep={authInitialStep} />;
}

export function App() {
  const { user, loading, profileReady } = useAuth();
  const booting = loading || (!!user && !profileReady);

  return (
    <ResponsiveProvider>
      {booting ? <Splash /> : !user ? <UnauthenticatedGate /> : <MainApp />}
    </ResponsiveProvider>
  );
}

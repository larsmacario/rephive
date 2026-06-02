import { APP_NAME, M } from "./theme";
import { PhoneApp } from "./PhoneApp";
import { useAuth } from "./lib/auth";
import { ResponsiveProvider } from "./lib/responsive";
import { AuthFlow } from "./screens/auth/AuthFlow";
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
        gap: 16,
        padding: "0 24px",
      }}
    >
      <AppLogo size={72} />
      <div
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 20,
          color: M.acc,
          letterSpacing: 0.5,
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        {APP_NAME}
      </div>
    </div>
  );
}

function MainApp() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <PhoneApp />
    </div>
  );
}

export function App() {
  const { user, loading } = useAuth();

  return (
    <ResponsiveProvider>
      {loading ? <Splash /> : !user ? <AuthFlow /> : <MainApp />}
    </ResponsiveProvider>
  );
}

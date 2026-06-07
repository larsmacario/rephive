import { M } from "../../theme";

export function TrackAutopilotBootOverlay() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "2px solid " + M.line,
          borderTopColor: M.brand,
          animation: "trackAutopilotSpin 0.85s linear infinite",
          marginBottom: 20,
        }}
      />
      <div
        style={{
          fontFamily: M.disp,
          fontWeight: 700,
          fontSize: 18,
          color: M.fg,
          lineHeight: 1.25,
        }}
      >
        Auto-Pilot bereitet deine Sätze vor…
      </div>
      <div style={{ fontSize: 13, color: M.mut, marginTop: 8, lineHeight: 1.45, maxWidth: 260 }}>
        Vorschläge aus deiner Trainingshistorie werden geladen.
      </div>
      <style>{`
        @keyframes trackAutopilotSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

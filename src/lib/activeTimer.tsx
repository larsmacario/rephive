import { createContext, useContext, useState, type ReactNode } from "react";

interface ActiveTimerContextValue {
  active: boolean;
  setActive: (active: boolean) => void;
}

const ActiveTimerContext = createContext<ActiveTimerContextValue | null>(null);

export function ActiveTimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  return (
    <ActiveTimerContext.Provider value={{ active, setActive }}>{children}</ActiveTimerContext.Provider>
  );
}

export function useActiveTimer() {
  const ctx = useContext(ActiveTimerContext);
  if (!ctx) throw new Error("useActiveTimer must be used within ActiveTimerProvider");
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";

interface NetworkContextValue {
  isOnline: boolean;
  refresh: () => void;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  refresh: () => {},
});

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const refresh = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        return;
      } catch {
        /* fall through */
      }
    }
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
  }, []);

  useEffect(() => {
    refresh();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let removeNative: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      void Network.addListener("networkStatusChange", (status) => {
        setIsOnline(status.connected);
      }).then((handle) => {
        removeNative = () => void handle.remove();
      });
    }

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      removeNative?.();
    };
  }, [refresh]);

  const value = useMemo(() => ({ isOnline, refresh }), [isOnline, refresh]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork() {
  return useContext(NetworkContext);
}

export function getIsOnlineSync(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

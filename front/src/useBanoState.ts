import { useCallback, useEffect, useRef, useState } from "react";
import {
  authWithKey,
  BanoApiError,
  clearSession,
  fetchState,
  getStoredKey,
  getStoredToken,
  lockOrUnlock,
  setStoredKey,
  setStoredToken,
  type BanoStateDTO,
} from "./api.js";

const POLL_MS = 2000;

function readQrKeyFromUrl(): string | null {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get("k");
  } catch {
    return null;
  }
}

export interface BanoViewModel {
  status: BanoStateDTO["status"] | "loading";
  expiresAt: number | null;
  authenticated: boolean;
  error: string | null;
  info: string | null;
  busy: boolean;
  isOwner: boolean;
  occupy: () => Promise<void>;
  release: () => Promise<void>;
}

export function useBanoState(): BanoViewModel {
  const [state, setState] = useState<BanoStateDTO | null>(null);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const tokenRef = useRef<string | null>(token);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchState();
      setState(next);
    } catch {
      /* transient, will retry next poll */
    }
  }, []);

  const doAuth = useCallback(async (k: string): Promise<string | null> => {
    try {
      const res = await authWithKey(k);
      setStoredToken(res.sessionToken, res.expiresInMs);
      setStoredKey(k);
      setToken(res.sessionToken);
      tokenRef.current = res.sessionToken;
      return res.sessionToken;
    } catch (err) {
      if (err instanceof BanoApiError && err.status === 401) {
        setError("QR inválido. Volvé a escanearlo.");
      } else {
        setError("No se pudo validar el QR.");
      }
      return null;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      void refresh();
      setNow(Date.now());
    }, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const kFromUrl = readQrKeyFromUrl();
    if (kFromUrl && !token) {
      void doAuth(kFromUrl).then(() => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("k");
        window.history.replaceState({}, document.title, cleanUrl.pathname);
      });
    }
  }, [token, doAuth]);

  const isOwner = !!state?.lockedBy && !!token && state.lockedBy === token;

  const runAction = useCallback(
    async (action: "lock" | "unlock"): Promise<void> => {
      let currentToken = tokenRef.current;
      if (!currentToken || !state) return;
      setBusy(true);
      setError(null);
      setInfo(null);
      try {
        const next = await lockOrUnlock(currentToken, action);
        setState(next);
        return;
      } catch (err) {
        if (!(err instanceof BanoApiError)) {
          setError("Error de conexión.");
          return;
        }
        if (err.status === 401) {
          const k = getStoredKey();
          if (!k) {
            clearSession();
            setToken(null);
            setError("Tu sesión venció. Volvé a escanear el QR.");
            return;
          }
          setInfo("Renovando sesión…");
          const fresh = await doAuth(k);
          if (!fresh) {
            setError("Tu sesión venció. Volvé a escanear el QR.");
            return;
          }
          try {
            const next = await lockOrUnlock(fresh, action);
            setState(next);
            setInfo(null);
            return;
          } catch (err2) {
            if (err2 instanceof BanoApiError && err2.status === 409) {
              setError("Ya está ocupado por otra persona.");
              return;
            }
            setError("No se pudo completar la acción.");
            return;
          }
        }
        if (err.status === 409) {
          setError("Ya está ocupado por otra persona.");
          return;
        }
        if (err.status === 403) {
          setError("No sos quien tiene el control ahora mismo.");
          return;
        }
        setError("No se pudo completar la acción.");
        return;
      } finally {
        setBusy(false);
      }
    },
    [state, doAuth],
  );

  const occupy = useCallback(() => runAction("lock"), [runAction]);
  const release = useCallback(() => runAction("unlock"), [runAction]);

  const remainingMs =
    state?.expiresAt && state.status === "occupied" ? Math.max(0, state.expiresAt - now) : null;

  return {
    status: state ? state.status : "loading",
    expiresAt: remainingMs,
    authenticated: !!token,
    error,
    info,
    busy,
    isOwner,
    occupy,
    release,
  };
}

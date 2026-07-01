import { useCallback, useEffect, useRef, useState } from "react";
import { api, BanoApiError } from "./api.js";
import { dispatchNotification } from "./notifications.js";
import type { BanoStateDTO } from "./types.js";

const POLL_MS = 2000;

function humanize(code: string | null): string {
  switch (code) {
    case "already_locked":
      return "Ya está ocupado.";
    case "not_owner":
      return "No eres quien lo está usando.";
    case "not_your_turn":
      return "No es tu turno todavía.";
    case "your_turn_lock_instead":
      return "¡Es tu turno! Presiona Ocupar.";
    case "you_are_inside":
      return "Ya estás dentro.";
    case "already_in_queue":
      return "Ya estás en la fila.";
    case "bathroom_free_lock_instead":
      return "El baño está libre, presiona Ocupar.";
    case "extra_max_reached":
      return "Alcanzaste el tiempo extra máximo.";
    case "unauthorized":
      return "Tu sesión venció. Vuelve a iniciar sesión.";
    default:
      return "No se pudo completar.";
  }
}

export interface BanoVm {
  state: BanoStateDTO | null;
  busy: boolean;
  error: string | null;
  remainingMs: number | null;
  occupy: () => Promise<void>;
  release: () => Promise<void>;
  extra: () => Promise<void>;
  setPanic: (value: boolean) => Promise<void>;
  joinQueue: () => Promise<void>;
  leaveQueue: () => Promise<void>;
}

export function useBano(meId: string | null): BanoVm {
  const [state, setState] = useState<BanoStateDTO | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const prevStatus = useRef<string | null>(null);
  const prevMyTurn = useRef<boolean>(false);
  const meIdRef = useRef<string | null>(meId);
  useEffect(() => {
    meIdRef.current = meId;
  }, [meId]);

  const refresh = useCallback(async () => {
    try {
      setState(await api.state());
    } catch {
      /* transient; retry next poll */
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
    if (!state) return;
    const status = state.status;
    if (prevStatus.current !== null && prevStatus.current !== status) {
      if (status === "occupied") {
        dispatchNotification("occupied", {
          title: "Baño ocupado",
          body: state.lockedBy ? `Lo está usando ${state.lockedBy.name}` : "",
        });
      } else if (status === "free") {
        dispatchNotification("free", { title: "Baño libre", body: "Ya puedes usarlo." });
      }
    }
    prevStatus.current = status;

    const myTurn = !!meIdRef.current && state.notifiedUserId === meIdRef.current;
    if (myTurn && !prevMyTurn.current) {
      dispatchNotification("your_turn", {
        title: "¡Te toca!",
        body: "Tienes 60 s para ocupar el baño.",
      });
    }
    prevMyTurn.current = myTurn;
  }, [state]);

  const run = useCallback(async (fn: () => Promise<BanoStateDTO>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      setState(await fn());
    } catch (e) {
      if (e instanceof BanoApiError) setError(humanize(e.code));
      else setError("Error de conexión.");
    } finally {
      setBusy(false);
    }
  }, []);

  const remainingMs =
    state?.expiresAt && state.status === "occupied" ? Math.max(0, state.expiresAt - now) : null;

  return {
    state,
    busy,
    error,
    remainingMs,
    occupy: () => run(api.lock),
    release: () => run(api.unlock),
    extra: () => run(api.extend),
    setPanic: (v: boolean) => run(() => api.panic(v)),
    joinQueue: () => run(api.joinQueue),
    leaveQueue: () => run(api.leaveQueue),
  };
}

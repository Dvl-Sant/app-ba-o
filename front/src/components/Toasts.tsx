import { useEffect, useState } from "react";
import { FaBell, FaTimes } from "react-icons/fa";
import { dismissToast, subscribeToasts, type NotificationKind, type Toast } from "../notifications.js";

const tone: Record<NotificationKind, string> = {
  occupied: "bg-red-500/90 text-white",
  free: "bg-emerald-500/90 text-slate-900",
  your_turn: "bg-amber-400/95 text-slate-900",
};

export function Toasts() {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => subscribeToasts(setItems), []);

  return (
    <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:w-80 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-xl shadow-lg p-3 flex gap-2 items-start text-sm ring-1 ring-black/10 ${tone[t.kind]}`}
        >
          <FaBell className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">{t.title}</div>
            {t.body && <div className="opacity-90">{t.body}</div>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="opacity-70 hover:opacity-100" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { FaLock, FaTrophy } from "react-icons/fa";
import { api } from "../api.js";
import { useAuth } from "../auth.js";
import { canAccessRanking } from "../roles.js";
import type { RankingEntry } from "../types.js";

type Sort = "total" | "count" | "avg";

const tabs: { key: Sort; label: string }[] = [
  { key: "total", label: "Tiempo" },
  { key: "count", label: "Veces" },
  { key: "avg", label: "Promedio" },
];

function fmtTotal(ms: number): string {
  const min = Math.round(ms / 60000);
  return min > 0 ? `${min} min` : `${Math.round(ms / 1000)}s`;
}

function fmtAvg(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function metricValue(sort: Sort, count: number, totalMs: number): string {
  if (sort === "count") return `${count}×`;
  if (sort === "avg") return fmtAvg(count > 0 ? totalMs / count : 0);
  return fmtTotal(totalMs);
}

const medal = ["bg-amber-400 text-slate-900", "bg-slate-300 text-slate-900", "bg-amber-700 text-white"];

export function RankingPanel() {
  const { user } = useAuth();
  const allowed = canAccessRanking(user?.role);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [sort, setSort] = useState<Sort>("total");

  // Sin polling si el usuario no tiene permiso (evita 403 cada 15s).
  useEffect(() => {
    if (!allowed) return;
    const load = () => {
      api.ranking().then((r) => setRanking(r.ranking)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [allowed]);

  // Visitante: panel bloqueado en lugar del ranking.
  if (!allowed) {
    return (
      <section className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4 flex flex-col items-center justify-center text-center gap-2">
        <FaLock className="text-2xl text-white/40" />
        <p className="text-sm text-white/60">El ranking es solo para usuarios locales.</p>
      </section>
    );
  }

  const rows = useMemo(() => {
    const valueOf = (r: RankingEntry) =>
      sort === "count" ? r.count : sort === "avg" ? (r.count > 0 ? r.totalMs / r.count : 0) : r.totalMs;
    return [...ranking].sort((a, b) => valueOf(b) - valueOf(a));
  }, [ranking, sort]);

  return (
    <section className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2 text-sm font-bold mb-3">
        <FaTrophy className="text-amber-400" /> Ranking baño
      </div>

      <div className="flex gap-1 mb-3 bg-black/25 rounded-full p-1 text-xs">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setSort(t.key)}
            className={`flex-1 rounded-full py-1 font-semibold transition ${
              sort === t.key ? "bg-emerald-500 text-slate-900" : "text-white/60 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-white/60">Sin datos todavía.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.userId ?? r.userName} className="flex items-center gap-2 text-sm">
              <span
                className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${medal[i] ?? "bg-white/10 text-white/70"}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">{r.userName}</span>
              <span className="text-white/80 text-xs font-semibold tabular-nums">
                {metricValue(sort, r.count, r.totalMs)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

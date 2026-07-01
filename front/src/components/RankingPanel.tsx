import { useEffect, useState } from "react";
import { FaTrophy } from "react-icons/fa";
import { api } from "../api.js";
import type { RankingEntry } from "../types.js";

function fmtTotal(ms: number): string {
  return `${Math.round(ms / 60000)} min`;
}

const medal = ["bg-amber-400 text-slate-900", "bg-slate-300 text-slate-900", "bg-amber-700 text-white"];

export function RankingPanel() {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  useEffect(() => {
    const load = () => {
      api.ranking().then((r) => setRanking(r.ranking)).catch(() => {});
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-4">
      <div className="flex items-center gap-2 text-sm font-bold mb-3">
        <FaTrophy className="text-amber-400" /> Ranking baño
      </div>
      {ranking.length === 0 ? (
        <p className="text-sm text-white/60">Sin datos todavía.</p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {ranking.slice(0, 10).map((r, i) => (
            <li key={r.userId ?? r.userName} className="flex items-center gap-2 text-sm">
              <span
                className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${medal[i] ?? "bg-white/10 text-white/70"}`}
              >
                {i + 1}
              </span>
              <span className="flex-1 truncate">{r.userName}</span>
              <span className="text-white/60 text-xs">{r.count}×</span>
              <span className="text-white/40 text-xs w-14 text-right">{fmtTotal(r.totalMs)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

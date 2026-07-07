import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCrown,
  FaExclamationTriangle,
  FaHistory,
  FaLockOpen,
  FaSpinner,
  FaSyncAlt,
  FaTrash,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";
import { useAuth } from "../auth.js";
import { useBano } from "../useBano.js";
import { api, BanoApiError } from "../api.js";
import { roleLabel } from "../roles.js";
import type { HistoryEntry, PublicUser, RankingEntry, UserRole } from "../types.js";

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function fmtTotal(ms: number): string {
  const min = Math.round(ms / 60000);
  return `${min} min`;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const reasonLabel: Record<HistoryEntry["reason"], string> = {
  normal: "normal",
  forced: "forzado (admin)",
  expired: "expiró solo",
};

const medal = ["bg-amber-400 text-slate-900", "bg-slate-300 text-slate-900", "bg-amber-700 text-white"];

const ROLE_OPTIONS: UserRole[] = ["visitante", "local", "admin"];

const roleBadge: Record<UserRole, string> = {
  admin: "bg-amber-400/20 text-amber-300 ring-amber-300/30",
  local: "bg-emerald-400/20 text-emerald-300 ring-emerald-300/30",
  visitante: "bg-slate-400/20 text-slate-300 ring-slate-300/30",
};

export function AdminPage({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const vm = useBano(user?.id ?? null);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [users, setUsers] = useState<PublicUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [usersMsg, setUsersMsg] = useState<string | null>(null);

  const refresh = useCallback(async (f?: string, t?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [h, r] = await Promise.all([api.adminHistory(f, t), api.ranking(f, t)]);
      setHistory(h.history);
      setRanking(r.ranking);
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const res = await api.listUsers();
      setUsers(res.users);
    } catch {
      setUsersError("No se pudo cargar la lista de usuarios.");
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshUsers();
  }, [refresh, refreshUsers]);

  const changeRole = async (u: PublicUser, role: UserRole) => {
    if (role === u.role) return;
    setSavingId(u.id);
    setUsersMsg(null);
    try {
      const res = await api.updateUser(u.id, { role });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.user : x)));
      setUsersMsg(`Rol de ${res.user.name} → ${roleLabel(res.user.role)}.`);
    } catch (err) {
      const msg =
        err instanceof BanoApiError && err.code === "cannot_demote_self"
          ? "No puedes bajarte tu propio rol."
          : "No se pudo actualizar el rol.";
      setUsersError(msg);
    } finally {
      setSavingId(null);
    }
  };

  const removeUser = async (u: PublicUser) => {
    if (!window.confirm(`¿Eliminar a ${u.name} (@${u.username})? Esta acción no se puede deshacer.`)) return;
    setSavingId(u.id);
    setUsersMsg(null);
    try {
      await api.deleteUser(u.id);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
      setUsersMsg(`${u.name} eliminado.`);
    } catch (err) {
      const msg =
        err instanceof BanoApiError && err.code === "cannot_delete_self"
          ? "No puedes eliminarte a ti mismo."
          : "No se pudo eliminar el usuario.";
      setUsersError(msg);
    } finally {
      setSavingId(null);
    }
  };

  const applyFilters = () => void refresh(from, to);
  const clearFilters = () => {
    setFrom("");
    setTo("");
    void refresh();
  };

  const occupied = vm.state?.status === "occupied";
  const lockedBy = vm.state?.lockedBy?.name ?? null;

  const forceUnlock = async () => {
    if (!occupied) return;
    if (!window.confirm(`¿Forzar desbloqueo?${lockedBy ? ` Lo está usando ${lockedBy}.` : ""}`)) return;
    await vm.release();
    void refresh(from, to);
  };

  return (
    <main className="min-h-full w-full bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <header className="flex items-center justify-between mb-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-full px-3 py-1.5"
          >
            <FaArrowLeft /> Volver
          </button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <FaCrown className="text-amber-400" /> Panel admin
          </h1>
          <button
            onClick={() => refresh(from, to)}
            className="text-sm bg-slate-800 hover:bg-slate-700 rounded-full px-3 py-1.5 flex items-center gap-1"
          >
            {loading ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Refrescar
          </button>
        </header>

        {/* Estado + force unlock */}
        <section className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Estado actual</div>
              <div className={`text-2xl font-extrabold ${occupied ? "text-red-400" : "text-emerald-400"}`}>
                {occupied ? "Ocupado" : "Libre"}
              </div>
              {occupied && lockedBy && <div className="text-xs text-slate-400">Lo usa {lockedBy}</div>}
            </div>
            <button
              onClick={forceUnlock}
              disabled={!occupied || vm.busy}
              className="rounded-xl bg-red-500 hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-4 py-3 flex items-center gap-2"
            >
              {vm.busy ? <FaSpinner className="animate-spin" /> : <FaLockOpen />}
              Forzar desbloqueo
            </button>
          </div>
        </section>

        {/* Filtros */}
        <section className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4 mb-5">
          <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Filtrar por fecha</div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs">
              Desde
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 ring-1 ring-white/10" />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Hasta
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="bg-slate-800 rounded-lg px-2 py-1.5 ring-1 ring-white/10" />
            </label>
            <button onClick={applyFilters} className="bg-emerald-500 text-slate-900 font-semibold rounded-lg px-3 py-1.5 text-sm">
              Aplicar
            </button>
            <button onClick={clearFilters} className="bg-slate-800 hover:bg-slate-700 rounded-lg px-3 py-1.5 text-sm">
              Limpiar
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-xl bg-red-500/15 ring-1 ring-red-400/30 p-3 text-sm flex items-center gap-2 mb-5">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Usuarios */}
        <section className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4 mb-5">
          <div className="flex items-center justify-between gap-2 text-sm font-bold mb-3">
            <span className="flex items-center gap-2">
              <FaUsers className="text-emerald-400" /> Usuarios ({users.length})
            </span>
            <button
              onClick={() => void refreshUsers()}
              className="text-xs bg-slate-800 hover:bg-slate-700 rounded-full px-3 py-1.5 flex items-center gap-1"
            >
              {usersLoading ? <FaSpinner className="animate-spin" /> : <FaSyncAlt />} Refrescar
            </button>
          </div>

          {usersError && (
            <div className="rounded-lg bg-red-500/15 ring-1 ring-red-400/30 p-2 text-xs mb-2 flex items-center gap-2">
              <FaExclamationTriangle /> {usersError}
            </div>
          )}
          {usersMsg && (
            <div className="rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30 p-2 text-xs mb-2">{usersMsg}</div>
          )}

          {usersLoading && users.length === 0 ? (
            <p className="text-sm text-slate-500">Cargando…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-500">Sin usuarios.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {users.map((u) => {
                const isSelf = u.id === user?.id;
                const busy = savingId === u.id;
                return (
                  <li key={u.id} className="py-2 flex items-center gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold truncate">{u.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ring-1 ${roleBadge[u.role]}`}>
                          {roleLabel(u.role)}
                        </span>
                        {isSelf && <span className="text-[10px] text-slate-500">(tú)</span>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">@{u.username}</div>
                    </div>
                    <select
                      value={u.role}
                      disabled={busy || isSelf}
                      onChange={(e) => void changeRole(u, e.target.value as UserRole)}
                      className="bg-slate-800 rounded-lg px-2 py-1.5 text-xs ring-1 ring-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isSelf ? "No puedes cambiar tu propio rol" : "Cambiar rol"}
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void removeUser(u)}
                      disabled={busy || isSelf}
                      className="text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed p-1.5"
                      title={isSelf ? "No puedes eliminarte" : "Eliminar usuario"}
                    >
                      {busy ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Ranking */}
        <section className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4 mb-5">
          <div className="flex items-center gap-2 text-sm font-bold mb-3">
            <FaTrophy className="text-amber-400" /> Ranking · los que más van al baño
          </div>
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-500">Sin datos.</p>
          ) : (
            <ol className="flex flex-col gap-1.5">
              {ranking.map((r, i) => (
                <li key={r.userId ?? r.userName} className="flex items-center gap-3 text-sm">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${medal[i] ?? "bg-slate-700 text-slate-300"}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{r.userName}</span>
                  <span className="text-slate-400">{r.count} {r.count === 1 ? "uso" : "usos"}</span>
                  <span className="text-slate-500 text-xs">{fmtTotal(r.totalMs)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Historial */}
        <section className="rounded-2xl bg-slate-900 ring-1 ring-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold mb-3">
            <FaHistory /> Historial ({history.length})
          </div>
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">Sin movimientos.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {history.map((h) => (
                <li key={h.id} className="py-2 text-sm flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold">{h.userName}</span>
                    <span className="text-slate-500"> · {fmtDate(h.unlockedAt)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{fmtDuration(h.durationMs)}</span>
                    {h.extraMinutesUsed > 0 && <span className="text-amber-400">+{h.extraMinutesUsed} extra</span>}
                    <span className="text-slate-500">{reasonLabel[h.reason]}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

import {
  FaClock,
  FaCrown,
  FaExclamationTriangle,
  FaListOl,
  FaLock,
  FaLockOpen,
  FaPlus,
  FaRestroom,
  FaSignOutAlt,
} from "react-icons/fa";
import { useAuth } from "../auth.js";
import { useBano } from "../useBano.js";
import { Toasts } from "../components/Toasts.js";

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function DashboardPage({ onAdmin }: { onAdmin: () => void }) {
  const { user, logout } = useAuth();
  const vm = useBano(user?.id ?? null);
  const s = vm.state;

  if (!user) return null;

  const isOccupied = s?.status === "occupied";
  const isFree = s?.status === "free";
  const isOwner = !!s?.lockedBy && s.lockedBy.id === user.id;
  const myTurn = !!s && s.notifiedUserId === user.id;
  const queueOpen = !s?.notifiedUserId; // nadie fue notificado todavía
  const myEntry = s?.queue.find((q) => q.userId === user.id) ?? null;

  const canOccupy = isFree && !vm.busy && (!s?.notifiedUserId || myTurn);
  const canRelease = isOwner && isOccupied && !vm.busy;
  const canExtend = isOwner && isOccupied && !!s && s.extraMinutesUsed < s.extraMax && !vm.busy;
  const canJoin = isOccupied && !isOwner && !myEntry && !vm.busy;
  const canLeave = !!myEntry && !vm.busy;

  const theme = isOccupied
    ? "from-red-600 via-red-700 to-rose-800"
    : isFree
      ? "from-emerald-500 via-emerald-600 to-teal-700"
      : "from-slate-800 via-slate-900 to-slate-950";

  const claimRemaining =
    myTurn && s?.claimExpiresAt ? Math.max(0, s.claimExpiresAt - Date.now()) : null;

  return (
    <main
      className={`min-h-full w-full flex flex-col items-center p-6 bg-gradient-to-b ${theme} text-white transition-colors duration-700`}
    >
      <Toasts />

      <header className="w-full max-w-md flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 opacity-90">
          <FaRestroom className="text-xl" />
          <span className="text-xs uppercase tracking-widest">Baño · Oficina</span>
        </div>
        <div className="flex items-center gap-2">
          {user.role === "admin" && (
            <button
              onClick={onAdmin}
              className="text-xs bg-amber-400/90 hover:bg-amber-300 text-slate-900 font-semibold rounded-full px-3 py-1 flex items-center gap-1"
              title="Panel admin"
            >
              <FaCrown /> Admin
            </button>
          )}
          <span className="text-xs bg-white/15 rounded-full px-3 py-1">{user.name}</span>
          <button
            onClick={logout}
            className="text-xs bg-black/20 hover:bg-black/30 rounded-full px-3 py-1 flex items-center gap-1"
            title="Cerrar sesión"
          >
            <FaSignOutAlt /> Salir
          </button>
        </div>
      </header>

      <section className="w-full max-w-md flex flex-col items-center mt-6">
        <div className={`relative h-56 w-56 rounded-full flex items-center justify-center ${isOccupied ? "pulse-ring" : ""}`}>
          <div className="h-48 w-48 rounded-full bg-white/15 backdrop-blur flex flex-col items-center justify-center text-center shadow-2xl">
            {isOccupied ? <FaLock className="text-5xl drop-shadow" /> : <FaLockOpen className="text-5xl drop-shadow" />}
            <span className="mt-3 text-xl font-extrabold uppercase tracking-wide">
              {isOccupied ? "Ocupado" : "Libre"}
            </span>
            {isOccupied && vm.remainingMs !== null && (
              <span className="mt-1 flex items-center gap-1 text-xs opacity-90">
                <FaClock /> {format(vm.remainingMs)}
              </span>
            )}
            {isOccupied && s?.lockedBy && !isOwner && (
              <span className="mt-1 text-[11px] opacity-80">Lo usa {s.lockedBy.name}</span>
            )}
          </div>
        </div>

        {myTurn && (
          <div className="mt-4 rounded-xl bg-amber-400/25 ring-1 ring-amber-200/50 p-3 text-center text-sm flex items-center justify-center gap-2">
            <FaListOl />
            <span>
              ¡Te toca a vos!
              {claimRemaining !== null ? ` Tenés ${Math.ceil(claimRemaining / 1000)}s para ocuparlo.` : ""}
            </span>
          </div>
        )}

        <div className="mt-6 w-full flex flex-col gap-3">
          {canOccupy && (
            <button
              onClick={() => void vm.occupy()}
              className="w-full rounded-2xl bg-white text-emerald-700 font-bold py-5 text-xl shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-3"
            >
              <FaLock className="text-2xl" /> {myTurn ? "Ocupar (es mi turno)" : "Marcar Ocupado"}
            </button>
          )}

          {canRelease && (
            <button
              onClick={() => void vm.release()}
              className="w-full rounded-2xl bg-white text-red-600 font-bold py-5 text-xl shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-3"
            >
              <FaLockOpen className="text-2xl" /> Liberar
            </button>
          )}

          {canExtend && (
            <button
              onClick={() => void vm.extra()}
              className="w-full rounded-2xl bg-black/25 hover:bg-black/35 ring-1 ring-white/15 font-semibold py-3 text-sm flex items-center justify-center gap-2 transition"
            >
              <FaPlus /> Tiempo extra +1 min
              <span className="opacity-70">
                ({s?.extraMinutesUsed ?? 0}/{s?.extraMax ?? 0})
              </span>
            </button>
          )}

          {canJoin && (
            <button
              onClick={() => void vm.joinQueue()}
              className="w-full rounded-2xl bg-black/25 hover:bg-black/35 ring-1 ring-white/15 font-semibold py-4 flex items-center justify-center gap-2 transition"
            >
              <FaListOl /> Sumarme a la fila
            </button>
          )}

          {canLeave && myEntry && (
            <>
              <div className="rounded-xl bg-black/20 p-3 text-center text-sm">
                Estás en la fila · posición <strong>#{myEntry.position}</strong>
              </div>
              <button
                onClick={() => void vm.leaveQueue()}
                className="w-full rounded-2xl bg-black/25 hover:bg-black/35 ring-1 ring-white/15 font-semibold py-3 text-sm flex items-center justify-center gap-2 transition"
              >
                Salir de la fila
              </button>
            </>
          )}

          {isOccupied && !isOwner && !myEntry && (
            <div className="rounded-xl bg-black/25 p-4 text-center text-sm">
              Otro compañero lo está usando. Sumate a la fila para que te avise cuando sea tu turno.
            </div>
          )}
        </div>

        {s && s.queue.length > 0 && (
          <div className="mt-6 w-full rounded-xl bg-black/20 ring-1 ring-white/10 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-80 mb-2">
              <FaListOl /> Fila ({s.queue.length})
            </div>
            <ul className="flex flex-col divide-y divide-white/10">
              {s.queue.map((q) => (
                <li
                  key={q.userId}
                  className={`flex justify-between py-1.5 text-sm ${q.userId === user.id ? "text-amber-300 font-bold" : ""}`}
                >
                  <span>
                    #{q.position} · {q.name}
                    {q.userId === s.notifiedUserId && <span className="ml-1 text-amber-200">← le toca</span>}
                  </span>
                </li>
              ))}
            </ul>
            {!queueOpen && (
              <p className="mt-2 text-[11px] opacity-70">
                Cuando el baño se libere, se le avisará al primero; tiene 60s para ocuparlo o pasa al siguiente.
              </p>
            )}
          </div>
        )}

        {vm.error && (
          <div className="mt-4 rounded-xl bg-black/35 p-3 text-center text-sm flex items-center justify-center gap-2">
            <FaExclamationTriangle /> {vm.error}
          </div>
        )}
      </section>

      <footer className="w-full max-w-md text-center text-[11px] opacity-70 pt-6 pb-2 mt-auto flex items-center justify-center gap-2">
        <FaClock /> Sesión de 10 min · Se libera solo al expirar · Tiempo extra disponible
      </footer>
    </main>
  );
}

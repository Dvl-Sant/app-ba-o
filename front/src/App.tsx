import { useState } from "react";
import {
  FaLock,
  FaLockOpen,
  FaRestroom,
  FaQrcode,
  FaClock,
  FaSpinner,
  FaSyncAlt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaUserCheck,
} from "react-icons/fa";
import { useBanoState } from "./useBanoState.js";

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type FlashKind = "occupy" | "release" | null;

export default function App() {
  const vm = useBanoState();
  const [flash, setFlash] = useState<FlashKind>(null);

  const isOccupied = vm.status === "occupied";
  const isFree = vm.status === "free";
  const isLoading = vm.status === "loading";

  const canOccupy = isFree && vm.authenticated && !vm.busy;
  const canRelease = vm.isOwner && isOccupied && !vm.busy;

  const theme = isOccupied
    ? "from-red-600 via-red-700 to-rose-800"
    : isFree
      ? "from-emerald-500 via-emerald-600 to-teal-700"
      : "from-slate-800 via-slate-900 to-slate-950";

  const handleOccupy = async () => {
    await vm.occupy();
    setFlash("occupy");
    setTimeout(() => setFlash(null), 1200);
  };

  const handleRelease = async () => {
    await vm.release();
    setFlash("release");
    setTimeout(() => setFlash(null), 1200);
  };

  return (
    <main
      className={`min-h-full w-full flex flex-col items-center justify-between p-6 bg-gradient-to-b ${theme} text-white transition-colors duration-700`}
    >
      <header className="w-full max-w-md flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 opacity-90">
          <FaRestroom className="text-xl" />
          <span className="text-xs uppercase tracking-widest">Baño · Oficina</span>
        </div>
        {vm.authenticated ? (
          <span className="flex items-center gap-1 text-xs bg-white/15 rounded-full px-3 py-1">
            <FaUserCheck /> Sesión activa
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs bg-black/20 rounded-full px-3 py-1">
            <FaQrcode /> Solo lectura
          </span>
        )}
      </header>

      <section className="w-full max-w-md flex flex-col items-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-16 opacity-90">
            <FaSpinner className="text-3xl animate-spin" />
            <span className="text-sm">Conectando…</span>
          </div>
        ) : (
          <>
            <div
              className={`relative h-60 w-60 rounded-full flex items-center justify-center ${
                isOccupied ? "pulse-ring" : ""
              }`}
            >
              <div className="h-52 w-52 rounded-full bg-white/15 backdrop-blur flex flex-col items-center justify-center text-center shadow-2xl">
                {isOccupied ? (
                  <FaLock className="text-6xl drop-shadow" />
                ) : (
                  <FaLockOpen className="text-6xl drop-shadow" />
                )}
                <span className="mt-3 text-2xl font-extrabold uppercase tracking-wide">
                  {isOccupied ? "Ocupado" : "Libre"}
                </span>
                {isOccupied && vm.expiresAt !== null && (
                  <span className="mt-1 flex items-center gap-1 text-xs opacity-90">
                    <FaClock /> auto-libera en {formatRemaining(vm.expiresAt)}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-8 w-full flex flex-col gap-3">
              {!vm.authenticated && !isLoading && (
                <div className="rounded-xl bg-black/25 p-4 text-center text-sm flex items-center justify-center gap-2">
                  <FaQrcode className="text-lg shrink-0" />
                  <span>Escaneá el QR del baño para poder cambiar el estado.</span>
                </div>
              )}

              {canOccupy && (
                <button
                  onClick={handleOccupy}
                  disabled={vm.busy}
                  className="w-full rounded-2xl bg-white text-emerald-700 font-bold py-5 text-xl shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {vm.busy ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaLock className="text-2xl" />
                  )}
                  Marcar Ocupado
                </button>
              )}

              {canRelease && (
                <button
                  onClick={handleRelease}
                  disabled={vm.busy}
                  className="w-full rounded-2xl bg-white text-red-600 font-bold py-5 text-xl shadow-xl active:scale-[0.98] transition flex items-center justify-center gap-3 disabled:opacity-60"
                >
                  {vm.busy ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaLockOpen className="text-2xl" />
                  )}
                  Liberar
                </button>
              )}

              {isOccupied && !vm.isOwner && (
                <div className="rounded-xl bg-black/25 p-4 text-center text-sm">
                  Otro compañero lo está usando. Esperá un toque.
                </div>
              )}

              {flash === "occupy" && (
                <div className="rounded-xl bg-black/25 p-3 text-center text-sm flex items-center justify-center gap-2">
                  <FaUserCheck /> Listo, baño marcado como ocupado.
                </div>
              )}
              {flash === "release" && (
                <div className="rounded-xl bg-black/25 p-3 text-center text-sm flex items-center justify-center gap-2">
                  <FaLockOpen /> Baño liberado. ¡Gracias!
                </div>
              )}
            </div>

            {vm.info && (
              <div className="mt-4 rounded-xl bg-black/25 p-3 text-center text-sm flex items-center justify-center gap-2">
                <FaSyncAlt className="animate-spin" /> {vm.info}
              </div>
            )}

            {vm.error && (
              <div className="mt-4 rounded-xl bg-black/35 p-3 text-center text-sm flex items-center justify-center gap-2">
                <FaExclamationTriangle /> {vm.error}
              </div>
            )}
          </>
        )}
      </section>

      <footer className="w-full max-w-md text-center text-[11px] opacity-70 pt-6 pb-2 flex items-center justify-center gap-2">
        <FaClock /> Sesión de 10 min · El estado se libera solo al expirar
        <FaInfoCircle className="ml-1" title="Estado en memoria del servidor" />
      </footer>
    </main>
  );
}

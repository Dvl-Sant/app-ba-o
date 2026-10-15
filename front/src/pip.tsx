import { createRoot, type Root } from "react-dom/client";
import { FaClock, FaLock, FaLockOpen, FaToiletPaper } from "react-icons/fa";
import { useBano } from "./useBano.js";

// Monitor flotante siempre visible (Document Picture-in-Picture, Chromium
// 116+: Brave/Chrome/Edge). La ventana corre su propio polling, asi que
// sigue actualizandose en tiempo real aunque la pestana principal quede
// en segundo plano (los timers de pestanas ocultas son throttleados; los
// de esta ventana visible no).

function format(ms: number): string {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function PipWidget() {
  const vm = useBano(null, { notify: false });
  const s = vm.state;
  const isOccupied = s?.status === "occupied";
  const isFree = s?.status === "free";
  const panic = !!s?.panic;

  const theme = panic
    ? "from-amber-400 via-yellow-500 to-amber-600"
    : isOccupied
      ? "from-red-600 via-red-700 to-rose-800"
      : isFree
        ? "from-emerald-500 via-emerald-600 to-teal-700"
        : "from-slate-800 via-slate-900 to-slate-950";

  return (
    <div
      className={`h-full w-full bg-gradient-to-b ${theme} text-white flex flex-col items-center justify-center gap-1 select-none transition-colors duration-700`}
    >
      {panic && (
        <div className="flex items-center gap-2 font-bold text-amber-200 animate-pulse mb-1">
          <FaToiletPaper /> ¡FALTA PAPEL!
        </div>
      )}
      <div className="flex items-center gap-3">
        {isOccupied ? <FaLock className="text-3xl" /> : <FaLockOpen className="text-3xl" />}
        <span className="text-2xl font-extrabold uppercase tracking-wide">
          {!s ? "…" : isOccupied ? "Ocupado" : "Libre"}
        </span>
      </div>
      {isOccupied && vm.remainingMs !== null && (
        <span className="flex items-center gap-1 text-sm opacity-90">
          <FaClock /> {format(vm.remainingMs)}
        </span>
      )}
      {isOccupied && s?.lockedBy && (
        <span className="text-xs opacity-80">Lo usa {s.lockedBy.name}</span>
      )}
      {s && s.queue.length > 0 && (
        <span className="mt-1 text-[11px] bg-black/25 rounded-full px-2 py-0.5">
          Fila: {s.queue.length}
        </span>
      )}
    </div>
  );
}

function copyStyles(target: Document): void {
  for (const sheet of document.styleSheets) {
    try {
      const rules = [...sheet.cssRules].map((r) => r.cssText).join("");
      const style = target.createElement("style");
      style.textContent = rules;
      target.head.appendChild(style);
    } catch {
      // Hoja cross-origin: clonar el <link> tal cual.
      const node = sheet.ownerNode as HTMLLinkElement | null;
      if (node?.href) {
        const link = target.createElement("link");
        link.rel = "stylesheet";
        link.href = node.href;
        target.head.appendChild(link);
      }
    }
  }
}

let pipRoot: Root | null = null;

export async function openBanoPip(): Promise<boolean> {
  const dpip = window.documentPictureInPicture;
  if (!dpip) return false;
  // Solo una instancia: si ya hay ventana abierta, enfocarla.
  if (dpip.window) {
    dpip.window.focus();
    return true;
  }

  const pipWindow = await dpip.requestWindow({
    width: 320,
    height: 200,
    disallowReturnToOpener: false,
  });

  pipWindow.document.title = "Baño";
  copyStyles(pipWindow.document);

  const mount = pipWindow.document.createElement("div");
  mount.style.height = "100%";
  pipWindow.document.body.style.margin = "0";
  pipWindow.document.body.style.overflow = "hidden";
  pipWindow.document.body.appendChild(mount);

  pipRoot = createRoot(mount);
  pipRoot.render(<PipWidget />);

  pipWindow.addEventListener("pagehide", () => {
    pipRoot?.unmount();
    pipRoot = null;
  });
  return true;
}

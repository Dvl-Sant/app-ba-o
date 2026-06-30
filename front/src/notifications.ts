export type NotificationKind = "occupied" | "free" | "your_turn";

export interface Toast {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<(t: Toast[]) => void>();

export function subscribeToasts(fn: (t: Toast[]) => void): () => void {
  listeners.add(fn);
  fn(toasts);
  return () => {
    listeners.delete(fn);
  };
}

function emit(): void {
  const snap = [...toasts];
  listeners.forEach((l) => l(snap));
}

export function dismissToast(id: number): void {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

let audioCtx: AudioContext | null = null;

function playSound(kind: NotificationKind): void {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = audioCtx ?? new Ctor();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = kind === "your_turn" ? 880 : kind === "free" ? 660 : 440;
    osc.type = "sine";
    const t0 = audioCtx.currentTime;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.15, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    osc.start(t0);
    osc.stop(t0 + 0.5);
  } catch {
    /* audio not available */
  }
}

export function dispatchNotification(kind: NotificationKind, opts: { title: string; body: string }): void {
  const id = nextId++;
  toasts = [...toasts, { id, kind, title: opts.title, body: opts.body }];
  emit();
  setTimeout(() => dismissToast(id), 6000);
  playSound(kind);
  // Extensión futura (Web Push): si hay permiso + suscripción guardada,
  // enviar la notificación al service worker para que llegue con la pestaña cerrada.
}

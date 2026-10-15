// Favicon dinamico: pinta el icono de la pestana como un punto de color
// segun el estado del bano. Es la alternativa visible en cualquier
// navegador de escritorio (el theme-color de la franja de pestanas solo
// lo aplican Android y las PWA instaladas, no Chromium desktop).

export type FaviconState = "free" | "occupied" | "panic" | "unknown";

const COLORS: Record<FaviconState, string> = {
  free: "#059669",
  occupied: "#b91c1c",
  panic: "#eab308",
  unknown: "#0f172a",
};

export function updateFavicon(state: FaviconState): void {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = COLORS[state];
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 5;
  ctx.stroke();

  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = canvas.toDataURL("image/png");
}

import { useEffect, useRef, useState, type FormEvent } from "react";
import { FaComments, FaPaperPlane, FaSpinner } from "react-icons/fa";
import { api, BanoApiError } from "../api.js";
import { useAuth } from "../auth.js";
import type { ChatMessage } from "../types.js";

function fmtTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel() {
  const { user } = useAuth();
  const meId = user?.id ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRef = useRef<number | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.chatMessages(lastRef.current);
        if (res.messages.length) {
          setMessages((prev) => {
            const known = new Set(prev.map((m) => m.id));
            const fresh = res.messages.filter((m) => !known.has(m.id));
            if (!fresh.length) return prev;
            return [...prev, ...fresh].slice(-200);
          });
          lastRef.current = res.messages[res.messages.length - 1].createdAt;
        }
      } catch {
        /* transient */
      }
    };
    void load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    try {
      const res = await api.sendChat(body);
      setMessages((prev) => [...prev, res.message].slice(-200));
      lastRef.current = res.message.createdAt;
    } catch (err) {
      setInput(body);
      if (err instanceof BanoApiError && err.status === 401) setError("Inicia sesión para chatear.");
      else setError("No se pudo enviar.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl bg-black/25 ring-1 ring-white/10 p-3 flex flex-col h-[55vh] lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center gap-2 text-sm font-bold mb-2 px-1">
        <FaComments className="text-emerald-400" /> Chat general
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
        {messages.length === 0 ? (
          <p className="text-sm text-white/50 m-auto">Sin mensajes todavía. ¡Escribe algo!</p>
        ) : (
          messages.map((m) => {
            const mine = m.userId === meId;
            return (
              <div key={m.id} className={`flex flex-col max-w-[85%] ${mine ? "self-end items-end" : "self-start items-start"}`}>
                {!mine && <span className="text-[10px] text-white/50 px-1">{m.userName}</span>}
                <div className={`rounded-2xl px-3 py-1.5 text-sm break-words ${mine ? "bg-emerald-500 text-slate-900" : "bg-white/10 text-white"}`}>
                  {m.body}
                </div>
                <span className="text-[9px] text-white/40 px-1">{fmtTime(m.createdAt)}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <div className="text-xs text-red-300 px-1 py-1">{error}</div>}
      <form onSubmit={send} className="flex gap-2 mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Escribe un mensaje…"
          className="flex-1 min-w-0 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-2 text-sm outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="rounded-full bg-emerald-500 disabled:opacity-50 text-slate-900 w-10 h-10 flex items-center justify-center shrink-0"
          aria-label="Enviar"
        >
          {sending ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
        </button>
      </form>
    </section>
  );
}

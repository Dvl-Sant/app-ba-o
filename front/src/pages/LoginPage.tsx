import { useState, type FormEvent } from "react";
import { FaRestroom, FaSpinner, FaSignInAlt, FaExclamationTriangle, FaUser } from "react-icons/fa";
import { useAuth } from "../auth.js";

export function LoginPage({ onGoRegister }: { onGoRegister: () => void }) {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch {
      setError("Usuario o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Iniciar sesión">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Usuario">
          <input
            type="text"
            required
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            placeholder="tu_usuario"
          />
        </Field>
        <Field label="Contraseña">
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>

        {error && (
          <div className="rounded-lg bg-red-500/15 ring-1 ring-red-400/30 p-2 text-sm flex items-center gap-2">
            <FaExclamationTriangle /> {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-900 font-bold py-3 flex items-center justify-center gap-2 transition"
        >
          {busy ? <FaSpinner className="animate-spin" /> : <FaSignInAlt />}
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-slate-300 mt-4">
        ¿No tienes cuenta?{" "}
        <button onClick={onGoRegister} className="text-emerald-400 hover:underline font-semibold">
          Regístrate
        </button>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-full w-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6 justify-center">
          <FaRestroom className="text-2xl text-emerald-400" />
          <span className="text-lg font-bold">Baño · Oficina</span>
        </div>
        <div className="rounded-2xl bg-slate-800/60 ring-1 ring-white/10 p-5 shadow-2xl">
          <h1 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FaUser className="text-emerald-400" /> {title}
          </h1>
          {children}
        </div>
      </div>
    </main>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "rounded-lg bg-slate-900/60 ring-1 ring-white/10 focus:ring-emerald-400/60 outline-none px-3 py-2 text-white placeholder:text-slate-500";

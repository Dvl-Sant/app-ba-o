import { useState, type FormEvent } from "react";
import { FaSpinner, FaUserPlus, FaExclamationTriangle } from "react-icons/fa";
import { useAuth } from "../auth.js";
import { AuthShell, Field, inputClass } from "./LoginPage.js";

export function RegisterPage({ onGoLogin }: { onGoLogin: () => void }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (username.trim().length < 3) {
      setError("El usuario debe tener al menos 3 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await register(username.trim().toLowerCase(), name.trim(), password);
    } catch {
      setError("No se pudo registrar. ¿Ese usuario ya existe?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Crear cuenta">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Nombre">
          <input
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Tu nombre"
          />
        </Field>
        <Field label="Usuario">
          <input
            required
            minLength={3}
            maxLength={50}
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={inputClass}
            placeholder="tu_usuario"
          />
        </Field>
        <Field label="Contraseña (mín. 6)">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
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
          {busy ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
          Registrarme
        </button>
      </form>

      <p className="text-center text-sm text-slate-300 mt-4">
        ¿Ya tenés cuenta?{" "}
        <button onClick={onGoLogin} className="text-emerald-400 hover:underline font-semibold">
          Iniciar sesión
        </button>
      </p>
    </AuthShell>
  );
}

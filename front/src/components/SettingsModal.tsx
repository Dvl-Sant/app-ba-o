import { useState } from "react";
import { FaCheck, FaExclamationTriangle, FaKey, FaSpinner, FaTimes, FaUser } from "react-icons/fa";
import { useAuth } from "../auth.js";
import { BanoApiError } from "../api.js";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const wantsName = trimmedName && trimmedName !== user.name;
    const wantsPassword = newPassword || confirmPassword;

    if (!wantsName && !wantsPassword) {
      setError("No hay cambios para guardar.");
      return;
    }
    if (wantsPassword && !currentPassword) {
      setError("Debes ingresar tu contraseña actual para cambiarla.");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    setSaving(true);
    try {
      let msg = "";
      if (wantsName) msg += "Nombre actualizado. ";
      if (wantsPassword) msg += "Contraseña actualizada.";
      await updateProfile({
        name: wantsName ? trimmedName : undefined,
        currentPassword: wantsPassword ? currentPassword : undefined,
        newPassword: wantsPassword ? newPassword : undefined,
      });
      setSuccess(msg.trim() || "Perfil actualizado.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg =
        err instanceof BanoApiError && err.code === "invalid_current_password"
          ? "La contraseña actual es incorrecta."
          : "No se pudo guardar. Intenta de nuevo.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-slate-900 ring-1 ring-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="font-bold flex items-center gap-2 text-white">
            <FaKey className="text-emerald-400" /> Configuración
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1" aria-label="Cerrar">
            <FaTimes />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 flex flex-col gap-4">
          {/* Perfil */}
          <div>
            <label className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1 mb-1">
              <FaUser /> Nombre
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full rounded-lg bg-slate-800 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-emerald-400"
            />
            <p className="text-[11px] text-slate-500 mt-1">Usuario: @{user.username}</p>
          </div>

          <div className="border-t border-white/10 pt-4">
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-3">Cambiar contraseña</p>
            <div className="flex flex-col gap-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Contraseña actual"
                className="w-full rounded-lg bg-slate-800 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-emerald-400"
                autoComplete="current-password"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña (mín. 6 caracteres)"
                className="w-full rounded-lg bg-slate-800 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-emerald-400"
                autoComplete="new-password"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetir nueva contraseña"
                className="w-full rounded-lg bg-slate-800 ring-1 ring-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-emerald-400"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/15 ring-1 ring-red-400/30 p-2 text-xs flex items-center gap-2 text-red-300">
              <FaExclamationTriangle /> {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-500/15 ring-1 ring-emerald-400/30 p-2 text-xs flex items-center gap-2 text-emerald-300">
              <FaCheck /> {success}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 text-sm"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {saving ? <FaSpinner className="animate-spin" /> : <FaCheck />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setCargando(false);
    if (error) setError("Email o contraseña incorrectos.");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm w-full max-w-sm">
        <h1 className="text-lg font-bold text-slate-900 mb-1">Control de horas</h1>
        <p className="text-sm text-slate-500 mb-6">Acceso solo para RRHH — SERCOMOSA</p>

        {error && <div className="mb-4 text-sm bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2">{error}</div>}

        <label className="block text-xs text-slate-500 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="tu@sercomosa.es"
        />

        <label className="block text-xs text-slate-500 mb-1">Contraseña</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-5"
        />

        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-slate-900 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          {cargando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

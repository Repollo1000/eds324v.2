"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Si pasa, nos vamos al dashboard
      router.push("/dashboard");
      router.refresh(); // Refresca para asegurar que los datos carguen bien

    } catch (err: any) {
      if (err.message.includes("Invalid login credentials")) {
        setError("Correo o contraseña incorrectos.");
      } else {
        setError("Error de conexión. Intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 px-4">
      
      {/* Logo o Título */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-teal-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-teal-600/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Acceso Administrativo</h1>
        <p className="text-zinc-500 text-sm mt-1">Sistema de Control EDS</p>
      </div>

      <div className="w-full max-w-sm bg-white dark:bg-black p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        
        {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100 flex items-center gap-2">
                <span>🚫</span> {error}
            </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Correo Institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-teal-500 outline-none transition"
              placeholder="nombre@empresa.cl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-teal-500 outline-none transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-teal-600/20 transition transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <p className="text-xs text-zinc-400">
                ¿Olvidaste tu clave o no tienes cuenta? <br/>
                Contacta directamente a Administración.
            </p>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] text-zinc-400 opacity-60">
        © 2025 Sistema EDS v2.0 - Acceso Restringido
      </p>
    </div>
  );
}
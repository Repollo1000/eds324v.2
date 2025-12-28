"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!email || !password) {
      setError("Debes ingresar tu correo y contraseña");
      return;
    }

    setLoading(true);

    // Simulación (para demo)
    setTimeout(() => {
      if (email !== "demo@shell.cl") {
        setError("Usuario o contraseña incorrectos");
      } else {
        console.log("Login ok — redirige al dashboard");
      }
      setLoading(false);
    }, 900);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4">

      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-black shadow-xl border border-zinc-200 dark:border-zinc-800 p-8">

        <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Iniciar sesión
        </h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
          Accede al sistema de cuadraturas
        </p>

        {error && (
          <div className="mb-4 text-sm bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Correo institucional
            </label>

            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="usuario@empresa.cl"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Contraseña
            </label>

            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                autoComplete="current-password"
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3 py-2 text-sm pr-12 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-800"
              >
                {showPass ? "Ocultar" : "Ver"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-2.5 transition"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400 text-center">
          ¿Olvidaste tu contraseña?
          <span className="text-teal-600 dark:text-teal-400 cursor-pointer ml-1">
            Recuperar acceso
          </span>
        </p>

        <p className="mt-3 text-xs text-center text-zinc-400">
          Acceso exclusivo personal autorizado
        </p>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // Función auxiliar para saber si un link está activo
  const isActive = (path: string) => pathname === path;

  // Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    // Mantenemos w-64 como en tu diseño
    <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen sticky top-0 z-40">
      
      {/* HEADER DEL SIDEBAR */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-900">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-teal-600/20">
            ⛽
          </div>
          EDS Control
        </h1>
      </div>

      {/* NAVEGACIÓN */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* GRUPO 1: PRINCIPAL */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Principal
          </p>
          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              📊 Resumen mensual
            </Link>
          </div>
        </div>

        {/* GRUPO 2: OPERACIÓN */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Operación
          </p>
          <div className="space-y-1">
            <Link
              href="/dashboard/cuadraturas/nuevo"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard/cuadraturas/nuevo")
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              ➕ Nueva Cuadratura
            </Link>
            
            <Link
              href="/dashboard/cuadraturas"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard/cuadraturas")
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              📋 Historial de Turnos
            </Link>
          </div>
        </div>

        {/* GRUPO 3: ADMINISTRACIÓN */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2 mt-6">
            Administración
          </p>
          <div className="space-y-1">
            <Link
              href="/dashboard/personal"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard/personal")
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              👥 Personal / Licencias
            </Link>

            <Link
              href="/dashboard/pagos"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard/pagos")
                  ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              }`}
            >
              💸 Pagos y Anticipos
            </Link>
          </div>
        </div>
      </nav>

      {/* FOOTER DEL SIDEBAR (Cerrar Sesión) */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50">
        <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
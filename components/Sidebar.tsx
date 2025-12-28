"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  // Función auxiliar para saber si un link está activo
  const isActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-screen sticky top-0">
      
      {/* HEADER DEL SIDEBAR */}
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-900">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white">
            ⛽
          </div>
          EDS Control
        </h1>
      </div>

      {/* NAVEGACIÓN */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        
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

        {/* GRUPO 2: OPERACIÓN (Aquí va "Nuevo Turno") */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Operación
          </p>
          <div className="space-y-1">
            <Link
              href="/dashboard/cuadraturas/nuevo"
              className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive("/dashboard/cuadraturas/nueva")
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
          </div>
        </div>

      </nav>

      {/* FOOTER DEL SIDEBAR (Usuario) */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold">
            U
          </div>
          <div className="text-sm">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">Usuario</p>
            <p className="text-xs text-zinc-500">Operador</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
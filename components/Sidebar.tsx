"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const linkClass = (path: string) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive(path)
        ? "bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
    }`;

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-100 dark:border-zinc-900 shrink-0">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white shadow-md shadow-teal-600/20 text-sm">
            ⛽
          </div>
          EDS Control
        </h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          title="Cerrar menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Principal */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Principal
          </p>
          <div className="space-y-1">
            <Link href="/dashboard" className={linkClass("/dashboard")} onClick={onClose}>
              📊 Resumen mensual
            </Link>
          </div>
        </div>

        {/* Operación */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Operación
          </p>
          <div className="space-y-1">
            <Link href="/dashboard/cuadraturas/nuevo" className={linkClass("/dashboard/cuadraturas/nuevo")} onClick={onClose}>
              ➕ Nueva Cuadratura
            </Link>
            <Link href="/dashboard/turnos" className={linkClass("/dashboard/turnos")} onClick={onClose}>
              📅 Generador de Turnos
            </Link>
            <Link href="/dashboard/cuadraturas" className={linkClass("/dashboard/cuadraturas")} onClick={onClose}>
              📋 Historial de Turnos
            </Link>
          </div>
        </div>

        {/* Administración */}
        <div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 px-2">
            Administración
          </p>
          <div className="space-y-1">
            <Link href="/dashboard/personal" className={linkClass("/dashboard/personal")} onClick={onClose}>
              👥 Personal / Licencias
            </Link>
            <Link href="/dashboard/pagos" className={linkClass("/dashboard/pagos")} onClick={onClose}>
              💸 Pagos y Anticipos
            </Link>
            <Link href="/dashboard/liquidaciones" className={linkClass("/dashboard/liquidaciones")} onClick={onClose}>
              📑 Liquidaciones
            </Link>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}

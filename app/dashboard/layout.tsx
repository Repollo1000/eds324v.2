"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.replace("/login");
      else setIsAuthorized(true);
    };
    checkSession();
  }, [router]);

  if (!isAuthorized) return null; 

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 relative flex">
      
      {/* 1. SIDEBAR */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* 2. BOTÓN DE TOGGLE (MEJORADO) */}
      {/* - CERRADO: left-4 (Esquina flotante)
          - ABIERTO: left-52 (DENTRO del Sidebar, a la derecha). 
            * w-64 son aprox 16rem. left-52 son 13rem. 
            * Queda dentro de la barra blanca, lejos del logo y lejos del contenido.
      */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed top-4 z-50 p-2 rounded-lg transition-all duration-300 ease-in-out ${
          sidebarOpen 
            ? "left-52 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400" // Estilo sutil (X) dentro del menú
            : "left-4 bg-white dark:bg-zinc-950 shadow-md border border-zinc-200 dark:border-zinc-800 text-zinc-600" // Estilo botón (Hamburguesa) flotante
        }`}
        title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
      >
        {sidebarOpen ? (
          // Icono X
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          // Icono Hamburguesa
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div 
        className={`flex-1 transition-all duration-300 ease-in-out ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {children}
      </div>
      
    </div>
  );
}
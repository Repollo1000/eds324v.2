"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Importante para redirigir
import { supabase } from "@/lib/supabase"; // Importante para verificar sesión
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false); // Estado de carga

  // --- PROTECCIÓN DE RUTA ---
  useEffect(() => {
    const checkSession = async () => {
      // Preguntamos a Supabase si hay alguien logueado
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Si no hay sesión, chao -> Al login
        router.replace("/login");
      } else {
        // Si hay sesión, permitimos ver el contenido
        setIsAuthorized(true);
      }
    };

    checkSession();
  }, [router]);

  // Mientras verificamos, mostramos una pantalla de carga blanca limpia
  if (!isAuthorized) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
        </div>
    );
  }

  // Si está autorizado, mostramos el Dashboard normal
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      
      {/* 1. SIDEBAR */}
      <div 
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-white dark:bg-black border-r border-zinc-200 dark:border-zinc-800 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* 2. BOTÓN DE MENU */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-zinc-950 shadow-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
      >
        {sidebarOpen ? (
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        )}
      </button>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div 
        className={`transition-all duration-300 ease-in-out ${
          sidebarOpen ? "lg:pl-72" : "pl-0"
        }`}
      >
        {children}
      </div>
      
    </div>
  );
}
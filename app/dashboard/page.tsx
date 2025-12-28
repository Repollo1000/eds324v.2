"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [mes, setMes] = useState("2024-12");

  // --- DATOS MOCK (Simulación de lo que vendría de la Base de Datos) ---
  // Estos datos sumarían todo lo ingresado en los formularios diarios
  const resumenMes = {
    ventasTotales: 145800200,
    diferenciaCaja: -24500, // Acumulado del mes (rojo si es negativo)
    
    // Lo que pediste específicamente:
    bencinaEnzo: 480500,    // Suma de todos los vales "Bencina Enzo"
    perrosMuertos: 65000,   // Suma de todas las fugas
    turnosExtras: 5,        // Cantidad de turnos extra pagados
    
    // RRHH
    licencias: 2,           // Personas con licencia este mes
    atrasos: 4,             // Personas que llegaron tarde
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* HEADER: Título y Selector de Mes */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Resumen Operativo
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Datos clave para toma de decisiones y reportes ENEX.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-bold text-zinc-500 uppercase px-3">Periodo:</span>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>
      </div>

      {/* SECCIÓN 1: INDICADORES CRÍTICOS (GASTOS Y PÉRDIDAS) */}
      <div>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
          Control de Gastos y Pérdidas (Acumulado Mes)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* CARD: BENCINA ENZO */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                ⛽
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Bencina Enzo</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {formato(resumenMes.bencinaEnzo)}
            </p>
            <p className="text-xs text-blue-600 mt-1 font-medium">Consumo interno</p>
          </div>

          {/* CARD: PERROS MUERTOS */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/5 rounded-bl-full"></div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                🏃‍♂️
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Perros Muertos</p>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formato(resumenMes.perrosMuertos)}
            </p>
            <p className="text-xs text-red-500 mt-1 font-medium">Pérdida directa</p>
          </div>

          {/* CARD: TURNOS EXTRAS */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">
                clock
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Turnos Extras</p>
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {resumenMes.turnosExtras} <span className="text-sm font-normal text-zinc-500">turnos</span>
            </p>
            <p className="text-xs text-amber-600 mt-1 font-medium">Pago adicional req.</p>
          </div>

          {/* CARD: DIFERENCIA DE CAJA */}
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-zinc-600">
                ⚖️
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Diferencia Caja</p>
            </div>
            <p className={`text-2xl font-bold ${resumenMes.diferenciaCaja >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {resumenMes.diferenciaCaja > 0 ? '+' : ''}{formato(resumenMes.diferenciaCaja)}
            </p>
            <p className="text-xs text-zinc-500 mt-1 font-medium">Balance operadores</p>
          </div>

        </div>
      </div>

      {/* SECCIÓN 2: GESTIÓN DE PERSONAL (RRHH) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TARJETA RRHH */}
        <div className="lg:col-span-1 bg-white dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">Novedades Personal</h3>
            <Link href="/dashboard/personal" className="text-xs text-teal-600 hover:underline">Ver detalle</Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Licencias Médicas</span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">{resumenMes.licencias}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-sm text-zinc-600 dark:text-zinc-300">Atrasos / Ausencias</span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-50">{resumenMes.atrasos}</span>
            </div>
            
            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
               <p className="text-xs text-zinc-400 leading-relaxed">
                 * Recuerda revisar estos datos antes de procesar los sueldos a fin de mes.
               </p>
            </div>
          </div>
        </div>

        {/* GRÁFICO / TABLA RESUMEN VENTAS (Espacio Grande) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-teal-900 to-teal-950 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          {/* Decoración Fondo */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-1">Ventas Totales del Periodo</h3>
            <p className="text-teal-200 text-sm mb-6">Acumulado de ventas combustibles + tienda</p>
            
            <div className="flex items-baseline gap-2 mb-8">
              <span className="text-4xl md:text-5xl font-bold">{formato(resumenMes.ventasTotales)}</span>
              <span className="text-teal-300 text-sm">CLP</span>
            </div>

            {/* Accesos rápidos a reportes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm border border-white/5">
                    <span className="text-sm font-medium">📄 Generar Reporte ENEX</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">PDF</span>
                </button>
                <button className="flex items-center justify-between p-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors backdrop-blur-sm border border-white/5">
                    <span className="text-sm font-medium">📊 Detalle por Atendedor</span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded">Ver</span>
                </button>
            </div>
          </div>
        </div>

      </div>

      {/* SECCIÓN 3: PREVISUALIZACIÓN DE CIERRE (Ayuda visual) */}
      <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 flex items-start gap-3">
        <div className="text-zinc-400 mt-1">💡</div>
        <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Consejo para Cierre de Mes</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-2xl">
                Al llenar los formularios de ENEX, utiliza el total de <strong>Bencina Enzo</strong> como "Consumo Interno" y los <strong>Perros Muertos</strong> deben declararse como "Mermas/Pérdidas" para cuadrar el inventario de combustible.
            </p>
        </div>
      </div>

    </div>
  );
}

// Función auxiliar para formato de dinero CL
function formato(amount: number) {
  return amount.toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });
}
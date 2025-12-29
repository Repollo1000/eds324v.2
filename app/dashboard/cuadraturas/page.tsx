"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function CuadraturasPage() {
  const [filtro, setFiltro] = useState("");
  const [turnos, setTurnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos
  const fetchTurnos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('turnos')
      .select('*')
      .order('fecha', { ascending: false }); // Ordenar por fecha descendente
    
    if (!error) setTurnos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTurnos();
  }, []);

  // --- NUEVA FUNCIÓN: ELIMINAR TURNO ---
  const eliminarTurno = async (id: string) => {
    // 1. Preguntar confirmación para evitar accidentes
    const confirmacion = window.confirm("¿Estás seguro de borrar este turno permanentemente? Esta acción no se puede deshacer.");
    
    if (!confirmacion) return;

    // 2. Borrar de Supabase
    const { error } = await supabase
      .from('turnos')
      .delete()
      .eq('id', id);

    if (error) {
      alert("Error al eliminar: " + error.message);
    } else {
      // 3. Recargar la lista visualmente
      alert("🗑️ Turno eliminado correctamente");
      fetchTurnos(); // Recargamos los datos para que desaparezca de la tabla
    }
  };

  const datosFiltrados = turnos.filter(item => 
    item.responsable?.toLowerCase().includes(filtro.toLowerCase()) ||
    item.fecha?.includes(filtro)
  );

  const money = (val: number) => val?.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Historial de Turnos</h1>
          <p className="text-sm text-zinc-500">Datos en tiempo real.</p>
        </div>
        
        <div className="flex gap-3">
            <input 
                type="text" 
                placeholder="Buscar..." 
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
            />
            <Link
            href="/dashboard/cuadraturas/nuevo"
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm flex items-center gap-2"
            >
            <span>+</span> Nuevo Turno
            </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
            <div className="p-8 text-center text-zinc-500">Cargando datos...</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-xs">
                    <tr>
                    <th className="px-6 py-4 font-semibold">Fecha / Turno</th>
                    <th className="px-6 py-4 font-semibold">Responsable</th>
                    <th className="px-6 py-4 font-semibold text-right">Ventas Totales</th>
                    <th className="px-6 py-4 font-semibold text-right">Diferencia</th>
                    <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {datosFiltrados.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                        <td className="px-6 py-4">
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {new Date(item.fecha).toLocaleDateString("es-CL", { timeZone: 'UTC' })}
                            </p>
                            <p className="text-xs text-zinc-500 capitalize">{item.turno}</p>
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600">
                                    {item.responsable.charAt(0)}
                                </div>
                                <span className="text-zinc-700 dark:text-zinc-300">{item.responsable}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                            {money(item.total_ventas)}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className={`px-2 py-1 rounded-md font-bold text-xs ${
                                item.diferencia === 0 ? 'bg-zinc-100 text-zinc-600' :
                                item.diferencia > 0 ? 'bg-emerald-100 text-emerald-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                                {item.diferencia > 0 ? '+' : ''}{money(item.diferencia)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <Link href={`/dashboard/dia/${item.id}`} className="text-teal-600 hover:text-teal-800 font-medium hover:underline text-xs">
                                  Ver Detalle
                              </Link>
                              
                              {/* BOTÓN ELIMINAR */}
                              <button 
                                onClick={() => eliminarTurno(item.id)}
                                className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded"
                                title="Eliminar turno"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                              </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
        )}
        
        {!loading && datosFiltrados.length === 0 && (
            <div className="p-8 text-center text-zinc-500">
                No hay turnos registrados aún.
            </div>
        )}
      </div>
    </div>
  );
}
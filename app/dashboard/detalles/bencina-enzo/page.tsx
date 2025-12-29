"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DetalleBencinaEnzoPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [totalMes, setTotalMes] = useState(0);

  useEffect(() => {
    const fetchMovimientos = async () => {
      setLoading(true);
      
      // 1. Calcular rango de fechas del mes seleccionado
      const [year, month] = mes.split("-");
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      // 2. Traer turnos del mes
      const { data, error } = await supabase
        .from('turnos')
        .select('id, fecha, turno, responsable, gastos')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (!error && data) {
        // 3. Filtrar en Javascript: Solo los que tengan bencinaEnzo > 0
        const filtrados = data
            .map(t => ({
                ...t,
                monto: Number(t.gastos?.bencinaEnzo) || 0 // Extraemos el valor del JSON
            }))
            .filter(t => t.monto > 0); // Solo mostramos si hubo gasto

        setMovimientos(filtrados);
        
        // Calcular total
        const total = filtrados.reduce((acc, curr) => acc + curr.monto, 0);
        setTotalMes(total);
      }
      
      setLoading(false);
    };

    fetchMovimientos();
  }, [mes]);

  const formato = (v: number) => v.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-800 mb-2 flex items-center gap-1">
                ← Volver al Dashboard
            </button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-lg text-xl">⛽</span>
                Detalle Bencina Enzo
            </h1>
            <p className="text-sm text-zinc-500">Historial de cargas de combustible interno.</p>
        </div>

        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <span className="text-xs font-bold text-zinc-500 uppercase px-2">Periodo:</span>
          <input
            type="month"
            value={mes}
            onChange={e => setMes(e.target.value)}
            className="bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
          />
        </div>
      </div>

      {/* RESUMEN TOTAL */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-lg">
            <p className="text-blue-100 text-sm font-medium mb-1">Total Consumo ({mes})</p>
            <p className="text-3xl font-bold">{formato(totalMes)}</p>
        </div>
      </div>

      {/* TABLA DE DETALLE */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
            <div className="p-12 text-center text-zinc-500 animate-pulse">Buscando registros...</div>
        ) : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Fecha</th>
                            <th className="px-6 py-4 font-semibold">Responsable (Atendedor)</th>
                            <th className="px-6 py-4 font-semibold">Turno</th>
                            <th className="px-6 py-4 font-semibold text-right">Monto Cargado</th>
                            <th className="px-6 py-4 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {movimientos.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                    No hay registros de Bencina Enzo en este mes.
                                </td>
                            </tr>
                        ) : (
                            movimientos.map((m) => (
                                <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        {new Date(m.fecha).toLocaleDateString("es-CL", { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                                                {m.responsable.charAt(0)}
                                            </div>
                                            {m.responsable}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 capitalize text-zinc-500">
                                        {m.turno}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                        {formato(m.monto)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/dia/${m.id}`} className="text-blue-600 hover:underline text-xs">
                                            Ver Planilla
                                        </Link>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}
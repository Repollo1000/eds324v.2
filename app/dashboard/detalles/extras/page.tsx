"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useMesFiltro, getFechaRango } from "@/lib/useMesFiltro";
import Link from "next/link";
import MonthPicker from "@/components/MonthPicker";
import { calcularTotalDomingos } from "@/lib/domingos";

export default function DetalleExtrasPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes, isReady] = useMesFiltro();
  // Estado de totales con domingos separados
  const [totales, setTotales] = useState({
    turnoExtra: 0,
    horasExtras: 0,
    tercerDomingo: 0,
    cuartoDomingo: 0,
    quintoDomingo: 0
  });

  useEffect(() => {
    if (!isReady) return;

    const fetchMovimientos = async () => {
      setLoading(true);
      const { startDate, endDate } = getFechaRango(mes);

      const { data, error } = await supabase
        .from('turnos')
        .select('id, fecha, turno, responsable, gastos')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (!error && data) {
        // CORREGIDO: Calcular suma de los 3 domingos separados
        const filtrados = data
            .map(t => ({
                ...t,
                montoTurno: Number(t.gastos?.turnoExtra) || 0,
                montoHora: Number(t.gastos?.horasExtras) || 0,
                // Calcular total de domingos y mantener desglose
                montoDomingoTotal: calcularTotalDomingos(t.gastos),
                tercerDomingo: Number(t.gastos?.tercerDomingo) || 0,
                cuartoDomingo: Number(t.gastos?.cuartoDomingo) || 0,
                quintoDomingo: Number(t.gastos?.quintoDomingo) || 0,
            }))
            .filter(t => t.montoTurno > 0 || t.montoHora > 0 || t.montoDomingoTotal > 0);

        setMovimientos(filtrados);

        // Calcular totales separados
        const totalTurno = filtrados.reduce((acc, curr) => acc + curr.montoTurno, 0);
        const totalHora = filtrados.reduce((acc, curr) => acc + curr.montoHora, 0);
        const total3er = filtrados.reduce((acc, curr) => acc + curr.tercerDomingo, 0);
        const total4to = filtrados.reduce((acc, curr) => acc + curr.cuartoDomingo, 0);
        const total5to = filtrados.reduce((acc, curr) => acc + curr.quintoDomingo, 0);

        setTotales({
          turnoExtra: totalTurno,
          horasExtras: totalHora,
          tercerDomingo: total3er,
          cuartoDomingo: total4to,
          quintoDomingo: total5to
        });
      }
      setLoading(false);
    };

    fetchMovimientos();
  }, [mes, isReady]);

  const formato = (v: number) => v.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  return (
    <div className="p-6 md:p-8 max-w-[85rem] mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-800 mb-2 flex items-center gap-1">← Volver</button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-lg text-xl">⏱️</span>
                Detalle Turnos, Horas y Domingos Extras
            </h1>
        </div>
        <MonthPicker value={mes} onChange={setMes} />
      </div>

      {/* TARJETAS DE RESUMEN - 6 columnas con domingos desglosados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {/* Total */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg col-span-2">
          <p className="text-amber-100 text-xs uppercase font-bold mb-1">Total Pagado</p>
          <p className="text-3xl font-bold">
            {formato(totales.turnoExtra + totales.horasExtras + totales.tercerDomingo + totales.cuartoDomingo + totales.quintoDomingo)}
          </p>
        </div>

        {/* Turnos */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Turnos Extra</p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{formato(totales.turnoExtra)}</p>
        </div>

        {/* Horas */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Horas Extra</p>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200">{formato(totales.horasExtras)}</p>
        </div>

        {/* 3er Domingo */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-rose-100 dark:border-rose-900/30">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1">3er Domingo</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formato(totales.tercerDomingo)}</p>
        </div>

        {/* 4to Domingo */}
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-rose-100 dark:border-rose-900/30">
          <p className="text-zinc-500 text-xs uppercase font-bold mb-1">4to Domingo</p>
          <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formato(totales.cuartoDomingo)}</p>
        </div>

        {/* 5to Domingo (solo si hay datos) */}
        {totales.quintoDomingo > 0 && (
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-rose-100 dark:border-rose-900/30">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">5to Domingo</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">{formato(totales.quintoDomingo)}</p>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? <div className="p-12 text-center text-zinc-500 animate-pulse">Cargando...</div> : (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[800px]">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Responsable</th>
                            <th className="px-6 py-4">Turno</th>
                            <th className="px-6 py-4 text-right bg-amber-50/50 dark:bg-amber-900/10">Turno Extra</th>
                            <th className="px-6 py-4 text-right bg-orange-50/50 dark:bg-orange-900/10">Horas Extra</th>
                            <th className="px-6 py-4 text-right bg-rose-50/50 dark:bg-rose-900/10">3er Dom</th>
                            <th className="px-6 py-4 text-right bg-rose-50/50 dark:bg-rose-900/10">4to Dom</th>
                            <th className="px-6 py-4 text-right bg-rose-50/50 dark:bg-rose-900/10">5to Dom</th>
                            <th className="px-6 py-4 text-right">Total</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {movimientos.length === 0 ? (
                            <tr><td colSpan={10} className="px-6 py-12 text-center text-zinc-500">No hay extras registrados este mes.</td></tr>
                        ) : (
                            movimientos.map((m) => (
                                <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(m.fecha).toLocaleDateString("es-CL", { timeZone: 'UTC' })}</td>
                                    <td className="px-6 py-4 font-medium whitespace-nowrap">{m.responsable}</td>
                                    <td className="px-6 py-4 capitalize text-zinc-500">{m.turno}</td>
                                    <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-amber-50/30 dark:bg-amber-900/5">
                                        {m.montoTurno > 0 ? formato(m.montoTurno) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-orange-50/30 dark:bg-orange-900/5">
                                        {m.montoHora > 0 ? formato(m.montoHora) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-rose-50/30 dark:bg-rose-900/5">
                                        {m.tercerDomingo > 0 ? formato(m.tercerDomingo) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-rose-50/30 dark:bg-rose-900/5">
                                        {m.cuartoDomingo > 0 ? formato(m.cuartoDomingo) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-rose-50/30 dark:bg-rose-900/5">
                                        {m.quintoDomingo > 0 ? formato(m.quintoDomingo) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-amber-600 dark:text-amber-500">
                                        {formato(m.montoTurno + m.montoHora + m.montoDomingoTotal)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/dia/${m.id}`} className="text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 text-xs">Planilla</Link>
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
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DetalleExtrasPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [totales, setTotales] = useState({ turnoExtra: 0, horasExtras: 0 });

  useEffect(() => {
    const fetchMovimientos = async () => {
      setLoading(true);
      const [year, month] = mes.split("-");
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay}`;

      const { data, error } = await supabase
        .from('turnos')
        .select('id, fecha, turno, responsable, gastos')
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .order('fecha', { ascending: false });

      if (!error && data) {
        // Filtramos turnos que tengan ALGÚN tipo de extra
        const filtrados = data
            .map(t => ({
                ...t,
                montoTurno: Number(t.gastos?.turnoExtra) || 0,
                montoHora: Number(t.gastos?.horasExtras) || 0
            }))
            .filter(t => t.montoTurno > 0 || t.montoHora > 0);

        setMovimientos(filtrados);
        
        // Calcular totales separados
        const totalTurno = filtrados.reduce((acc, curr) => acc + curr.montoTurno, 0);
        const totalHora = filtrados.reduce((acc, curr) => acc + curr.montoHora, 0);
        setTotales({ turnoExtra: totalTurno, horasExtras: totalHora });
      }
      setLoading(false);
    };

    fetchMovimientos();
  }, [mes]);

  const formato = (v: number) => v.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
            <button onClick={() => router.back()} className="text-sm text-zinc-500 hover:text-zinc-800 mb-2 flex items-center gap-1">← Volver</button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-lg text-xl">⏱️</span>
                Detalle Turnos y Horas Extras
            </h1>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-500 uppercase px-2">Periodo:</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none" />
        </div>
      </div>

      {/* TARJETAS DE RESUMEN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
         <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white shadow-lg">
            <p className="text-amber-100 text-xs uppercase font-bold mb-1">Total Pagado</p>
            <p className="text-3xl font-bold">{formato(totales.turnoExtra + totales.horasExtras)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Por Turnos Extras</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formato(totales.turnoExtra)}</p>
        </div>
        <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-amber-100 dark:border-amber-900/30">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">Por Horas Extras</p>
            <p className="text-2xl font-bold text-zinc-800 dark:text-zinc-200">{formato(totales.horasExtras)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? <div className="p-12 text-center text-zinc-500 animate-pulse">Cargando...</div> : (
            <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Responsable</th>
                        <th className="px-6 py-4">Turno</th>
                        <th className="px-6 py-4 text-right bg-amber-50/50 dark:bg-amber-900/10">Turno Extra</th>
                        <th className="px-6 py-4 text-right bg-orange-50/50 dark:bg-orange-900/10">Horas Extras</th>
                        <th className="px-6 py-4 text-right">Total Día</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {movimientos.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-500">No hay extras registrados este mes.</td></tr>
                    ) : (
                        movimientos.map((m) => (
                            <tr key={m.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                                <td className="px-6 py-4">{new Date(m.fecha).toLocaleDateString("es-CL", { timeZone: 'UTC' })}</td>
                                <td className="px-6 py-4 font-medium">{m.responsable}</td>
                                <td className="px-6 py-4 capitalize text-zinc-500">{m.turno}</td>
                                <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-amber-50/30 dark:bg-amber-900/5">
                                    {m.montoTurno > 0 ? formato(m.montoTurno) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-zinc-600 dark:text-zinc-300 bg-orange-50/30 dark:bg-orange-900/5">
                                    {m.montoHora > 0 ? formato(m.montoHora) : '-'}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-amber-600">
                                    {formato(m.montoTurno + m.montoHora)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <Link href={`/dashboard/dia/${m.id}`} className="text-zinc-400 hover:text-amber-600 text-xs">Planilla</Link>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        )}
      </div>
    </div>
  );
}
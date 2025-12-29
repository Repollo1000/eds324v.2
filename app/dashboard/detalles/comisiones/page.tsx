"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function DetalleComisionesPage() {
  const router = useRouter();
  const [movimientos, setMovimientos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [totales, setTotales] = useState({ promo: 0, lubri: 0 });

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
        // Filtrar turnos con alguna comisión
        const filtrados = data
            .map(t => ({
                ...t,
                promo: Number(t.gastos?.comisionesPromocion) || 0,
                lubri: Number(t.gastos?.comisionesLubricantes) || 0,
            }))
            .filter(t => t.promo > 0 || t.lubri > 0);

        setMovimientos(filtrados);
        
        const totPromo = filtrados.reduce((acc, curr) => acc + curr.promo, 0);
        const totLubri = filtrados.reduce((acc, curr) => acc + curr.lubri, 0);
        setTotales({ promo: totPromo, lubri: totLubri });
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
                <span className="p-2 bg-yellow-100 text-yellow-700 rounded-lg text-xl">⭐</span>
                Detalle Comisiones
            </h1>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-lg border border-zinc-200">
          <span className="text-xs font-bold text-zinc-500 uppercase px-2">Periodo:</span>
          <input type="month" value={mes} onChange={e => setMes(e.target.value)} className="bg-transparent text-sm font-medium outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
         <div className="bg-white p-5 rounded-xl border border-yellow-200 shadow-sm">
            <p className="text-yellow-600 text-xs uppercase font-bold mb-1">Total Promociones</p>
            <p className="text-2xl font-bold text-zinc-800">{formato(totales.promo)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-yellow-200 shadow-sm">
            <p className="text-yellow-600 text-xs uppercase font-bold mb-1">Total Lubricantes</p>
            <p className="text-2xl font-bold text-zinc-800">{formato(totales.lubri)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        {loading ? <div className="p-12 text-center text-zinc-500">Cargando...</div> : (
            <table className="w-full text-sm text-left">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
                    <tr>
                        <th className="px-6 py-4">Fecha</th>
                        <th className="px-6 py-4">Responsable</th>
                        <th className="px-6 py-4">Turno</th>
                        <th className="px-6 py-4 text-right">Promoción</th>
                        <th className="px-6 py-4 text-right">Lubricantes</th>
                        <th className="px-6 py-4"></th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                    {movimientos.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No hay comisiones.</td></tr>
                    ) : (
                        movimientos.map((m) => (
                            <tr key={m.id} className="hover:bg-zinc-50 transition">
                                <td className="px-6 py-4">{new Date(m.fecha).toLocaleDateString("es-CL", { timeZone: 'UTC' })}</td>
                                <td className="px-6 py-4 font-medium">{m.responsable}</td>
                                <td className="px-6 py-4 capitalize text-zinc-500">{m.turno}</td>
                                <td className="px-6 py-4 text-right font-bold text-zinc-700">{m.promo > 0 ? formato(m.promo) : '-'}</td>
                                <td className="px-6 py-4 text-right font-bold text-zinc-700">{m.lubri > 0 ? formato(m.lubri) : '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <Link href={`/dashboard/dia/${m.id}`} className="text-zinc-400 hover:text-yellow-600 text-xs">Planilla</Link>
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
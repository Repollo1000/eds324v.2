"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export default function DashboardPage() {
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"
  const [loading, setLoading] = useState(true);
  
  // Datos crudos
  const [rawTurnos, setRawTurnos] = useState<any[]>([]);
  const [rawPagos, setRawPagos] = useState<any[]>([]);

  // Gráfico
  const [graficoVentas, setGraficoVentas] = useState<{dia: string, monto: number}[]>([]);

  // Totales
  const [resumen, setResumen] = useState({
    ventasTotales: 0,
    diferenciaCaja: 0,
    bencinaEnzo: 0,
    perrosMuertos: 0,
    turnosExtrasMonto: 0,
    horasExtrasMonto: 0,
    comisionesPromocion: 0,
    comisionesLubricantes: 0,
    totalAnticipos: 0,
    totalAguinaldos: 0,
  });

  useEffect(() => {
    const cargarResumen = async () => {
      setLoading(true);

      const [yearStr, monthStr] = mes.split("-");
      const year = parseInt(yearStr);
      const month = parseInt(monthStr);

      // Calcular primer y último día del mes
      const startDate = `${yearStr}-${monthStr}-01`;
      // Truco: día 0 del mes siguiente es el último día del mes actual
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${yearStr}-${monthStr}-${lastDay}`;

      console.log("📅 Buscando datos entre:", startDate, "y", endDate);

      // 1. CONSULTA DB
      const promiseTurnos = supabase.from("turnos").select("*").gte("fecha", startDate).lte("fecha", endDate).order('fecha');
      const promisePagos = supabase.from("pagos_personal").select("*").gte("fecha", startDate).lte("fecha", endDate).order('fecha');

      const [resTurnos, resPagos] = await Promise.all([promiseTurnos, promisePagos]);

      if (resTurnos.error || resPagos.error) {
        console.error("Error cargando datos:", resTurnos.error || resPagos.error);
        setLoading(false);
        return;
      }

      setRawTurnos(resTurnos.data || []);
      setRawPagos(resPagos.data || []);

      // 2. PROCESAR TURNOS
      let totalVentas = 0;
      let totalDiferencia = 0;
      let totalBencinaEnzo = 0;
      let totalPerros = 0;
      let montoTurnosExtras = 0;
      let montoHorasExtras = 0;
      let comPromocion = 0;
      let comLubricantes = 0;

      // Diccionario para gráfico
      const ventasPorDia: Record<string, number> = {};

      resTurnos.data?.forEach((t) => {
        const ventaDia = Number(t.total_ventas) || 0;
        totalVentas += ventaDia;
        totalDiferencia += Number(t.diferencia) || 0;

        // --- LÓGICA DE GRÁFICO CORREGIDA ---
        // Aseguramos obtener solo el día (DD) de la fecha YYYY-MM-DD
        // Usamos split para evitar problemas de zona horaria con new Date()
        const diaPart = t.fecha.split('T')[0].split('-')[2]; 
        const diaNum = parseInt(diaPart).toString(); // Quita ceros a la izquierda (05 -> 5) para normalizar
        
        ventasPorDia[diaNum] = (ventasPorDia[diaNum] || 0) + ventaDia;

        // Sumar Gastos
        if (t.gastos) {
          totalBencinaEnzo += Number(t.gastos.bencinaEnzo) || 0;
          totalPerros += Number(t.gastos.perrosMuertos) || 0;
          montoTurnosExtras += Number(t.gastos.turnoExtra) || 0;
          montoHorasExtras += Number(t.gastos.horasExtras) || 0;
          comPromocion += Number(t.gastos.comisionesPromocion) || 0;
          comLubricantes += Number(t.gastos.comisionesLubricantes) || 0;
        }
      });

      // Rellenar array del gráfico con todos los días del mes (incluso los vacíos)
      const datosGrafico = [];
      for (let i = 1; i <= lastDay; i++) {
        const diaKey = i.toString();
        datosGrafico.push({ 
            dia: i.toString(), // "1", "2"... 
            monto: ventasPorDia[diaKey] || 0 
        });
      }
      setGraficoVentas(datosGrafico);

      // 3. PROCESAR PAGOS
      let sumAnticipos = 0;
      let sumAguinaldos = 0;
      resPagos.data?.forEach((p) => {
        if (p.tipo === 'anticipo') sumAnticipos += Number(p.monto);
        if (p.tipo === 'aguinaldo') sumAguinaldos += Number(p.monto);
      });

      setResumen({
        ventasTotales: totalVentas,
        diferenciaCaja: totalDiferencia,
        bencinaEnzo: totalBencinaEnzo,
        perrosMuertos: totalPerros,
        turnosExtrasMonto: montoTurnosExtras,
        horasExtrasMonto: montoHorasExtras,
        comisionesPromocion: comPromocion,
        comisionesLubricantes: comLubricantes,
        totalAnticipos: sumAnticipos,
        totalAguinaldos: sumAguinaldos,
      });

      setLoading(false);
    };

    cargarResumen();
  }, [mes]);

  const handleExportExcel = () => {
    const datosOperativos = rawTurnos.map(t => ({
        Fecha: t.fecha,
        Turno: t.turno,
        Responsable: t.responsable,
        'Venta Total': t.total_ventas,
        'Diferencia Caja': t.diferencia,
        'Bencina Enzo': t.gastos?.bencinaEnzo || 0,
        'Perros Muertos': t.gastos?.perrosMuertos || 0,
        'Com. Promoción': t.gastos?.comisionesPromocion || 0,
        'Com. Lubricantes': t.gastos?.comisionesLubricantes || 0,
        'Turnos Extra ($)': t.gastos?.turnoExtra || 0,
        'Horas Extra ($)': t.gastos?.horasExtras || 0,
    }));
    const datosRRHH = rawPagos.map(p => ({
        Fecha: p.fecha,
        Personal: p.nombre_personal,
        Tipo: p.tipo.toUpperCase(),
        Monto: p.monto,
        Comentario: p.comentario
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(datosOperativos);
    XLSX.utils.book_append_sheet(wb, ws1, "Operaciones");
    const ws2 = XLSX.utils.json_to_sheet(datosRRHH);
    XLSX.utils.book_append_sheet(wb, ws2, "Pagos RRHH");
    XLSX.writeFile(wb, `Reporte_Mensual_${mes}.xlsx`);
  };

  const money = (val: number) => val.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Resumen Operativo</h1>
          <p className="text-sm text-zinc-500">Consolidado del mes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition"
          >
            <span>📊</span> Exportar Excel
          </button>
          
          <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <span className="text-xs font-bold text-zinc-500 uppercase px-3">Periodo:</span>
            <input
              type="month"
              value={mes}
              onChange={e => setMes(e.target.value)}
              className="bg-transparent text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-zinc-500 animate-pulse">Cargando datos...</div>
      ) : (
        <>
        {/* 1. VENTA TOTAL */}
        <div className="bg-gradient-to-r from-teal-900 to-teal-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
                 <div>
                     <h3 className="text-teal-200 text-sm font-medium mb-1">Ventas Totales del Periodo</h3>
                     <p className="text-4xl md:text-5xl font-bold">{money(resumen.ventasTotales)}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 text-center">
                     <p className="text-xs text-teal-200 uppercase mb-1">Diferencia de Caja</p>
                     <p className={`text-2xl font-bold ${resumen.diferenciaCaja >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                         {resumen.diferenciaCaja > 0 ? '+' : ''}{money(resumen.diferenciaCaja)}
                     </p>
                 </div>
             </div>
        </div>

        {/* 2. GRÁFICO DE TENDENCIA (CORREGIDO) */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6">Tendencia de Ventas Diaria</h3>
            <div className="h-48 flex items-end gap-2 min-w-[600px] pb-2">
                {graficoVentas.map((dato) => {
                    const maxVenta = Math.max(...graficoVentas.map(d => d.monto), 1);
                    const porcentaje = (dato.monto / maxVenta) * 100;
                    
                    // Aseguramos que si hay venta, se vea al menos un 5% de altura
                    const alturaVisual = dato.monto > 0 ? Math.max(porcentaje, 5) : 0;

                    return (
                        <div key={dato.dia} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end">
                            {/* Barra */}
                            <div 
                                className={`w-full rounded-t-sm transition-all duration-500 relative ${
                                    dato.monto > 0 
                                    ? "bg-teal-500 hover:bg-teal-400" 
                                    : "bg-zinc-100 dark:bg-zinc-800 h-1"
                                }`}
                                style={{ height: dato.monto > 0 ? `${alturaVisual}%` : '4px' }}
                            >
                                {/* Tooltip Flotante */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition bg-black text-white text-[10px] py-1 px-2 rounded whitespace-nowrap z-20 pointer-events-none">
                                    ${dato.monto.toLocaleString("es-CL")}
                                </div>
                            </div>
                            
                            {/* Día */}
                            <span className="text-[10px] text-zinc-400 font-medium">{dato.dia}</span>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* 3. GRID OPERATIVO */}
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4">Detalle de Gastos y Comisiones</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <Link href="/dashboard/detalles/comisiones" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-yellow-100 dark:border-yellow-900/30 shadow-sm hover:shadow-md hover:border-yellow-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-yellow-600">⭐</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Comisiones</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-zinc-500">Promoción:</span><span className="font-bold">{money(resumen.comisionesPromocion)}</span></div>
                        <div className="flex justify-between text-xs pt-1 border-t border-zinc-100 dark:border-zinc-800"><span className="text-zinc-500">Lubricantes:</span><span className="font-bold">{money(resumen.comisionesLubricantes)}</span></div>
                    </div>
                    <p className="text-[10px] text-yellow-600 mt-2 font-medium text-right group-hover:underline">Ver detalle →</p>
                </div>
            </Link>

            <Link href="/dashboard/detalles/bencina-enzo" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm hover:shadow-md hover:border-blue-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">⛽</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Bencina Enzo</p>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{money(resumen.bencinaEnzo)}</p>
                    <p className="text-[10px] text-blue-600 mt-1 font-medium text-right group-hover:underline">Ver detalle →</p>
                </div>
            </Link>

            <Link href="/dashboard/detalles/perros-muertos" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm hover:shadow-md hover:border-red-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">🏃‍♂️</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Perros Muertos</p>
                    </div>
                    <p className="text-2xl font-bold text-red-600">{money(resumen.perrosMuertos)}</p>
                    <p className="text-[10px] text-red-600 mt-1 font-medium text-right group-hover:underline">Ver detalle →</p>
                </div>
            </Link>

            <Link href="/dashboard/detalles/extras" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm hover:shadow-md hover:border-amber-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-amber-600">⏱️</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Extras</p>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{money(resumen.turnosExtrasMonto + resumen.horasExtrasMonto)}</p>
                    <p className="text-[10px] text-amber-600 mt-1 font-medium text-right group-hover:underline">Ver detalle →</p>
                </div>
            </Link>
        </div>

        {/* 4. GRID RRHH */}
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mt-4">Recursos Humanos (RRHH)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
             <Link href="/dashboard/pagos" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-cyan-100 dark:border-cyan-900/30 shadow-sm hover:shadow-md hover:border-cyan-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg text-cyan-600">💸</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Anticipos</p>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{money(resumen.totalAnticipos)}</p>
                    <p className="text-[10px] text-cyan-600 mt-1 font-medium text-right group-hover:underline">Gestionar →</p>
                </div>
            </Link>

            <Link href="/dashboard/pagos" className="block h-full">
                <div className="h-full bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-sm hover:shadow-md hover:border-purple-300 transition cursor-pointer group">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-600">🎁</div>
                        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Aguinaldos</p>
                    </div>
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{money(resumen.totalAguinaldos)}</p>
                    <p className="text-[10px] text-purple-600 mt-1 font-medium text-right group-hover:underline">Gestionar →</p>
                </div>
            </Link>

            <div className="col-span-1 sm:col-span-2 bg-zinc-50 dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
                <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Total Desembolso Personal</p>
                <div className="flex items-baseline justify-between">
                    <span className="text-3xl font-bold text-zinc-800 dark:text-zinc-200">
                        {money(resumen.turnosExtrasMonto + resumen.horasExtrasMonto + resumen.totalAnticipos + resumen.totalAguinaldos)}
                    </span>
                    <span className="text-xs text-zinc-500 text-right">
                        (Extras + Anticipos + Aguinaldos)
                    </span>
                </div>
            </div>
        </div>
        </>
      )}
    </div>
  );
}
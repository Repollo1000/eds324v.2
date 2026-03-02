"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useMesFiltro, getFechaRango } from "@/lib/useMesFiltro";
import { Users } from 'lucide-react';
import { toast } from "@/lib/toast";
import ConfirmModal from "@/components/ConfirmModal";
import MonthPicker from "@/components/MonthPicker";

type FiltroTurno = "" | "mañana" | "tarde" | "noche";
type Vista = "detalle" | "agrupada";

export default function CuadraturasPage() {
  const [filtro, setFiltro] = useState("");
  const [filtroTurno, setFiltroTurno] = useState<FiltroTurno>("");
  const [vista, setVista] = useState<Vista>("detalle");
  const [mes, setMes, isReady] = useMesFiltro();
  const [turnos, setTurnos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{ id: string } | null>(null);

  // Cargar datos del mes seleccionado
  const fetchTurnos = async () => {
    setLoading(true);
    const { startDate, endDate } = getFechaRango(mes);

    const { data, error } = await supabase
      .from("turnos")
      .select("*")
      .gte("fecha", startDate)
      .lte("fecha", endDate)
      .order("fecha", { ascending: false });

    if (!error) setTurnos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isReady) return;
    fetchTurnos();
  }, [mes, isReady]);

  const confirmarEliminar = (id: string) => {
    setConfirmModal({ id });
  };

  const eliminarTurno = async () => {
    if (!confirmModal) return;
    const { error } = await supabase.from("turnos").delete().eq("id", confirmModal.id);
    if (error) {
      toast.error("Error al eliminar", error.message);
    } else {
      toast.success("Turno eliminado", "El registro fue borrado permanentemente");
      fetchTurnos();
    }
    setConfirmModal(null);
  };

  // Filtrado combinado: texto + turno
  const datosFiltrados = turnos.filter((item) => {
    const matchTexto =
      !filtro ||
      item.responsable?.toLowerCase().includes(filtro.toLowerCase()) ||
      item.fecha?.includes(filtro);
    const matchTurno = !filtroTurno || item.turno === filtroTurno;
    return matchTexto && matchTurno;
  });

  const datosAgrupados = useMemo(() => {
    if (vista !== 'agrupada') return [];

    const grouped = datosFiltrados.reduce((acc, item) => {
      const responsable = item.responsable || "Sin Asignar";
      if (!acc[responsable]) {
        acc[responsable] = {
          responsable,
          turnos: 0,
          total_ventas: 0,
          diferencia: 0,
        };
      }
      acc[responsable].turnos += 1;
      acc[responsable].total_ventas += Number(item.total_ventas) || 0;
      acc[responsable].diferencia += Number(item.diferencia) || 0;
      return acc;
    }, {} as any);

    return Object.values(grouped).sort((a: any, b: any) => b.diferencia - a.diferencia);
  }, [datosFiltrados, vista]);


  // Resumen del subset visible
  const totalVentas = datosFiltrados.reduce(
    (acc, t) => acc + (Number(t.total_ventas) || 0),
    0
  );
  const totalDiferencia = datosFiltrados.reduce(
    (acc, t) => acc + (Number(t.diferencia) || 0),
    0
  );

  const money = (val: number) =>
    val?.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  const turnoBadge = (turno: string) => {
    switch (turno) {
      case "mañana":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "tarde":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "noche":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-zinc-100 text-zinc-600";
    }
  };

  const turnoLabel = (turno: string) => {
    switch (turno) {
      case "mañana":
        return "Mañana";
      case "tarde":
        return "Tarde";
      case "noche":
        return "Noche";
      default:
        return turno;
    }
  };

  const pills: { label: string; value: FiltroTurno }[] = [
    { label: "Todos", value: "" },
    { label: "Mañana", value: "mañana" },
    { label: "Tarde", value: "tarde" },
    { label: "Noche", value: "noche" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Historial de Turnos
          </h1>
          <p className="text-sm text-zinc-500">
            {datosFiltrados.length} registros
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Buscar responsable..."
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

      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Pills de turno */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
          {pills.map((p) => (
            <button
              key={p.value}
              onClick={() => setFiltroTurno(p.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                filtroTurno === p.value
                  ? "bg-white dark:bg-zinc-800 text-teal-700 dark:text-teal-400 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
            <button
              onClick={() => setVista(vista === "detalle" ? "agrupada" : "detalle")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-700"
            >
              <Users size={14} />
              {vista === "detalle" ? "Agrupar por Responsable" : "Mostrar Detalle"}
            </button>
        </div>

        {/* Selector de fecha */}
        <MonthPicker value={mes} onChange={setMes} />
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">
            Cargando datos...
          </div>
        ) : vista === 'detalle' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-5 py-3 font-semibold">Fecha</th>
                  <th className="px-5 py-3 font-semibold">Turno</th>
                  <th className="px-5 py-3 font-semibold">Responsable</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Ventas
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Efectivo Real
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Diferencia
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {datosFiltrados.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(item.fecha).toLocaleDateString("es-CL", {
                          timeZone: "UTC",
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`px-2 py-1 rounded-md text-xs font-bold ${turnoBadge(
                          item.turno
                        )}`}
                      >
                        {turnoLabel(item.turno)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600">
                          {item.responsable?.charAt(0)}
                        </div>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {item.responsable}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {money(item.total_ventas)}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-600 dark:text-zinc-400">
                      {money(item.efectivo_real)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`px-2 py-1 rounded-md font-bold text-xs ${
                          item.diferencia === 0
                            ? "bg-zinc-100 text-zinc-600"
                            : item.diferencia > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.diferencia > 0 ? "+" : ""}
                        {money(item.diferencia)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard/dia/${item.id}`}
                          className="text-teal-600 hover:text-teal-800 font-medium hover:underline text-xs"
                        >
                          Ver Detalle
                        </Link>
                        <button
                          onClick={() => confirmarEliminar(item.id)}
                          className="text-red-400 hover:text-red-600 transition p-1 hover:bg-red-50 rounded"
                          title="Eliminar turno"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
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
              {datosFiltrados.length > 0 && (
                <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <td colSpan={3} className="px-5 py-3">
                      <span className="text-xs font-bold text-zinc-500">
                        {datosFiltrados.length} turnos
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {money(totalVentas)}
                      </span>
                    </td>
                    <td className="px-5 py-3"></td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-xs font-bold ${
                          totalDiferencia >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {totalDiferencia > 0 ? "+" : ""}
                        {money(totalDiferencia)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-5 py-3 font-semibold">Responsable</th>
                  <th className="px-5 py-3 font-semibold text-center">Turnos</th>
                  <th className="px-5 py-3 font-semibold text-right">Total Ventas</th>
                  <th className="px-5 py-3 font-semibold text-right">Diferencia Acumulada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {(datosAgrupados as any[]).map((item) => (
                  <tr
                    key={item.responsable}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600">
                          {item.responsable?.charAt(0)}
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {item.responsable}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center font-medium text-zinc-600 dark:text-zinc-400">
                      {item.turnos}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {money(item.total_ventas)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`px-2 py-1 rounded-md font-bold text-xs ${
                          item.diferencia === 0
                            ? "bg-zinc-100 text-zinc-600"
                            : item.diferencia > 0
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.diferencia > 0 ? "+" : ""}
                        {money(item.diferencia)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {datosAgrupados.length > 0 && (
                <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold text-zinc-500">
                        {datosAgrupados.length} responsables
                      </span>
                    </td>
                    <td className="px-5 py-3"></td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {money(totalVentas)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`text-xs font-bold ${
                          totalDiferencia >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {money(totalDiferencia)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}

        {!loading && datosFiltrados.length === 0 && (
          <div className="p-8 text-center text-zinc-500">
            No hay turnos en este periodo.
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!confirmModal}
        onConfirm={eliminarTurno}
        onCancel={() => setConfirmModal(null)}
        title="Eliminar turno"
        message="¿Estás seguro de borrar este turno permanentemente? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}

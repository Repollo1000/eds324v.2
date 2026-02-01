"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMesFiltro } from "@/lib/useMesFiltro";
import Link from "next/link";

type Empleado = { id: string; nombre: string };
type Ausencia = {
  id: string;
  personal_id: string;
  fecha: string;
  tipo: string;
  dias: number;
  observaciones: string;
  reemplazo: string;
  personal: { nombre: string };
};

export default function AusenciasPage() {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);

  // Filtro de mes
  const [mes, setMes] = useMesFiltro();

  // Formulario
  const [personalId, setPersonalId] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [tipo, setTipo] = useState("ausencia");
  const [dias, setDias] = useState("1");
  const [reemplazo, setReemplazo] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Cargar empleados y ausencias
  useEffect(() => {
    const fetchData = async () => {
      const { data: personalData } = await supabase
        .from("personal")
        .select("id, nombre")
        .eq("activo", true)
        .order("nombre");

      if (personalData) setEmpleados(personalData);
      fetchAusencias();
    };
    fetchData();
  }, [mes]);

  const fetchAusencias = async () => {
    const [year, month] = mes.split("-");
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const { data } = await supabase
      .from("ausencias")
      .select("*, personal:personal_id(nombre)")
      .gte("fecha", startDate)
      .lte("fecha", endDate)
      .order("fecha", { ascending: false });

    if (data) setAusencias(data as Ausencia[]);
  };

  // Guardar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalId) {
      alert("Selecciona un trabajador");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("ausencias").insert([
      {
        personal_id: personalId,
        fecha,
        tipo,
        dias: Number(dias) || 1,
        observaciones,
        reemplazo,
      },
    ]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      setDias("1");
      setObservaciones("");
      setReemplazo("");
      fetchAusencias();
    }
    setLoading(false);
  };

  // Eliminar
  const handleEliminar = async (id: string) => {
    if (!confirm("¿Eliminar este registro?")) return;
    const { error } = await supabase.from("ausencias").delete().eq("id", id);
    if (!error) fetchAusencias();
  };

  const totalAusencias = ausencias.filter((a) => a.tipo === "ausencia").length;
  const totalLicencias = ausencias.filter(
    (a) => a.tipo === "licencia_medica"
  ).length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Ausencias y Licencias
          </h1>
          <p className="text-sm text-zinc-500">
            Registra ausencias y licencias médicas del personal.
          </p>
        </div>
        <Link
          href="/dashboard/importar"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800 border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
        >
          Importar Excel
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-4">
              Registrar Ausencia
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Trabajador
                </label>
                <select
                  value={personalId}
                  onChange={(e) => setPersonalId(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                >
                  <option value="">-- Seleccionar --</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Tipo
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTipo("ausencia")}
                    className={`flex-1 py-2 text-sm rounded border ${
                      tipo === "ausencia"
                        ? "bg-orange-50 border-orange-500 text-orange-700 font-bold"
                        : "border-zinc-300 text-zinc-500"
                    }`}
                  >
                    Ausencia
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipo("licencia_medica")}
                    className={`flex-1 py-2 text-sm rounded border ${
                      tipo === "licencia_medica"
                        ? "bg-rose-50 border-rose-500 text-rose-700 font-bold"
                        : "border-zinc-300 text-zinc-500"
                    }`}
                  >
                    Licencia Médica
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Días
                </label>
                <input
                  type="number"
                  min="1"
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Reemplazo (Opcional)
                </label>
                <select
                  value={reemplazo}
                  onChange={(e) => setReemplazo(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                >
                  <option value="">-- Sin reemplazo --</option>
                  {empleados.map((e) => (
                    <option key={e.id} value={e.nombre}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Observaciones (Opcional)
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-sm"
                  placeholder="Ej: 3 LICENCIA, 14 DIAS..."
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-3 rounded-lg font-bold hover:opacity-90 transition"
              >
                {loading ? "Guardando..." : "Registrar"}
              </button>
            </form>
          </div>
        </div>

        {/* LISTADO */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filtro Mes */}
          <div className="flex items-center justify-between bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              Registros del Mes
            </span>
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              className="bg-transparent font-medium text-zinc-600 focus:outline-none"
            />
          </div>

          {/* Tabla */}
          <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3 text-center">Tipo</th>
                  <th className="px-4 py-3 text-center">Días</th>
                  <th className="px-4 py-3">Reemplazo</th>
                  <th className="px-4 py-3">Obs</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {ausencias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-zinc-500"
                    >
                      No hay registros este mes.
                    </td>
                  </tr>
                ) : (
                  ausencias.map((a) => (
                    <tr
                      key={a.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition"
                    >
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(a.fecha).toLocaleDateString("es-CL", {
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                        {a.personal?.nombre || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            a.tipo === "ausencia"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {a.tipo === "licencia_medica"
                            ? "Licencia"
                            : "Ausencia"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-bold">
                        {a.dias}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                        {a.reemplazo || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-500 text-xs max-w-[120px] truncate">
                        {a.observaciones || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEliminar(a.id)}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="Eliminar"
                        >
                          &#x1F5D1;&#xFE0F;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {ausencias.length > 0 && (
                <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 font-bold border-t border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <td colSpan={7} className="px-4 py-3">
                      <div className="flex gap-6 text-sm">
                        <span className="text-orange-600">
                          Ausencias: {totalAusencias}
                        </span>
                        <span className="text-rose-600">
                          Licencias: {totalLicencias}
                        </span>
                        <span className="text-zinc-600">
                          Total registros: {ausencias.length}
                        </span>
                      </div>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

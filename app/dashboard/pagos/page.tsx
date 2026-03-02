"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMesFiltro, getFechaRango } from "@/lib/useMesFiltro";
import { toast } from "@/lib/toast";
import ConfirmModal from "@/components/ConfirmModal";
import MonthPicker from "@/components/MonthPicker";
import MoneyInput from "@/components/MoneyInput";

type Empleado = { id: string; nombre: string };
type Pago = {
  id: string;
  fecha: string;
  tipo: string;
  monto: number;
  nombre_personal: string;
  comentario: string;
};

export default function PagosPage() {
  const [loading, setLoading] = useState(false);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  // Filtro de mes para la lista
  const [mes, setMes, isReady] = useMesFiltro();

  // Formulario
  const [personalId, setPersonalId] = useState("");
  const [tipo, setTipo] = useState("anticipo"); // anticipo | aguinaldo
  const [monto, setMonto] = useState(0);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [comentario, setComentario] = useState("");

  // Modal confirmación
  const [confirmModal, setConfirmModal] = useState<{ id: string } | null>(null);

  // 1. Cargar Empleados y Pagos
  useEffect(() => {
    if (!isReady) return;

    const fetchData = async () => {
      // Cargar personal activo
      const { data: personalData } = await supabase
        .from('personal')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');

      if (personalData) setEmpleados(personalData);

      fetchPagos();
    };
    fetchData();
  }, [mes, isReady]); // Recargar pagos si cambia el mes

  const fetchPagos = async () => {
    const { startDate, endDate } = getFechaRango(mes);

    const { data } = await supabase
      .from('pagos_personal')
      .select('*')
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .order('fecha', { ascending: false });

    if (data) setPagos(data);
  };

  // 2. Guardar Pago
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalId || monto === 0) { toast.warning("Faltan datos", "Selecciona un trabajador e ingresa el monto"); return; }

    setLoading(true);

    // Buscar nombre del empleado seleccionado para guardarlo también
    const empleado = empleados.find(e => e.id === personalId);

    const { error } = await supabase.from('pagos_personal').insert([{
      fecha,
      tipo,
      monto,
      personal_id: personalId,
      nombre_personal: empleado?.nombre || "Desconocido",
      comentario
    }]);

    if (error) {
      toast.error("Error al guardar", error.message);
    } else {
      // Limpiar formulario y recargar
      setMonto(0);
      setComentario("");
      fetchPagos();
      toast.success("Pago registrado", "El anticipo fue guardado correctamente");
    }
    setLoading(false);
  };

  // 3. Eliminar Pago
  const confirmarEliminar = (id: string) => {
    setConfirmModal({ id });
  };

  const handleEliminar = async () => {
    if (!confirmModal) return;
    const { error } = await supabase.from('pagos_personal').delete().eq('id', confirmModal.id);
    if (!error) {
      toast.success("Pago eliminado", "El registro fue borrado del sistema");
      fetchPagos();
    } else {
      toast.error("Error al eliminar", error.message);
    }
    setConfirmModal(null);
  };

  const totalDelMes = pagos.reduce((acc, p) => acc + p.monto, 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Pagos y Anticipos (RRHH)</h1>
        <p className="text-sm text-zinc-500">Gestiona anticipos de sueldo y aguinaldos del personal.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE INGRESO */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm sticky top-6">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-200 mb-4">Registrar Nuevo Pago</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Trabajador</label>
                <select 
                  value={personalId} 
                  onChange={e => setPersonalId(e.target.value)} 
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                >
                  <option value="">-- Seleccionar --</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Tipo de Pago</label>
                <div className="flex gap-2">
                    <button 
                        type="button"
                        onClick={() => setTipo("anticipo")}
                        className={`flex-1 py-2 text-sm rounded border ${tipo === 'anticipo' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-zinc-300 text-zinc-500'}`}
                    >
                        Anticipo
                    </button>
                    <button 
                        type="button"
                        onClick={() => setTipo("aguinaldo")}
                        className={`flex-1 py-2 text-sm rounded border ${tipo === 'aguinaldo' ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'border-zinc-300 text-zinc-500'}`}
                    >
                        Aguinaldo
                    </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Monto</label>
                <MoneyInput
                    value={monto}
                    onChange={setMonto}
                    className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 font-bold text-lg"
                    placeholder="$ 0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Fecha</label>
                <input 
                    type="date" 
                    value={fecha} 
                    onChange={e => setFecha(e.target.value)} 
                    className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Comentario (Opcional)</label>
                <input 
                    type="text" 
                    value={comentario} 
                    onChange={e => setComentario(e.target.value)} 
                    className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-sm" 
                    placeholder="Ej: Adelanto quincena"
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black py-3 rounded-lg font-bold hover:opacity-90 transition"
              >
                {loading ? "Guardando..." : "Registrar Pago"}
              </button>

            </form>
          </div>
        </div>

        {/* LISTADO HISTORIAL */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Filtro de Mes */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <span className="font-bold text-zinc-700 dark:text-zinc-300">Historial del Mes</span>
                <MonthPicker value={mes} onChange={setMes} />
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Personal</th>
                            <th className="px-4 py-3 text-center">Tipo</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                            <th className="px-4 py-3 text-right"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {pagos.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No hay pagos registrados este mes.</td></tr>
                        ) : (
                            pagos.map(p => (
                                <tr key={p.id} className="hover:bg-zinc-50 transition">
                                    <td className="px-4 py-3 text-zinc-500">{new Date(p.fecha).toLocaleDateString("es-CL", {timeZone: 'UTC'})}</td>
                                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                        {p.nombre_personal}
                                        {p.comentario && <p className="text-xs text-zinc-400 font-normal">{p.comentario}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            p.tipo === 'anticipo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {p.tipo}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100">
                                        {p.monto.toLocaleString("es-CL", {style: 'currency', currency: 'CLP'})}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button 
                                            onClick={() => confirmarEliminar(p.id)}
                                            className="text-red-400 hover:text-red-600 p-1"
                                            title="Eliminar"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                    {/* Footer de Tabla con Total */}
                    {pagos.length > 0 && (
                        <tfoot className="bg-zinc-50 dark:bg-zinc-900/50 font-bold border-t border-zinc-200 dark:border-zinc-800">
                            <tr>
                                <td colSpan={3} className="px-4 py-3 text-right text-zinc-600">TOTAL PAGADO:</td>
                                <td className="px-4 py-3 text-right text-zinc-900 dark:text-zinc-100">
                                    {totalDelMes.toLocaleString("es-CL", {style: 'currency', currency: 'CLP'})}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

        </div>
      </div>

      <ConfirmModal
        open={!!confirmModal}
        onConfirm={handleEliminar}
        onCancel={() => setConfirmModal(null)}
        title="Eliminar pago"
        message="¿Estás seguro de borrar este registro de pago?"
        confirmText="Eliminar"
        variant="danger"
      />
    </div>
  );
}
"use client";

import { useState } from "react";

// Tipo para las novedades
type Novedad = {
  id: string;
  empleado: string;
  tipo: "licencia" | "ausencia" | "permiso";
  fechaInicio: string;
  fechaFin: string;
  observacion: string;
};

// Datos de ejemplo
const dataInicial: Novedad[] = [
  { id: "1", empleado: "Dayrishell", tipo: "licencia", fechaInicio: "2024-12-01", fechaFin: "2024-12-05", observacion: "Licencia médica gripe" },
  { id: "2", empleado: "Mauricio", tipo: "permiso", fechaInicio: "2024-12-10", fechaFin: "2024-12-10", observacion: "Trámites personales" },
];

export default function PersonalPage() {
  const [novedades, setNovedades] = useState(dataInicial);
  const [showForm, setShowForm] = useState(false);

  // Estados form simple
  const [nuevo, setNuevo] = useState({ empleado: "", tipo: "ausencia", fechaInicio: "", fechaFin: "", observacion: "" });

  const handleSave = () => {
    // Aquí guardarías en BD
    setNovedades([...novedades, { ...nuevo, id: crypto.randomUUID(), tipo: nuevo.tipo as any }]);
    setShowForm(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Gestión de Personal</h1>
          <p className="text-sm text-zinc-500">Registro de ausencias, licencias y permisos.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showForm ? "Cancelar" : "+ Nueva Novedad"}
        </button>
      </div>

      {/* FORMULARIO RÁPIDO */}
      {showForm && (
        <div className="bg-zinc-50 dark:bg-zinc-900 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 mb-8">
          <h3 className="font-bold mb-4">Ingresar Novedad</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input type="text" placeholder="Nombre Empleado" className="p-2 rounded border" onChange={e => setNuevo({...nuevo, empleado: e.target.value})} />
            <select className="p-2 rounded border" onChange={e => setNuevo({...nuevo, tipo: e.target.value})}>
                <option value="ausencia">Ausencia (Falta)</option>
                <option value="licencia">Licencia Médica</option>
                <option value="permiso">Permiso</option>
            </select>
            <input type="date" className="p-2 rounded border" onChange={e => setNuevo({...nuevo, fechaInicio: e.target.value})} />
            <input type="date" className="p-2 rounded border" onChange={e => setNuevo({...nuevo, fechaFin: e.target.value})} />
            <input type="text" placeholder="Observación" className="md:col-span-2 p-2 rounded border" onChange={e => setNuevo({...nuevo, observacion: e.target.value})} />
          </div>
          <button onClick={handleSave} className="bg-teal-600 text-white px-4 py-2 rounded text-sm">Guardar Registro</button>
        </div>
      )}

      {/* TABLA DE REGISTROS */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 font-medium text-zinc-500">Empleado</th>
              <th className="px-6 py-3 font-medium text-zinc-500">Tipo</th>
              <th className="px-6 py-3 font-medium text-zinc-500">Fechas</th>
              <th className="px-6 py-3 font-medium text-zinc-500">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {novedades.map((n) => (
              <tr key={n.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{n.empleado}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${
                    n.tipo === 'licencia' ? 'bg-blue-100 text-blue-700' :
                    n.tipo === 'ausencia' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {n.tipo}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-500">{n.fechaInicio} / {n.fechaFin}</td>
                <td className="px-6 py-4 text-zinc-500">{n.observacion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
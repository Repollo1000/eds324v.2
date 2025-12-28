"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PersonalPage() {
  const [personal, setPersonal] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para crear nuevo empleado
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [showInput, setShowInput] = useState(false);

  // Cargar lista de empleados
  useEffect(() => {
    fetchPersonal();
  }, []);

  const fetchPersonal = async () => {
    setLoading(true);
    const { data } = await supabase.from('personal').select('*').order('nombre');
    if (data) setPersonal(data);
    setLoading(false);
  };

  const crearEmpleado = async () => {
    if (!nuevoNombre) return;
    const { error } = await supabase.from('personal').insert([{ nombre: nuevoNombre }]);
    if (!error) {
      setNuevoNombre("");
      setShowInput(false);
      fetchPersonal(); // Recargar lista
    }
  };

  // Aquí también podrías agregar la lógica de Licencias Médicas (Novedades)
  // Pero por ahora centrémonos en crear el catálogo de empleados.

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Personal / Atendedores</h1>
          <p className="text-sm text-zinc-500">Administra quiénes trabajan en la estación.</p>
        </div>
        <button 
          onClick={() => setShowInput(!showInput)}
          className="bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-sm font-medium"
        >
          {showInput ? "Cancelar" : "+ Nuevo Empleado"}
        </button>
      </div>

      {showInput && (
        <div className="mb-6 flex gap-2">
            <input 
                type="text" 
                placeholder="Nombre del Atendedor" 
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                className="flex-1 p-2 rounded border border-zinc-300 dark:bg-zinc-900"
            />
            <button onClick={crearEmpleado} className="bg-teal-600 text-white px-4 py-2 rounded">Guardar</button>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 font-medium text-zinc-500">Nombre</th>
              <th className="px-6 py-3 font-medium text-zinc-500">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {personal.map((p) => (
              <tr key={p.id}>
                <td className="px-6 py-4 font-bold text-zinc-900 dark:text-zinc-100">{p.nombre}</td>
                <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${p.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
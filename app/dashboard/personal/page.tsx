"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Personal = {
  id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
};

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [nombreEdicion, setNombreEdicion] = useState("");

  // 1. Cargar trabajadores
  const fetchPersonal = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("personal")
      .select("*")
      .order("nombre", { ascending: true });
    
    if (!error) setPersonal(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonal();
  }, []);

  // 2. Agregar nuevo trabajador
  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return;

    const { error } = await supabase
      .from("personal")
      .insert([{ nombre: nuevoNombre.trim(), activo: true }]);

    if (error) {
      alert("Error al agregar: " + error.message);
    } else {
      setNuevoNombre("");
      fetchPersonal(); // Recargar lista
    }
  };

  // 3. Eliminar trabajador
  const handleEliminar = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar a este trabajador?")) return;

    const { error } = await supabase.from("personal").delete().eq("id", id);

    if (error) alert("Error al eliminar");
    else fetchPersonal();
  };

  // 4. Cambiar estado (Activo/Inactivo)
  const toggleEstado = async (id: string, estadoActual: boolean) => {
    const { error } = await supabase
      .from("personal")
      .update({ activo: !estadoActual })
      .eq("id", id);
      
    if (!error) fetchPersonal();
  };

  // 5. Editar nombre
  const guardarEdicion = async (id: string) => {
    const { error } = await supabase
        .from("personal")
        .update({ nombre: nombreEdicion })
        .eq("id", id);
    
    if (!error) {
        setEditando(null);
        fetchPersonal();
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Gestión de Personal</h1>
        <p className="text-sm text-zinc-500">Administra quiénes pueden ser seleccionados en los turnos.</p>
      </div>

      {/* FORMULARIO DE AGREGAR */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-8">
        <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">Agregar Nuevo Colaborador</h3>
        <form onSubmit={handleAgregar} className="flex gap-3">
          <input
            type="text"
            placeholder="Nombre completo (Ej: Juan Pérez)"
            className="flex-1 p-2 rounded-lg border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 focus:ring-2 focus:ring-teal-500 outline-none"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
          />
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-medium transition"
          >
            + Agregar
          </button>
        </form>
      </div>

      {/* LISTA DE PERSONAL */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-zinc-500">Cargando lista...</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Nombre</th>
                <th className="px-6 py-4 font-semibold text-center">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {personal.length === 0 && (
                 <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">
                        No hay personal registrado. Agrega el primero arriba.
                    </td>
                 </tr>
              )}
              {personal.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                    {editando === p.id ? (
                        <div className="flex gap-2">
                            <input 
                                value={nombreEdicion} 
                                onChange={e => setNombreEdicion(e.target.value)}
                                className="border p-1 rounded dark:bg-zinc-800"
                            />
                            <button onClick={() => guardarEdicion(p.id)} className="text-green-600 text-xs font-bold">OK</button>
                            <button onClick={() => setEditando(null)} className="text-zinc-400 text-xs">X</button>
                        </div>
                    ) : (
                        p.nombre
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => toggleEstado(p.id, p.activo)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                        p.activo
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
                      }`}
                    >
                      {p.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button 
                        onClick={() => { setEditando(p.id); setNombreEdicion(p.nombre); }}
                        className="text-blue-600 hover:underline text-xs"
                    >
                        Editar
                    </button>
                    <button
                      onClick={() => handleEliminar(p.id)}
                      className="text-red-500 hover:text-red-700 hover:underline text-xs"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
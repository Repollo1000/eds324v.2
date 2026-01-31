"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Plus, 
  Search, 
  Pencil, 
  Trash2, 
  X, 
  Save, 
  CheckCircle, 
  User, 
  Mail, 
  CreditCard 
} from "lucide-react";

// Tipo de dato actualizado
type Personal = {
  id: string;
  nombre: string;
  rut: string | null;
  correo: string | null;
  activo: boolean;
  rol: 'atendedor' | 'supervisor';
  grupo: 'A' | 'B' | null;
  created_at: string;
};

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el Modal (Crear/Editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rut: "",
    correo: "",
    activo: true,
    rol: "atendedor" as 'atendedor' | 'supervisor',
    grupo: "A" as 'A' | 'B' | null,
  });

  // Cargar datos al inicio
  useEffect(() => {
    fetchPersonal();
  }, []);

  const fetchPersonal = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("personal")
      .select("*")
      .order("nombre");
    setPersonal(data || []);
    setLoading(false);
  };

  // Abrir Modal para Crear
  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData({ nombre: "", rut: "", correo: "", activo: true, rol: "atendedor", grupo: "A" });
    setIsModalOpen(true);
  };

  // Abrir Modal para Editar
  const handleOpenEdit = (persona: Personal) => {
    setEditingId(persona.id);
    setFormData({
      nombre: persona.nombre,
      rut: persona.rut || "",
      correo: persona.correo || "",
      activo: persona.activo,
      rol: persona.rol || "atendedor",
      grupo: persona.rol === 'supervisor' ? null : (persona.grupo || "A"),
    });
    setIsModalOpen(true);
  };

  // Guardar (Crear o Editar)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpieza básica de datos
    const dataToSave = {
      nombre: formData.nombre.trim(),
      rut: formData.rut.replace(/\./g, "").replace(/-/g, "").toLowerCase().trim(), // Limpiar RUT
      correo: formData.correo.trim(),
      activo: formData.activo,
      rol: formData.rol,
      grupo: formData.rol === 'supervisor' ? null : formData.grupo,
    };

    if (!dataToSave.nombre) return alert("El nombre es obligatorio");

    try {
      if (editingId) {
        // MODO EDITAR
        const { error } = await supabase
          .from("personal")
          .update(dataToSave)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        // MODO CREAR
        const { error } = await supabase
          .from("personal")
          .insert(dataToSave);
        if (error) throw error;
      }

      setIsModalOpen(false);

      if (editingId) {
        // Optimistic update for edit
        setPersonal(prev =>
          prev.map(p => p.id === editingId ? { ...p, ...dataToSave } : p)
        );
      } else {
        // Re-fetch only after create (need the server-generated id)
        fetchPersonal();
      }

    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    }
  };

  // Función "Soft Delete" (Desactivar en vez de borrar)
  const toggleEstado = async (id: string, estadoActual: boolean) => {
    // Optimistic update
    setPersonal(prev =>
      prev.map(p => p.id === id ? { ...p, activo: !estadoActual } : p)
    );
    const { error } = await supabase.from("personal").update({ activo: !estadoActual }).eq("id", id);
    if (error) {
      // Revert on failure
      setPersonal(prev =>
        prev.map(p => p.id === id ? { ...p, activo: estadoActual } : p)
      );
    }
  };

  // Eliminar permanentemente
  const handleDelete = async (persona: Personal) => {
    if (!confirm(`¿Eliminar a "${persona.nombre}" permanentemente?\n\nEsta acción no se puede deshacer. Se eliminarán también sus turnos generados.`)) return;
    try {
      const { error } = await supabase.from("personal").delete().eq("id", persona.id);
      if (error) throw error;
      // Optimistic removal
      setPersonal(prev => prev.filter(p => p.id !== persona.id));
    } catch (error: any) {
      alert("Error al eliminar: " + error.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Gestión de Personal</h1>
          <p className="text-zinc-500 text-sm">Administra empleados, correos y estados para las liquidaciones.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 transition"
        >
          <Plus size={16} /> Nuevo Trabajador
        </button>
      </div>

      {/* TABLA */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 text-zinc-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3 font-semibold">Nombre</th>
              <th className="px-6 py-3 font-semibold">RUT</th>
              <th className="px-6 py-3 font-semibold">Correo</th>
              <th className="px-6 py-3 font-semibold text-center">Rol</th>
              <th className="px-6 py-3 font-semibold text-center">Grupo</th>
              <th className="px-6 py-3 font-semibold text-center">Estado</th>
              <th className="px-6 py-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-zinc-400">Cargando...</td></tr>
            ) : personal.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-6 py-4 font-medium text-zinc-900 dark:text-white">{p.nombre}</td>
                <td className="px-6 py-4 text-zinc-500 font-mono">{p.rut || "—"}</td>
                <td className="px-6 py-4 text-zinc-500">{p.correo || <span className="text-red-400 text-xs font-bold">Falta Email</span>}</td>

                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    p.rol === 'supervisor'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}>
                    {p.rol === 'supervisor' ? 'Supervisor' : 'Atendedor'}
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  {p.rol === 'atendedor' ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      p.grupo === 'A'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      Grupo {p.grupo || '—'}
                    </span>
                  ) : (
                    <span className="text-zinc-400 text-xs">—</span>
                  )}
                </td>

                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => toggleEstado(p.id, p.activo)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      p.activo 
                        ? "bg-green-100 text-green-700 border-green-200" 
                        : "bg-zinc-100 text-zinc-500 border-zinc-200"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </button>
                </td>

                <td className="px-6 py-4 text-right flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition" title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition" title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE EDICIÓN / CREACIÓN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Cabecera Modal */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-lg">{editingId ? "Editar Trabajador" : "Nuevo Trabajador"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-red-500 transition">
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              
              {/* Nombre */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                  <input 
                    type="text" 
                    required
                    className="w-full pl-10 p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-900 outline-none"
                    placeholder="Ej: Juan Pérez"
                    value={formData.nombre}
                    onChange={e => setFormData({...formData, nombre: e.target.value})}
                  />
                </div>
              </div>

              {/* RUT */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">RUT (Sin puntos)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                  <input 
                    type="text" 
                    className="w-full pl-10 p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-900 outline-none"
                    placeholder="Ej: 12345678-9"
                    value={formData.rut}
                    onChange={e => setFormData({...formData, rut: e.target.value})}
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1">Se usará para detectar liquidaciones automáticamente.</p>
              </div>

              {/* Correo */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-zinc-400" size={16} />
                  <input 
                    type="email" 
                    className="w-full pl-10 p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 focus:ring-2 focus:ring-zinc-900 outline-none"
                    placeholder="Ej: juan@empresa.com"
                    value={formData.correo}
                    onChange={e => setFormData({...formData, correo: e.target.value})}
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Rol</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, rol: "atendedor", grupo: formData.grupo || "A"})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                      formData.rol === "atendedor"
                        ? "bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:border-zinc-100"
                        : "bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    Atendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, rol: "supervisor", grupo: null})}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                      formData.rol === "supervisor"
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                    }`}
                  >
                    Supervisor
                  </button>
                </div>
              </div>

              {/* Grupo (solo para atendedores) */}
              {formData.rol === "atendedor" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1 uppercase">Grupo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, grupo: "A"})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                        formData.grupo === "A"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}
                    >
                      Grupo A
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, grupo: "B"})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition ${
                        formData.grupo === "B"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white text-zinc-500 border-zinc-300 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}
                    >
                      Grupo B
                    </button>
                  </div>
                </div>
              )}

              {/* Checkbox Activo */}
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="activoCheck"
                  checked={formData.activo}
                  onChange={e => setFormData({...formData, activo: e.target.checked})}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="activoCheck" className="text-sm font-medium cursor-pointer select-none">
                  Trabajador Activo
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-50 transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition flex justify-center items-center gap-2"
                >
                  <Save size={16} /> Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ProtegerRuta from '@/components/ProtegerRuta'
import { useRouter } from 'next/navigation'

type EventoAuditoria = {
  id: string
  tabla: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  usuario_email: string
  usuario_rol: string
  datos_anteriores: any
  datos_nuevos: any
  timestamp: string
}

export default function AuditoriaPage() {
  const router = useRouter()
  const [eventos, setEventos] = useState<EventoAuditoria[]>([])
  const [filtroTabla, setFiltroTabla] = useState('todas')
  const [filtroAccion, setFiltroAccion] = useState('todas')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarEventos = async () => {
      setLoading(true)
      let query = supabase
        .from('historial_auditoria')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(500)

      if (filtroTabla !== 'todas') {
        query = query.eq('tabla', filtroTabla)
      }
      if (filtroAccion !== 'todas') {
        query = query.eq('accion', filtroAccion)
      }

      const { data } = await query
      setEventos(data || [])
      setLoading(false)
    }
    cargarEventos()
  }, [filtroTabla, filtroAccion])

  const getAccionColor = (accion: string) => {
    switch (accion) {
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'UPDATE': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
      case 'INSERT': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
    }
  }

  return (
    <ProtegerRuta requiereRol="administrador">
      <div className="p-6 md:p-8 max-w-[90rem] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <button
              onClick={() => router.back()}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mb-2 flex items-center gap-1"
            >
              ← Volver
            </button>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <span className="p-2 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-xl">
                🔍
              </span>
              Auditoría del Sistema
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Registro automático de todos los cambios críticos en el sistema
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 mb-6 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Filtrar por tabla
            </label>
            <select
              value={filtroTabla}
              onChange={(e) => setFiltroTabla(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="todas">Todas las tablas</option>
              <option value="turnos">Turnos</option>
              <option value="pagos_personal">Pagos Personal</option>
              <option value="personal">Personal</option>
              <option value="ausencias">Ausencias</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
              Filtrar por acción
            </label>
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-sm"
            >
              <option value="todas">Todas las acciones</option>
              <option value="INSERT">Creación (INSERT)</option>
              <option value="UPDATE">Modificación (UPDATE)</option>
              <option value="DELETE">Eliminación (DELETE)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFiltroTabla('todas')
                setFiltroAccion('todas')
              }}
              className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Tabla de eventos */}
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-zinc-500 animate-pulse">
              Cargando eventos de auditoría...
            </div>
          ) : eventos.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">
              No hay eventos que cumplan con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <tr className="text-zinc-600 dark:text-zinc-400 text-xs uppercase">
                    <th className="px-4 py-3 text-left font-semibold">Fecha/Hora</th>
                    <th className="px-4 py-3 text-left font-semibold">Tabla</th>
                    <th className="px-4 py-3 text-left font-semibold">Acción</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuario</th>
                    <th className="px-4 py-3 text-left font-semibold">Rol</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {eventos.map(e => (
                    <tr key={e.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                        {new Date(e.timestamp).toLocaleString('es-CL', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                        {e.tabla}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAccionColor(e.accion)}`}>
                          {e.accion}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300">
                        {e.usuario_email || 'Sistema'}
                      </td>
                      <td className="px-4 py-3 text-xs capitalize text-zinc-600 dark:text-zinc-400">
                        {e.usuario_rol || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info footer */}
        <div className="mt-4 text-xs text-zinc-500 text-center">
          Mostrando últimos {eventos.length} eventos (máximo 500)
        </div>
      </div>
    </ProtegerRuta>
  )
}

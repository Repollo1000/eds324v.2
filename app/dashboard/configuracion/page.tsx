'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useUsuario } from '@/lib/useUsuario'
import { toast } from '@/lib/toast'

export default function ConfiguracionPage() {
  const router = useRouter()
  const { usuario, loading } = useUsuario()

  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [cambiandoPassword, setCambiandoPassword] = useState(false)

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      toast.error('Completa todos los campos')
      return
    }

    if (passwordNueva.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }

    if (passwordNueva !== passwordConfirmar) {
      toast.error('Las contraseñas no coinciden')
      return
    }

    if (passwordActual === passwordNueva) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    setCambiandoPassword(true)

    try {
      // Primero verificar la contraseña actual intentando hacer login
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: usuario?.email || '',
        password: passwordActual,
      })

      if (verifyError) {
        toast.error('Contraseña actual incorrecta')
        setCambiandoPassword(false)
        return
      }

      // Cambiar la contraseña
      const { error } = await supabase.auth.updateUser({
        password: passwordNueva
      })

      if (error) {
        toast.error('Error al cambiar contraseña', error.message)
        setCambiandoPassword(false)
        return
      }

      toast.success('Contraseña actualizada correctamente')

      // Limpiar formulario
      setPasswordActual('')
      setPasswordNueva('')
      setPasswordConfirmar('')

    } catch (err) {
      toast.error('Error inesperado al cambiar contraseña')
    } finally {
      setCambiandoPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 mb-2 flex items-center gap-1"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <span className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-xl">
            ⚙️
          </span>
          Configuración
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Administra tu cuenta y preferencias
        </p>
      </div>

      {/* Información del Usuario */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
          Información de la Cuenta
        </h2>

        <div className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
              Email
            </label>
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {usuario?.email || 'No disponible'}
            </div>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
              Nombre
            </label>
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {usuario?.email?.split('@')[0] || 'Usuario'}
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
              Rol
            </label>
            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700">
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                usuario?.rol === 'administrador'
                  ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                  : 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              }`}>
                {usuario?.rol === 'administrador' ? '👑 Administrador' : '👤 Supervisor'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cambiar Contraseña */}
      <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4 flex items-center gap-2">
          🔐 Cambiar Contraseña
        </h2>

        <form onSubmit={handleCambiarPassword} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Contraseña Actual *
            </label>
            <input
              type="password"
              value={passwordActual}
              onChange={(e) => setPasswordActual(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu contraseña actual"
              disabled={cambiandoPassword}
            />
          </div>

          {/* Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Nueva Contraseña *
            </label>
            <input
              type="password"
              value={passwordNueva}
              onChange={(e) => setPasswordNueva(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Mínimo 8 caracteres"
              disabled={cambiandoPassword}
            />
            <p className="text-xs text-zinc-500 mt-1">
              Mínimo 8 caracteres. Usa mayúsculas, minúsculas, números y símbolos.
            </p>
          </div>

          {/* Confirmar Contraseña */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              value={passwordConfirmar}
              onChange={(e) => setPasswordConfirmar(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Repite la nueva contraseña"
              disabled={cambiandoPassword}
            />
          </div>

          {/* Indicador de fortaleza */}
          {passwordNueva && (
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3">
              <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                Fortaleza de la contraseña:
              </p>
              <div className="space-y-1 text-xs">
                <div className={passwordNueva.length >= 8 ? 'text-green-600' : 'text-zinc-400'}>
                  {passwordNueva.length >= 8 ? '✓' : '○'} Mínimo 8 caracteres
                </div>
                <div className={/[A-Z]/.test(passwordNueva) ? 'text-green-600' : 'text-zinc-400'}>
                  {/[A-Z]/.test(passwordNueva) ? '✓' : '○'} Incluye mayúsculas
                </div>
                <div className={/[a-z]/.test(passwordNueva) ? 'text-green-600' : 'text-zinc-400'}>
                  {/[a-z]/.test(passwordNueva) ? '✓' : '○'} Incluye minúsculas
                </div>
                <div className={/[0-9]/.test(passwordNueva) ? 'text-green-600' : 'text-zinc-400'}>
                  {/[0-9]/.test(passwordNueva) ? '✓' : '○'} Incluye números
                </div>
                <div className={/[^A-Za-z0-9]/.test(passwordNueva) ? 'text-green-600' : 'text-zinc-400'}>
                  {/[^A-Za-z0-9]/.test(passwordNueva) ? '✓' : '○'} Incluye símbolos (#, @, !, etc.)
                </div>
              </div>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={cambiandoPassword || !passwordActual || !passwordNueva || !passwordConfirmar}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cambiandoPassword ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>

      {/* Nota de seguridad */}
      <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-xs text-amber-800 dark:text-amber-400">
          <strong>💡 Nota:</strong> Al cambiar tu contraseña, se cerrará tu sesión automáticamente en todos los dispositivos.
          Deberás volver a iniciar sesión con la nueva contraseña.
        </p>
      </div>
    </div>
  )
}

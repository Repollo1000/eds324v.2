'use client'
import { useUsuario } from '@/lib/useUsuario'
import { puedeAcceder } from '@/lib/roles'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtegerRuta({
  children,
  requiereRol
}: {
  children: React.ReactNode
  requiereRol?: 'administrador' | 'supervisor'
}) {
  const { usuario, loading } = useUsuario()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && usuario) {
      if (requiereRol && usuario.rol !== requiereRol) {
        router.replace('/dashboard?error=sin_permisos')
      } else if (!puedeAcceder(usuario.rol, pathname)) {
        router.replace('/dashboard?error=sin_permisos')
      }
    }
  }, [loading, usuario, requiereRol, pathname, router])

  if (loading) return <div className="p-8 text-center">Verificando permisos...</div>
  if (!usuario || (requiereRol && usuario.rol !== requiereRol)) return null

  return <>{children}</>
}

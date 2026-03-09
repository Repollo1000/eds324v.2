'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Rol } from './roles'

export function useUsuario() {
  const [usuario, setUsuario] = useState<{ email: string; rol: Rol } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const rol = data.user?.user_metadata?.rol || 'supervisor'
      setUsuario(data.user ? { email: data.user.email!, rol } : null)
      setLoading(false)
    })
  }, [])

  return { usuario, loading }
}

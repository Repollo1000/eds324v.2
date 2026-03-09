export type Rol = 'administrador' | 'supervisor'

export const PERMISOS = {
  administrador: {
    ver: ['*'],
    crear: ['*'],
    editar: ['*'],
    eliminar: ['*'],
    acciones_especiales: ['importar_excel', 'eliminar_mes', 'ver_auditoria']
  },
  supervisor: {
    ver: ['dashboard', 'cuadraturas', 'turnos', 'personal', 'ausencias'],
    crear: ['cuadraturas', 'ausencias', 'turnos'],
    editar: ['cuadraturas', 'ausencias'],
    eliminar: [],
    acciones_especiales: []
  }
}

export function puedeAcceder(rol: Rol | undefined, ruta: string): boolean {
  if (!rol) return false
  if (rol === 'administrador') return true

  const rutasProtegidas = ['/dashboard/importar', '/dashboard/auditoria', '/dashboard/tributario']
  if (rutasProtegidas.some(r => ruta.startsWith(r))) {
    return false // supervisor no puede acceder a rutas protegidas
  }

  return true
}

/**
 * Helper functions para el manejo de domingos extras
 *
 * Los domingos extras se almacenan en 3 campos separados dentro de gastos:
 * - tercerDomingo: Pago por trabajar el tercer domingo del mes
 * - cuartoDomingo: Pago por trabajar el cuarto domingo del mes
 * - quintoDomingo: Pago por trabajar el quinto domingo del mes (poco frecuente)
 */

/**
 * Calcula el total de pagos por domingos extras sumando los 3 campos
 * @param gastos - Objeto JSONB de gastos del turno
 * @returns Total de los 3 domingos
 */
export function calcularTotalDomingos(gastos: any): number {
  if (!gastos) return 0
  return (
    (Number(gastos.tercerDomingo) || 0) +
    (Number(gastos.cuartoDomingo) || 0) +
    (Number(gastos.quintoDomingo) || 0)
  )
}

/**
 * Formatea el detalle de domingos para mostrar en tooltip o detalle
 * @param gastos - Objeto JSONB de gastos del turno
 * @returns String descriptivo (ej: "3er: $10.000, 4to: $8.000")
 */
export function formatearDetalleDomingos(gastos: any): string {
  if (!gastos) return '-'

  const detalles: string[] = []
  if (gastos.tercerDomingo > 0) {
    detalles.push(`3er: ${formatMoney(gastos.tercerDomingo)}`)
  }
  if (gastos.cuartoDomingo > 0) {
    detalles.push(`4to: ${formatMoney(gastos.cuartoDomingo)}`)
  }
  if (gastos.quintoDomingo > 0) {
    detalles.push(`5to: ${formatMoney(gastos.quintoDomingo)}`)
  }

  return detalles.length > 0 ? detalles.join(', ') : '-'
}

/**
 * Formatea un número como moneda chilena
 */
function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0
  }).format(n)
}

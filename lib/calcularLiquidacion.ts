// Tasas AFP vigentes 2025
export const TASAS_AFP: Record<string, number> = {
  capital: 11.44,
  cuprum: 11.44,
  habitat: 11.27,
  modelo: 10.58,
  planvital: 11.16,
  provida: 11.45,
  uno: 10.46,
}

// Parámetros legales 2025
export const PARAMETROS = {
  SUELDO_MINIMO: 500000,
  TOPE_IMPONIBLE: 81.6, // UF
  UF_APROXIMADO: 38500,
  GRATIFICACION_TOPE_IMM: 4.75,
  SALUD_FONASA: 7,
  CESANTIA_INDEFINIDO: 0.6,
  CESANTIA_PLAZO_FIJO: 0,
}

// Tramos impuesto único 2da categoría (aproximados)
const TRAMOS_IMPUESTO = [
  { hasta: 828116, tasa: 0 },
  { hasta: 1840258, tasa: 4 },
  { hasta: 3067096, tasa: 8 },
  { hasta: 4293935, tasa: 13.5 },
  { hasta: 5520773, tasa: 23 },
  { hasta: 7361031, tasa: 30.4 },
  { hasta: 19015413, tasa: 35 },
  { hasta: Infinity, tasa: 40 },
]

export interface DatosEmpleado {
  id: string
  nombre: string
  rut: string
  fecha_ingreso: string | null
  tipo_contrato: 'indefinido' | 'plazo_fijo'
  cargo: string
  afp: string
  salud: 'fonasa' | 'isapre'
  isapre_monto: number
  sueldo_base: number
  asignacion_caja: number
  movilizacion: number
}

export interface DatosMensuales {
  diasTrabajados: number
  diasLicencia: number
  diasAusencia: number
  horasExtra: number
  horasFestivo: number
  horasDomingo: number
  anticipos: number
  prestamos: number
  perdidaCaja: number
  otrosDescuentos: number
}

export interface Liquidacion {
  // Info
  empleado: DatosEmpleado
  mes: string
  anio: number

  // Días
  diasTrabajados: number
  diasLicencia: number
  diasAusencia: number
  diasMes: number

  // Haberes
  sueldoBase: number
  sueldoBaseProporcional: number
  gratificacion: number
  horasExtrasMonto: number
  horasFestivoMonto: number
  horasDomingoMonto: number
  totalImponible: number
  asignacionCaja: number
  movilizacion: number
  totalNoImponible: number
  totalHaberes: number

  // Descuentos legales
  afpNombre: string
  afpTasa: number
  afpMonto: number
  saludTipo: string
  saludMonto: number
  cesantiaMonto: number
  impuestoMonto: number
  totalDescLegales: number

  // Otros descuentos
  anticipos: number
  prestamos: number
  perdidaCaja: number
  otrosDescuentos: number
  totalOtrosDesc: number

  // Totales
  rentaTributable: number
  alcanceLiquido: number
}

export function calcularLiquidacion(
  empleado: DatosEmpleado,
  mes: number,
  anio: number,
  datos: DatosMensuales
): Liquidacion {

  const diasMes = new Date(anio, mes, 0).getDate()
  const diasTrabajados = datos.diasTrabajados
  const proporcion = diasTrabajados / diasMes

  // ============ HABERES ============

  // Sueldo base proporcional
  const sueldoBaseProporcional = Math.round(empleado.sueldo_base * proporcion)

  // Gratificación mensual (25% del sueldo, tope 4.75 IMM)
  const topeGratificacion = Math.round(PARAMETROS.SUELDO_MINIMO * PARAMETROS.GRATIFICACION_TOPE_IMM / 12)
  const gratificacion = Math.min(
    Math.round(sueldoBaseProporcional * 0.25),
    Math.round(topeGratificacion * proporcion)
  )

  // Valor hora para extras (sueldo / 30 / 7.33 horas diarias)
  const valorHora = empleado.sueldo_base / 30 / 7.33

  // Horas extras (50% recargo normal)
  const horasExtrasMonto = Math.round(datos.horasExtra * valorHora * 1.5)

  // Horas festivo (100% recargo = doble)
  const horasFestivoMonto = Math.round(datos.horasFestivo * valorHora * 2)

  // Horas domingo (recargo 30%)
  const horasDomingoMonto = Math.round(datos.horasDomingo * valorHora * 1.3)

  // Total imponible
  const totalImponible = sueldoBaseProporcional + gratificacion + horasExtrasMonto + horasFestivoMonto + horasDomingoMonto

  // No imponibles (proporcionales)
  const asignacionCaja = Math.round(empleado.asignacion_caja * proporcion)
  const movilizacion = Math.round(empleado.movilizacion * proporcion)
  const totalNoImponible = asignacionCaja + movilizacion

  // Total haberes
  const totalHaberes = totalImponible + totalNoImponible

  // ============ DESCUENTOS LEGALES ============

  // AFP
  const afpTasa = TASAS_AFP[empleado.afp] || 10.58
  const afpMonto = Math.round(totalImponible * afpTasa / 100)

  // Salud
  let saludMonto: number
  if (empleado.salud === 'fonasa') {
    saludMonto = Math.round(totalImponible * PARAMETROS.SALUD_FONASA / 100)
  } else {
    // Isapre: monto fijo o 7% mínimo
    saludMonto = Math.max(
      Math.round(totalImponible * 0.07),
      empleado.isapre_monto
    )
  }

  // Seguro cesantía (solo indefinido)
  const cesantiaMonto = empleado.tipo_contrato === 'indefinido'
    ? Math.round(totalImponible * PARAMETROS.CESANTIA_INDEFINIDO / 100)
    : 0

  // Base tributable
  const rentaTributable = totalImponible - afpMonto - saludMonto - cesantiaMonto

  // Impuesto único 2da categoría
  let impuestoMonto = 0
  if (rentaTributable > TRAMOS_IMPUESTO[0].hasta) {
    // Encontrar tramo
    let montoAnterior = 0
    for (const tramo of TRAMOS_IMPUESTO) {
      if (rentaTributable <= tramo.hasta) {
        impuestoMonto = Math.round((rentaTributable - montoAnterior) * tramo.tasa / 100)
        break
      }
      montoAnterior = tramo.hasta
    }
  }

  const totalDescLegales = afpMonto + saludMonto + cesantiaMonto + impuestoMonto

  // ============ OTROS DESCUENTOS ============

  const totalOtrosDesc = datos.anticipos + datos.prestamos + datos.perdidaCaja + datos.otrosDescuentos

  // ============ LÍQUIDO ============

  const alcanceLiquido = totalHaberes - totalDescLegales - totalOtrosDesc

  return {
    empleado,
    mes: new Date(anio, mes - 1).toLocaleDateString('es-CL', { month: 'long' }),
    anio,

    diasTrabajados,
    diasLicencia: datos.diasLicencia,
    diasAusencia: datos.diasAusencia,
    diasMes,

    sueldoBase: empleado.sueldo_base,
    sueldoBaseProporcional,
    gratificacion,
    horasExtrasMonto,
    horasFestivoMonto,
    horasDomingoMonto,
    totalImponible,
    asignacionCaja,
    movilizacion,
    totalNoImponible,
    totalHaberes,

    afpNombre: empleado.afp.charAt(0).toUpperCase() + empleado.afp.slice(1),
    afpTasa,
    afpMonto,
    saludTipo: empleado.salud === 'fonasa' ? 'Fonasa' : 'Isapre',
    saludMonto,
    cesantiaMonto,
    impuestoMonto,
    totalDescLegales,

    anticipos: datos.anticipos,
    prestamos: datos.prestamos,
    perdidaCaja: datos.perdidaCaja,
    otrosDescuentos: datos.otrosDescuentos,
    totalOtrosDesc,

    rentaTributable,
    alcanceLiquido,
  }
}

// Formatear dinero
export function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n)
}

// Formatear RUT
export function formatRut(rut: string): string {
  if (!rut) return ''
  const clean = rut.replace(/[^0-9kK]/g, '').toLowerCase()
  if (clean.length < 2) return clean
  const dv = clean.slice(-1)
  const num = clean.slice(0, -1)
  const formatted = num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${dv.toUpperCase()}`
}

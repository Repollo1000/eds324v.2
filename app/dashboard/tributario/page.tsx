'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

interface ResumenMensual {
  mes: string
  ventasNeto: number
  ventasIVA: number
  ventasTotal: number
}

interface ResumenEmpleado {
  id: string
  nombre: string
  rut: string
  turnosTrabajados: number
  turnosExtras: number
  horasExtras: number
  comisiones: number
  bencinaEnzo: number
  totalGanado: number
}

interface ComprasSII {
  rut: string
  razonSocial: string
  folio: string
  fecha: string
  montoExento: number
  montoNeto: number
  montoIVA: number
  montoTotal: number
}

export default function TributarioPage() {
  const [mes, setMes] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [resumenVentas, setResumenVentas] = useState<ResumenMensual | null>(null)
  const [compras, setCompras] = useState<ComprasSII[]>([])
  const [totalComprasNeto, setTotalComprasNeto] = useState(0)
  const [totalComprasIVA, setTotalComprasIVA] = useState(0)
  const [loading, setLoading] = useState(true)
  const [archivo, setArchivo] = useState<string | null>(null)
  const [resumenEmpleados, setResumenEmpleados] = useState<ResumenEmpleado[]>([])
  const [loadingEmpleados, setLoadingEmpleados] = useState(false)

  useEffect(() => {
    cargarVentas()
    cargarResumenEmpleados()
  }, [mes])

  async function cargarVentas() {
    setLoading(true)

    const [year, month] = mes.split('-').map(Number)
    const inicioMes = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const finMes = new Date(year, month, 0).toISOString().split('T')[0]

    // Obtener turnos del mes
    const { data: turnos, error } = await supabase
      .from('turnos')
      .select('total_ventas')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)

    if (error) {
      console.error('Error cargando ventas:', error)
      setLoading(false)
      return
    }

    const ventasTotal = turnos?.reduce((sum, t) => sum + (Number(t.total_ventas) || 0), 0) || 0
    const ventasNeto = Math.round(ventasTotal / 1.19)
    const ventasIVA = ventasTotal - ventasNeto

    setResumenVentas({
      mes,
      ventasTotal,
      ventasNeto,
      ventasIVA
    })

    setLoading(false)
  }

  async function cargarResumenEmpleados() {
    setLoadingEmpleados(true)

    const [year, month] = mes.split('-').map(Number)
    const inicioMes = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const finMes = new Date(year, month, 0).toISOString().split('T')[0]

    // Cargar personal
    const { data: personal } = await supabase
      .from('personal')
      .select('id, nombre, rut')

    // Cargar turnos del mes
    const { data: turnos } = await supabase
      .from('turnos')
      .select('responsable, gastos')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)

    if (!personal || !turnos) {
      setLoadingEmpleados(false)
      return
    }

    // Agrupar por empleado
    const resumenMap: Record<string, ResumenEmpleado> = {}

    personal.forEach(p => {
      resumenMap[p.nombre] = {
        id: p.id,
        nombre: p.nombre,
        rut: p.rut || '',
        turnosTrabajados: 0,
        turnosExtras: 0,
        horasExtras: 0,
        comisiones: 0,
        bencinaEnzo: 0,
        totalGanado: 0
      }
    })

    turnos.forEach(t => {
      const nombre = t.responsable
      if (!resumenMap[nombre]) {
        resumenMap[nombre] = {
          id: '',
          nombre,
          rut: '',
          turnosTrabajados: 0,
          turnosExtras: 0,
          horasExtras: 0,
          comisiones: 0,
          bencinaEnzo: 0,
          totalGanado: 0
        }
      }

      resumenMap[nombre].turnosTrabajados++

      if (t.gastos) {
        const g = t.gastos
        resumenMap[nombre].turnosExtras += Number(g.turnoExtra) || 0
        resumenMap[nombre].horasExtras += Number(g.horasExtras) || 0
        resumenMap[nombre].comisiones += (Number(g.comisionesPromocion) || 0) + (Number(g.comisionesLubricantes) || 0)
        resumenMap[nombre].bencinaEnzo += Number(g.bencinaEnzo) || 0
      }
    })

    // Calcular total ganado
    Object.values(resumenMap).forEach(e => {
      e.totalGanado = e.turnosExtras + e.horasExtras + e.comisiones
    })

    // Filtrar solo los que trabajaron
    const resumen = Object.values(resumenMap)
      .filter(e => e.turnosTrabajados > 0)
      .sort((a, b) => b.turnosTrabajados - a.turnosTrabajados)

    setResumenEmpleados(resumen)
    setLoadingEmpleados(false)
  }

  async function exportarLibroRemuneraciones() {
    const [year, month] = mes.split('-').map(Number)
    const nombreMesStr = new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

    const datosExport = resumenEmpleados.map(e => ({
      'RUT': e.rut,
      'Nombre': e.nombre,
      'Turnos Trabajados': e.turnosTrabajados,
      'Turnos Extras ($)': e.turnosExtras,
      'Horas Extras ($)': e.horasExtras,
      'Comisiones ($)': e.comisiones,
      'Bencina/Vales ($)': e.bencinaEnzo,
      'Total Extras ($)': e.totalGanado
    }))

    const ws = XLSX.utils.json_to_sheet(datosExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Remuneraciones')
    XLSX.writeFile(wb, `libro-remuneraciones-${mes}.xlsx`)
  }

  function procesarArchivoSII(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setArchivo(file.name)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        // Buscar la fila de encabezados
        let headerRowIndex = -1
        for (let i = 0; i < Math.min(20, jsonData.length); i++) {
          const row = jsonData[i]
          if (row && row.some((cell: any) =>
            String(cell).toLowerCase().includes('rut') ||
            String(cell).toLowerCase().includes('folio') ||
            String(cell).toLowerCase().includes('neto')
          )) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1) {
          alert('No se pudo identificar el formato del archivo. Asegúrate de que sea el archivo de Registro de Compras del SII.')
          return
        }

        const headers = jsonData[headerRowIndex].map((h: any) => String(h).toLowerCase().trim())

        // Mapear índices de columnas
        const colIndices = {
          rut: headers.findIndex((h: string) => h.includes('rut')),
          razonSocial: headers.findIndex((h: string) => h.includes('raz') || h.includes('nombre')),
          folio: headers.findIndex((h: string) => h.includes('folio')),
          fecha: headers.findIndex((h: string) => h.includes('fecha')),
          exento: headers.findIndex((h: string) => h.includes('exento')),
          neto: headers.findIndex((h: string) => h.includes('neto') && !h.includes('exento')),
          iva: headers.findIndex((h: string) => h.includes('iva') || h.includes('recuperable')),
          total: headers.findIndex((h: string) => h.includes('total'))
        }

        const comprasParsed: ComprasSII[] = []

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const rut = colIndices.rut >= 0 ? String(row[colIndices.rut] || '') : ''
          if (!rut || rut === 'undefined' || rut === '') continue

          const compra: ComprasSII = {
            rut,
            razonSocial: colIndices.razonSocial >= 0 ? String(row[colIndices.razonSocial] || '') : '',
            folio: colIndices.folio >= 0 ? String(row[colIndices.folio] || '') : '',
            fecha: colIndices.fecha >= 0 ? String(row[colIndices.fecha] || '') : '',
            montoExento: colIndices.exento >= 0 ? Number(row[colIndices.exento]) || 0 : 0,
            montoNeto: colIndices.neto >= 0 ? Number(row[colIndices.neto]) || 0 : 0,
            montoIVA: colIndices.iva >= 0 ? Number(row[colIndices.iva]) || 0 : 0,
            montoTotal: colIndices.total >= 0 ? Number(row[colIndices.total]) || 0 : 0
          }

          comprasParsed.push(compra)
        }

        setCompras(comprasParsed)

        const totalNeto = comprasParsed.reduce((sum, c) => sum + c.montoNeto, 0)
        const totalIVA = comprasParsed.reduce((sum, c) => sum + c.montoIVA, 0)

        setTotalComprasNeto(totalNeto)
        setTotalComprasIVA(totalIVA)

      } catch (error) {
        console.error('Error procesando archivo:', error)
        alert('Error al procesar el archivo. Verifica que sea un archivo Excel válido del SII.')
      }
    }
    reader.readAsBinaryString(file)
  }

  function limpiarCompras() {
    setCompras([])
    setTotalComprasNeto(0)
    setTotalComprasIVA(0)
    setArchivo(null)
  }

  const ivaDebito = resumenVentas?.ventasIVA || 0
  const ivaCredito = totalComprasIVA
  const ivaPagar = ivaDebito - ivaCredito

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)
  }

  const nombreMes = (mesStr: string) => {
    const [year, month] = mesStr.split('-').map(Number)
    const fecha = new Date(year, month - 1, 1)
    return fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Módulo Tributario</h1>
        <p className="text-gray-600 dark:text-gray-400">Calcula tu F29 automáticamente</p>
      </div>

      {/* Selector de mes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Período
        </label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Resumen F29 */}
          <div className="bg-gray-900 text-white rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 text-teal-400">
              Resumen F29 - {nombreMes(mes)}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* IVA Débito */}
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">IVA Débito (Ventas)</p>
                <p className="text-2xl font-bold text-red-400">{formatMoney(ivaDebito)}</p>
                <p className="text-xs text-gray-500 mt-1">Lo que cobraste a clientes</p>
              </div>

              {/* IVA Crédito */}
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">IVA Crédito (Compras)</p>
                <p className="text-2xl font-bold text-green-400">{formatMoney(ivaCredito)}</p>
                <p className="text-xs text-gray-500 mt-1">Lo que pagaste a proveedores</p>
              </div>

              {/* Resultado */}
              <div className={`rounded-lg p-4 ${ivaPagar > 0 ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                <p className="text-gray-400 text-sm">
                  {ivaPagar > 0 ? 'A Pagar al SII' : 'Crédito a Favor'}
                </p>
                <p className={`text-2xl font-bold ${ivaPagar > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {formatMoney(Math.abs(ivaPagar))}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {ivaPagar > 0 ? 'Debes pagar esto al SII' : 'Te queda como crédito'}
                </p>
              </div>
            </div>
          </div>

          {/* Detalle Ventas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Ventas del Mes (desde Turnos)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Neto</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatMoney(resumenVentas?.ventasNeto || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">IVA (19%)</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatMoney(resumenVentas?.ventasIVA || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {formatMoney(resumenVentas?.ventasTotal || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Compras SII */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Compras del Mes (desde SII)
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sube el archivo "Registro de Compras" descargado desde sii.cl
                </p>
              </div>
              {archivo && (
                <button
                  onClick={limpiarCompras}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Limpiar
                </button>
              )}
            </div>

            {!archivo ? (
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Arrastra el archivo Excel del SII o haz clic para seleccionar
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={procesarArchivoSII}
                  className="mt-4 text-sm"
                />
                <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  <p className="font-medium">¿Cómo obtener el archivo?</p>
                  <ol className="mt-2 text-left max-w-md mx-auto space-y-1">
                    <li>1. Entra a <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">sii.cl</span></li>
                    <li>2. Ve a Servicios Online → Factura Electrónica</li>
                    <li>3. Registro de Compras y Ventas</li>
                    <li>4. Selecciona el mes y descarga Excel</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-4 text-sm text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Archivo cargado: {archivo}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Neto</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {formatMoney(totalComprasNeto)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">IVA Recuperable</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {formatMoney(totalComprasIVA)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Documentos</p>
                    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {compras.length}
                    </p>
                  </div>
                </div>

                {/* Tabla de compras */}
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Proveedor</th>
                        <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">RUT</th>
                        <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Neto</th>
                        <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">IVA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                      {compras.slice(0, 50).map((compra, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-gray-900 dark:text-gray-100">
                            {compra.razonSocial || '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                            {compra.rut}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                            {formatMoney(compra.montoNeto)}
                          </td>
                          <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                            {formatMoney(compra.montoIVA)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {compras.length > 50 && (
                    <p className="text-center text-sm text-gray-500 py-2">
                      Mostrando 50 de {compras.length} documentos
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Libro de Remuneraciones */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Libro de Remuneraciones
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Resumen de pagos variables por empleado
                </p>
              </div>
              <button
                onClick={exportarLibroRemuneraciones}
                disabled={resumenEmpleados.length === 0}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700
                         disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium
                         flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
              </button>
            </div>

            {loadingEmpleados ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mx-auto"></div>
              </div>
            ) : resumenEmpleados.length === 0 ? (
              <p className="text-center py-8 text-gray-500 dark:text-gray-400">
                No hay turnos registrados para este mes
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Empleado</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">RUT</th>
                      <th className="px-3 py-2 text-center text-gray-600 dark:text-gray-300">Turnos</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">T. Extras</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">H. Extras</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">Comisiones</th>
                      <th className="px-3 py-2 text-right text-gray-600 dark:text-gray-300 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                    {resumenEmpleados.map((e) => (
                      <tr key={e.id || e.nombre}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 font-medium">
                          {e.nombre}
                        </td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {e.rut || '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">
                          {e.turnosTrabajados}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {formatMoney(e.turnosExtras)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {formatMoney(e.horasExtras)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                          {formatMoney(e.comisiones)}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100 font-semibold">
                          {formatMoney(e.totalGanado)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                    <tr>
                      <td className="px-3 py-2 text-gray-900 dark:text-gray-100" colSpan={2}>Total</td>
                      <td className="px-3 py-2 text-center text-gray-900 dark:text-gray-100">
                        {resumenEmpleados.reduce((sum, e) => sum + e.turnosTrabajados, 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatMoney(resumenEmpleados.reduce((sum, e) => sum + e.turnosExtras, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatMoney(resumenEmpleados.reduce((sum, e) => sum + e.horasExtras, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                        {formatMoney(resumenEmpleados.reduce((sum, e) => sum + e.comisiones, 0))}
                      </td>
                      <td className="px-3 py-2 text-right text-teal-600 dark:text-teal-400">
                        {formatMoney(resumenEmpleados.reduce((sum, e) => sum + e.totalGanado, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Instrucciones F29 */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Cómo declarar tu F29
            </h3>
            <ol className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex gap-2">
                <span className="font-bold">1.</span>
                Entra a sii.cl → Servicios Online → Declaraciones de IVA (F29)
              </li>
              <li className="flex gap-2">
                <span className="font-bold">2.</span>
                Ingresa el IVA Débito: <span className="font-mono bg-blue-100 dark:bg-blue-800 px-2 rounded">{formatMoney(ivaDebito)}</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">3.</span>
                El IVA Crédito debería aparecer automático si subiste el registro de compras
              </li>
              <li className="flex gap-2">
                <span className="font-bold">4.</span>
                Verifica que el monto a pagar sea: <span className="font-mono bg-blue-100 dark:bg-blue-800 px-2 rounded">{formatMoney(Math.abs(ivaPagar))}</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold">5.</span>
                Envía la declaración antes del día 12 del mes siguiente
              </li>
            </ol>
          </div>

        </div>
      )}
    </div>
  )
}

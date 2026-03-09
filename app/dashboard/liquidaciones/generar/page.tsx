'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { calcularLiquidacion, formatMoney, formatRut, TASAS_AFP, type DatosEmpleado, type DatosMensuales, type Liquidacion } from '@/lib/calcularLiquidacion'
import { FileText, Download, Eye, Calculator, Users, Calendar, ChevronLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from '@/lib/toast'

export default function GenerarLiquidacionesPage() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [empleados, setEmpleados] = useState<DatosEmpleado[]>([])
  const [loading, setLoading] = useState(true)
  const [datosEmpleados, setDatosEmpleados] = useState<Record<string, DatosMensuales>>({})
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [selectedEmpleado, setSelectedEmpleado] = useState<string | null>(null)
  const [previewLiquidacion, setPreviewLiquidacion] = useState<Liquidacion | null>(null)
  const [enviando, setEnviando] = useState<string | null>(null) // ID del empleado que se está enviando

  // Cargar empleados activos
  useEffect(() => {
    cargarEmpleados()
  }, [])

  // Cargar datos del mes cuando cambia
  useEffect(() => {
    if (empleados.length > 0) {
      cargarDatosMes()
    }
  }, [mes, anio, empleados])

  async function cargarEmpleados() {
    const { data } = await supabase
      .from('personal')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (data) {
      setEmpleados(data.map(e => ({
        id: e.id,
        nombre: e.nombre,
        rut: e.rut || '',
        fecha_ingreso: e.fecha_ingreso,
        tipo_contrato: e.tipo_contrato || 'indefinido',
        cargo: e.cargo || 'operador',
        afp: e.afp || 'modelo',
        salud: e.salud || 'fonasa',
        isapre_monto: e.isapre_monto || 0,
        sueldo_base: e.sueldo_base || 529000,
        asignacion_caja: e.asignacion_caja || 15000,
        movilizacion: e.movilizacion || 50000,
      })))
    }
    setLoading(false)
  }

  async function cargarDatosMes() {
    const diasMes = new Date(anio, mes, 0).getDate()
    const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`
    const finMes = `${anio}-${String(mes).padStart(2, '0')}-${diasMes}`

    // Cargar turnos del mes
    const { data: turnos } = await supabase
      .from('turnos')
      .select('responsable, gastos, diferencia')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)

    // Cargar anticipos del mes
    const { data: pagos } = await supabase
      .from('pagos_personal')
      .select('personal_id, monto, tipo')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .eq('tipo', 'anticipo')

    // Cargar ausencias del mes
    const { data: ausencias } = await supabase
      .from('ausencias')
      .select('personal_id, tipo')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)

    // Procesar datos por empleado
    const nuevosDatos: Record<string, DatosMensuales> = {}

    empleados.forEach(emp => {
      // Contar turnos trabajados
      const turnosEmp = turnos?.filter(t =>
        t.responsable?.toLowerCase() === emp.nombre.toLowerCase()
      ) || []

      // Sumar anticipos
      const anticiposEmp = pagos?.filter(p => p.personal_id === emp.id)
        .reduce((sum, p) => sum + (p.monto || 0), 0) || 0

      // Sumar pérdida de caja (diferencias negativas)
      const perdidaCaja = turnosEmp.reduce((sum, t) => {
        const dif = Number(t.diferencia) || 0
        return sum + (dif < 0 ? Math.abs(dif) : 0)
      }, 0)

      // Calcular horas extras de los turnos
      let horasFestivo = 0
      let horasDomingo = 0
      turnosEmp.forEach(t => {
        if (t.gastos) {
          // Aproximar horas desde montos (valor hora ~$4200)
          const valorHora = emp.sueldo_base / 30 / 7.33
          if (t.gastos.horasExtras) {
            horasFestivo += (t.gastos.horasExtras / valorHora / 2) || 0
          }
        }
      })

      // Contar días licencia y ausencia
      const licencias = ausencias?.filter(a => a.personal_id === emp.id && a.tipo === 'licencia').length || 0
      const ausenciasCount = ausencias?.filter(a => a.personal_id === emp.id && a.tipo !== 'licencia').length || 0

      // Días trabajados = turnos * 1 (asumiendo 1 turno = 1 día, ajustar según tu lógica)
      const diasTrabajados = Math.min(diasMes - licencias - ausenciasCount, diasMes)

      nuevosDatos[emp.id] = {
        diasTrabajados,
        diasLicencia: licencias,
        diasAusencia: ausenciasCount,
        horasExtra: 0,
        horasFestivo: Math.round(horasFestivo),
        horasDomingo: 15, // Aproximado estándar
        anticipos: anticiposEmp,
        prestamos: 0, // TODO: cargar de tabla prestamos
        perdidaCaja,
        otrosDescuentos: 0,
      }
    })

    setDatosEmpleados(nuevosDatos)
  }

  function calcularTodas() {
    const nuevasLiquidaciones: Liquidacion[] = []

    empleados.forEach(emp => {
      const datos = datosEmpleados[emp.id] || {
        diasTrabajados: 30,
        diasLicencia: 0,
        diasAusencia: 0,
        horasExtra: 0,
        horasFestivo: 0,
        horasDomingo: 15,
        anticipos: 0,
        prestamos: 0,
        perdidaCaja: 0,
        otrosDescuentos: 0,
      }

      const liq = calcularLiquidacion(emp, mes, anio, datos)
      nuevasLiquidaciones.push(liq)
    })

    setLiquidaciones(nuevasLiquidaciones)
    toast.success('Liquidaciones calculadas', `Se calcularon ${nuevasLiquidaciones.length} liquidaciones`)
  }

  function actualizarDato(empleadoId: string, campo: keyof DatosMensuales, valor: number) {
    setDatosEmpleados(prev => ({
      ...prev,
      [empleadoId]: {
        ...prev[empleadoId],
        [campo]: valor
      }
    }))
  }

  async function generarPDF(liquidacion: Liquidacion) {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const emp = liquidacion.empleado
    const pw = doc.internal.pageSize.getWidth()
    const margin = 15
    const colMid = pw / 2

    // Colores - Paleta teal profesional
    const tealPrimary: [number, number, number] = [13, 148, 136]      // teal-600
    const tealDark: [number, number, number] = [17, 94, 89]           // teal-800
    const tealLight: [number, number, number] = [204, 251, 241]       // teal-100
    const grayBg: [number, number, number] = [249, 250, 251]          // gray-50
    const grayBorder: [number, number, number] = [229, 231, 235]      // gray-200
    const grayText: [number, number, number] = [107, 114, 128]        // gray-500
    const redAccent: [number, number, number] = [239, 68, 68]         // red-500
    const greenAccent: [number, number, number] = [34, 197, 94]       // green-500

    const formatFechaIngreso = (fecha: string | null) => {
      if (!fecha) return 'No registrada'
      const d = new Date(fecha)
      return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    // ========== HEADER CON BARRA TEAL ==========
    doc.setFillColor(...tealPrimary)
    doc.rect(0, 0, pw, 4, 'F')

    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...tealDark)
    doc.text('Liquidación de Remuneraciones', margin, 18)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...grayText)
    doc.text(`Mes: ${liquidacion.mes} de ${liquidacion.anio}`, margin, 26)

    // Línea decorativa
    doc.setDrawColor(...tealPrimary)
    doc.setLineWidth(0.5)
    doc.line(margin, 30, margin + 60, 30)

    // ========== INFO EMPLEADO Y EMPRESA ==========
    let y = 38
    const boxHeight = 54

    // Caja empleado con borde teal
    doc.setDrawColor(...tealPrimary)
    doc.setLineWidth(0.3)
    doc.rect(margin, y, colMid - margin - 5, boxHeight)

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...tealDark)
    doc.text(emp.nombre.toUpperCase(), margin + 4, y + 9)

    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.text('Rut: ', margin + 4, y + 17)
    doc.setFont('helvetica', 'normal')
    doc.text(formatRut(emp.rut), margin + 13, y + 17)

    doc.setFont('helvetica', 'bold')
    doc.text('Fecha de Ingreso: ', margin + 4, y + 23)
    doc.setFont('helvetica', 'normal')
    doc.text(formatFechaIngreso(emp.fecha_ingreso), margin + 36, y + 23)

    doc.setFont('helvetica', 'bold')
    doc.text('Tipo de Contrato: ', margin + 4, y + 29)
    doc.setFont('helvetica', 'normal')
    doc.text(emp.tipo_contrato === 'indefinido' ? 'Indefinido' : 'Plazo Fijo', margin + 36, y + 29)

    doc.setFont('helvetica', 'bold')
    doc.text('Cargo: ', margin + 4, y + 35)
    doc.setFont('helvetica', 'normal')
    doc.text(emp.cargo.toUpperCase(), margin + 17, y + 35)

    doc.setFont('helvetica', 'bold')
    doc.text('AFP: ', margin + 4, y + 41)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...tealPrimary)
    doc.text(liquidacion.afpNombre, margin + 14, y + 41)

    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.text('Salud: ', margin + 4, y + 47)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...tealPrimary)
    doc.text(`${liquidacion.saludTipo} (Fonasa)`, margin + 17, y + 47)

    // Caja empresa
    const rightX = colMid + 5
    const rightW = pw - margin - rightX
    doc.setDrawColor(...grayBorder)
    doc.rect(rightX, y, rightW, boxHeight)

    // Header empresa con fondo teal
    doc.setFillColor(...tealLight)
    doc.rect(rightX, y, rightW, 10, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...tealDark)
    doc.text('INFORMACIÓN EMPRESA', rightX + 4, y + 7)

    doc.setTextColor(60, 60, 60)
    doc.setFont('helvetica', 'bold')
    doc.text('Razón Social: ', rightX + 4, y + 17)
    doc.setFont('helvetica', 'normal')
    doc.text('SOZA MADARIAGA Y CIA LIMITADA', rightX + 28, y + 17)

    doc.setFont('helvetica', 'bold')
    doc.text('Rut Empresa:', rightX + 4, y + 23)
    doc.setFont('helvetica', 'normal')
    doc.text('78054999-8', rightX + 28, y + 23)

    doc.setFont('helvetica', 'bold')
    doc.text('Dirección: ', rightX + 4, y + 29)
    doc.setFont('helvetica', 'normal')
    doc.text('AV PDTE JORGE ALESSANDRI', rightX + 22, y + 29)
    doc.text('N° 26517', rightX + 22, y + 34)

    doc.setFont('helvetica', 'bold')
    doc.text('C. Costo: ', rightX + 4, y + 42)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...tealPrimary)
    doc.text('FILE 324 COMBUSTIBLE', rightX + 22, y + 42)

    // ========== TABLA DÍAS/HORAS ==========
    y += boxHeight + 10
    const colW = (pw - 2 * margin) / 4
    const rowH = 11

    const drawCell = (x: number, cy: number, w: number, h: number, text: string, isHeader: boolean) => {
      if (isHeader) {
        doc.setFillColor(...tealLight)
        doc.rect(x, cy, w, h, 'F')
        doc.setTextColor(...tealDark)
      } else {
        doc.setTextColor(40, 40, 40)
      }
      doc.setDrawColor(...grayBorder)
      doc.rect(x, cy, w, h)
      doc.setFont('helvetica', isHeader ? 'bold' : 'normal')
      doc.setFontSize(8)
      const textY = cy + h / 2 + 2
      doc.text(text, x + w / 2, textY, { align: 'center' })
    }

    // Fila 1
    drawCell(margin, y, colW, rowH, 'Días Trabajados:', true)
    drawCell(margin + colW, y, colW, rowH, 'Días Licencia', true)
    drawCell(margin + colW * 2, y, colW, rowH, 'Días Ausencia', true)
    drawCell(margin + colW * 3, y, colW, rowH, 'Horas Base', true)

    y += rowH
    drawCell(margin, y, colW, rowH, String(liquidacion.diasTrabajados), false)
    drawCell(margin + colW, y, colW, rowH, String(liquidacion.diasLicencia), false)
    drawCell(margin + colW * 2, y, colW, rowH, String(liquidacion.diasAusencia), false)
    drawCell(margin + colW * 3, y, colW, rowH, '44,0', false)

    // Fila 2
    y += rowH
    drawCell(margin, y, colW, rowH, 'Horas Extra', true)
    drawCell(margin + colW, y, colW, rowH, 'Tope Imponible', true)
    drawCell(margin + colW * 2, y, colW, rowH, 'Tributable', true)
    drawCell(margin + colW * 3, y, colW, rowH, 'Cargas', true)

    y += rowH
    drawCell(margin, y, colW, rowH, '0,0', false)
    drawCell(margin + colW, y, colW, rowH, new Intl.NumberFormat('es-CL').format(liquidacion.totalImponible), false)
    drawCell(margin + colW * 2, y, colW, rowH, new Intl.NumberFormat('es-CL').format(liquidacion.rentaTributable), false)
    drawCell(margin + colW * 3, y, colW, rowH, '0', false)

    // ========== TABLA HABERES / DESCUENTOS ==========
    y += rowH + 6
    const halfW = (pw - 2 * margin) / 2 - 3

    // Headers con color
    doc.setFillColor(...greenAccent)
    doc.rect(margin, y, halfW, 9, 'F')
    doc.setFillColor(...redAccent)
    doc.rect(margin + halfW + 6, y, halfW, 9, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('Haberes', margin + 4, y + 6)
    doc.text('Descuentos', margin + halfW + 10, y + 6)

    y += 9
    let yHab = y + 7
    let yDesc = y + 7
    const habX = margin
    const habValX = margin + halfW - 4
    const descX = margin + halfW + 6
    const descValX = pw - margin - 4

    doc.setFontSize(8)

    const addHaber = (label: string, valor: number | string, bold = false, isTotal = false) => {
      if (isTotal) {
        doc.setFillColor(240, 253, 244) // green-50
        doc.rect(habX, yHab - 4, halfW, 7, 'F')
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(isTotal ? 22 : 60, isTotal ? 163 : 60, isTotal ? 74 : 60)
      doc.text(label, habX + 3, yHab)
      const valStr = typeof valor === 'string' ? valor : formatMoney(valor)
      doc.text(valStr, habValX, yHab, { align: 'right' })
      yHab += bold ? 7 : 6
    }

    const addDesc = (label: string, valor: number | string, bold = false, isTotal = false) => {
      if (isTotal) {
        doc.setFillColor(254, 242, 242) // red-50
        doc.rect(descX, yDesc - 4, halfW, 7, 'F')
      }
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      doc.setTextColor(isTotal ? 185 : 60, isTotal ? 28 : 60, isTotal ? 28 : 60)
      doc.text(label, descX + 3, yDesc)
      const valStr = typeof valor === 'string' ? valor : new Intl.NumberFormat('es-CL').format(valor)
      doc.text(valStr, descValX, yDesc, { align: 'right' })
      yDesc += bold ? 7 : 6
    }

    // HABERES
    addHaber('Sueldo Base', liquidacion.sueldoBaseProporcional)
    addHaber('Gratificación Mensual', liquidacion.gratificacion)
    if (liquidacion.horasFestivoMonto > 0) addHaber('Horas Extras Festivo', liquidacion.horasFestivoMonto)
    if (liquidacion.horasDomingoMonto > 0) addHaber('Horas Domingo ( 15.0 Horas )', liquidacion.horasDomingoMonto)
    addHaber('TOTAL IMPONIBLE', liquidacion.totalImponible, true, true)
    yHab += 2

    if (liquidacion.asignacionCaja > 0) addHaber('Asignación de Caja', liquidacion.asignacionCaja)
    if (liquidacion.movilizacion > 0) addHaber('Movilización', liquidacion.movilizacion)
    addHaber('TOTAL NO IMPONIBLE', liquidacion.totalNoImponible, true)
    yHab += 3
    addHaber('TOTAL HABERES', liquidacion.totalHaberes, true, true)

    // DESCUENTOS
    addDesc(`AFP ( ${liquidacion.afpNombre}: ${liquidacion.afpTasa}% )`, liquidacion.afpMonto)
    addDesc(`Salud 7% (${liquidacion.saludTipo})`, liquidacion.saludMonto)
    if (liquidacion.cesantiaMonto > 0) addDesc('Seguro Cesantía Trabajador', liquidacion.cesantiaMonto)
    addDesc(`Impuesto ( Renta: $${new Intl.NumberFormat('es-CL').format(liquidacion.rentaTributable)} )`, liquidacion.impuestoMonto > 0 ? liquidacion.impuestoMonto : '$0')
    addDesc('TOTAL DESC. LEGALES', liquidacion.totalDescLegales, true, true)
    yDesc += 2

    if (liquidacion.perdidaCaja > 0) addDesc('Descuento por pérdida de caja', liquidacion.perdidaCaja)
    if (liquidacion.anticipos > 0) addDesc(`Descuento Anticipo`, liquidacion.anticipos)
    if (liquidacion.prestamos > 0) addDesc('Descuento préstamo', liquidacion.prestamos)
    addDesc('TOTAL OTROS DESC.', liquidacion.totalOtrosDesc, true)

    // Bordes
    const tableHeight = Math.max(yHab, yDesc) - y + 5
    doc.setDrawColor(...grayBorder)
    doc.rect(margin, y, halfW, tableHeight)
    doc.rect(margin + halfW + 6, y, halfW, tableHeight)

    // ========== ALCANCE LÍQUIDO ==========
    const yLiquido = Math.max(yHab, yDesc) + 10
    doc.setFillColor(...tealPrimary)
    doc.roundedRect(margin + halfW + 6, yLiquido, halfW, 14, 2, 2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text('ALCANCE LÍQUIDO:', margin + halfW + 12, yLiquido + 9)
    doc.setFontSize(12)
    doc.text(formatMoney(liquidacion.alcanceLiquido), descValX - 2, yLiquido + 9, { align: 'right' })

    // ========== FOOTER ==========
    const yFooter = yLiquido + 22
    doc.setFontSize(7)
    doc.setTextColor(...tealPrimary)
    doc.text('Liquidación generada automáticamente por EDS Control', margin, yFooter)

    // Certificado
    const yFirma = yFooter + 8
    doc.setDrawColor(...grayBorder)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(margin, yFirma, colMid - margin, 32, 2, 2, 'FD')

    // Icono firma
    doc.setFillColor(...tealLight)
    doc.circle(margin + 10, yFirma + 16, 7, 'F')
    doc.setDrawColor(...tealPrimary)
    doc.circle(margin + 10, yFirma + 16, 7, 'D')

    doc.setFontSize(7)
    doc.setTextColor(60, 60, 60)
    const certX = margin + 22
    doc.text('Certifico que he recibido a mi entera satisfacción', certX, yFirma + 9)
    doc.text(`la suma de ${formatMoney(liquidacion.alcanceLiquido)} indicada en la presente`, certX, yFirma + 14)
    doc.text('liquidación, y no tengo cargo ni cobro posterior que', certX, yFirma + 19)
    doc.text('hacer por los conceptos de esta liquidación.', certX, yFirma + 24)

    // Vº.Bº. y QR
    const vbX = colMid + 5
    const vbW = (pw - margin - vbX) / 2 - 2
    doc.roundedRect(vbX, yFirma, vbW, 32, 2, 2)
    doc.setFontSize(8)
    doc.setTextColor(...grayText)
    doc.text('Vº.Bº.', vbX + vbW / 2, yFirma + 22, { align: 'center' })

    // ========== QR CODE ==========
    const qrX = vbX + vbW + 4
    const qrSize = 28

    // Generar URL del storage
    const storagePath = `${emp.id}/${anio}_${mes}.pdf`
    const { data: urlData } = supabase.storage.from('NOMINAS').getPublicUrl(storagePath)
    const publicUrl = urlData.publicUrl

    // Generar QR
    const QRCode = (await import('qrcode')).default
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 150,
      margin: 1,
      color: { dark: '#0d9488', light: '#ffffff' }
    })

    // Insertar QR en PDF
    doc.addImage(qrDataUrl, 'PNG', qrX + 2, yFirma + 2, qrSize, qrSize)

    // Barra inferior
    doc.setFillColor(...tealPrimary)
    doc.rect(0, 293, pw, 4, 'F')

    // ========== SUBIR A SUPABASE Y GUARDAR ==========
    const pdfBlob = doc.output('blob')

    // Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('NOMINAS')
      .upload(storagePath, pdfBlob, {
        upsert: true,
        contentType: 'application/pdf'
      })

    if (uploadError) {
      console.error('Error subiendo PDF:', uploadError)
      toast.error('Error al subir', 'No se pudo guardar en la nube')
    } else {
      // Guardar registro en BD
      await supabase.from('liquidaciones').upsert({
        personal_id: emp.id,
        mes,
        anio,
        archivo_path: storagePath,
        estado: 'generado'
      }, { onConflict: 'personal_id,mes,anio' })

      toast.success('PDF guardado', 'Disponible en la nube')
    }

    // También descargar localmente
    const nombreArchivo = `liquidacion-${emp.nombre.replace(/\s+/g, '-').toLowerCase()}-${liquidacion.mes}-${liquidacion.anio}.pdf`
    doc.save(nombreArchivo)
  }

  // Función para enviar por correo
  async function enviarPorCorreo(liquidacion: Liquidacion) {
    const emp = liquidacion.empleado

    // Obtener correo del empleado
    const { data: personal } = await supabase
      .from('personal')
      .select('correo')
      .eq('id', emp.id)
      .single()

    if (!personal?.correo) {
      toast.error('Sin correo', `${emp.nombre} no tiene email registrado`)
      return
    }

    setEnviando(emp.id)

    try {
      // Generar PDF
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      const pw = doc.internal.pageSize.getWidth()
      const margin = 15

      // Colores
      const tealPrimary: [number, number, number] = [13, 148, 136]
      const tealDark: [number, number, number] = [17, 94, 89]

      // Header
      doc.setFillColor(...tealPrimary)
      doc.rect(0, 0, pw, 4, 'F')
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...tealDark)
      doc.text('Liquidación de Remuneraciones', margin, 18)
      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text(`Mes: ${liquidacion.mes} de ${liquidacion.anio}`, margin, 26)

      // Info empleado
      let y = 40
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text(emp.nombre.toUpperCase(), margin, y)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`RUT: ${formatRut(emp.rut)} | Cargo: ${emp.cargo} | AFP: ${liquidacion.afpNombre}`, margin, y + 7)

      // Tabla resumen
      y = 60
      doc.setFillColor(249, 250, 251)
      doc.rect(margin, y, pw - 2 * margin, 10, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text(`Días: ${liquidacion.diasTrabajados}`, margin + 5, y + 7)
      doc.text(`Licencia: ${liquidacion.diasLicencia}`, margin + 40, y + 7)
      doc.text(`Ausencia: ${liquidacion.diasAusencia}`, margin + 75, y + 7)

      // Haberes y Descuentos
      y = 80
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(34, 197, 94)
      doc.text('HABERES', margin, y)
      doc.setTextColor(239, 68, 68)
      doc.text('DESCUENTOS', pw / 2 + 10, y)

      y += 8
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(0, 0, 0)

      // Haberes
      doc.text('Sueldo Base:', margin, y)
      doc.text(formatMoney(liquidacion.sueldoBaseProporcional), margin + 60, y, { align: 'right' })
      doc.text('Gratificación:', margin, y + 6)
      doc.text(formatMoney(liquidacion.gratificacion), margin + 60, y + 6, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text('Total Imponible:', margin, y + 14)
      doc.text(formatMoney(liquidacion.totalImponible), margin + 60, y + 14, { align: 'right' })
      doc.text('Total Haberes:', margin, y + 22)
      doc.text(formatMoney(liquidacion.totalHaberes), margin + 60, y + 22, { align: 'right' })

      // Descuentos
      doc.setFont('helvetica', 'normal')
      doc.text(`AFP (${liquidacion.afpTasa}%):`, pw / 2 + 10, y)
      doc.text(formatMoney(liquidacion.afpMonto), pw - margin, y, { align: 'right' })
      doc.text('Salud (7%):', pw / 2 + 10, y + 6)
      doc.text(formatMoney(liquidacion.saludMonto), pw - margin, y + 6, { align: 'right' })
      doc.setFont('helvetica', 'bold')
      doc.text('Desc. Legales:', pw / 2 + 10, y + 14)
      doc.text(formatMoney(liquidacion.totalDescLegales), pw - margin, y + 14, { align: 'right' })
      doc.text('Otros Desc.:', pw / 2 + 10, y + 22)
      doc.text(formatMoney(liquidacion.totalOtrosDesc), pw - margin, y + 22, { align: 'right' })

      // Alcance líquido
      y += 35
      doc.setFillColor(...tealPrimary)
      doc.roundedRect(pw / 2, y, pw / 2 - margin, 14, 2, 2, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.text('ALCANCE LÍQUIDO:', pw / 2 + 8, y + 9)
      doc.text(formatMoney(liquidacion.alcanceLiquido), pw - margin - 5, y + 9, { align: 'right' })

      // Footer
      doc.setFillColor(...tealPrimary)
      doc.rect(0, 285, pw, 4, 'F')
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 100)
      doc.text('Liquidación generada por EDS Control', pw / 2, 280, { align: 'center' })

      // Crear blob y enviar
      const pdfBlob = doc.output('blob')

      const formData = new FormData()
      formData.append('file', pdfBlob, `Liquidacion_${mes}_${anio}.pdf`)
      formData.append('email', personal.correo)
      formData.append('nombre', emp.nombre)
      formData.append('mes', `${liquidacion.mes} ${liquidacion.anio}`)

      const res = await fetch('/api/enviar-liquidacion', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        throw new Error('Error al enviar')
      }

      toast.success('Correo enviado', `Liquidación enviada a ${emp.nombre}`)
    } catch (error) {
      console.error(error)
      toast.error('Error', 'No se pudo enviar el correo')
    } finally {
      setEnviando(null)
    }
  }

  const nombreMes = (m: number) => {
    return new Date(2024, m - 1).toLocaleDateString('es-CL', { month: 'long' })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/liquidaciones" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition">
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Generar Liquidaciones</h1>
          <p className="text-zinc-500 text-sm">Calcula y genera PDFs de liquidaciones de sueldo</p>
        </div>
      </div>

      {/* Selector período */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Mes</label>
            <select
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
              className="p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700 min-w-[150px]"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{nombreMes(i + 1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Año</label>
            <select
              value={anio}
              onChange={e => setAnio(Number(e.target.value))}
              className="p-2 border rounded-lg dark:bg-zinc-800 dark:border-zinc-700"
            >
              <option value={2024}>2024</option>
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
            </select>
          </div>
          <button
            onClick={calcularTodas}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg font-bold hover:bg-teal-700 transition flex items-center gap-2"
          >
            <Calculator size={18} />
            Calcular Todas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-2 text-zinc-500">Cargando empleados...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Lista empleados */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <Users size={18} className="text-zinc-400" />
              <h2 className="font-bold">Empleados Activos ({empleados.length})</h2>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {empleados.map(emp => {
                const liq = liquidaciones.find(l => l.empleado.id === emp.id)
                const datos = datosEmpleados[emp.id]
                return (
                  <div
                    key={emp.id}
                    className={`p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition ${
                      selectedEmpleado === emp.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''
                    }`}
                    onClick={() => {
                      setSelectedEmpleado(emp.id)
                      if (liq) setPreviewLiquidacion(liq)
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">{emp.nombre}</p>
                        <p className="text-xs text-zinc-500">{formatRut(emp.rut)} · {emp.cargo}</p>
                      </div>
                      <div className="text-right">
                        {liq ? (
                          <>
                            <p className="font-bold text-teal-600">{formatMoney(liq.alcanceLiquido)}</p>
                            <div className="flex gap-1 mt-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setPreviewLiquidacion(liq) }}
                                className="p-1 text-zinc-400 hover:text-blue-600 transition"
                                title="Ver detalle"
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); generarPDF(liq) }}
                                className="p-1 text-zinc-400 hover:text-teal-600 transition"
                                title="Descargar PDF"
                              >
                                <Download size={16} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); enviarPorCorreo(liq) }}
                                disabled={enviando === emp.id}
                                className="p-1 text-zinc-400 hover:text-blue-600 transition disabled:opacity-50"
                                title="Enviar por correo"
                              >
                                {enviando === emp.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                              </button>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-zinc-400">Sin calcular</p>
                        )}
                      </div>
                    </div>
                    {datos && (
                      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                        <span>{datos.diasTrabajados} días</span>
                        {datos.anticipos > 0 && <span className="text-amber-600">Anticipo: {formatMoney(datos.anticipos)}</span>}
                        {datos.perdidaCaja > 0 && <span className="text-red-500">Pérdida: {formatMoney(datos.perdidaCaja)}</span>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Preview liquidación */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
              <FileText size={18} className="text-zinc-400" />
              <h2 className="font-bold">Vista Previa</h2>
            </div>

            {previewLiquidacion ? (
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {/* Info empleado */}
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-3">
                  <p className="font-bold text-teal-900 dark:text-teal-100">{previewLiquidacion.empleado.nombre}</p>
                  <p className="text-sm text-teal-700 dark:text-teal-300">
                    {formatRut(previewLiquidacion.empleado.rut)} · {previewLiquidacion.mes} {previewLiquidacion.anio}
                  </p>
                </div>

                {/* Haberes */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Haberes</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Sueldo Base</span><span>{formatMoney(previewLiquidacion.sueldoBaseProporcional)}</span></div>
                    <div className="flex justify-between"><span>Gratificación</span><span>{formatMoney(previewLiquidacion.gratificacion)}</span></div>
                    {previewLiquidacion.horasFestivoMonto > 0 && <div className="flex justify-between"><span>Hrs. Festivo</span><span>{formatMoney(previewLiquidacion.horasFestivoMonto)}</span></div>}
                    {previewLiquidacion.horasDomingoMonto > 0 && <div className="flex justify-between"><span>Hrs. Domingo</span><span>{formatMoney(previewLiquidacion.horasDomingoMonto)}</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1"><span>Total Imponible</span><span>{formatMoney(previewLiquidacion.totalImponible)}</span></div>
                    <div className="flex justify-between text-zinc-500"><span>+ No Imponible</span><span>{formatMoney(previewLiquidacion.totalNoImponible)}</span></div>
                    <div className="flex justify-between font-bold text-green-600"><span>Total Haberes</span><span>{formatMoney(previewLiquidacion.totalHaberes)}</span></div>
                  </div>
                </div>

                {/* Descuentos */}
                <div>
                  <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">Descuentos</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-red-600"><span>AFP ({previewLiquidacion.afpTasa}%)</span><span>-{formatMoney(previewLiquidacion.afpMonto)}</span></div>
                    <div className="flex justify-between text-red-600"><span>Salud (7%)</span><span>-{formatMoney(previewLiquidacion.saludMonto)}</span></div>
                    {previewLiquidacion.cesantiaMonto > 0 && <div className="flex justify-between text-red-600"><span>Cesantía</span><span>-{formatMoney(previewLiquidacion.cesantiaMonto)}</span></div>}
                    {previewLiquidacion.impuestoMonto > 0 && <div className="flex justify-between text-red-600"><span>Impuesto</span><span>-{formatMoney(previewLiquidacion.impuestoMonto)}</span></div>}
                    <div className="flex justify-between font-bold border-t pt-1 text-red-600"><span>Desc. Legales</span><span>-{formatMoney(previewLiquidacion.totalDescLegales)}</span></div>
                    {previewLiquidacion.totalOtrosDesc > 0 && (
                      <>
                        {previewLiquidacion.anticipos > 0 && <div className="flex justify-between text-amber-600"><span>Anticipos</span><span>-{formatMoney(previewLiquidacion.anticipos)}</span></div>}
                        {previewLiquidacion.perdidaCaja > 0 && <div className="flex justify-between text-amber-600"><span>Pérdida Caja</span><span>-{formatMoney(previewLiquidacion.perdidaCaja)}</span></div>}
                        <div className="flex justify-between font-bold text-amber-600"><span>Otros Desc.</span><span>-{formatMoney(previewLiquidacion.totalOtrosDesc)}</span></div>
                      </>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-teal-600 text-white rounded-lg p-4 flex justify-between items-center">
                  <span className="font-bold">ALCANCE LÍQUIDO</span>
                  <span className="text-2xl font-bold">{formatMoney(previewLiquidacion.alcanceLiquido)}</span>
                </div>

                {/* Acciones */}
                <div className="flex gap-2">
                  <button
                    onClick={() => generarPDF(previewLiquidacion)}
                    className="flex-1 py-3 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition flex items-center justify-center gap-2"
                  >
                    <Download size={18} />
                    Descargar
                  </button>
                  <button
                    onClick={() => enviarPorCorreo(previewLiquidacion)}
                    disabled={enviando === previewLiquidacion.empleado.id}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {enviando === previewLiquidacion.empleado.id ? (
                      <><Loader2 size={18} className="animate-spin" /> Enviando...</>
                    ) : (
                      <><Send size={18} /> Enviar</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400">
                <FileText size={48} className="mx-auto mb-3 opacity-30" />
                <p>Selecciona un empleado para ver la vista previa</p>
                <p className="text-sm mt-1">O haz clic en "Calcular Todas" para procesar</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resumen totales */}
      {liquidaciones.length > 0 && (
        <div className="mt-6 bg-zinc-900 text-white rounded-xl p-6">
          <h3 className="text-lg font-bold mb-4">Resumen {nombreMes(mes)} {anio}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-zinc-400 text-sm">Total Haberes</p>
              <p className="text-xl font-bold text-green-400">
                {formatMoney(liquidaciones.reduce((s, l) => s + l.totalHaberes, 0))}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Desc. Legales</p>
              <p className="text-xl font-bold text-red-400">
                {formatMoney(liquidaciones.reduce((s, l) => s + l.totalDescLegales, 0))}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Otros Desc.</p>
              <p className="text-xl font-bold text-amber-400">
                {formatMoney(liquidaciones.reduce((s, l) => s + l.totalOtrosDesc, 0))}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 text-sm">Total Líquido a Pagar</p>
              <p className="text-2xl font-bold text-teal-400">
                {formatMoney(liquidaciones.reduce((s, l) => s + l.alcanceLiquido, 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

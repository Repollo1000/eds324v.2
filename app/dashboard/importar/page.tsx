"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import { toast } from "@/lib/toast";
import ConfirmModal from "@/components/ConfirmModal";

type Empleado = { id: string; nombre: string };

// --- Tipos Ausencias ---
type FilaAusencia = {
  fecha: string;
  nombre: string;
  tipo: "ausencia" | "licencia_medica";
  dias: number;
  observaciones: string;
  reemplazo: string;
  personalId: string;
  valida: boolean;
};

// --- Tipos Cuadraturas ---
type ItemLista = { id: string; monto: number; referencia: string };

type TurnoImport = {
  fecha: string;
  turno: string; // "mañana" | "tarde" | "noche"
  turnoLabel: string; // "A" | "B" | "C"
  responsable: string;
  nombreExcel: string;
  depositos: ItemLista[];
  vouchers: ItemLista[];
  gastos: {
    bencinaEnzo: number;
    perrosMuertos: number;
    turnoExtra: number;
    horasExtras: number;
    comisionesPromocion: number;
    comisionesLubricantes: number;
    tercerDomingo: number;
    cuartoDomingo: number;
    quintoDomingo: number;
    valeEasyPay: number;
    otros: number;
  };
  total_tarjetas: number;
  venta_combustible: number;
  venta_tienda: number;
  total_ventas: number;
  total_no_efectivo: number;
  efectivo_esperado: number;
  efectivo_real: number;
  diferencia: number;
  valida: boolean;
};

type ModoImportacion = "ausencias" | "cuadraturas";

export default function ImportarPage() {
  const router = useRouter();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [importando, setImportando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Estado del archivo subido
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [anioExcel, setAnioExcel] = useState(new Date().getFullYear());
  const [mesExcel, setMesExcel] = useState(new Date().getMonth() + 1);

  // Modo de importación
  const [modo, setModo] = useState<ModoImportacion | "">("");

  // Ausencias
  const [hojasDisponibles, setHojasDisponibles] = useState<string[]>([]);
  const [hojaSeleccionada, setHojaSeleccionada] = useState("");
  const [filasAusencias, setFilasAusencias] = useState<FilaAusencia[]>([]);

  // Cuadraturas
  const [turnosImport, setTurnosImport] = useState<TurnoImport[]>([]);
  const [duplicadosAdvertencia, setDuplicadosAdvertencia] = useState("");

  // Resultado
  const [importados, setImportados] = useState(0);

  // Modal confirmación
  const [confirmModal, setConfirmModal] = useState(false);

  // Cargar TODO el personal (incluyendo inactivos/despedidos para datos históricos)
  useEffect(() => {
    const cargar = async () => {
      const { data } = await supabase
        .from("personal")
        .select("id, nombre")
        .order("nombre");
      if (data) setEmpleados(data);
    };
    cargar();
  }, []);

  // --- Helpers compartidos ---
  const buscarPersonal = (nombreExcel: string): { id: string; nombre: string } | null => {
    const limpio = nombreExcel.trim().toUpperCase().replace(/\s+/g, " ");
    if (!limpio) return null;
    const exacto = empleados.find((e) => e.nombre.toUpperCase() === limpio);
    if (exacto) return exacto;
    const parcial = empleados.find(
      (e) =>
        e.nombre.toUpperCase().includes(limpio) ||
        limpio.includes(e.nombre.toUpperCase())
    );
    if (parcial) return parcial;
    const palabras = limpio.split(" ");
    const porPalabra = empleados.find((e) => {
      const n = e.nombre.toUpperCase();
      return palabras.some((p) => p.length > 2 && n.includes(p));
    });
    return porPalabra || null;
  };

  const parsearFecha = (valor: any, anio: number, mes: number): string | null => {
    if (!valor) return null;
    if (valor instanceof Date) return valor.toISOString().split("T")[0];
    if (typeof valor === "number" && valor > 40000) {
      const d = new Date((valor - 25569) * 86400000);
      return d.toISOString().split("T")[0];
    }
    const str = String(valor).trim().toUpperCase();
    const rango = str.match(/(\d{1,2})\s*(?:AL|-AL)\s*(\d{1,2})/);
    if (rango) {
      const dia = rango[1].padStart(2, "0");
      return `${anio}-${String(mes).padStart(2, "0")}-${dia}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
    return null;
  };

  const parsearDias = (valor: any): number => {
    if (!valor) return 1;
    const m = String(valor).trim().match(/(\d+)/);
    return m ? parseInt(m[1]) || 1 : 1;
  };

  const parsearReemplazo = (valor: any): string => {
    if (!valor) return "";
    const m = String(valor).trim().match(/REEMPLAZ\w+\s+(?:PO[R]?\s+)?(.+)/i);
    return m ? m[1].trim() : "";
  };

  const num = (v: any): number => {
    if (v === null || v === undefined || v === "") return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  // --- Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const wb = XLSX.read(data, { type: "binary", cellDates: true });

      setWorkbook(wb);
      setNombreArchivo(file.name);
      setHojasDisponibles(wb.SheetNames);
      setFilasAusencias([]);
      setTurnosImport([]);
      setImportados(0);
      setModo("");
      setDuplicadosAdvertencia("");

      // Detectar mes/año del nombre
      const nombre = file.name.toUpperCase();
      const meses: Record<string, number> = {
        ENERO: 1, FEBRERO: 2, MARZO: 3, ABRIL: 4, MAYO: 5, JUNIO: 6,
        JULIO: 7, AGOSTO: 8, SEPTIEMBRE: 9, OCTUBRE: 10, NOVIEMBRE: 11, DICIEMBRE: 12,
      };
      for (const [n, num] of Object.entries(meses)) {
        if (nombre.includes(n)) { setMesExcel(num); break; }
      }
      const am = nombre.match(/(\d{4})/);
      if (am) setAnioExcel(parseInt(am[1]));

      // Auto-detectar modo
      const tieneHojasNumericas = wb.SheetNames.some((n) => /^(0[1-9]|[12]\d|3[01])$/.test(n.trim()));
      const tieneHojaAusencias = wb.SheetNames.some((n) => n.toUpperCase().includes("AUSENCIA"));

      if (tieneHojasNumericas && nombre.includes("CUADRATURA")) {
        setModo("cuadraturas");
      } else if (tieneHojaAusencias) {
        setModo("ausencias");
        const auto = wb.SheetNames.find((n) => n.toUpperCase().includes("AUSENCIA"));
        if (auto) setHojaSeleccionada(auto);
      }
    };
    reader.readAsBinaryString(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  // --- Parsear Ausencias (lógica original) ---
  const parsearAusencias = () => {
    if (!workbook || !hojaSeleccionada) return;

    const ws = workbook.Sheets[hojaSeleccionada];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const result: FilaAusencia[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      const [fechaRaw, nombreRaw, motivoRaw, diasRaw] = row;

      if (!nombreRaw || String(nombreRaw).toUpperCase() === "TOTAL") continue;

      const nombreStr = String(nombreRaw)
        .trim()
        .replace(/\s*LICENCIA\s*/i, "")
        .trim();
      if (!nombreStr) continue;

      const fechaParsed = parsearFecha(fechaRaw, anioExcel, mesExcel);
      if (!fechaParsed) continue;

      const motivoStr = String(motivoRaw || "").toUpperCase();
      const esLicencia =
        motivoStr.includes("LICENCIA") || motivoStr.includes("LIENCIA");

      const diasVal = parsearDias(diasRaw);
      const reemplazoVal = parsearReemplazo(diasRaw);
      const obsVal =
        reemplazoVal
          ? String(diasRaw || "")
          : diasVal > 1
          ? String(diasRaw || "")
          : "";

      const match = buscarPersonal(nombreStr);

      result.push({
        fecha: fechaParsed,
        nombre: nombreStr,
        tipo: esLicencia ? "licencia_medica" : "ausencia",
        dias: diasVal,
        observaciones: obsVal,
        reemplazo: reemplazoVal,
        personalId: match?.id || "",
        valida: !!match,
      });
    }

    setFilasAusencias(result);
  };

  // --- Parsear Cuadraturas ---
  const parsearCuadraturas = async () => {
    if (!workbook) return;

    const turnoMap: { label: string; nombre: string; colStart: number }[] = [
      { label: "A", nombre: "mañana", colStart: 1 },  // B=col1 to F=col5
      { label: "B", nombre: "tarde", colStart: 9 },    // J=col9 to N=col13
      { label: "C", nombre: "noche", colStart: 17 },   // R=col17 to V=col21
    ];

    const result: TurnoImport[] = [];
    const mesStr = String(mesExcel).padStart(2, "0");

    for (let dia = 1; dia <= 31; dia++) {
      const diaStr = String(dia).padStart(2, "0");
      const sheetName = workbook.SheetNames.find((n) => n.trim() === diaStr);
      if (!sheetName) continue;

      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;

      // Read raw cell data (0-indexed rows)
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

      const fechaDefault = `${anioExcel}-${mesStr}-${diaStr}`;

      for (const turnoConfig of turnoMap) {
        const { label, nombre: turnoNombre, colStart } = turnoConfig;

        // R7 = row index 6 → names row
        const namesRow = rows[6];
        if (!namesRow) continue;

        // Iterate through 5 possible person columns
        for (let offset = 0; offset < 5; offset++) {
          const col = colStart + offset;
          const personName = namesRow[col];
          if (!personName || String(personName).trim() === "") continue;

          const nameStr = String(personName).trim();

          // Check if person has any data (not all zeros)
          let hasData = false;

          // Collect depositos (R8-R21 = rows 7-20)
          const depositosList: ItemLista[] = [];
          for (let r = 7; r <= 20; r++) {
            const val = rows[r]?.[col];
            if (val !== null && val !== undefined && num(val) !== 0) {
              hasData = true;
              depositosList.push({
                id: crypto.randomUUID(),
                monto: num(val),
                referencia: "",
              });
            }
          }

          // MONEDAS/EFECTIVO (R22-R27 = rows 21-26, pueden ser varias filas)
          for (let r = 21; r <= 26; r++) {
            const val = num(rows[r]?.[col]);
            if (val !== 0) {
              hasData = true;
              depositosList.push({
                id: crypto.randomUUID(),
                monto: val,
                referencia: "Monedas/Efectivo",
              });
            }
          }

          // Collect vouchers - Copiloto (R34-36 = rows 33-35)
          const vouchersList: ItemLista[] = [];
          for (let r = 33; r <= 35; r++) {
            const val = rows[r]?.[col];
            if (val !== null && val !== undefined && num(val) !== 0) {
              hasData = true;
              vouchersList.push({
                id: crypto.randomUUID(),
                monto: num(val),
                referencia: "Copiloto",
              });
            }
          }

          // ShellCard (R37-40 = rows 36-39)
          for (let r = 36; r <= 39; r++) {
            const val = rows[r]?.[col];
            if (val !== null && val !== undefined && num(val) !== 0) {
              hasData = true;
              vouchersList.push({
                id: crypto.randomUUID(),
                monto: num(val),
                referencia: "ShellCard",
              });
            }
          }

          // Gastos
          const gastosObj = {
            bencinaEnzo: 0,
            perrosMuertos: 0,
            turnoExtra: 0,
            horasExtras: 0,
            comisionesPromocion: 0,
            comisionesLubricantes: 0,
            tercerDomingo: 0,
            cuartoDomingo: 0,
            quintoDomingo: 0,
            valeEasyPay: 0,
            otros: 0,
          };

          // R41 = row 40: Comision A Y L
          const comisionVal = num(rows[40]?.[col]);
          if (comisionVal !== 0) {
            gastosObj.comisionesPromocion = comisionVal;
            hasData = true;
          }

          // R42-43 = rows 41-42: Variable expenses (parse label from column A or turno's first col)
          for (let r = 41; r <= 42; r++) {
            const val = num(rows[r]?.[col]);
            if (val === 0) continue;
            hasData = true;

            // Try to read the label from column A (col 0) or the turno's label column
            const labelRaw = String(rows[r]?.[0] || rows[r]?.[colStart - 1] || "").toUpperCase().trim();

            if (labelRaw.includes("TERCER") || (labelRaw.includes("DOMINGO") && labelRaw.includes("3"))) {
              gastosObj.tercerDomingo += val;
            } else if (labelRaw.includes("4") || labelRaw.includes("CUARTO")) {
              gastosObj.cuartoDomingo += val;
            } else if (labelRaw.includes("5TO") || labelRaw.includes("QUINTO")) {
              gastosObj.quintoDomingo += val;
            } else if (labelRaw.includes("TURNO") || labelRaw.includes("T EXTRA") || labelRaw.includes("TEXTRA")) {
              gastosObj.turnoExtra += val;
            } else if (labelRaw.includes("BENCINA") || labelRaw.includes("DIESEL")) {
              gastosObj.bencinaEnzo += val;
            } else if (labelRaw.includes("DOMINGO")) {
              // Generic domingo without qualifier → tercerDomingo
              gastosObj.tercerDomingo += val;
            } else {
              gastosObj.otros += val;
            }
          }

          // R44 = row 43: Vale Easy Pay or other
          const r44Val = num(rows[43]?.[col]);
          if (r44Val !== 0) {
            hasData = true;
            const labelR44 = String(rows[43]?.[0] || rows[43]?.[colStart - 1] || "").toUpperCase().trim();
            if (labelR44.includes("EASY PAY") || labelR44.includes("EASYPAY")) {
              gastosObj.valeEasyPay += r44Val;
            } else {
              gastosObj.otros += r44Val;
            }
          }

          // R50 = row 49: Tarjetas
          const tarjetas = num(rows[49]?.[col]);
          if (tarjetas !== 0) hasData = true;

          // R55 = row 54: VENTA
          const venta = num(rows[54]?.[col]);
          if (venta !== 0) hasData = true;

          // R56 = row 55: DIFERENCIA
          const diferencia = num(rows[55]?.[col]);

          // Skip persons with no data
          if (!hasData) continue;

          // Ensure at least one deposito entry
          if (depositosList.length === 0) {
            depositosList.push({ id: crypto.randomUUID(), monto: 0, referencia: "" });
          }
          // Ensure at least one voucher entry
          if (vouchersList.length === 0) {
            vouchersList.push({ id: crypto.randomUUID(), monto: 0, referencia: "Copiloto" });
          }

          // Calculate totals
          const sumDepositos = depositosList.reduce((acc, d) => acc + d.monto, 0);
          const sumVouchers = vouchersList.reduce((acc, v) => acc + v.monto, 0);
          const sumGastos = Object.entries(gastosObj).reduce((acc, [key, val]) => {
            if (key === "perrosMuertos") return acc;
            return acc + val;
          }, 0);

          const totalNoEfectivo = sumVouchers + sumGastos + tarjetas;
          const efectivoEsperado = venta - totalNoEfectivo;

          // Match person
          const match = buscarPersonal(nameStr);

          result.push({
            fecha: fechaDefault,
            turno: turnoNombre,
            turnoLabel: label,
            responsable: match?.nombre || nameStr,
            nombreExcel: nameStr,
            depositos: depositosList,
            vouchers: vouchersList,
            gastos: gastosObj,
            total_tarjetas: tarjetas,
            venta_combustible: venta,
            venta_tienda: 0,
            total_ventas: venta,
            total_no_efectivo: totalNoEfectivo,
            efectivo_esperado: efectivoEsperado,
            efectivo_real: sumDepositos,
            diferencia: diferencia !== 0 ? diferencia : sumDepositos - efectivoEsperado,
            valida: !!match,
          });
        }
      }
    }

    setTurnosImport(result);

    // Check for existing turnos in this month
    const fechaInicio = `${anioExcel}-${mesStr}-01`;
    const fechaFin = `${anioExcel}-${mesStr}-31`;
    const { data: existentes } = await supabase
      .from("turnos")
      .select("id, fecha, turno, responsable")
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (existentes && existentes.length > 0) {
      setDuplicadosAdvertencia(
        `Ya existen ${existentes.length} turnos registrados en este mes. Revisa antes de importar para evitar duplicados.`
      );
    } else {
      setDuplicadosAdvertencia("");
    }
  };

  // Triggers
  useEffect(() => {
    if (modo === "ausencias" && hojaSeleccionada && workbook && empleados.length > 0) {
      parsearAusencias();
    }
  }, [hojaSeleccionada, workbook, empleados, anioExcel, mesExcel]);

  useEffect(() => {
    if (modo === "cuadraturas" && workbook && empleados.length > 0) {
      parsearCuadraturas();
    }
  }, [modo, workbook, empleados, anioExcel, mesExcel]);

  // --- Agregar persona nueva como despedido ---
  const agregarPersonalDespedido = async (nombreExcel: string): Promise<{ id: string; nombre: string } | null> => {
    const nombre = nombreExcel.trim().toUpperCase().replace(/\s+/g, " ");
    if (!nombre) return null;

    const { data, error } = await supabase
      .from("personal")
      .insert({
        nombre,
        activo: false,
        estado: "despedido",
        rol: "atendedor",
        grupo: null,
      })
      .select("id, nombre")
      .single();

    if (error) {
      toast.error("Error al agregar persona", error.message);
      return null;
    }

    // Agregar a la lista local
    setEmpleados((prev) => [...prev, data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    return data;
  };

  const agregarYAsignarTurno = async (index: number, nombreExcel: string) => {
    const persona = await agregarPersonalDespedido(nombreExcel);
    if (!persona) return;

    setTurnosImport((prev) => {
      const copy = [...prev];
      // Asignar a todos los turnos con el mismo nombre de Excel
      for (let j = 0; j < copy.length; j++) {
        if (copy[j].nombreExcel.trim().toUpperCase() === nombreExcel.trim().toUpperCase() && !copy[j].valida) {
          copy[j] = { ...copy[j], responsable: persona.nombre, valida: true };
        }
      }
      return copy;
    });
  };

  const agregarYAsignarAusencia = async (index: number, nombreExcel: string) => {
    const persona = await agregarPersonalDespedido(nombreExcel);
    if (!persona) return;

    setFilasAusencias((prev) => {
      const copy = [...prev];
      for (let j = 0; j < copy.length; j++) {
        if (copy[j].nombre.trim().toUpperCase() === nombreExcel.trim().toUpperCase() && !copy[j].valida) {
          copy[j] = { ...copy[j], personalId: persona.id, valida: true };
        }
      }
      return copy;
    });
  };

  // --- Update handlers ---
  const updateFilaAusencia = (index: number, field: keyof FilaAusencia, value: any) => {
    setFilasAusencias((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "personalId") copy[index].valida = !!value;
      return copy;
    });
  };

  const updateTurnoImport = (index: number, field: string, value: any) => {
    setTurnosImport((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      if (field === "responsable") {
        copy[index].valida = !!value && value !== "";
      }
      return copy;
    });
  };

  // --- Importar Ausencias ---
  const handleImportarAusencias = async () => {
    const validas = filasAusencias.filter((f) => f.valida && f.personalId);
    if (validas.length === 0) {
      toast.warning("No hay filas válidas", "Asigna un trabajador a cada fila antes de importar");
      return;
    }

    setImportando(true);
    const registros = validas.map((f) => ({
      personal_id: f.personalId,
      fecha: f.fecha,
      tipo: f.tipo,
      dias: f.dias,
      observaciones: f.observaciones,
      reemplazo: f.reemplazo,
    }));

    const { error } = await supabase.from("ausencias").insert(registros);
    if (error) {
      toast.error("Error al importar", error.message);
    } else {
      toast.success("Importación completada", `Se importaron ${validas.length} ausencias`);
      setImportados(validas.length);
      setFilasAusencias([]);
    }
    setImportando(false);
  };

  // --- Importar Cuadraturas ---
  const handleImportarCuadraturas = async () => {
    const validos = turnosImport.filter((t) => t.valida);
    if (validos.length === 0) {
      toast.warning("No hay turnos válidos", "Verifica que los nombres estén asignados");
      return;
    }

    setImportando(true);

    const registros = validos.map((t) => ({
      fecha: t.fecha,
      turno: t.turno,
      responsable: t.responsable,
      venta_combustible: t.venta_combustible,
      venta_tienda: t.venta_tienda,
      vouchers: t.vouchers,
      depositos: t.depositos,
      gastos: t.gastos,
      total_tarjetas: t.total_tarjetas,
      total_ventas: t.total_ventas,
      total_no_efectivo: t.total_no_efectivo,
      efectivo_esperado: t.efectivo_esperado,
      efectivo_real: t.efectivo_real,
      diferencia: t.diferencia,
    }));

    // Insert in batches of 500
    let inserted = 0;
    for (let i = 0; i < registros.length; i += 500) {
      const batch = registros.slice(i, i + 500);
      const { error } = await supabase.from("turnos").insert(batch);
      if (error) {
        toast.error(`Error en lote ${Math.floor(i / 500) + 1}`, error.message);
        setImportando(false);
        return;
      }
      inserted += batch.length;
    }

    toast.success("Importación completada", `Se importaron ${inserted} turnos`);
    setImportados(inserted);
    setTurnosImport([]);
    setImportando(false);
  };

  // --- Eliminar cuadraturas del mes ---
  const abrirModalEliminar = () => {
    setConfirmModal(true);
  };

  const handleEliminarCuadraturasMes = async () => {
    setConfirmModal(false);
    const mesStr = String(mesExcel).padStart(2, "0");
    const mesesNombres = [
      "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];

    setImportando(true);
    const fechaInicio = `${anioExcel}-${mesStr}-01`;
    const fechaFin = `${anioExcel}-${mesStr}-31`;

    const { error, count } = await supabase
      .from("turnos")
      .delete({ count: "exact" })
      .gte("fecha", fechaInicio)
      .lte("fecha", fechaFin);

    if (error) {
      toast.error("Error al eliminar", error.message);
    } else {
      toast.success("Turnos eliminados", `Se borraron ${count ?? 0} registros de ${mesesNombres[mesExcel]} ${anioExcel}`);
      setDuplicadosAdvertencia("");
    }
    setImportando(false);
  };

  // --- Counts ---
  const filasValidasAusencias = filasAusencias.filter((f) => f.valida).length;
  const turnosValidos = turnosImport.filter((t) => t.valida).length;

  const money = (val: number) =>
    val?.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

  // --- Reset ---
  const resetAll = () => {
    setImportados(0);
    setNombreArchivo("");
    setHojasDisponibles([]);
    setHojaSeleccionada("");
    setWorkbook(null);
    setModo("");
    setFilasAusencias([]);
    setTurnosImport([]);
    setDuplicadosAdvertencia("");
  };

  // --- Resumen cuadraturas ---
  const diasUnicos = new Set(turnosImport.map((t) => t.fecha)).size;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Importar Datos desde Excel
          </h1>
          <p className="text-sm text-zinc-500">
            Sube archivos Excel de cuadraturas mensuales para cargar turnos o ausencias historicas.
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/cuadraturas")}
          className="text-sm underline text-zinc-500 hover:text-zinc-800"
        >
          Volver
        </button>
      </div>

      {/* Paso 1: Subir archivo */}
      <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">
          1. Seleccionar archivo Excel
        </h2>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
        <div className="flex gap-4 items-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2.5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition"
          >
            Seleccionar archivo .xlsx
          </button>
          {nombreArchivo && (
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {nombreArchivo}
            </span>
          )}
        </div>
      </div>

      {/* Paso 2: Seleccionar modo y periodo */}
      {workbook && (
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6">
          <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-4">
            2. Seleccionar que importar
          </h2>

          {/* Modo selector */}
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => {
                setModo("cuadraturas");
                setFilasAusencias([]);
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition border-2 ${
                modo === "cuadraturas"
                  ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              Cuadraturas (Turnos)
            </button>
            <button
              type="button"
              onClick={() => {
                setModo("ausencias");
                setTurnosImport([]);
                const auto = hojasDisponibles.find((n) =>
                  n.toUpperCase().includes("AUSENCIA")
                );
                if (auto) setHojaSeleccionada(auto);
              }}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold transition border-2 ${
                modo === "ausencias"
                  ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-300"
              }`}
            >
              Ausencias
            </button>
          </div>

          {/* Periodo + hoja (ausencias) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {modo === "ausencias" && (
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">
                  Hoja del Excel
                </label>
                <select
                  value={hojaSeleccionada}
                  onChange={(e) => setHojaSeleccionada(e.target.value)}
                  className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
                >
                  <option value="">-- Seleccionar hoja --</option>
                  {hojasDisponibles.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Mes
              </label>
              <select
                value={mesExcel}
                onChange={(e) => setMesExcel(parseInt(e.target.value))}
                className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
              >
                {[
                  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
                ].map((n, i) => (
                  <option key={i} value={i + 1}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">
                Año
              </label>
              <input
                type="number"
                value={anioExcel}
                onChange={(e) => setAnioExcel(parseInt(e.target.value) || 2025)}
                className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
              />
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* VISTA PREVIA: CUADRATURAS                    */}
      {/* ============================================ */}
      {modo === "cuadraturas" && turnosImport.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                3. Vista previa de turnos
              </h2>
              <p className="text-xs text-zinc-500">
                Encontrados: {turnosImport.length} turnos en {diasUnicos} dias
                {" "}({turnosValidos} validos)
              </p>
              {duplicadosAdvertencia && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  {duplicadosAdvertencia}
                </p>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={abrirModalEliminar}
                disabled={importando}
                className="px-3 py-2 border border-red-300 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 transition disabled:opacity-50"
              >
                Eliminar mes
              </button>
              <button
                onClick={handleImportarCuadraturas}
                disabled={importando || turnosValidos === 0}
                className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {importando
                  ? "Importando..."
                  : `Importar ${turnosValidos} registros`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Turno</th>
                  <th className="px-3 py-2">Responsable</th>
                  <th className="px-3 py-2 text-right">Depositos</th>
                  <th className="px-3 py-2 text-right">Vouchers</th>
                  <th className="px-3 py-2 text-right">Gastos</th>
                  <th className="px-3 py-2 text-right">Tarjetas</th>
                  <th className="px-3 py-2 text-right">Venta</th>
                  <th className="px-3 py-2 text-right">Diferencia</th>
                  <th className="px-3 py-2 text-center">OK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {turnosImport.map((t, i) => {
                  const sumDep = t.depositos.reduce((a, d) => a + d.monto, 0);
                  const sumVou = t.vouchers.reduce((a, v) => a + v.monto, 0);
                  const sumGas = Object.entries(t.gastos).reduce(
                    (a, [k, v]) => (k === "perrosMuertos" ? a : a + v),
                    0
                  );
                  return (
                    <tr
                      key={i}
                      className={
                        t.valida
                          ? "bg-green-50/50 dark:bg-green-900/10"
                          : "bg-red-50/50 dark:bg-red-900/10"
                      }
                    >
                      <td className="px-3 py-2 text-xs font-mono">
                        {t.fecha.slice(5)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            t.turnoLabel === "A"
                              ? "bg-amber-100 text-amber-700"
                              : t.turnoLabel === "B"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {t.turnoLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {t.valida ? (
                          <span className="text-xs font-medium">
                            {t.responsable}
                          </span>
                        ) : (
                          <div className="flex gap-1 items-center">
                            <select
                              value={t.responsable}
                              onChange={(e) =>
                                updateTurnoImport(i, "responsable", e.target.value)
                              }
                              className="flex-1 p-1 rounded border text-xs border-red-300 bg-red-50"
                            >
                              <option value="">
                                {t.nombreExcel} (sin match)
                              </option>
                              {empleados.map((e) => (
                                <option key={e.id} value={e.nombre}>
                                  {e.nombre}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => agregarYAsignarTurno(i, t.nombreExcel)}
                              title={`Agregar "${t.nombreExcel}" como despedido`}
                              className="shrink-0 px-1.5 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold hover:bg-amber-200 transition"
                            >
                              +Nuevo
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono">
                        {sumDep > 0 ? money(sumDep) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono">
                        {sumVou > 0 ? money(sumVou) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono">
                        {sumGas > 0 ? money(sumGas) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono">
                        {t.total_tarjetas > 0 ? money(t.total_tarjetas) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-mono font-bold">
                        {t.total_ventas > 0 ? money(t.total_ventas) : "-"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            t.diferencia === 0
                              ? "bg-zinc-100 text-zinc-600"
                              : t.diferencia > 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.diferencia > 0 ? "+" : ""}
                          {money(t.diferencia)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {t.valida ? (
                          <span className="text-green-600 font-bold">ok</span>
                        ) : (
                          <span className="text-red-500 font-bold">--</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Las filas en rojo no tienen responsable asignado. Selecciona manualmente el nombre correcto.
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* VISTA PREVIA: AUSENCIAS                      */}
      {/* ============================================ */}
      {modo === "ausencias" && filasAusencias.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm mb-6 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <div>
              <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                3. Revisar y corregir datos
              </h2>
              <p className="text-xs text-zinc-500">
                {filasValidasAusencias} de {filasAusencias.length} filas listas para importar
              </p>
            </div>
            <button
              onClick={handleImportarAusencias}
              disabled={importando || filasValidasAusencias === 0}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
            >
              {importando
                ? "Importando..."
                : `Importar ${filasValidasAusencias} registros`}
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 dark:bg-zinc-900 text-zinc-500 uppercase text-xs sticky top-0">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Nombre (Excel)</th>
                  <th className="px-4 py-2">Trabajador</th>
                  <th className="px-4 py-2 text-center">Tipo</th>
                  <th className="px-4 py-2 text-center">Dias</th>
                  <th className="px-4 py-2">Reemplazo</th>
                  <th className="px-4 py-2">Obs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filasAusencias.map((fila, i) => (
                  <tr
                    key={i}
                    className={
                      fila.valida
                        ? "bg-green-50/50 dark:bg-green-900/10"
                        : "bg-red-50/50 dark:bg-red-900/10"
                    }
                  >
                    <td className="px-4 py-2 text-xs font-mono">
                      {fila.fecha}
                    </td>
                    <td className="px-4 py-2 text-xs font-medium">
                      {fila.nombre}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 items-center">
                        <select
                          value={fila.personalId}
                          onChange={(e) =>
                            updateFilaAusencia(i, "personalId", e.target.value)
                          }
                          className={`flex-1 p-1 rounded border text-xs ${
                            fila.valida
                              ? "border-green-300"
                              : "border-red-300 bg-red-50"
                          }`}
                        >
                          <option value="">-- Sin asignar --</option>
                          {empleados.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.nombre}
                            </option>
                          ))}
                        </select>
                        {!fila.valida && (
                          <button
                            type="button"
                            onClick={() => agregarYAsignarAusencia(i, fila.nombre)}
                            title={`Agregar "${fila.nombre}" como despedido`}
                            className="shrink-0 px-1.5 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold hover:bg-amber-200 transition"
                          >
                            +Nuevo
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <select
                        value={fila.tipo}
                        onChange={(e) =>
                          updateFilaAusencia(i, "tipo", e.target.value)
                        }
                        className="p-1 rounded border text-xs"
                      >
                        <option value="ausencia">Ausencia</option>
                        <option value="licencia_medica">Licencia</option>
                      </select>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={fila.dias}
                        onChange={(e) =>
                          updateFilaAusencia(i, "dias", parseInt(e.target.value) || 1)
                        }
                        className="w-14 p-1 rounded border text-xs text-center"
                      />
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500">
                      {fila.reemplazo || "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-zinc-500 max-w-[120px] truncate">
                      {fila.observaciones || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500">
            Las filas en rojo no tienen trabajador asignado y no se importaran.
            Selecciona manualmente el trabajador correcto.
          </div>
        </div>
      )}

      {/* Resultado importacion */}
      {importados > 0 && filasAusencias.length === 0 && turnosImport.length === 0 && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/30 rounded-xl p-6 text-center">
          <p className="text-green-700 dark:text-green-400 font-bold text-lg mb-1">
            Se importaron {importados} registros correctamente
          </p>
          <p className="text-green-600 dark:text-green-500 text-sm mb-4">
            Puedes subir otro archivo o ver los datos importados.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={resetAll}
              className="px-4 py-2 border border-zinc-300 rounded-lg text-sm font-bold hover:bg-white transition"
            >
              Subir otro archivo
            </button>
            <button
              onClick={() =>
                router.push(
                  modo === "cuadraturas"
                    ? "/dashboard/cuadraturas"
                    : "/dashboard/ausencias"
                )
              }
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-bold hover:bg-zinc-800 transition"
            >
              {modo === "cuadraturas" ? "Ver Cuadraturas" : "Ver Ausencias"}
            </button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmModal}
        onConfirm={handleEliminarCuadraturasMes}
        onCancel={() => setConfirmModal(false)}
        title="Eliminar turnos del mes"
        message={`Vas a ELIMINAR todos los turnos de este mes. Esta acción no se puede deshacer. ¿Continuar?`}
        confirmText="Eliminar todo"
        variant="danger"
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ItemLista = { id: string; monto: number; referencia: string };
type Empleado = { id: string; nombre: string };

export default function DetalleTurnoPage() {
  const router = useRouter();
  const params = useParams(); // Obtenemos el ID de la URL
  const idTurno = params.id as string;

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // --- ESTADOS (Mismos que en Nuevo Turno) ---
  const [listaAtendedores, setListaAtendedores] = useState<Empleado[]>([]);
  
  const [fecha, setFecha] = useState("");
  const [turno, setTurno] = useState("mañana");
  const [responsable, setResponsable] = useState("");

  const [ventaCombustible, setVentaCombustible] = useState<number | "">(""); 
  const [ventaTienda, setVentaTienda] = useState<number | "">(""); 
  const [totalTarjetas, setTotalTarjetas] = useState<number | "">("");
  
  const [vouchers, setVouchers] = useState<ItemLista[]>([]); 
  const [depositos, setDepositos] = useState<ItemLista[]>([]);
  
  const [gastos, setGastos] = useState({
    bencinaEnzo: 0, 
    perrosMuertos: 0, 
    turnoExtra: 0,
    horasExtras: 0,
    comisionesPromocion: 0,
    comisionesLubricantes: 0,
    tercerDomingo: 0, 
    cuartoDomingo: 0, 
    valeEasyPay: 0, 
    otros: 0,
  });

  const [calculos, setCalculos] = useState({
    totalVentas: 0, 
    totalNoEfectivo: 0, 
    efectivoEsperado: 0, 
    efectivoReal: 0, 
    diferencia: 0,
  });

  // --- 1. CARGAR DATOS AL INICIO ---
  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);

      // A) Cargar lista de empleados (para el select)
      const { data: personal } = await supabase
        .from('personal')
        .select('id, nombre')
        .order('nombre');
      if (personal) setListaAtendedores(personal);

      // B) Cargar el Turno específico
      const { data: turnoData, error } = await supabase
        .from('turnos')
        .select('*')
        .eq('id', idTurno)
        .single();

      if (error || !turnoData) {
        alert("No se encontró el turno.");
        router.push("/dashboard/cuadraturas");
        return;
      }

      // C) Rellenar el formulario con los datos recuperados
      setFecha(turnoData.fecha);
      setTurno(turnoData.turno);
      setResponsable(turnoData.responsable);
      setVentaCombustible(turnoData.venta_combustible);
      setVentaTienda(turnoData.venta_tienda);
      setTotalTarjetas(turnoData.total_tarjetas);
      
      // JSONs: Aseguramos que sean arrays/objetos válidos
      setVouchers(Array.isArray(turnoData.vouchers) ? turnoData.vouchers : []);
      setDepositos(Array.isArray(turnoData.depositos) ? turnoData.depositos : []);
      
      // Gastos: Mezclamos con los defaults por si agregaste campos nuevos después
      setGastos(prev => ({ ...prev, ...turnoData.gastos }));

      setLoading(false);
    };

    if (idTurno) cargarDatos();
  }, [idTurno]);

  // --- 2. CÁLCULOS EN TIEMPO REAL (Igual que en Nuevo) ---
  useEffect(() => {
    const sumVentas = (Number(ventaCombustible) || 0) + (Number(ventaTienda) || 0);
    const sumVouchers = vouchers.reduce((acc, item) => acc + (item.monto || 0), 0);
    const sumTarjetas = Number(totalTarjetas) || 0;
    
    // Sumar gastos EXCEPTO Perro Muerto (Informativo)
    const sumGastos = Object.entries(gastos).reduce((acc, [key, val]) => {
        if (key === 'perrosMuertos') return acc; 
        return acc + (Number(val) || 0);
    }, 0);

    const totalNoEfectivo = sumVouchers + sumGastos + sumTarjetas;
    const efectivoEsperado = sumVentas - totalNoEfectivo; 
    const sumDepositos = depositos.reduce((acc, item) => acc + (item.monto || 0), 0);
    const diferencia = sumDepositos - efectivoEsperado;

    setCalculos({ totalVentas: sumVentas, totalNoEfectivo, efectivoEsperado, efectivoReal: sumDepositos, diferencia });
  }, [ventaCombustible, ventaTienda, vouchers, gastos, totalTarjetas, depositos]);

  // --- HANDLERS ---
  const addRow = (setter: any, defaultRef = "") => setter((prev: any) => [...prev, { id: crypto.randomUUID(), monto: 0, referencia: defaultRef }]);
  const removeRow = (setter: any, id: string) => setter((prev: any) => prev.length > 1 ? prev.filter((i: any) => i.id !== id) : prev);
  const updateRow = (setter: any, id: string, field: string, val: any) => setter((prev: any) => prev.map((i: any) => i.id === id ? { ...i, [field]: val } : i));
  const handleGasto = (key: string, val: string) => setGastos(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  // --- 3. GUARDAR CAMBIOS (UPDATE) ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsable) { alert("⚠️ Selecciona un responsable"); return; }
    
    setGuardando(true);

    try {
      const datosActualizados = {
        fecha,
        turno,
        responsable,
        venta_combustible: Number(ventaCombustible) || 0,
        venta_tienda: Number(ventaTienda) || 0,
        vouchers,
        gastos,
        depositos, 
        total_tarjetas: Number(totalTarjetas) || 0,
        // Guardamos los totales calculados de nuevo por si cambiaron
        total_ventas: calculos.totalVentas,
        total_no_efectivo: calculos.totalNoEfectivo,
        efectivo_esperado: calculos.efectivoEsperado,
        efectivo_real: calculos.efectivoReal,
        diferencia: calculos.diferencia
      };

      const { error } = await supabase
        .from('turnos')
        .update(datosActualizados)
        .eq('id', idTurno); // IMPORTANTE: Actualizar solo ESTE ID

      if (error) throw error;

      alert("✅ Cuadratura actualizada correctamente");
      router.push("/dashboard/cuadraturas");

    } catch (error: any) {
      console.error(error);
      alert("Error al actualizar: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-zinc-500">Cargando detalles...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen flex flex-col pb-40">
      
      {/* HEADER DE EDICIÓN */}
      <div className="flex justify-between items-center mb-8 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30">
        <div>
            <h1 className="text-xl font-bold text-amber-800 dark:text-amber-200">✏️ Editando Cuadratura</h1>
            <p className="text-xs text-amber-600 dark:text-amber-400">ID: {idTurno}</p>
        </div>
        <div className="flex gap-3">
             <button onClick={() => router.back()} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 px-3 py-2">
                Cancelar
             </button>
             <button onClick={handleUpdate} disabled={guardando} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition">
                {guardando ? "Guardando..." : "Guardar Cambios"}
             </button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6 flex-1 flex flex-col">
        
        {/* BLOQUE DATOS PRINCIPALES */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Responsable</label>
              <select 
                value={responsable} 
                onChange={e => setResponsable(e.target.value)} 
                className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
              >
                {listaAtendedores.map(at => (
                    <option key={at.id} value={at.nombre}>{at.nombre}</option>
                ))}
                {/* Opción fallback por si el responsable ya no está en la lista activa */}
                {!listaAtendedores.find(a => a.nombre === responsable) && <option value={responsable}>{responsable}</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Turno</label>
              <select value={turno} onChange={e => setTurno(e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700">
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </div>
          </div>
        </div>

        {/* 1. EFECTIVO REAL (DEPÓSITOS) */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xs font-bold text-emerald-600 uppercase mb-4">1. Efectivo Real (Depósitos)</h2>
          <div className="space-y-2">
              {depositos.map((item, index) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm shrink-0 border border-emerald-100">
                    #{index + 1}
                  </div>
                  <input type="number" value={item.monto || ""} onChange={e => updateRow(setDepositos, item.id, "monto", parseFloat(e.target.value))} className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700 font-bold text-lg" />
                  <button type="button" onClick={() => removeRow(setDepositos, item.id)} className="text-red-500 px-3">×</button>
                </div>
              ))}
              <button type="button" onClick={() => addRow(setDepositos)} className="text-sm text-emerald-600 hover:underline mt-2">+ Agregar depósito</button>
            </div>
        </div>

        {/* 2. VOUCHERS Y 3. GASTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Vouchers */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-blue-600 uppercase mb-4">2. Copiloto / ShellCard</h2>
                <div className="space-y-2">
                {vouchers.map((item) => (
                    <div key={item.id} className="flex gap-2">
                        <input type="number" value={item.monto || ""} onChange={e => updateRow(setVouchers, item.id, "monto", parseFloat(e.target.value))} className="w-32 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700" />
                        <select value={item.referencia} onChange={e => updateRow(setVouchers, item.id, "referencia", e.target.value)} className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700 bg-white">
                            <option value="Copiloto">Copiloto</option>
                            <option value="ShellCard">ShellCard</option>
                        </select>
                        <button type="button" onClick={() => removeRow(setVouchers, item.id)} className="text-red-500 px-2">×</button>
                    </div>
                ))}
                <button type="button" onClick={() => addRow(setVouchers, "Copiloto")} className="text-sm text-blue-600 hover:underline">+ Agregar</button>
                </div>
            </div>

            {/* Gastos */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-red-600 uppercase mb-4">3. Gastos y Otros</h2>
                <div className="space-y-3">
                     {/* Comisiones */}
                     <div className="grid grid-cols-2 gap-4 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                         <div>
                            <label className="block text-xs font-bold text-yellow-700 mb-1">Com. Promoción</label>
                            <input type="number" value={gastos.comisionesPromocion || ""} onChange={e => handleGasto("comisionesPromocion", e.target.value)} className="w-full p-2 rounded border border-yellow-200 text-right font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-yellow-700 mb-1">Com. Lubricantes</label>
                            <input type="number" value={gastos.comisionesLubricantes || ""} onChange={e => handleGasto("comisionesLubricantes", e.target.value)} className="w-full p-2 rounded border border-yellow-200 text-right font-bold" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-100">
                        {/* Perro Muerto Informativo */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-red-700 mb-1">Perro Muerto (Info)</label>
                            <input type="number" value={gastos.perrosMuertos || ""} onChange={e => handleGasto("perrosMuertos", e.target.value)} className="w-full p-2 rounded border border-red-200 bg-red-50 text-right" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 mb-1">Bencina Enzo</label>
                            <input type="number" value={gastos.bencinaEnzo || ""} onChange={e => handleGasto("bencinaEnzo", e.target.value)} className="w-full p-2 rounded border border-zinc-300 text-right" />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-zinc-700 mb-1">Turno Extra</label>
                            <input type="number" value={gastos.turnoExtra || ""} onChange={e => handleGasto("turnoExtra", e.target.value)} className="w-full p-2 rounded border border-zinc-300 text-right" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 mb-1">Horas Extras</label>
                            <input type="number" value={gastos.horasExtras || ""} onChange={e => handleGasto("horasExtras", e.target.value)} className="w-full p-2 rounded border border-zinc-300 text-right" />
                        </div>
                    </div>
                    {/* Otros campos */}
                    <div className="grid grid-cols-2 gap-3">
                         {Object.keys(gastos).filter(k => !['comisionesPromocion', 'comisionesLubricantes','perrosMuertos','bencinaEnzo','turnoExtra', 'horasExtras'].includes(k)).map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-zinc-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <input type="number" value={gastos[key as keyof typeof gastos] || ""} onChange={e => handleGasto(key, e.target.value)} className="w-full p-2 rounded border border-zinc-300 text-right" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* 4. VENTAS Y 5. TARJETAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-teal-600 uppercase mb-4">4. Ventas Totales</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Combustibles</label>
                        <input type="number" value={ventaCombustible} onChange={e => setVentaCombustible(parseFloat(e.target.value) || "")} className="w-full text-lg font-bold p-3 rounded border border-zinc-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Tienda</label>
                        <input type="number" value={ventaTienda} onChange={e => setVentaTienda(parseFloat(e.target.value) || "")} className="w-full text-lg font-bold p-3 rounded border border-zinc-300" />
                    </div>
                </div>
             </div>
             <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-indigo-600 uppercase mb-4">5. Tarjetas (Transbank)</h2>
                <input type="number" value={totalTarjetas} onChange={e => setTotalTarjetas(parseFloat(e.target.value) || "")} className="w-full p-3 text-lg font-bold rounded border border-zinc-300" />
             </div>
        </div>

        {/* FOOTER STICKY CON RESULTADOS */}
        <div className="sticky bottom-0 z-20 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 p-4 shadow-xl -mx-4 -mb-4 md:-mx-8 md:-mb-8 mt-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="flex gap-6 text-sm">
                    <div className="hidden md:block"><p className="text-zinc-500 text-xs">Efec. Esperado</p><p className="font-bold text-blue-600">${calculos.efectivoEsperado.toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs uppercase text-zinc-500 font-bold">Diferencia</p>
                        <p className={`text-2xl font-bold ${calculos.diferencia > 0 ? 'text-emerald-500' : calculos.diferencia < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {calculos.diferencia.toLocaleString()}
                        </p>
                    </div>
                    <button onClick={handleUpdate} disabled={guardando} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                        {guardando ? "..." : "Actualizar"}
                    </button>
                </div>
            </div>
        </div>

      </form>
    </div>
  );
}
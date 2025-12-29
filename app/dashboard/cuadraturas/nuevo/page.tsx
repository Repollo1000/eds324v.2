"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ItemLista = { id: string; monto: number; referencia: string };
type Empleado = { id: string; nombre: string };

export default function NuevaCuadraturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // --- ESTADOS ---
  const [listaAtendedores, setListaAtendedores] = useState<Empleado[]>([]);
  
  // 1. Datos Generales
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState("mañana");
  const [responsable, setResponsable] = useState("");

  // 2. Ingresos y Detalle
  const [ventaCombustible, setVentaCombustible] = useState<number | "">(""); 
  const [ventaTienda, setVentaTienda] = useState<number | "">(""); 
  const [totalTarjetas, setTotalTarjetas] = useState<number | "">("");
  
  // Listas Dinámicas
  const [vouchers, setVouchers] = useState<ItemLista[]>([{ id: "1", monto: 0, referencia: "Copiloto" }]); 
  const [depositos, setDepositos] = useState<ItemLista[]>([{ id: "1", monto: 0, referencia: "" }]);
  
  // Gastos
  const [gastos, setGastos] = useState({
    bencinaEnzo: 0, 
    perrosMuertos: 0, // Se guarda, pero NO se suma al cuadre
    turnoExtra: 0,
    horasExtras: 0,
    comisionesPromocion: 0,
    comisionesLubricantes: 0,
    tercerDomingo: 0, 
    cuartoDomingo: 0, 
    valeEasyPay: 0, 
    otros: 0,
  });

  // Totales Calculados
  const [calculos, setCalculos] = useState({
    totalVentas: 0, 
    totalNoEfectivo: 0, 
    efectivoEsperado: 0, 
    efectivoReal: 0, 
    diferencia: 0,
  });

  // --- EFECTO 1: CARGAR PERSONAL ---
  useEffect(() => {
    const cargarPersonal = async () => {
      const { data, error } = await supabase
        .from('personal')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (!error && data) {
        setListaAtendedores(data);
      }
    };
    cargarPersonal();
  }, []);

  // --- EFECTO 2: CÁLCULOS AUTOMÁTICOS ---
  useEffect(() => {
    // 1. Sumar Ventas
    const sumVentas = (Number(ventaCombustible) || 0) + (Number(ventaTienda) || 0);
    
    // 2. Sumar "No Efectivo" (Documentos + Gastos + Tarjetas)
    const sumVouchers = vouchers.reduce((acc, item) => acc + (item.monto || 0), 0);
    
    // [CORRECCIÓN AQUÍ]: Sumamos todos los gastos EXCEPTO 'perrosMuertos'
    const sumGastos = Object.entries(gastos).reduce((acc, [key, val]) => {
        if (key === 'perrosMuertos') return acc; // IGNORAR PERRO MUERTO EN LA SUMA
        return acc + (Number(val) || 0);
    }, 0);

    const sumTarjetas = Number(totalTarjetas) || 0;
    
    const totalNoEfectivo = sumVouchers + sumGastos + sumTarjetas;

    // 3. Calcular lo que debería haber en efectivo
    const efectivoEsperado = sumVentas - totalNoEfectivo; 

    // 4. Sumar lo que realmente hay (Depósitos)
    const sumDepositos = depositos.reduce((acc, item) => acc + (item.monto || 0), 0);

    // 5. Diferencia Final
    const diferencia = sumDepositos - efectivoEsperado;

    setCalculos({ 
        totalVentas: sumVentas, 
        totalNoEfectivo, 
        efectivoEsperado, 
        efectivoReal: sumDepositos, 
        diferencia 
    });
  }, [ventaCombustible, ventaTienda, vouchers, gastos, totalTarjetas, depositos]);

  // --- HANDLERS ---
  const addRow = (setter: any, defaultRef = "") => setter((prev: any) => [...prev, { id: crypto.randomUUID(), monto: 0, referencia: defaultRef }]);
  const removeRow = (setter: any, id: string) => setter((prev: any) => prev.length > 1 ? prev.filter((i: any) => i.id !== id) : prev);
  const updateRow = (setter: any, id: string, field: string, val: any) => setter((prev: any) => prev.map((i: any) => i.id === id ? { ...i, [field]: val } : i));
  const handleGasto = (key: string, val: string) => setGastos(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsable) { alert("⚠️ Selecciona un responsable"); return; }
    
    setLoading(true);

    try {
      const datosParaGuardar = {
        fecha,
        turno,
        responsable,
        venta_combustible: Number(ventaCombustible) || 0,
        venta_tienda: Number(ventaTienda) || 0,
        vouchers,
        gastos, // Se guarda el objeto completo (incluyendo el perro muerto) en la base de datos
        depositos, 
        total_tarjetas: Number(totalTarjetas) || 0,
        total_ventas: calculos.totalVentas,
        total_no_efectivo: calculos.totalNoEfectivo,
        efectivo_esperado: calculos.efectivoEsperado,
        efectivo_real: calculos.efectivoReal,
        diferencia: calculos.diferencia
      };

      const { error } = await supabase.from('turnos').insert([datosParaGuardar]);
      if (error) throw error;

      alert("✅ Turno cerrado correctamente");
      router.push("/dashboard/cuadraturas");

    } catch (error: any) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen flex flex-col">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ingreso de Turno</h1>
        <button onClick={() => router.back()} className="text-sm underline text-zinc-500">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
        
        {/* BLOQUE DATOS PRINCIPALES */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Responsable <span className="text-red-500">*</span></label>
              <select 
                value={responsable} 
                onChange={e => setResponsable(e.target.value)} 
                className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700"
              >
                <option value="">-- Seleccionar Atendedor --</option>
                {listaAtendedores.map(at => (
                    <option key={at.id} value={at.nombre}>{at.nombre}</option>
                ))}
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
                  <input 
                    type="number" 
                    placeholder="Monto" 
                    value={item.monto || ""} 
                    onChange={e => updateRow(setDepositos, item.id, "monto", parseFloat(e.target.value))} 
                    className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700 font-bold text-lg" 
                  />
                  <button type="button" onClick={() => removeRow(setDepositos, item.id)} className="text-red-500 px-3 py-2 hover:bg-red-50 rounded transition">×</button>
                </div>
              ))}
              <button type="button" onClick={() => addRow(setDepositos)} className="text-sm text-emerald-600 hover:underline font-medium mt-2 flex items-center gap-1">
                + Agregar otro depósito
              </button>
            </div>
        </div>

        {/* 2. COPILOTO / SHELLCARD Y 3. GASTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 2. VOUCHERS */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-blue-600 uppercase mb-4">2. Copiloto / ShellCard</h2>
                <div className="space-y-2">
                {vouchers.map((item) => (
                    <div key={item.id} className="flex gap-2">
                        <input 
                            type="number" 
                            placeholder="Monto" 
                            value={item.monto || ""} 
                            onChange={e => updateRow(setVouchers, item.id, "monto", parseFloat(e.target.value))} 
                            className="w-32 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700" 
                        />
                        <select 
                            value={item.referencia} 
                            onChange={e => updateRow(setVouchers, item.id, "referencia", e.target.value)}
                            className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700 bg-white"
                        >
                            <option value="Copiloto">Copiloto</option>
                            <option value="ShellCard">ShellCard</option>
                        </select>
                        <button type="button" onClick={() => removeRow(setVouchers, item.id)} className="text-red-500 px-2">×</button>
                    </div>
                ))}
                <button type="button" onClick={() => addRow(setVouchers, "Copiloto")} className="text-sm text-blue-600 hover:underline">+ Agregar</button>
                </div>
            </div>

            {/* 3. GASTOS */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-red-600 uppercase mb-4">3. Gastos, Egresos y Pérdidas</h2>
                <div className="space-y-3">
                    {/* Gastos Principales */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                        
                        <div className="col-span-2 grid grid-cols-2 gap-4 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                             <div>
                                <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-1">Com. Promoción</label>
                                <input type="number" placeholder="0" value={gastos.comisionesPromocion || ""} onChange={e => handleGasto("comisionesPromocion", e.target.value)} className="w-full p-2 rounded border border-yellow-200 dark:border-yellow-900/30 text-right font-bold" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-yellow-700 dark:text-yellow-500 mb-1">Com. Lubricantes</label>
                                <input type="number" placeholder="0" value={gastos.comisionesLubricantes || ""} onChange={e => handleGasto("comisionesLubricantes", e.target.value)} className="w-full p-2 rounded border border-yellow-200 dark:border-yellow-900/30 text-right font-bold" />
                            </div>
                        </div>

                        {/* Perro Muerto: Solo Informativo (No se suma en el useEffect) */}
                        <div className="relative">
                            <label className="block text-xs font-bold text-red-700 mb-1">Perro Muerto (Info)</label>
                            <input type="number" placeholder="0" value={gastos.perrosMuertos || ""} onChange={e => handleGasto("perrosMuertos", e.target.value)} className="w-full p-2 rounded border border-red-200 bg-red-50 dark:bg-red-900/10 text-right" />
                            <span className="text-[10px] text-zinc-400 absolute right-1 -bottom-4">* No cuadra caja</span>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Bencina Enzo</label>
                            <input type="number" placeholder="0" value={gastos.bencinaEnzo || ""} onChange={e => handleGasto("bencinaEnzo", e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                        </div>
                        
                        <div className="col-span-2 grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Turno Extra</label>
                                <input type="number" placeholder="0" value={gastos.turnoExtra || ""} onChange={e => handleGasto("turnoExtra", e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Horas Extras</label>
                                <input type="number" placeholder="0" value={gastos.horasExtras || ""} onChange={e => handleGasto("horasExtras", e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                            </div>
                        </div>
                    </div>

                    {/* Otros Gastos Dinámicos */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {Object.keys(gastos).filter(k => !['comisionesPromocion', 'comisionesLubricantes','perrosMuertos','bencinaEnzo','turnoExtra', 'horasExtras'].includes(k)).map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-zinc-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <input type="number" placeholder="0" value={gastos[key as keyof typeof gastos] || ""} onChange={e => handleGasto(key, e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* 4. VENTAS TOTALES */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
             <h2 className="text-xs font-bold text-teal-600 uppercase mb-4">4. Ventas Totales</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-medium mb-1">Venta Combustibles</label>
                  <input type="number" placeholder="$ 0" value={ventaCombustible} onChange={e => setVentaCombustible(parseFloat(e.target.value) || "")} className="w-full text-lg font-bold p-3 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Venta Tienda</label>
                  <input type="number" placeholder="$ 0" value={ventaTienda} onChange={e => setVentaTienda(parseFloat(e.target.value) || "")} className="w-full text-lg font-bold p-3 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700" />
               </div>
             </div>
        </div>

        {/* 5. TARJETAS */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xs font-bold text-indigo-600 uppercase mb-4">5. Tarjetas (Transbank)</h2>
          <div className="relative">
             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold">$</span>
             <input type="number" placeholder="0" value={totalTarjetas} onChange={e => setTotalTarjetas(parseFloat(e.target.value) || "")} className="w-full pl-8 p-3 text-lg font-bold rounded border border-zinc-300 focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-900 dark:border-zinc-700" />
          </div>
        </div>

        {/* BARRA INFERIOR (FOOTER STICKY) */}
        <div className="sticky bottom-0 z-20 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 p-4 shadow-xl -mx-4 -mb-4 md:-mx-8 md:-mb-8 mt-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                <div className="flex gap-6 text-sm">
                    <div className="hidden md:block"><p className="text-zinc-500 text-xs">Ventas</p><p className="font-bold">${calculos.totalVentas.toLocaleString()}</p></div>
                    <div className="hidden md:block"><p className="text-zinc-500 text-xs">(-) No Efec.</p><p className="font-bold text-red-600">-${calculos.totalNoEfectivo.toLocaleString()}</p></div>
                    <div className="border-l pl-4 border-zinc-300"><p className="text-zinc-500 text-xs">Efec. Esperado</p><p className="font-bold text-blue-600">${calculos.efectivoEsperado.toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs uppercase text-zinc-500 font-bold">Diferencia</p>
                        <p className={`text-2xl font-bold ${calculos.diferencia > 0 ? 'text-emerald-500' : calculos.diferencia < 0 ? 'text-red-500' : 'text-zinc-400'}`}>
                            {calculos.diferencia.toLocaleString()}
                        </p>
                    </div>
                    <button onClick={handleSubmit} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg">
                        {loading ? "Guardando..." : "Cerrar Turno"}
                    </button>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ItemLista = { id: string; monto: number; referencia: string };

const ATENDEDORES = [
  { id: "1", nombre: "Iván" },
  { id: "2", nombre: "Mauricio" },
  { id: "3", nombre: "Dayrishell" },
];

export default function NuevaCuadraturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 1. DATOS
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState("mañana");
  const [responsable, setResponsable] = useState("");

  // 2. INGRESOS
  const [ventaCombustible, setVentaCombustible] = useState<number | "">(""); 
  const [ventaTienda, setVentaTienda] = useState<number | "">(""); 
  
  // 3. VOUCHERS LISTA
  const [vouchers, setVouchers] = useState<ItemLista[]>([{ id: "1", monto: 0, referencia: "" }]);

  // 4. GASTOS Y EGRESOS (Aquí agregamos los nuevos campos)
  const [gastos, setGastos] = useState({
    anticipos: 0,        // <--- NUEVO
    bencinaEnzo: 0,      // <--- NUEVO (Uso interno)
    perrosMuertos: 0,    // <--- NUEVO (Fugas)
    turnoExtra: 0,       // YA ESTABA
    comisiones: 0,
    tercerDomingo: 0,
    cuartoDomingo: 0,
    valeEasyPay: 0,
    otros: 0,
  });

  // 5. TARJETAS
  const [totalTarjetas, setTotalTarjetas] = useState<number | "">("");

  // 6. EFECTIVO REAL
  const [depositos, setDepositos] = useState<ItemLista[]>([{ id: "1", monto: 0, referencia: "" }]);

  // TOTALES
  const [calculos, setCalculos] = useState({
    totalVentas: 0,
    totalNoEfectivo: 0,
    efectivoEsperado: 0,
    efectivoReal: 0,
    diferencia: 0,
  });

  useEffect(() => {
    const sumVentas = (Number(ventaCombustible) || 0) + (Number(ventaTienda) || 0);
    const sumVouchers = vouchers.reduce((acc, item) => acc + (item.monto || 0), 0);
    const sumGastos = Object.values(gastos).reduce((acc, val) => acc + (Number(val) || 0), 0);
    const sumTarjetas = Number(totalTarjetas) || 0;
    const sumDepositos = depositos.reduce((acc, item) => acc + (item.monto || 0), 0);

    const totalNoEfectivo = sumVouchers + sumGastos + sumTarjetas;
    const efectivoEsperado = sumVentas - totalNoEfectivo; 
    const diferencia = sumDepositos - efectivoEsperado;

    setCalculos({ totalVentas: sumVentas, totalNoEfectivo, efectivoEsperado, efectivoReal: sumDepositos, diferencia });
  }, [ventaCombustible, ventaTienda, vouchers, gastos, totalTarjetas, depositos]);

  const addRow = (setter: any) => setter((prev: any) => [...prev, { id: crypto.randomUUID(), monto: 0, referencia: "" }]);
  const removeRow = (setter: any, id: string) => setter((prev: any) => prev.length > 1 ? prev.filter((i: any) => i.id !== id) : prev);
  const updateRow = (setter: any, id: string, field: string, val: any) => setter((prev: any) => prev.map((i: any) => i.id === id ? { ...i, [field]: val } : i));
  const handleGasto = (key: string, val: string) => setGastos(prev => ({ ...prev, [key]: parseFloat(val) || 0 }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsable) { alert("⚠️ Selecciona un responsable"); return; }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log("Guardado", { responsable, fecha, calculos });
    router.push("/dashboard");
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto pb-40">
      <div className="flex justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Ingreso de Turno</h1>
        <button onClick={() => router.back()} className="text-sm underline text-zinc-500">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. DATOS */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1">Responsable <span className="text-red-500">*</span></label>
              <select value={responsable} onChange={e => setResponsable(e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700">
                <option value="">-- Seleccionar --</option>
                {ATENDEDORES.map(at => <option key={at.id} value={at.nombre}>{at.nombre}</option>)}
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

        {/* 2. VENTAS */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xs font-bold text-teal-600 uppercase mb-4">1. Ventas Totales</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. VOUCHERS */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-blue-600 uppercase mb-4">2. Vouchers / ShellCard</h2>
                <div className="space-y-2">
                {vouchers.map((item) => (
                    <div key={item.id} className="flex gap-2">
                    <input type="number" placeholder="Monto" value={item.monto || ""} onChange={e => updateRow(setVouchers, item.id, "monto", parseFloat(e.target.value))} className="w-32 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700" />
                    <input type="text" placeholder="Ref" value={item.referencia} onChange={e => updateRow(setVouchers, item.id, "referencia", e.target.value)} className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700" />
                    <button type="button" onClick={() => removeRow(setVouchers, item.id)} className="text-red-500 px-2">×</button>
                    </div>
                ))}
                <button type="button" onClick={() => addRow(setVouchers)} className="text-sm text-blue-600 hover:underline">+ Agregar</button>
                </div>
            </div>

            {/* 4. GASTOS (ACTUALIZADO CON TUS REQUERIMIENTOS) */}
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <h2 className="text-xs font-bold text-red-600 uppercase mb-4">3. Gastos, Egresos y Pérdidas</h2>
                <div className="space-y-3">
                    {/* Items Críticos */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
                        <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">Anticipos Personal</label>
                            <input type="number" placeholder="0" value={gastos.anticipos || ""} onChange={e => handleGasto("anticipos", e.target.value)} className="w-full p-2 rounded border border-red-200 bg-red-50 dark:bg-red-900/10 text-right" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-red-700 mb-1">Perro Muerto (Fuga)</label>
                            <input type="number" placeholder="0" value={gastos.perrosMuertos || ""} onChange={e => handleGasto("perrosMuertos", e.target.value)} className="w-full p-2 rounded border border-red-200 bg-red-50 dark:bg-red-900/10 text-right" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Bencina Enzo (Consumo)</label>
                            <input type="number" placeholder="0" value={gastos.bencinaEnzo || ""} onChange={e => handleGasto("bencinaEnzo", e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Turno Extra</label>
                            <input type="number" placeholder="0" value={gastos.turnoExtra || ""} onChange={e => handleGasto("turnoExtra", e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                        </div>
                    </div>

                    {/* Otros Gastos */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        {Object.keys(gastos).filter(k => !['anticipos','perrosMuertos','bencinaEnzo','turnoExtra'].includes(k)).map((key) => (
                            <div key={key}>
                                <label className="block text-xs font-medium text-zinc-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <input type="number" placeholder="0" value={gastos[key as keyof typeof gastos] || ""} onChange={e => handleGasto(key, e.target.value)} className="w-full p-2 rounded border border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700 text-right" />
                            </div>
                        ))}
                    </div>
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

        {/* 6. EFECTIVO REAL */}
        <div className="bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <h2 className="text-xs font-bold text-emerald-600 uppercase mb-4">6. Efectivo Real (Depósitos)</h2>
          <div className="space-y-2">
              {depositos.map((item) => (
                <div key={item.id} className="flex gap-2">
                  <input type="number" placeholder="Monto" value={item.monto || ""} onChange={e => updateRow(setDepositos, item.id, "monto", parseFloat(e.target.value))} className="w-32 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700 font-bold" />
                  <input type="text" placeholder="N° Bolsa" value={item.referencia} onChange={e => updateRow(setDepositos, item.id, "referencia", e.target.value)} className="flex-1 p-2 rounded border dark:bg-zinc-900 dark:border-zinc-700" />
                  <button type="button" onClick={() => removeRow(setDepositos, item.id)} className="text-red-500 px-2">×</button>
                </div>
              ))}
              <button type="button" onClick={() => addRow(setDepositos)} className="text-sm text-emerald-600 hover:underline">+ Agregar Depósito</button>
            </div>
        </div>
      
        {/* BARRA INFERIOR */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800 p-4 shadow-xl z-20 lg:pl-72">
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
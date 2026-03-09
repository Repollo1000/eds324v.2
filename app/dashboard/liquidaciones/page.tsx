"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, Send, UploadCloud, CheckCircle, Search, AlertTriangle, Loader2, Clock } from "lucide-react";
import { useLiquidacionesStore } from "./store";
import { toast } from "@/lib/toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function LiquidacionesPage() {
  const [personal, setPersonal] = useState<any[]>([]);
  // Usamos el store global en lugar de state local
  const { hojas, setHojas, actualizarHoja } = useLiquidacionesStore();
  
  const prevUrlsRef = useRef<string[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<number | null>(null);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());

  // Modal confirmación
  const [confirmModal, setConfirmModal] = useState<{ hoja: any } | null>(null);

  // 1. CARGAR PERSONAL
  useEffect(() => {
    supabase.from("personal").select("*").eq("activo", true).order("nombre")
      .then(({ data }) => setPersonal(data || []));
  }, []);

  // Cleanup Blob URLs when hojas change or on unmount
  useEffect(() => {
    return () => {
      prevUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // 2. PROTECCIÓN ANTI-RECARGA (F5)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hojas.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Esto activa la alerta del navegador
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hojas]);

  // Utilidad para limpiar RUT y comparar
  const limpiarRut = (rut: string) => rut.replace(/\./g, "").replace(/-/g, "").toLowerCase().trim();

  // 3. PROCESAR EL PDF (Corte + Detección) — libs loaded on demand
  const procesarPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setProcesando(true);

    try {
      // Dynamic imports — only loaded when user uploads a file
      const { PDFDocument } = await import("pdf-lib");
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const fileBytes = await e.target.files[0].arrayBuffer();
      const pdfDoc = await PDFDocument.load(fileBytes);
      const totalPaginas = pdfDoc.getPageCount();
      const nuevasHojas: any[] = [];
      // Regex mejorado: detecta RUTs chilenos de 6-9 dígitos (incluye RUTs antiguos)
      const rutRegex = /\b\d{1,3}(?:\.?\d{3}){1,2}-?[0-9kK]\b/g;

      // Revoke previous Blob URLs to prevent memory leak
      prevUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      prevUrlsRef.current = [];

      for (let i = 0; i < totalPaginas; i++) {
        const subPdf = await PDFDocument.create();
        const [copiedPage] = await subPdf.copyPages(pdfDoc, [i]);
        subPdf.addPage(copiedPage);
        const pdfBytes = await subPdf.save();

        const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
        const previewUrl = URL.createObjectURL(blob);
        prevUrlsRef.current.push(previewUrl);

        let asignadoA = "";
        let infoDeteccion = "";

        // Extract text for RUT detection
        try {
          const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
          const pdf = await loadingTask.promise;
          const page = await pdf.getPage(1);
          const textContent = await page.getTextContent();
          const textoPagina = textContent.items.map((item: any) => item.str).join(" ");
          const rutsEncontrados = textoPagina.match(rutRegex) || [];

          for (const rutRaw of rutsEncontrados) {
             const rutLimpio = limpiarRut(rutRaw);
             const trabajador = personal.find(p => p.rut && limpiarRut(p.rut) === rutLimpio);
             if (trabajador) {
               asignadoA = trabajador.id;
               infoDeteccion = "RUT detectado";
               break;
             }
          }
        } catch { /* text extraction failed, continue */ }

        nuevasHojas.push({
          id: i,
          blob,
          previewUrl,
          asignadoA,
          infoDeteccion,
          estado: "no_enviado"
        });
      }
      setHojas(nuevasHojas);
    } catch (err) {
      toast.error("Error al procesar", String(err));
    }
    setProcesando(false);
  };

  // 4. ACCIÓN MAESTRA: SUBIR + GUARDAR + ENVIAR EMAIL
  const iniciarEnvio = (hoja: any) => {
    if (!hoja.asignadoA) {
      toast.warning("Falta asignar trabajador", "Selecciona un colaborador de la lista");
      return;
    }
    const trabajador = personal.find(p => p.id === hoja.asignadoA);
    if (!trabajador?.correo) {
      toast.warning("Sin correo electrónico", `${trabajador?.nombre} no tiene email registrado`);
      return;
    }
    setConfirmModal({ hoja });
  };

  const enviarLiquidacion = async () => {
    if (!confirmModal) return;
    const hoja = confirmModal.hoja;
    const trabajador = personal.find(p => p.id === hoja.asignadoA);
    if (!trabajador) return;

    setConfirmModal(null);
    setEnviandoId(hoja.id); // Activar spinner de carga

    try {
      const fileName = `${trabajador.id}/${anio}_${mes}.pdf`;

      // A. Subir PDF a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("nominas")
        .upload(fileName, hoja.blob, { upsert: true });
      if (uploadError) throw uploadError;

      // B. Guardar registro en Base de Datos (upsert para evitar duplicados)
      const { error: dbError } = await supabase.from("liquidaciones").upsert({
        personal_id: trabajador.id,
        mes,
        anio,
        archivo_path: fileName,
        estado: 'enviado'
      }, {
        onConflict: 'personal_id,mes,anio'
      });
      if (dbError) throw dbError;

      // C. Disparar envío de correo (API Route)
      const formData = new FormData();
      formData.append("file", hoja.blob, `Liquidacion_${mes}_${anio}.pdf`);
      formData.append("email", trabajador.correo);
      formData.append("nombre", trabajador.nombre);
      formData.append("mes", `${mes}/${anio}`);

      const res = await fetch("/api/enviar-liquidacion", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Fallo al enviar el email");

      // D. Actualizar estado visual (Verde)
      actualizarHoja(hoja.id, { estado: "enviado" });
      toast.success("Liquidación enviada", `El correo fue enviado a ${trabajador.nombre}`);

    } catch (error: any) {
      console.error(error);
      toast.error("Error al enviar", error.message);
    } finally {
      setEnviandoId(null);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* CABECERA */}
      <div className="flex justify-between items-center mb-6">
        <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Envío Masivo de Liquidaciones</h1>
            <p className="text-sm text-zinc-500">Carga el PDF consolidado. El sistema separará las hojas y enviará los correos.</p>
        </div>
        <div className="flex gap-2">
           <select value={mes} onChange={e=>setMes(Number(e.target.value))} className="border p-2 rounded text-sm bg-white dark:bg-zinc-900 shadow-sm">
             {Array.from({length: 12}, (_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('es',{month:'long'})}</option>)}
           </select>
           <input type="number" value={anio} onChange={e=>setAnio(Number(e.target.value))} className="border p-2 rounded w-20 text-sm bg-white dark:bg-zinc-900 shadow-sm"/>
        </div>
      </div>

      {/* ZONA DE CARGA (Dropzone) */}
      {hojas.length === 0 && (
        <div className="bg-white dark:bg-zinc-950 p-12 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 mb-8 text-center hover:border-teal-500 transition cursor-pointer relative group shadow-sm">
            <input type="file" accept="application/pdf" onChange={procesarPDF} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
            <div className="flex flex-col items-center gap-4 pointer-events-none transition group-hover:scale-105">
                <div className="p-4 bg-teal-50 rounded-full text-teal-600">
                    <UploadCloud size={40} />
                </div>
                <div>
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100 block">Haga clic o arrastre el PDF aquí</span>
                    <span className="text-sm text-zinc-500">Separación inteligente y detección de RUT automática</span>
                </div>
            </div>
            {procesando && (
                <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center text-teal-600 font-bold z-20 backdrop-blur-sm">
                    <Loader2 size={40} className="animate-spin mb-2"/>
                    Procesando documento...
                </div>
            )}
        </div>
      )}

      {/* TABLA DE RESULTADOS */}
      {hojas.length > 0 && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 text-center w-16">Pág</th>
                <th className="px-6 py-3">Colaborador</th>
                <th className="px-6 py-3 text-center">Vista</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {hojas.map((hoja) => (
                <tr key={hoja.id} className={`transition ${hoja.estado === 'enviado' ? 'bg-green-50/40 dark:bg-green-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`}>
                  
                  {/* # PAGINA */}
                  <td className="px-6 py-4 text-center text-zinc-400 font-mono text-xs font-bold">
                    {hoja.id + 1}
                  </td>
                  
                  {/* SELECTOR DE TRABAJADOR */}
                  <td className="px-6 py-4">
                    {hoja.estado === 'enviado' ? (
                        <div className="flex items-center gap-2 text-green-700 font-bold">
                            <CheckCircle size={16} /> 
                            {personal.find(p => p.id === hoja.asignadoA)?.nombre}
                        </div>
                    ) : (
                        <div className="relative max-w-sm">
                            <select 
                                className={`w-full p-2.5 pl-3 pr-10 border rounded-lg appearance-none outline-none focus:ring-2 transition text-sm ${
                                    !hoja.asignadoA 
                                    ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-200' 
                                    : 'border-zinc-300 bg-white focus:ring-teal-100 focus:border-teal-500'
                                }`}
                                value={hoja.asignadoA}
                                onChange={(e) => actualizarHoja(hoja.id, { asignadoA: e.target.value })}
                            >
                                <option value="">-- SELECCIONAR TRABAJADOR --</option>
                                {personal.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre} {p.correo ? '' : '(Sin Email)'}
                                    </option>
                                ))}
                            </select>
                            
                            {/* Icono de estado dentro del select */}
                            <div className="absolute right-3 top-3 pointer-events-none">
                                {hoja.infoDeteccion ? (
                                    <Search size={16} className="text-teal-600" />
                                ) : !hoja.asignadoA ? (
                                    <AlertTriangle size={16} className="text-red-500" />
                                ) : null}
                            </div>
                        </div>
                    )}
                  </td>

                  {/* VISOR PDF */}
                  <td className="px-6 py-4 text-center">
                    <a 
                        href={hoja.previewUrl} 
                        target="_blank" 
                        className="inline-flex p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-110 transition shadow-sm"
                        title="Ver documento original"
                    >
                        <Eye size={18} />
                    </a>
                  </td>

                  {/* ESTADO VISUAL */}
                  <td className="px-6 py-4 text-center">
                    {hoja.estado === 'enviado' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 shadow-sm">
                            <CheckCircle size={12}/> ENVIADO
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 shadow-sm animate-pulse">
                            <Clock size={12}/> NO ENVIADO
                        </span>
                    )}
                  </td>

                  {/* BOTÓN DE ACCIÓN */}
                  <td className="px-6 py-4 text-right">
                    {hoja.estado !== 'enviado' && (
                        <button
                            onClick={() => iniciarEnvio(hoja)}
                            disabled={!hoja.asignadoA || enviandoId === hoja.id}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition shadow-sm ${
                                !hoja.asignadoA 
                                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                                : 'bg-zinc-900 hover:bg-zinc-800 text-white hover:shadow-lg hover:-translate-y-0.5'
                            }`}
                        >
                            {enviandoId === hoja.id ? (
                                <> <Loader2 className="animate-spin" size={14}/> Enviando... </>
                            ) : (
                                <> <Send size={14}/> Enviar </>
                            )}
                        </button>
                    )}
                    {hoja.estado === 'enviado' && (
                        <span className="text-xs font-bold text-zinc-400">Listo</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal
        open={!!confirmModal}
        onConfirm={enviarLiquidacion}
        onCancel={() => setConfirmModal(null)}
        title="Enviar liquidación"
        message={confirmModal ? `¿Confirmas enviar la liquidación a ${personal.find(p => p.id === confirmModal.hoja.asignadoA)?.nombre}?` : ""}
        confirmText="Enviar"
        variant="info"
      />
    </div>
  );
}
"use client";

import { useState, useEffect, useMemo, memo, Fragment } from "react";
import { supabase } from "@/lib/supabase";
import {
  Calendar,
  Users,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Save,
  RefreshCw,
  Trash2,
  Eye,
  UserCheck,
  CalendarDays,
} from "lucide-react";
import type {
  PersonalConRol,
  ShiftAssignment,
  GeneratorResult,
  Grupo,
  TurnoCode,
} from "@/lib/turnosTypes";
import { generateTurnos, countSundays } from "@/lib/turnosGenerator";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const TURNO_COLORS: Record<TurnoCode, string> = {
  M: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  T: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  N: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  L: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500",
};

const TURNO_LABELS: Record<TurnoCode, string> = {
  M: "Mañana",
  T: "Tarde",
  N: "Noche",
  L: "Libre",
};

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type ViewMode = "calendario" | "semanal" | "persona";
type PageState = "empty" | "preview" | "saved";

export default function TurnosPage() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [view, setView] = useState<ViewMode>("calendario");
  const [pageState, setPageState] = useState<PageState>("empty");

  const [personal, setPersonal] = useState<PersonalConRol[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [quintoDomingoGrupo, setQuintoDomingoGrupo] = useState<Grupo>("A");
  const [weekIndex, setWeekIndex] = useState(0);
  const [supervisorMId, setSupervisorMId] = useState<string | null>(null);
  const [swapDay, setSwapDay] = useState<number | null>(null);

  // Load personal
  useEffect(() => {
    fetchPersonal();
  }, []);

  // Check for saved shifts when month/year changes
  useEffect(() => {
    checkSavedShifts();
  }, [mes, anio]);

  const fetchPersonal = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("personal")
      .select("id, nombre, rol, grupo, activo")
      .eq("activo", true)
      .order("nombre");
    setPersonal((data as PersonalConRol[]) || []);
    setLoading(false);
  };

  const checkSavedShifts = async () => {
    const { data } = await supabase
      .from("turnos_generados")
      .select("personal_id, fecha, turno")
      .eq("anio", anio)
      .eq("mes", mes);

    if (data && data.length > 0) {
      // Rebuild result from saved data
      rebuildFromSaved(data as { personal_id: string; fecha: string; turno: TurnoCode }[]);
    } else {
      setResult(null);
      setPageState("empty");
    }
  };

  const rebuildFromSaved = (data: { personal_id: string; fecha: string; turno: TurnoCode }[]) => {
    const assignments: ShiftAssignment[] = data.map(d => ({
      personalId: d.personal_id,
      fecha: d.fecha,
      turno: d.turno,
    }));

    // Build stats in a single pass O(n) instead of O(n*m)
    const counters: Record<string, { M: number; T: number; N: number; L: number; domingos: number }> = {};
    for (const p of personal) {
      counters[p.id] = { M: 0, T: 0, N: 0, L: 0, domingos: 0 };
    }
    for (const a of assignments) {
      const c = counters[a.personalId];
      if (!c) continue;
      c[a.turno]++;
      if (a.turno !== 'L') {
        const date = new Date(a.fecha + 'T12:00:00');
        if (date.getDay() === 0) c.domingos++;
      }
    }

    const stats: GeneratorResult["stats"] = {};
    for (const p of personal) {
      const c = counters[p.id];
      stats[p.id] = {
        nombre: p.nombre,
        rol: p.rol,
        grupo: p.grupo,
        mañana: c.M,
        tarde: c.T,
        noche: c.N,
        libre: c.L,
        domingos: c.domingos,
      };
    }

    setResult({ assignments, stats, warnings: [] });
    setPageState("saved");
  };

  // Rebuild stats when personal data loads and we have saved result
  useEffect(() => {
    if (personal.length > 0 && pageState === "empty") {
      checkSavedShifts();
    }
  }, [personal]);

  // Auto-select first supervisor for morning when data loads
  useEffect(() => {
    const sups = personal.filter(p => p.rol === "supervisor");
    if (sups.length >= 2 && !supervisorMId) {
      setSupervisorMId(sups[0].id);
    }
  }, [personal]);

  // Staff validation
  const supervisors = personal.filter(p => p.rol === "supervisor");
  const grupoA = personal.filter(p => p.rol === "atendedor" && p.grupo === "A");
  const grupoB = personal.filter(p => p.rol === "atendedor" && p.grupo === "B");
  const staffValid = supervisors.length === 2 && grupoA.length === 7 && grupoB.length === 7;
  const hasAnyStaff = personal.length > 0;

  const numSundays = useMemo(() => countSundays(anio, mes), [anio, mes]);
  const has5thSunday = numSundays >= 5;

  // Days of the month
  const daysInMonth = useMemo(() => {
    const count = new Date(anio, mes, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [anio, mes]);

  // Weeks in month (Sunday-based, for weekly view)
  const weeksInMonth = useMemo(() => {
    const weeks: Date[] = [];
    const firstDay = new Date(anio, mes - 1, 1);
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(firstDay.getDate() - firstDay.getDay());
    const lastDay = new Date(anio, mes, 0);
    const current = new Date(firstSunday);
    while (current <= lastDay) {
      weeks.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
    return weeks;
  }, [anio, mes]);

  // Assignment lookup map
  const assignmentMap = useMemo(() => {
    if (!result) return {};
    const map: Record<string, TurnoCode> = {};
    for (const a of result.assignments) {
      map[`${a.personalId}_${a.fecha}`] = a.turno;
    }
    return map;
  }, [result]);

  // Ordered personnel for display: supervisors, then group A, then group B
  const orderedPersonal = useMemo(() => {
    return [...supervisors, ...grupoA, ...grupoB];
  }, [personal]);

  // Per-day shift counts + deficit for coverage indicators
  const coverageMap = useMemo(() => {
    if (!result) return {};
    const map: Record<string, Record<TurnoCode, number>> = {};
    for (const a of result.assignments) {
      if (!map[a.fecha]) map[a.fecha] = { M: 0, T: 0, N: 0, L: 0 };
      map[a.fecha][a.turno]++;
    }
    return map;
  }, [result]);

  const getExpected = (day: number): Record<string, number> => {
    const isSun = isDaySunday(day);
    return {
      M: isSun ? 2 : 5, // weekday: 1 sup + 4 att
      T: isSun ? 2 : 5,
      N: 3,
    };
  };

  const handleGenerate = () => {
    const swapFecha = swapDay
      ? `${anio}-${String(mes).padStart(2, '0')}-${String(swapDay).padStart(2, '0')}`
      : undefined;
    const genResult = generateTurnos({
      personal,
      anio,
      mes,
      quintoDomingoGrupo: has5thSunday ? quintoDomingoGrupo : null,
      supervisorMId: supervisorMId || undefined,
      swapFecha,
    });
    setResult(genResult);
    setPageState("preview");
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);

    try {
      // Delete existing shifts for this month
      await supabase
        .from("turnos_generados")
        .delete()
        .eq("anio", anio)
        .eq("mes", mes);

      // Insert new shifts in batches
      const rows = result.assignments.map(a => ({
        personal_id: a.personalId,
        fecha: a.fecha,
        turno: a.turno,
        mes,
        anio,
      }));

      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from("turnos_generados").insert(batch);
        if (error) throw error;
      }

      setPageState("saved");
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setPageState("empty");
  };

  const handleRegenerate = () => {
    setResult(null);
    setPageState("empty");
  };

  // Navigate months
  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else setMes(mes - 1);
    setResult(null);
    setPageState("empty");
    setWeekIndex(0);
  };
  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else setMes(mes + 1);
    setResult(null);
    setPageState("empty");
    setWeekIndex(0);
  };

  // Helper: get day name abbreviation
  const getDayName = (day: number) => {
    const date = new Date(anio, mes - 1, day);
    const names = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    return names[date.getDay()];
  };
  const isDaySunday = (day: number) => new Date(anio, mes - 1, day).getDay() === 0;

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <p className="text-zinc-400">Cargando personal...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[100rem] mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Calendar className="shrink-0" size={22} /> Generador de Turnos
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Genera y administra turnos mensuales para el personal.
          </p>
        </div>

        {/* Month/Year selector */}
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronLeft size={18} />
          </button>
          <div className="px-3 sm:px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg font-bold text-sm min-w-[140px] sm:min-w-[180px] text-center">
            {MESES[mes - 1]} {anio}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* STAFF VALIDATION */}
      <div className={`rounded-xl border p-3 sm:p-4 mb-4 sm:mb-6 ${
        staffValid
          ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800"
          : "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
      }`}>
        <div className="flex items-start gap-3">
          {staffValid ? (
            <UserCheck size={20} className="text-green-600 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
          )}
          <div className="text-sm">
            <p className={`font-bold ${staffValid ? "text-green-800 dark:text-green-400" : "text-amber-800 dark:text-amber-400"}`}>
              {staffValid ? "Personal configurado correctamente" : "Personal incompleto — se generará con turnos faltantes"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-zinc-600 dark:text-zinc-400 text-xs sm:text-sm">
              <span className={supervisors.length === 2 ? "" : "text-amber-700 dark:text-amber-400 font-bold"}>
                Supervisores: {supervisors.length}/2
              </span>
              <span className={grupoA.length === 7 ? "" : "text-amber-700 dark:text-amber-400 font-bold"}>
                Grupo A: {grupoA.length}/7
              </span>
              <span className={grupoB.length === 7 ? "" : "text-amber-700 dark:text-amber-400 font-bold"}>
                Grupo B: {grupoB.length}/7
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5TH SUNDAY SELECTOR */}
      {has5thSunday && pageState !== "saved" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm text-amber-800 dark:text-amber-400">
                Este mes tiene 5 domingos
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                Selecciona qué grupo trabaja el 5° domingo. El grupo seleccionado trabajará 3 domingos este mes.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setQuintoDomingoGrupo("A")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition ${
                    quintoDomingoGrupo === "A"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                  }`}
                >
                  Grupo A
                </button>
                <button
                  onClick={() => setQuintoDomingoGrupo("B")}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition ${
                    quintoDomingoGrupo === "B"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-white text-zinc-500 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                  }`}
                >
                  Grupo B
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUPERVISOR CONFIG */}
      {supervisors.length >= 2 && pageState !== "saved" && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 dark:bg-purple-900/10 dark:border-purple-800 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="font-bold text-sm text-purple-800 dark:text-purple-400 mb-3">
            Asignación de Supervisores
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Supervisor M / T toggle */}
            <div className="flex-1">
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-2">Turno fijo (Lun-Sáb)</p>
              <div className="space-y-2">
                {supervisors.map(sup => {
                  const isM = sup.id === supervisorMId;
                  return (
                    <button
                      key={sup.id}
                      type="button"
                      onClick={() => setSupervisorMId(isM ? (supervisors.find(s => s.id !== sup.id)?.id || null) : sup.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-bold transition ${
                        isM
                          ? "bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
                          : "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                      }`}
                    >
                      <span>{sup.nombre}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        isM
                          ? "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-200"
                          : "bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-200"
                      }`}>
                        {isM ? "Mañana" : "Tarde"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Swap day */}
            <div className="sm:w-48">
              <p className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-2">Día de cambio (opcional)</p>
              <select
                value={swapDay ?? ""}
                onChange={e => setSwapDay(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-300 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">Sin cambio</option>
                {daysInMonth.filter(d => !isDaySunday(d)).map(d => (
                  <option key={d} value={d}>{getDayName(d)} {d}</option>
                ))}
              </select>
              <p className="text-[10px] text-purple-600 dark:text-purple-500 mt-1">
                Solo ese día intercambian turnos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* GENERATE / ACTION BAR */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        {pageState === "empty" && (
          <button
            onClick={handleGenerate}
            disabled={!hasAnyStaff}
            className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={16} /> Generar Turnos
          </button>
        )}

        {pageState === "preview" && (
          <>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={handleDiscard}
              className="bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
            >
              <Trash2 size={16} /> Descartar
            </button>
            <span className="hidden sm:flex text-xs text-amber-600 font-bold items-center gap-1 ml-1">
              <Eye size={14} /> Vista previa — sin guardar
            </span>
          </>
        )}

        {pageState === "saved" && (
          <>
            <span className="text-xs text-green-600 font-bold flex items-center gap-1">
              ✓ Guardados — {MESES[mes - 1]} {anio}
            </span>
            <button
              onClick={handleRegenerate}
              className="bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 px-3 sm:px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition sm:ml-auto"
            >
              <RefreshCw size={16} /> Regenerar
            </button>
          </>
        )}

        {/* View toggle */}
        {result && (
          <div className="flex w-full sm:w-auto sm:ml-auto bg-zinc-100 dark:bg-zinc-800 rounded-lg p-0.5">
            <button
              onClick={() => setView("calendario")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1 ${
                view === "calendario"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              <Calendar size={14} /> <span className="hidden sm:inline">Calendario</span><span className="sm:hidden">Mes</span>
            </button>
            <button
              onClick={() => setView("semanal")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1 ${
                view === "semanal"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              <CalendarDays size={14} /> Semanal
            </button>
            <button
              onClick={() => setView("persona")}
              className={`flex-1 sm:flex-none px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center justify-center gap-1 ${
                view === "persona"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                  : "text-zinc-500"
              }`}
            >
              <Users size={14} /> <span className="hidden sm:inline">Persona</span><span className="sm:hidden">Pers.</span>
            </button>
          </div>
        )}
      </div>

      {/* WARNINGS */}
      {result && result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="font-bold text-sm text-amber-800 dark:text-amber-400 mb-2">Advertencias</p>
          <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CALENDAR VIEW */}
      {result && view === "calendario" && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                  <th className="sticky left-0 z-10 bg-zinc-50 dark:bg-zinc-900 px-2 sm:px-3 py-2 text-left font-semibold text-zinc-500 uppercase min-w-[100px] sm:min-w-[160px]">
                    Nombre
                  </th>
                  {daysInMonth.map(day => (
                    <th
                      key={day}
                      className={`px-1 py-2 text-center font-semibold min-w-[36px] ${
                        isDaySunday(day)
                          ? "text-red-500 bg-red-50/50 dark:bg-red-900/10"
                          : "text-zinc-500"
                      }`}
                    >
                      <div>{getDayName(day)}</div>
                      <div className="font-bold">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Group separator: Supervisors */}
                <tr>
                  <td
                    colSpan={daysInMonth.length + 1}
                    className="sticky left-0 bg-purple-50 dark:bg-purple-900/10 px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider border-b border-purple-100 dark:border-purple-800/30"
                  >
                    Supervisores ({supervisors.length})
                  </td>
                </tr>
                {supervisors.map(p => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    daysInMonth={daysInMonth}
                    anio={anio}
                    mes={mes}
                    assignmentMap={assignmentMap}
                    isDaySunday={isDaySunday}
                  />
                ))}

                {/* Group separator: Grupo A */}
                <tr>
                  <td
                    colSpan={daysInMonth.length + 1}
                    className="sticky left-0 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider border-b border-blue-100 dark:border-blue-800/30"
                  >
                    Grupo A ({grupoA.length})
                  </td>
                </tr>
                {grupoA.map(p => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    daysInMonth={daysInMonth}
                    anio={anio}
                    mes={mes}
                    assignmentMap={assignmentMap}
                    isDaySunday={isDaySunday}
                  />
                ))}

                {/* Group separator: Grupo B */}
                <tr>
                  <td
                    colSpan={daysInMonth.length + 1}
                    className="sticky left-0 bg-amber-50 dark:bg-amber-900/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider border-b border-amber-100 dark:border-amber-800/30"
                  >
                    Grupo B ({grupoB.length})
                  </td>
                </tr>
                {grupoB.map(p => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    daysInMonth={daysInMonth}
                    anio={anio}
                    mes={mes}
                    assignmentMap={assignmentMap}
                    isDaySunday={isDaySunday}
                  />
                ))}

                {/* Coverage deficit section */}
                <tr>
                  <td
                    colSpan={daysInMonth.length + 1}
                    className="sticky left-0 bg-red-50 dark:bg-red-900/10 px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider border-y border-red-200 dark:border-red-800/30"
                  >
                    Cobertura
                  </td>
                </tr>
                {(["M", "T", "N"] as TurnoCode[]).map(turno => {
                  const hasAnyDeficit = daysInMonth.some(day => {
                    const dateStr = `${anio}-${String(mes).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const actual = coverageMap[dateStr]?.[turno] ?? 0;
                    const expected = getExpected(day)[turno];
                    return actual < expected;
                  });
                  if (!hasAnyDeficit) return null;
                  return (
                    <tr key={turno} className="bg-red-50/60 dark:bg-red-950/10 border-b border-red-100 dark:border-red-900/20">
                      <td className="sticky left-0 z-10 bg-red-50 dark:bg-red-950/20 px-2 sm:px-3 py-1.5 text-xs font-bold text-red-600 whitespace-nowrap border-r border-red-100 dark:border-red-900/20">
                        Falta {TURNO_LABELS[turno]}
                      </td>
                      {daysInMonth.map(day => {
                        const dateStr = `${anio}-${String(mes).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const actual = coverageMap[dateStr]?.[turno] ?? 0;
                        const expected = getExpected(day)[turno];
                        const deficit = expected - actual;
                        return (
                          <td key={day} className="px-0.5 py-1.5 text-center">
                            {deficit > 0 ? (
                              <span className="inline-block w-6 h-5 rounded bg-red-500 text-white text-[10px] font-bold leading-5">
                                {deficit}
                              </span>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-3 sm:gap-4 text-xs">
            {(["M", "T", "N", "L"] as TurnoCode[]).map(code => (
              <div key={code} className="flex items-center gap-1.5">
                <span className={`w-6 h-5 rounded text-center font-bold leading-5 ${TURNO_COLORS[code]}`}>
                  {code}
                </span>
                <span className="text-zinc-500">{TURNO_LABELS[code]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WEEKLY VIEW */}
      {result && view === "semanal" && weeksInMonth.length > 0 && (
        <>
          {/* Week navigation */}
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <button
              onClick={() => setWeekIndex(Math.max(0, weekIndex - 1))}
              disabled={weekIndex === 0}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} /> <span className="hidden sm:inline">Anterior</span>
            </button>
            <span className="text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400">
              Semana {weekIndex + 1} de {weeksInMonth.length}
            </span>
            <button
              onClick={() => setWeekIndex(Math.min(weeksInMonth.length - 1, weekIndex + 1))}
              disabled={weekIndex >= weeksInMonth.length - 1}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Siguiente</span> <ChevronRight size={16} />
            </button>
          </div>
          <WeeklyView
            weekStart={weeksInMonth[weekIndex]}
            anio={anio}
            mes={mes}
            assignmentMap={assignmentMap}
            personal={orderedPersonal}
          />
        </>
      )}

      {/* PERSON VIEW */}
      {result && view === "persona" && (
        <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase text-xs">
                <tr>
                  <th className="px-3 sm:px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">Rol</th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">Grupo</th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">
                    <span className={`inline-block w-6 h-5 rounded text-center font-bold leading-5 ${TURNO_COLORS.M}`}>M</span>
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">
                    <span className={`inline-block w-6 h-5 rounded text-center font-bold leading-5 ${TURNO_COLORS.T}`}>T</span>
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">
                    <span className={`inline-block w-6 h-5 rounded text-center font-bold leading-5 ${TURNO_COLORS.N}`}>N</span>
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">
                    <span className={`inline-block w-6 h-5 rounded text-center font-bold leading-5 ${TURNO_COLORS.L}`}>L</span>
                  </th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">Total</th>
                  <th className="px-2 sm:px-4 py-3 font-semibold text-center">Dom.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {orderedPersonal.map(p => {
                  const s = result.stats[p.id];
                  if (!s) return null;
                  const total = s.mañana + s.tarde + s.noche;
                  const maxSundays = numSundays > 4 ? 3 : 2;
                  const sundayWarning = p.rol === "atendedor" && s.domingos > maxSundays;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-zinc-900 dark:text-white whitespace-nowrap">{s.nombre}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          s.rol === "supervisor"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}>
                          {s.rol === "supervisor" ? "Sup" : "Att"}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-zinc-500 font-bold">
                        {s.grupo || "—"}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-amber-700 dark:text-amber-400">{s.mañana}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-blue-700 dark:text-blue-400">{s.tarde}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-indigo-700 dark:text-indigo-400">{s.noche}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-zinc-400">{s.libre}</td>
                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold text-zinc-900 dark:text-white">{total}</td>
                      <td className={`px-2 sm:px-4 py-2.5 sm:py-3 text-center font-bold ${
                        sundayWarning ? "text-red-600" : "text-zinc-600 dark:text-zinc-400"
                      }`}>
                        {s.domingos}
                        {sundayWarning && <AlertTriangle size={12} className="inline ml-1" />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!result && pageState === "empty" && (
        <div className="text-center py-10 sm:py-16 text-zinc-400 px-4">
          <Calendar size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-base sm:text-lg font-medium">No hay turnos generados</p>
          <p className="text-sm mt-1">
            {hasAnyStaff
              ? "Haz clic en \"Generar Turnos\" para crear el roster del mes."
              : "Agrega personal en la sección Personal antes de generar turnos."}
          </p>
        </div>
      )}
    </div>
  );
}

// --- Sub-component: Person Row in Calendar View ---
const PersonRow = memo(function PersonRow({
  person,
  daysInMonth,
  anio,
  mes,
  assignmentMap,
  isDaySunday,
}: {
  person: PersonalConRol;
  daysInMonth: number[];
  anio: number;
  mes: number;
  assignmentMap: Record<string, TurnoCode>;
  isDaySunday: (day: number) => boolean;
}) {
  return (
    <tr className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
      <td className="sticky left-0 z-10 bg-white dark:bg-zinc-950 px-2 sm:px-3 py-1.5 font-medium text-zinc-900 dark:text-zinc-200 text-xs whitespace-nowrap border-r border-zinc-100 dark:border-zinc-800 max-w-[100px] sm:max-w-none truncate">
        {person.nombre}
      </td>
      {daysInMonth.map(day => {
        const dateStr = `${anio}-${String(mes).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const turno = assignmentMap[`${person.id}_${dateStr}`];
        const sunday = isDaySunday(day);
        return (
          <td
            key={day}
            className={`px-0.5 py-1.5 text-center ${sunday ? "bg-red-50/30 dark:bg-red-900/5" : ""}`}
          >
            {turno ? (
              <span className={`inline-block w-6 h-5 rounded text-[10px] font-bold leading-5 ${TURNO_COLORS[turno]}`}>
                {turno}
              </span>
            ) : (
              <span className="text-zinc-300">·</span>
            )}
          </td>
        );
      })}
    </tr>
  );
});

// --- Sub-component: Weekly View (Shift-grouped) ---
const WeeklyView = memo(function WeeklyView({
  weekStart,
  anio,
  mes,
  assignmentMap,
  personal,
}: {
  weekStart: Date;
  anio: number;
  mes: number;
  assignmentMap: Record<string, TurnoCode>;
  personal: PersonalConRol[];
}) {
  const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of personal) map[p.id] = p.nombre;
    return map;
  }, [personal]);

  // For each shift type + day, collect assigned names
  const shiftData = useMemo(() => {
    const data: Record<string, Record<string, string[]>> = { M: {}, T: {}, N: {} };
    for (const day of weekDays) {
      const ds = formatDateStr(day);
      data.M[ds] = [];
      data.T[ds] = [];
      data.N[ds] = [];
    }
    for (const day of weekDays) {
      const ds = formatDateStr(day);
      for (const p of personal) {
        const turno = assignmentMap[`${p.id}_${ds}`];
        if (turno === 'M' || turno === 'T' || turno === 'N') {
          data[turno][ds].push(nameMap[p.id] || '?');
        }
      }
    }
    return data;
  }, [weekDays, assignmentMap, personal, nameMap]);

  const isInMonth = (d: Date) => d.getMonth() === mes - 1 && d.getFullYear() === anio;

  const expectedCount = (turno: string, d: Date): number => {
    if (!isInMonth(d)) return 0;
    const isSun = d.getDay() === 0;
    if (turno === 'N') return 3;
    return isSun ? 2 : 5; // weekday: 1 sup + 4 att = 5
  };

  const MAX_ROWS: Record<string, number> = { M: 5, T: 5, N: 3 };

  const sections = [
    {
      type: 'M' as TurnoCode,
      label: 'EQUIPO MAÑANA',
      headerClass: 'bg-yellow-400 text-yellow-950',
      rowClass: 'bg-amber-50/60 dark:bg-amber-950/20',
      hasFalta: true,
    },
    {
      type: 'T' as TurnoCode,
      label: 'EQUIPO TARDE',
      headerClass: 'bg-red-500 text-white',
      rowClass: 'bg-green-50/60 dark:bg-green-950/20',
      hasFalta: true,
    },
    {
      type: 'N' as TurnoCode,
      label: 'EQUIPO NOCHE',
      headerClass: 'bg-cyan-500 text-white',
      rowClass: 'bg-sky-50/60 dark:bg-sky-950/20',
      hasFalta: false,
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse min-w-[500px]">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              <th className="border border-zinc-200 dark:border-zinc-700 px-2 sm:px-4 py-2 sm:py-3 text-left font-bold text-zinc-600 dark:text-zinc-300 w-12 sm:w-20">
                Turno
              </th>
              {weekDays.map((day, i) => {
                const inMonth = isInMonth(day);
                const isSun = day.getDay() === 0;
                return (
                  <th
                    key={i}
                    className={`border border-zinc-200 dark:border-zinc-700 px-1 sm:px-3 py-2 sm:py-3 text-center font-bold ${
                      isSun ? 'text-red-500' : inMonth ? 'text-zinc-700 dark:text-zinc-300' : 'text-zinc-400'
                    }`}
                  >
                    <span className="hidden sm:inline">{DAY_NAMES[i]}</span>
                    <span className="sm:hidden">{DAY_NAMES[i].charAt(0)}</span>
                    {' '}{day.getDate()}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sections.map(section => (
              <Fragment key={section.type}>
                {/* Section header */}
                <tr>
                  <td
                    colSpan={8}
                    className={`${section.headerClass} text-center py-1.5 sm:py-2 font-black text-xs sm:text-sm tracking-wider border border-zinc-200 dark:border-zinc-700`}
                  >
                    {section.label}
                  </td>
                </tr>
                {/* Slot rows */}
                {Array.from({ length: MAX_ROWS[section.type] }).map((_, rowIdx) => (
                  <tr key={rowIdx} className={section.rowClass}>
                    <td className="border border-zinc-200 dark:border-zinc-700 px-2 sm:px-4 py-1.5 sm:py-2.5 font-bold text-zinc-600 dark:text-zinc-400 text-center">
                      {section.type}
                    </td>
                    {weekDays.map((day, colIdx) => {
                      const ds = formatDateStr(day);
                      const inMonth = isInMonth(day);
                      const name = shiftData[section.type]?.[ds]?.[rowIdx] || '';
                      return (
                        <td
                          key={colIdx}
                          className={`border border-zinc-200 dark:border-zinc-700 px-1 sm:px-3 py-1.5 sm:py-2.5 text-center font-medium whitespace-nowrap ${
                            !inMonth
                              ? 'bg-zinc-100 dark:bg-zinc-900 text-zinc-300 dark:text-zinc-700'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {inMonth ? name : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Falta row */}
                {section.hasFalta && (
                  <tr className="bg-red-50/80 dark:bg-red-950/20">
                    <td className="border border-zinc-200 dark:border-zinc-700 px-2 sm:px-4 py-1.5 sm:py-2.5"></td>
                    {weekDays.map((day, colIdx) => {
                      const ds = formatDateStr(day);
                      const inMonth = isInMonth(day);
                      const actual = shiftData[section.type]?.[ds]?.length || 0;
                      const expected = expectedCount(section.type, day);
                      const deficit = inMonth && actual < expected;
                      return (
                        <td
                          key={colIdx}
                          className="border border-zinc-200 dark:border-zinc-700 px-1 sm:px-3 py-1.5 sm:py-2.5 text-center"
                        >
                          {deficit && <span className="text-red-600 font-bold text-xs">Falta</span>}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});

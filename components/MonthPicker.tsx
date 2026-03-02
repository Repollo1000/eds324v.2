"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

const MESES_COMPLETO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DIAS_SEMANA = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

interface MonthPickerProps {
  value: string; // formato "YYYY-MM" o "YYYY-MM-DD"
  onChange: (value: string) => void;
}

export default function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parsear el valor actual
  const parts = value.split("-");
  const selectedYear = parseInt(parts[0]);
  const selectedMonth = parseInt(parts[1]);
  const selectedDay = parts[2] ? parseInt(parts[2]) : null;

  // Estado del calendario visible (puede ser diferente al seleccionado mientras navega)
  const [viewYear, setViewYear] = useState(selectedYear);
  const [viewMonth, setViewMonth] = useState(selectedMonth);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sincronizar vista con valor cuando cambia externamente
  useEffect(() => {
    setViewYear(selectedYear);
    setViewMonth(selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Calcular días del mes
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // Obtener el día de la semana del primer día del mes (0=Domingo, 1=Lunes, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month - 1, 1).getDay();
    // Convertir a lunes=0, domingo=6
    return day === 0 ? 6 : day - 1;
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth);

  // Navegar meses
  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  // Seleccionar día específico
  const handleSelectDay = (day: number) => {
    const mes = String(viewMonth).padStart(2, "0");
    const dia = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mes}-${dia}`);
    setIsOpen(false);
  };

  // Seleccionar mes completo
  const handleSelectMonth = () => {
    const mes = String(viewMonth).padStart(2, "0");
    onChange(`${viewYear}-${mes}`);
    setIsOpen(false);
  };

  // Ir al mes actual
  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  };

  // Texto a mostrar
  const displayText = selectedDay
    ? `${selectedDay} de ${MESES_COMPLETO[selectedMonth - 1]} ${selectedYear}`
    : `${MESES_COMPLETO[selectedMonth - 1]} ${selectedYear}`;

  // Verificar si un día es hoy
  const today = new Date();
  const isToday = (day: number) =>
    viewYear === today.getFullYear() &&
    viewMonth === today.getMonth() + 1 &&
    day === today.getDate();

  // Verificar si un día está seleccionado
  const isSelected = (day: number) =>
    viewYear === selectedYear &&
    viewMonth === selectedMonth &&
    day === selectedDay;

  // Verificar si el mes visible es el seleccionado (para resaltar todo el mes)
  const isMonthSelected = viewYear === selectedYear && viewMonth === selectedMonth && !selectedDay;

  return (
    <div ref={ref} className="relative">
      {/* Botón trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white dark:bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-600 transition text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        <Calendar size={16} className="text-zinc-500" />
        <span>{displayText}</span>
        <ChevronRight size={14} className={`text-zinc-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {/* Dropdown Calendario */}
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-4 w-80 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Navegación de mes */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              <ChevronLeft size={18} className="text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={handleSelectMonth}
              className={`px-3 py-1 rounded-lg text-sm font-bold transition ${
                isMonthSelected
                  ? "bg-teal-600 text-white"
                  : "text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
              title="Click para seleccionar todo el mes"
            >
              {MESES_COMPLETO[viewMonth - 1]} {viewYear}
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            >
              <ChevronRight size={18} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} className="text-center text-[10px] font-bold text-zinc-400 uppercase py-1">
                {dia}
              </div>
            ))}
          </div>

          {/* Días del mes */}
          <div className="grid grid-cols-7 gap-1">
            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {/* Días del mes */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
              <button
                key={day}
                onClick={() => handleSelectDay(day)}
                className={`
                  p-2 rounded-lg text-sm font-medium transition-all
                  ${isSelected(day)
                    ? "bg-teal-600 text-white shadow-md"
                    : isToday(day)
                      ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                      : isMonthSelected
                        ? "bg-teal-50/50 dark:bg-teal-900/20 text-zinc-700 dark:text-zinc-300 hover:bg-teal-100 dark:hover:bg-teal-900/40"
                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }
                `}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Acciones rápidas */}
          <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <button
              onClick={goToToday}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
            >
              Ir a hoy
            </button>
            <button
              onClick={handleSelectMonth}
              className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              Seleccionar todo {MESES_COMPLETO[viewMonth - 1]}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

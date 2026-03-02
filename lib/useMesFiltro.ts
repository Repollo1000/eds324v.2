import { useState, useEffect } from "react";

const STORAGE_KEY = "mesFiltro";

// Helper para obtener el rango de fechas basado en el filtro
// Acepta "YYYY-MM" (mes completo) o "YYYY-MM-DD" (día específico)
export function getFechaRango(filtro: string): { startDate: string; endDate: string } {
  const parts = filtro.split("-");
  const year = parts[0];
  const month = parts[1];

  if (parts[2]) {
    // Día específico: "YYYY-MM-DD"
    const date = `${year}-${month}-${parts[2]}`;
    return { startDate: date, endDate: date };
  } else {
    // Mes completo: "YYYY-MM"
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, "0")}`
    };
  }
}

// Leer valor inicial de localStorage (solo en cliente)
function getInitialValue(): string {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }
  return new Date().toISOString().slice(0, 7);
}

export function useMesFiltro() {
  const [mes, setMesState] = useState(getInitialValue);
  const [isReady, setIsReady] = useState(false);

  // Marcar como listo después de la hidratación
  useEffect(() => {
    // Re-leer de localStorage después de hidratar (por si el servidor tenía valor diferente)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== mes) {
      setMesState(saved);
    }
    setIsReady(true);
  }, []);

  // Guardar en localStorage al cambiar
  const setMes = (valor: string) => {
    setMesState(valor);
    localStorage.setItem(STORAGE_KEY, valor);
  };

  return [mes, setMes, isReady] as const;
}

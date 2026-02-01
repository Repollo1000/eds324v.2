import { useState, useEffect } from "react";

const STORAGE_KEY = "mesFiltro";

export function useMesFiltro() {
  const [mes, setMesState] = useState(new Date().toISOString().slice(0, 7));

  // Leer de localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setMesState(saved);
  }, []);

  // Guardar en localStorage al cambiar
  const setMes = (valor: string) => {
    setMesState(valor);
    localStorage.setItem(STORAGE_KEY, valor);
  };

  return [mes, setMes] as const;
}

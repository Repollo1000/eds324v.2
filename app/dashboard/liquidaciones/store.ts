// app/dashboard/liquidaciones/store.ts
import { create } from "zustand";

interface HojaLiquidacion {
  id: number;
  blob: Blob;       // El archivo PDF en memoria
  previewUrl: string;
  asignadoA: string; // ID del trabajador
  infoDeteccion: string;
  estado: "no_enviado" | "enviado"; // Simplificado
}

interface LiquidacionesState {
  hojas: HojaLiquidacion[];
  setHojas: (hojas: HojaLiquidacion[]) => void;
  actualizarHoja: (id: number, datos: Partial<HojaLiquidacion>) => void;
}

export const useLiquidacionesStore = create<LiquidacionesState>((set) => ({
  hojas: [], // Aquí se guardan los datos aunque cambies de pestaña
  setHojas: (hojas) => set({ hojas }),
  actualizarHoja: (id, datos) =>
    set((state) => ({
      hojas: state.hojas.map((h) => (h.id === id ? { ...h, ...datos } : h)),
    })),
}));
export type TurnoCode = 'M' | 'T' | 'N' | 'L';

export type Rol = 'atendedor' | 'supervisor';
export type Grupo = 'A' | 'B';

export interface PersonalConRol {
  id: string;
  nombre: string;
  rol: Rol;
  grupo: Grupo | null;
  activo: boolean;
}

export interface ShiftAssignment {
  personalId: string;
  fecha: string;       // YYYY-MM-DD
  turno: TurnoCode;
}

export interface GeneratorInput {
  personal: PersonalConRol[];
  anio: number;
  mes: number;         // 1-12
  quintoDomingoGrupo: Grupo | null; // which group works the 5th Sunday, null if no 5th Sunday
  supervisorMId?: string;  // ID of supervisor fixed to Mañana (other gets Tarde)
  swapFecha?: string;      // YYYY-MM-DD — single day where supervisors swap shifts
}

export interface PersonStats {
  nombre: string;
  rol: Rol;
  grupo: Grupo | null;
  mañana: number;
  tarde: number;
  noche: number;
  libre: number;
  domingos: number;
}

export interface GeneratorResult {
  assignments: ShiftAssignment[];
  stats: Record<string, PersonStats>;
  warnings: string[];
}

import {
  TurnoCode,
  PersonalConRol,
  ShiftAssignment,
  GeneratorInput,
  GeneratorResult,
  PersonStats,
} from './turnosTypes';

// --- Staffing targets ---
// Weekday: M = 1 sup + 4 att = 5, T = 1 sup + 4 att = 5, N = 3 att
// Sunday:  M = 2 att, T = 2 att, N = 3 att (from working group only)
const WEEKDAY_ATT_M = 4;
const WEEKDAY_ATT_T = 4;
const WEEKDAY_ATT_N = 3;
const SUNDAY_M = 2;
const SUNDAY_T = 2;

function getDaysInMonth(anio: number, mes: number): Date[] {
  const days: Date[] = [];
  const daysCount = new Date(anio, mes, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    days.push(new Date(anio, mes - 1, d));
  }
  return days;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function getSundayNumber(date: Date): number {
  return Math.ceil(date.getDate() / 7);
}

export function countSundays(anio: number, mes: number): number {
  const days = getDaysInMonth(anio, mes);
  return days.filter(isSunday).length;
}

// Pick up to N people from candidates, prioritizing fewest shifts of that type, then fewest total.
function pickByFairness(
  candidates: string[],
  n: number,
  shiftType: TurnoCode,
  shiftCounts: Record<string, Record<TurnoCode, number>>,
  totalCounts: Record<string, number>,
): string[] {
  const sorted = [...candidates].sort((a, b) => {
    const aType = shiftCounts[a]?.[shiftType] ?? 0;
    const bType = shiftCounts[b]?.[shiftType] ?? 0;
    if (aType !== bType) return aType - bType;
    const aTotal = totalCounts[a] ?? 0;
    const bTotal = totalCounts[b] ?? 0;
    return aTotal - bTotal;
  });
  return sorted.slice(0, Math.min(n, sorted.length));
}

export function generateTurnos(input: GeneratorInput): GeneratorResult {
  const { personal, anio, mes, quintoDomingoGrupo, supervisorMId, swapFecha } = input;
  const warnings: string[] = [];

  const supervisors = personal.filter(p => p.rol === 'supervisor' && p.activo);
  const grupoA = personal.filter(p => p.rol === 'atendedor' && p.grupo === 'A' && p.activo);
  const grupoB = personal.filter(p => p.rol === 'atendedor' && p.grupo === 'B' && p.activo);
  const allAttendants = [...grupoA, ...grupoB];

  // Staffing warnings (non-blocking)
  if (supervisors.length < 2) {
    warnings.push(`Se esperan 2 supervisores, hay ${supervisors.length}. Habrá turnos de supervisión sin cubrir.`);
  }
  if (grupoA.length < 7) {
    warnings.push(`Se esperan 7 atendedores en Grupo A, hay ${grupoA.length}. Habrá turnos sin cubrir.`);
  }
  if (grupoB.length < 7) {
    warnings.push(`Se esperan 7 atendedores en Grupo B, hay ${grupoB.length}. Habrá turnos sin cubrir.`);
  }

  const days = getDaysInMonth(anio, mes);
  const assignments: ShiftAssignment[] = [];

  const shiftCounts: Record<string, Record<TurnoCode, number>> = {};
  const totalCounts: Record<string, number> = {};
  const sundayCounts: Record<string, number> = {};

  const allPersonnel = [...supervisors, ...allAttendants];
  for (const p of allPersonnel) {
    shiftCounts[p.id] = { M: 0, T: 0, N: 0, L: 0 };
    totalCounts[p.id] = 0;
    sundayCounts[p.id] = 0;
  }

  // Resolve fixed supervisor assignment
  const fixedSupM = supervisorMId ? supervisors.find(s => s.id === supervisorMId) : null;
  const fixedSupT = supervisorMId ? supervisors.find(s => s.id !== supervisorMId) : null;

  function assign(personalId: string, fecha: string, turno: TurnoCode, date: Date) {
    assignments.push({ personalId, fecha, turno });
    shiftCounts[personalId][turno]++;
    if (turno !== 'L') {
      totalCounts[personalId]++;
    }
    if (isSunday(date) && turno !== 'L') {
      sundayCounts[personalId]++;
    }
  }

  for (const day of days) {
    const fecha = formatDate(day);

    if (isSunday(day)) {
      // --- SUNDAY LOGIC ---
      const sundayNum = getSundayNumber(day);
      let workingGroup: PersonalConRol[];
      let freeGroup: PersonalConRol[];

      if (sundayNum <= 4) {
        const isGroupAWorking = sundayNum % 2 === 1;
        workingGroup = isGroupAWorking ? grupoA : grupoB;
        freeGroup = isGroupAWorking ? grupoB : grupoA;
      } else {
        if (quintoDomingoGrupo === 'A') {
          workingGroup = grupoA;
          freeGroup = grupoB;
        } else {
          workingGroup = grupoB;
          freeGroup = grupoA;
        }
      }

      // Sunday: 2M + 2T + rest N from working group
      const workingIds = workingGroup.map(p => p.id);
      const mWorkers = pickByFairness(workingIds, SUNDAY_M, 'M', shiftCounts, totalCounts);
      const rem1 = workingIds.filter(id => !mWorkers.includes(id));
      const tWorkers = pickByFairness(rem1, SUNDAY_T, 'T', shiftCounts, totalCounts);
      const nWorkers = rem1.filter(id => !tWorkers.includes(id));

      for (const id of mWorkers) assign(id, fecha, 'M', day);
      for (const id of tWorkers) assign(id, fecha, 'T', day);
      for (const id of nWorkers) assign(id, fecha, 'N', day);

      for (const p of freeGroup) assign(p.id, fecha, 'L', day);
      for (const p of supervisors) assign(p.id, fecha, 'L', day);

    } else {
      // --- WEEKDAY LOGIC (Mon-Sat) ---
      // Supervisors: fixed M/T with optional swap day
      if (supervisors.length >= 2 && fixedSupM && fixedSupT) {
        const isSwap = swapFecha === fecha;
        const supM = isSwap ? fixedSupT : fixedSupM;
        const supT = isSwap ? fixedSupM : fixedSupT;
        assign(supM.id, fecha, 'M', day);
        assign(supT.id, fecha, 'T', day);
      } else if (supervisors.length >= 2) {
        // Fallback: first supervisor M, second T
        assign(supervisors[0].id, fecha, 'M', day);
        assign(supervisors[1].id, fecha, 'T', day);
      } else if (supervisors.length === 1) {
        assign(supervisors[0].id, fecha, 'M', day);
      }

      // Attendants: 4M + 4T + 3N = 11 working, rest free
      const attIds = allAttendants.map(p => p.id);

      const mWorkers = pickByFairness(attIds, WEEKDAY_ATT_M, 'M', shiftCounts, totalCounts);
      const rem1 = attIds.filter(id => !mWorkers.includes(id));
      const tWorkers = pickByFairness(rem1, WEEKDAY_ATT_T, 'T', shiftCounts, totalCounts);
      const rem2 = rem1.filter(id => !tWorkers.includes(id));
      const nWorkers = pickByFairness(rem2, WEEKDAY_ATT_N, 'N', shiftCounts, totalCounts);
      const freeWorkers = rem2.filter(id => !nWorkers.includes(id));

      for (const id of mWorkers) assign(id, fecha, 'M', day);
      for (const id of tWorkers) assign(id, fecha, 'T', day);
      for (const id of nWorkers) assign(id, fecha, 'N', day);
      for (const id of freeWorkers) assign(id, fecha, 'L', day);
    }
  }

  // Build stats
  const stats: Record<string, PersonStats> = {};
  for (const p of allPersonnel) {
    stats[p.id] = {
      nombre: p.nombre,
      rol: p.rol,
      grupo: p.grupo,
      mañana: shiftCounts[p.id].M,
      tarde: shiftCounts[p.id].T,
      noche: shiftCounts[p.id].N,
      libre: shiftCounts[p.id].L,
      domingos: sundayCounts[p.id],
    };
  }

  // Sunday limit check (max 2, or 3 if 5th Sunday exists)
  const numSundays = days.filter(isSunday).length;
  const maxSundays = numSundays > 4 ? 3 : 2;
  for (const p of allAttendants) {
    if (sundayCounts[p.id] > maxSundays) {
      warnings.push(`${p.nombre} tiene ${sundayCounts[p.id]} domingos trabajados (máx: ${maxSundays}).`);
    }
  }

  return { assignments, stats, warnings };
}

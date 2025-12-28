"use client";

import { useParams, useRouter } from "next/navigation";

type Turno = {
  operador: string;
  horaInicio: string;
  horaFin: string;
  ventas: number;
  diferencia: number;
};

const turnosMock: Turno[] = [
  { operador: "Mauricio", horaInicio: "07:00", horaFin: "15:00", ventas: 2854100, diferencia: -800 },
  { operador: "Dayrishell", horaInicio: "15:00", horaFin: "23:00", ventas: 3012550, diferencia: 1200 },
  { operador: "Usuario Faltante", horaInicio: "23:00", horaFin: "07:00", ventas: 2388010, diferencia: 0 },
];

export default function DiaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const totalVentas = turnosMock.reduce((acc, t) => acc + t.ventas, 0);
  const totalDiferencia = turnosMock.reduce((acc, t) => acc + t.diferencia, 0);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black px-6 py-8">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Cuadratura del día
          </h1>

          {/* aquí id puede ser fecha o un UUID */}
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {id}
          </p>
        </div>

        <button
          onClick={() => router.push("/dashboard")}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Volver al dashboard
        </button>
      </div>

      {/* RESUMEN DEL DÍA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        <Resumen label="Turnos registrados" value={`${turnosMock.length}`} />
        <Resumen label="Total ventas día" value={formato(totalVentas)} />
        <Resumen label="Diferencia total" value={formato(totalDiferencia)} />
      </div>

      {/* LISTADO DE TURNOS */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <div className="px-5 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Turnos del día
          </h2>
        </div>

        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {turnosMock.map((t, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4">

              <div>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {t.operador}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t.horaInicio} — {t.horaFin}
                </p>
              </div>

              <div className="flex items-center gap-10">
                <div className="text-right">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Ventas</p>
                  <p className="font-semibold">{formato(t.ventas)}</p>
                </div>

                <div className="text-right">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Diferencia</p>
                  <p className={
                    t.diferencia === 0
                      ? "text-zinc-600"
                      : t.diferencia > 0
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }>
                    {formato(t.diferencia)}
                  </p>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function Resumen({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
        {value}
      </h3>
    </div>
  );
}

function formato(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP" });
}

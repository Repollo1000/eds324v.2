import Link from "next/link";

export default function CuadraturasPage() {
  return (
    <div className="p-6">

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Cuadraturas</h1>

        <Link
          href="/dashboard/cuadraturas/nueva"
          className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Nueva Cuadratura
        </Link>
      </div>

      <p>Aquí irá la tabla de cuadraturas por día / turno.</p>

    </div>
  );
}

import Sidebar from "@/components/Sidebar"; // <--- Importamos el componente nuevo

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-zinc-50 dark:bg-black">
      
      {/* Aquí insertamos el Sidebar lateral fijo */}
      <Sidebar />

      {/* Aquí va el contenido cambiante (las páginas) */}
      <main className="flex-1 w-full">
        {children}
      </main>
      
    </div>
  );
}
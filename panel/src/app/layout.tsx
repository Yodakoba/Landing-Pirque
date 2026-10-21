import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Reservas — Brasas de Lo Pirque',
  // Uso interno: que no lo indexe nadie aunque quede accesible.
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="border-b border-hueso/10">
          <div className="mx-auto max-w-6xl px-5 py-4 flex items-baseline gap-6">
            <a href="/" className="font-bold tracking-widest text-sm uppercase text-oro">
              Reservas
            </a>
            <nav className="flex gap-5 text-sm text-hueso/70">
              <a href="/" className="hover:text-hueso">Calendario</a>
              <a href="/fechas" className="hover:text-hueso">Fechas hábiles</a>
              <a href="/config" className="hover:text-hueso">Configuración</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}

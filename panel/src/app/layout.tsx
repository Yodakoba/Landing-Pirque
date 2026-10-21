import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';

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
            <Nav />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}

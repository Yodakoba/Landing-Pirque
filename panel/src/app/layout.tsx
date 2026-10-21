import type { Metadata } from 'next';
import './globals.css';
import Cabecera from '@/components/Cabecera';
import { headers } from 'next/headers';
import { rolDeCabecera } from '@/lib/permisos';

export const metadata: Metadata = {
  title: 'Reservas — Brasas de Lo Pirque',
  // Uso interno: que no lo indexe nadie aunque quede accesible.
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // El rol se deriva acá, en el servidor, para que la barra no le ofrezca al
  // encargado enlaces que le van a devolver 403. **No es la protección**:
  // esa está en cada ruta. Esto es para no mentirle a quien mira.
  const rol = rolDeCabecera(headers().get('authorization') ?? '');
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Cabecera rol={rol} />
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}

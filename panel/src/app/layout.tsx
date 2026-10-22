import type { Metadata } from 'next';
import './globals.css';
import Cabecera from '@/components/Cabecera';
import { headers } from 'next/headers';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';

export const metadata: Metadata = {
  title: 'Reservas — Brasas de Lo Pirque',
  // Uso interno: que no lo indexe nadie aunque quede accesible.
  robots: { index: false, follow: false }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // El rol se deriva acá, en el servidor, para que la barra no le ofrezca al
  // encargado enlaces que le van a devolver 403. **No es la protección**:
  // esa está en cada ruta. Esto es para no mentirle a quien mira.
  //
  // El nombre va a la barra por un motivo concreto: con cuentas compartidas
  // nadie sabía con cuál estaba entrando, y ahora cada acción queda firmada.
  // Ver quién eres antes de tocar algo es parte de que la bitácora sirva.
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  return (
    <html lang="es">
      <body className="min-h-screen">
        <Cabecera rol={sesion?.rol ?? ''} usuario={sesion?.usuario ?? ''} />
        <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}

/**
 * **La ayuda de cada rol** (2026-11-12). Ver `lib/ayudaRol.ts`.
 *
 * El rol sale de la sesión, en el servidor, igual que en la portada: la
 * página muestra solo las pantallas que esta cuenta abre.
 */
import { headers } from 'next/headers';
import AyudaRol from '@/components/AyudaRol';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  return <AyudaRol rol={sesion?.rol ?? ''} gerencia={sesion?.gerencia === true}
    conComentar={!!process.env.COMENTARIOS_SHEET_ID?.trim()} />;
}

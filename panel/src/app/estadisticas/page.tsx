/**
 * Las estadísticas de reservas (2026-11-19). El permiso se comprueba acá y
 * en la ruta: el botón no se le muestra a quien no lo tiene, pero escribir
 * /estadisticas a mano es gratis.
 */
import { headers } from 'next/headers';
import Estadisticas from '@/components/Estadisticas';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';
import { puedeVer, type Rol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  if (!puedeVer((sesion?.rol ?? '') as Rol, 'estadisticas', sesion?.gerencia === true)) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-[14px] text-hueso/70">
          Las estadísticas de reservas las ven el encargado de operaciones, quien hace los pagos,
          la gerencia general y el administrador.
        </p>
      </div>
    );
  }
  return <Estadisticas />;
}

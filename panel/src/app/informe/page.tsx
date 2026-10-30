/**
 * El informe del equipo, por semana o por mes. El permiso se comprueba acá y
 * no solo en el menú: el menú no se lo muestra al encargado, pero escribir
 * /informe a mano es gratis.
 */
import { headers } from 'next/headers';
import InformeEquipo from '@/components/InformeEquipo';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';
import { puede, type Rol } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  if (!puede((sesion?.rol ?? '') as Rol, 'informe')) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-sm text-hueso/70">
          El informe del equipo lo ve el administrador. Los montos del día sí
          están en la página de cada día, al pasar lista.
        </p>
      </div>
    );
  }
  return <InformeEquipo />;
}

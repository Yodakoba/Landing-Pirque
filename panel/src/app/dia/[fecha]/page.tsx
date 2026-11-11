/**
 * Un día completo: las reservas, el equipo, las extras y lo cotizado.
 *
 * El rol y el nombre bajan desde el servidor por lo mismo que en la
 * portada: para no dibujarle a una cuenta bloques que no puede leer, y para
 * saber qué reservas son suyas. Ver `src/app/page.tsx`.
 */
import { headers } from 'next/headers';
import DayView from '@/components/DayView';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: { fecha: string } }) {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  return <DayView fecha={params.fecha}
                  rol={sesion?.rol ?? ''} usuario={sesion?.usuario ?? ''}
                  gerencia={sesion?.gerencia === true} />;
}

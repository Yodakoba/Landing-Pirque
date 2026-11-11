/**
 * El calendario, que es la portada del panel.
 *
 * **El rol y el nombre de la cuenta se derivan acá, en el servidor**, y
 * bajan como props. No son la protección —ésa está en cada ruta— pero sin
 * ellos la pantalla no puede dejar de ofrecer lo que la cuenta no puede
 * hacer, y un botón que siempre responde 403 se lee como un error del panel.
 *
 * Acá basta el rol: el calendario no tiene botones por reserva. El nombre
 * de la cuenta sí hace falta en la página de un día, que es donde se edita
 * y se borra una (ver `puedeTocarReserva()`).
 */
import { headers } from 'next/headers';
import CalendarView from '@/components/CalendarView';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from '@/lib/sesion';

export const dynamic = 'force-dynamic';

export default async function Pagina() {
  const sesion = await leerSesion(
    cookieDe(headers().get('cookie'), COOKIE_SESION), secretoDeSesion(process.env)
  );
  return <CalendarView rol={sesion?.rol ?? ''} gerencia={sesion?.gerencia === true} />;
}

/**
 * El endpoint que consume el SITIO PÚBLICO. Reemplaza al Web App de Apps
 * Script: `CONFIG.backend` en assets/js/reserva.js apunta acá.
 *
 * **Es la única ruta del panel SIN contraseña**, y está exenta a mano en
 * src/middleware.ts. Lo que devuelve lo decide paraElSitio(), que recorta
 * la ocupación a tres campos; ver src/lib/publico.ts.
 *
 * El contrato es el que ya esperaba el sitio, para no tocar su JavaScript
 * más que la URL:
 *
 *   GET ?accion=fechas  ->  { fechas: [{ fecha, quedan, pocos }] }
 *   si algo falla       ->  { error: "..." }  (y además un 500 de verdad)
 *
 * El campo `error` se mantiene aunque acá sí podamos devolver un código
 * HTTP correcto —Apps Script no podía, siempre respondía 200— porque el
 * sitio revisa las dos cosas y así la migración no depende de cambiar su
 * manejo de errores.
 */
import { NextResponse } from 'next/server';
import { leerReservas, leerFechas, leerConfig } from '@/lib/datos';
import { ocupacionDeTodos } from '@/lib/ocupacion';
import { paraElSitio } from '@/lib/publico';
import { hoy, sumarDias } from '@/lib/fechas';

export const dynamic = 'force-dynamic';   // cupos vivos, nunca cacheados

// El sitio se sirve desde otro dominio, así que sin esto el navegador
// bloquea la respuesta. Va abierto a propósito: esto devuelve lo mismo que
// cualquier visitante ve dibujado en la página, así que restringir
// orígenes no protegería nada y sí rompería las vistas previas y los
// tres idiomas si alguno cambia de dominio.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store'
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const [reservas, fechas, cfg] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig()
    ]);

    // Un día que ya pasó no se ofrece, aunque siga abierto en la planilla.
    // Y tampoco uno más lejano que el tope configurado: una fecha abierta
    // por error a un año plazo no debería poder reservarse.
    const desde = hoy();
    const hasta = sumarDias(desde, cfg.diasAFuturo);
    const ventana = fechas.filter((f) => f.fecha >= desde && f.fecha <= hasta);

    const dias = ocupacionDeTodos(reservas, ventana, cfg.cortes);
    return NextResponse.json(
      { fechas: paraElSitio(dias, cfg.avisoPocosLugares) },
      { headers: CORS }
    );
  } catch (e) {
    // El mensaje real queda en el log de Vercel, no en la respuesta: este
    // endpoint es público y los errores de la API de Sheets nombran la
    // planilla y la cuenta de servicio.
    console.error('[publico/fechas]', e);
    return NextResponse.json(
      { error: 'No pudimos cargar las fechas.' },
      { status: 500, headers: CORS }
    );
  }
}

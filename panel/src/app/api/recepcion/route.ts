/**
 * **La recepción de hoy** (2026-11-11): lo justo para recibir a la gente en
 * la entrada, y nada más. Las reservas de **hoy** —nunca otro día—, con
 * quién, cuántos, qué menús, si vino, cuántos llegaron y el aviso al jefe
 * de turno. Sin montos, sin pagos, sin contacto: la anfitriona no los
 * necesita para recibir a nadie.
 *
 * Con el permiso `asistencia`. Dice además si la recepción ya abrió
 * (`yaAbrio()`) y si el día está cerrado, para que la pantalla lo diga en
 * vez de dejar apretar y fallar.
 */
import { NextResponse } from 'next/server';
import { exigir } from '@/lib/permisos';
import { leerReservas, leerFechas, leerConfig, leerCierres } from '@/lib/datos';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { yaAbrio, estaCerrado as diaCerrado } from '@/lib/cierres';
import { ocupaLugar } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const no = await exigir(req, 'asistencia');
  if (no) return no;
  try {
    const fecha = hoy();
    const [reservas, fechas, cfg, cierres] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig(), leerCierres().catch(() => [])
    ]);
    const apertura = fechas.find((f) => f.fecha === fecha)?.apertura || cfg.horaApertura;
    return NextResponse.json({
      fecha, apertura,
      abierta: yaAbrio(fecha, apertura, ahoraEnChile()),
      cerrado: diaCerrado(cierres, fecha),
      reservas: reservas.filter((r) => r.fecha === fecha && ocupaLugar(r)).map((r) => ({
        fila: r.fila, nombre: r.nombre, personas: r.personas, menu: r.menu,
        asistencia: r.asistencia, llegaron: r.llegaron ?? null,
        avisoRecepcion: r.avisoRecepcion ?? ''
      }))
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

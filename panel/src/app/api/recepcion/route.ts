/**
 * **La recepción de hoy** (2026-11-11): lo justo para recibir a la gente en
 * la entrada, y nada más. Las reservas de **hoy** —nunca otro día—, con
 * quién, cuántos, qué menús, si vino, cuántos llegaron y el aviso al jefe
 * de turno. Sin contacto: la anfitriona no lo necesita para recibir a nadie.
 *
 * **Y cómo ingresarla en Fudo** (2026-11-11, lo pidió el cliente): ya pagó y
 * va como pago directo, o es solo reserva y se cobra sin descuento. Llega
 * armado (`comoIngresar()`), no los datos del pago con que se arma.
 *
 * Con el permiso `asistencia`. Dice además si la recepción ya abrió
 * (`yaAbrio()`) y si el día está cerrado, para que la pantalla lo diga en
 * vez de dejar apretar y fallar.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CIERRES } from '@/lib/cierres';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { exigir, exigirVer } from '@/lib/permisos';
import { leerReservas, leerFechas, leerConfig, leerCierres, leerMenus, reservasDeCotizaciones } from '@/lib/datos';
import { comoIngresar } from '@/lib/fudo';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { yaAbrio, estaCerrado as diaCerrado } from '@/lib/cierres';
import { ocupaLugar } from '@/lib/ocupacion';

export const dynamic = 'force-dynamic';

export const GET = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_CIERRES, HOJA_MENUS, HOJA_PRESUPUESTOS], async function GET(req: Request) {
  const no = await exigirVer(req, 'asistencia');
  if (no) return no;
  try {
    const fecha = hoy();
    const [reservas, fechas, cfg, cierres, menus, deCot] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig(), leerCierres().catch(() => []),
      leerMenus(), reservasDeCotizaciones().catch(() => new Map<string, string>())
    ]);
    const apertura = fechas.find((f) => f.fecha === fecha)?.apertura || cfg.horaApertura;
    return NextResponse.json({
      fecha, apertura,
      abierta: yaAbrio(fecha, apertura, ahoraEnChile()),
      cerrado: diaCerrado(cierres, fecha),
      reservas: reservas.filter((r) => r.fecha === fecha && ocupaLugar(r)).map((r) => ({
        fila: r.fila, nombre: r.nombre, personas: r.personas, menu: r.menu,
        asistencia: r.asistencia, llegaron: r.llegaron ?? null,
        avisoRecepcion: r.avisoRecepcion ?? '',
        ingreso: comoIngresar(r, menus, deCot.has(r.id))
      }))
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

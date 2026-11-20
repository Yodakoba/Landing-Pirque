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
import { HOJA_PRESUPUESTOS, HOJA_LINEAS } from '@/lib/presupuestos';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede } from '@/lib/auth';
import { leerReservas, leerFechas, leerConfig, leerCierres, leerMenus, reservasDeCotizaciones,
         leerPresupuestos, leerLineasPresupuesto } from '@/lib/datos';
import { comoIngresar, acordadosPorReserva, type Acordado } from '@/lib/fudo';
import { hoy } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { yaAbrio, estaCerrado as diaCerrado } from '@/lib/cierres';
import { ocupaLugar } from '@/lib/ocupacion';
import { paraReservar } from '@/lib/menus';
import { opcionesParaAgregar } from '@/lib/mesa';

export const dynamic = 'force-dynamic';

export const GET = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_CONFIG, HOJA_CIERRES, HOJA_MENUS, HOJA_PRESUPUESTOS, HOJA_LINEAS], async function GET(req: Request) {
  const no = await exigirVer(req, 'asistencia');
  if (no) return no;
  try {
    const fecha = hoy();
    const [reservas, fechas, cfg, cierres, menus, deCot] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig(), leerCierres().catch(() => []),
      leerMenus(), reservasDeCotizaciones().catch(() => new Map<string, string>())
    ]);
    // **Lo acordado en la cotización ganada** (2026-11-20, lo decidió el
    // cliente): lo ven el encargado de turno, operaciones y los de arriba
    // —los que tienen `ver`—. **La anfitriona no**: ella sigue con la caja de
    // siempre. Sale de la misma tanda de lecturas.
    const quien = await quienEs(req);
    const acordados = puede(quien.rol, 'ver')
      ? acordadosPorReserva(await leerPresupuestos().catch(() => []),
                            await leerLineasPresupuesto().catch(() => []), menus)
      : new Map<string, Acordado>();
    const apertura = fechas.find((f) => f.fecha === fecha)?.apertura || cfg.horaApertura;
    // Los menús que se pueden agregar a una mesa (2026-11-17, `mesa.ts`).
    const delSitio = paraReservar(menus).map((m) => m.nombre);
    return NextResponse.json({
      fecha, apertura,
      abierta: yaAbrio(fecha, apertura, ahoraEnChile()),
      cerrado: diaCerrado(cierres, fecha),
      reservas: reservas.filter((r) => r.fecha === fecha && ocupaLugar(r)).map((r) => ({
        fila: r.fila, nombre: r.nombre, personas: r.personas, menu: r.menu,
        asistencia: r.asistencia, llegaron: r.llegaron ?? null,
        avisoRecepcion: r.avisoRecepcion ?? '',
        ingreso: comoIngresar(r, menus, deCot.has(r.id), acordados.get(r.id)),
        // **La mesa** (2026-11-17): lo que se sumó, el valor final y con qué
        // se puede sumar. El valor final lo anota ella misma: no es un dato
        // que se le esconda.
        agregados: r.agregados ?? '', valorFinal: r.valorFinal ?? null, mesaCerrada: r.mesaCerrada ?? '',
        opciones: opcionesParaAgregar(r.menu, delSitio)
      }))
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

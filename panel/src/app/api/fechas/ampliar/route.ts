import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerFechas, leerReservas, leerConfig, guardarFecha, anotar } from '@/lib/datos';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { ocupaLugar } from '@/lib/ocupacion';
import { cupoAmpliado } from '@/lib/sobrecupo';
import { esFecha } from '@/lib/fechas';
import { empujarDia } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

/**
 * **Ampliar el cupo de un día para que quepan todos** (2026-11-12): la otra
 * salida del sobrecupo, cuando se decide recibir a todos y traer más
 * equipo en vez de soltar una reserva sin pagar.
 *
 * El cupo nuevo lo calcula el servidor con lo tomado de ese momento —no lo
 * manda el navegador—, y nunca pasa de la capacidad máxima del recinto
 * (`capacidad_maxima` en Configuración). Si ni con el máximo caben, sube
 * hasta ahí y lo dice: igual habrá que soltar a alguien.
 */
export const POST = conLecturas([HOJA_FECHAS, HOJA_RESERVAS], async function POST(req: Request) {
  // Subir el cupo es del gerente o más arriba (2026-11-12).
  const no = await exigir(req, 'cupo');
  if (no) return no;
  try {
    const cuerpo = (await req.json().catch(() => ({}))) ?? {};
    const fecha = String(cuerpo.fecha ?? '').trim();
    if (!esFecha(fecha)) return NextResponse.json({ error: 'Falta la fecha.' }, { status: 400 });
    const [fechas, reservas, cfg] = await Promise.all([leerFechas(), leerReservas(), leerConfig()]);
    const dia = fechas.find((f) => f.fecha === fecha);
    if (!dia) return NextResponse.json({ error: 'Ese día no está en el calendario.' }, { status: 404 });
    const tomadas = reservas.filter((r) => r.fecha === fecha && ocupaLugar(r))
      .reduce((n, r) => n + (Number(r.personas) || 0), 0);
    if (tomadas <= dia.capacidad) {
      return NextResponse.json({ ok: true, cupo: dia.capacidad, alcanza: true, sinCambios: true });
    }
    const { cupo, alcanza } = cupoAmpliado(tomadas, cfg.capacidadMaxima);
    if (cupo <= dia.capacidad) {
      return NextResponse.json({
        error: `El cupo ya está en la capacidad máxima del recinto (${cfg.capacidadMaxima}): `
          + 'para que quepan todos hay que soltar una reserva sin pagar.'
      }, { status: 409 });
    }
    const { fila: _f, ...sinFila } = dia;
    await guardarFecha({ ...sinFila, capacidad: cupo });
    await empujarDia(fecha);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Amplió el cupo por sobrecupo',
      detalle: `${fecha} · de ${dia.capacidad} a ${cupo}`
        + (alcanza ? '' : ` · tope del recinto: faltan ${tomadas - cupo} lugares`) });
    return NextResponse.json({ ok: true, cupo, alcanza, antes: dia.capacidad, faltan: Math.max(0, tomadas - cupo) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

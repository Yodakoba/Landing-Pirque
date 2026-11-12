import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerFechas, leerConfig, guardarFecha, anotar } from '@/lib/datos';
import { HOJA_FECHAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { esFecha } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';
import { marcaCupoPedido, cupoPedidoDe, cupoAlAprobar } from '@/lib/cupo';
import { empujarDia } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

/**
 * **Pedir más cupo, y aprobarlo** (2026-11-12, lo pidió el cliente). Subir
 * el cupo es del gerente de operaciones o más arriba (permiso `cupo`); el
 * encargado lo **pide** y el pedido le llega al gerente a la bandeja de
 * aprobaciones de la portada.
 *
 * - `pedir` (permiso `dias`): anota `Cupo pedido` en el día.
 * - `aprobar` (permiso `cupo`): sube el cupo a lo pedido, sin pasar de la
 *   capacidad máxima del recinto, y vacía el pedido.
 * - `rechazar` (permiso `cupo`): vacía el pedido; el cupo queda igual.
 */
export const POST = conLecturas([HOJA_FECHAS, HOJA_CONFIG], async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const fecha = String(b.fecha ?? '').trim();
    const accion = String(b.accion ?? '');
    if (!esFecha(fecha)) return NextResponse.json({ error: 'Falta la fecha.' }, { status: 400 });
    if (!['pedir', 'aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
    }
    const no = await exigir(req, accion === 'pedir' ? 'operarDia' : 'cupo');
    if (no) return no;

    const [fechas, cfg] = await Promise.all([leerFechas(), leerConfig()]);
    const dia = fechas.find((f) => f.fecha === fecha);
    if (!dia) return NextResponse.json({ error: 'Ese día no está en el calendario.' }, { status: 404 });
    const quien = await quienEs(req);
    const { fila: _f, ...sinFila } = dia;

    if (accion === 'pedir') {
      const cupo = Math.round(Number(b.cupo));
      if (!(cupo > dia.capacidad)) {
        return NextResponse.json({ error: `Pide un cupo mayor que el de hoy (${dia.capacidad}).` }, { status: 400 });
      }
      const motivo = String(b.motivo ?? '').trim();
      await guardarFecha({ ...sinFila, cupoPedido: marcaCupoPedido(cupo, quien.usuario, ahoraEnChile(), motivo) });
      await anotar({ ...quien, accion: 'Pidió subir el cupo',
        detalle: `${fecha} · de ${dia.capacidad} a ${cupo}${motivo ? ` · ${motivo}` : ''}` });
      return NextResponse.json({ ok: true, pedido: cupo });
    }

    const pedido = cupoPedidoDe(dia.cupoPedido);
    if (!pedido) return NextResponse.json({ error: 'Ese pedido ya no está: alguien lo resolvió.' }, { status: 409 });
    if (accion === 'rechazar') {
      await guardarFecha({ ...sinFila, cupoPedido: '' });
      await anotar({ ...quien, accion: 'Rechazó subir el cupo',
        detalle: `${fecha} · pedía ${pedido.cupo} (${pedido.quien}) · queda en ${dia.capacidad}` });
      return NextResponse.json({ ok: true, cupo: dia.capacidad });
    }
    const cupo = cupoAlAprobar(pedido.cupo, dia.capacidad, cfg.capacidadMaxima);
    await guardarFecha({ ...sinFila, capacidad: cupo, cupoPedido: '' });
    await empujarDia(fecha);
    await anotar({ ...quien, accion: 'Aprobó subir el cupo',
      detalle: `${fecha} · de ${dia.capacidad} a ${cupo} · lo pidió ${pedido.quien}`
        + (cupo < pedido.cupo ? ` · pedía ${pedido.cupo}, tope del recinto ${cfg.capacidadMaxima}` : '') });
    return NextResponse.json({ ok: true, cupo, antes: dia.capacidad, alTope: cupo < pedido.cupo });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { leerPresupuestos, guardarPresupuesto, leerFechas, guardarFecha, leerConfig, leerReservas, anotar } from '@/lib/datos';
import { HOJA_FECHAS, HOJA_RESERVAS, ESTADO_DIA, esPrivada, estaCerrado } from '@/lib/columnas';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { HOJA_CONFIG } from '@/lib/config';
import { puedeTocarPresupuesto, type Rol } from '@/lib/auth';
import { folioDe } from '@/lib/presupuestos';
import { ocupaLugar } from '@/lib/ocupacion';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy, esFecha } from '@/lib/fechas';
import { esExclusivo, exclusividadDe, marcaExclusividad, plazoParaLiberar } from '@/lib/exclusivo';
import { empujarDia } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

/**
 * **Liberar un día para un evento exclusivo** (2026-11-12, lo pidió el
 * cliente). Ver `lib/exclusivo.ts`.
 *
 * - `pedir` (quien puede tocar la cotización): el vendedor le pide a la
 *   gerencia liberar el día. Con menos días que el plazo, va como caso
 *   especial.
 * - `pausar` (permiso `exclusividad`): **dejar de vender el día** mientras se
 *   decide. Un día público pasa a privado —no se ofrece en el sitio— y se
 *   guarda cómo estaba, para devolverlo.
 * - `aprobar` (`exclusividad`): se aprueba liberar el día. También deja de
 *   venderlo, si no estaba pausado. Fuera de plazo pide motivo.
 * - `rechazar` (`exclusividad`): con motivo, que el vendedor ve en la
 *   cotización. Si el día estaba pausado por este pedido, vuelve a venderse.
 */
export const POST = conLecturas([HOJA_PRESUPUESTOS, HOJA_FECHAS, HOJA_RESERVAS, HOJA_CONFIG], async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const accion = String(b.accion ?? '');
    if (!['pedir', 'pausar', 'aprobar', 'rechazar'].includes(accion)) {
      return NextResponse.json({ error: 'Acción desconocida.' }, { status: 400 });
    }
    const quien = await quienEs(req);
    if (accion === 'pedir') {
      const no = await exigir(req, 'presupuestos');
      if (no) return no;
    } else {
      const no = await exigir(req, 'exclusividad');
      if (no) return no;
    }

    const [lista, fechas, reservas, cfg] = await Promise.all([leerPresupuestos(), leerFechas(), leerReservas(), leerConfig()]);
    const p = lista.find((x) => x.id === String(b.id ?? '').trim());
    if (!p) return NextResponse.json({ error: 'Esa cotización ya no está.' }, { status: 404 });
    if (!esFecha(p.fecha)) return NextResponse.json({ error: 'La cotización todavía no tiene día.' }, { status: 400 });
    if (!esExclusivo(p.exclusivo)) {
      return NextResponse.json({ error: 'La cotización no está marcada como exclusiva.' }, { status: 409 });
    }
    const otras = reservas.filter((r) => r.fecha === p.fecha && ocupaLugar(r) && r.id !== p.idReserva);
    const personas = otras.reduce((n, r) => n + (Number(r.personas) || 0), 0);
    const plazo = plazoParaLiberar(p.fecha, hoy(), cfg.exclusivoDias);
    const actual = exclusividadDe(p.exclusividad);
    const { fila: _f, ...resto } = p;
    const folio = folioDe(p);

    if (accion === 'pedir') {
      if (!puedeTocarPresupuesto(quien.rol as Rol, quien.usuario, p.creadoPor)) {
        return NextResponse.json({ error: 'Esa cotización no es tuya.', permiso: true }, { status: 403 });
      }
      if (!otras.length) return NextResponse.json({ error: 'Ese día no tiene otras reservas: no hay nada que liberar.' }, { status: 409 });
      const nota = plazo.enPlazo ? '' : `caso especial: faltan ${plazo.faltan} días`;
      const marca = marcaExclusividad('pedida', quien.usuario, ahoraEnChile(), nota);
      await guardarPresupuesto({ ...resto, exclusividad: marca });
      await anotar({ ...quien, accion: 'Pidió liberar un día para un evento exclusivo',
        detalle: `${folio} · ${p.fecha} · ${otras.length} reservas, ${personas} personas${nota ? ` · ${nota}` : ''}` });
      return NextResponse.json({ ok: true, exclusividad: marca });
    }

    if (accion !== 'pausar' && actual.estado !== 'pedida') {
      return NextResponse.json({ error: 'Ese pedido ya no está esperando: alguien lo resolvió.' }, { status: 409 });
    }

    /** Deja de vender el día: público → privado, guardando cómo estaba. */
    const pausar = async (): Promise<string> => {
      const dia = fechas.find((f) => f.fecha === p.fecha);
      if (!dia || estaCerrado(dia.estado) || esPrivada(dia.estado)) return resto.diaPausado ?? '';
      const { fila: _d, ...sinFila } = dia;
      await guardarFecha({ ...sinFila, estado: ESTADO_DIA.privada });
      await empujarDia(p.fecha);
      return dia.estado || ESTADO_DIA.abierta;
    };

    if (accion === 'pausar') {
      const previo = await pausar();
      await guardarPresupuesto({ ...resto, diaPausado: previo });
      await anotar({ ...quien, accion: 'Dejó de vender un día por un evento exclusivo', detalle: `${folio} · ${p.fecha}` });
      return NextResponse.json({ ok: true });
    }

    const motivo = String(b.motivo ?? '').replace(/\s+/g, ' ').trim();
    if (accion === 'aprobar') {
      if (!plazo.enPlazo && motivo.length < 5) {
        return NextResponse.json({
          error: `Faltan ${plazo.faltan} días (menos de ${cfg.exclusivoDias}): es un caso especial, escribe el motivo.`
        }, { status: 400 });
      }
      const previo = await pausar();
      await guardarPresupuesto({ ...resto, diaPausado: previo,
        exclusividad: marcaExclusividad('aprobada', quien.usuario, ahoraEnChile(), motivo) });
      await anotar({ ...quien, accion: 'Aprobó liberar un día para un evento exclusivo',
        detalle: `${folio} · ${p.fecha} · ${otras.length} reservas por liberar${motivo ? ` · ${motivo}` : ''}` });
      return NextResponse.json({ ok: true });
    }

    // rechazar
    if (motivo.length < 3) return NextResponse.json({ error: 'Escribe el motivo: lo ve el vendedor.' }, { status: 400 });
    if (resto.diaPausado) {
      const dia = fechas.find((f) => f.fecha === p.fecha);
      if (dia && esPrivada(dia.estado) && !estaCerrado(dia.estado)) {
        const { fila: _d, ...sinFila } = dia;
        await guardarFecha({ ...sinFila, estado: resto.diaPausado });
        await empujarDia(p.fecha);
      }
    }
    await guardarPresupuesto({ ...resto, diaPausado: '',
      exclusividad: marcaExclusividad('rechazada', quien.usuario, ahoraEnChile(), motivo) });
    await anotar({ ...quien, accion: 'Rechazó liberar un día para un evento exclusivo', detalle: `${folio} · ${p.fecha} · ${motivo}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

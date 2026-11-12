import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_RESERVAS, HOJA_FECHAS } from '@/lib/columnas';
import { HOJA_CONFIG } from '@/lib/config';
import { ocupacionDe } from '@/lib/ocupacion';
import { esFecha } from '@/lib/fechas';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PRESUPUESTOS, folioDe } from '@/lib/presupuestos';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { empujarDia } from '@/lib/crm-escribir';
import { anotar } from '@/lib/datos';
import { leerPresupuestos } from '@/lib/datos';
import { leerReservas, crearReserva, leerMenus, abrirElDiaSiHaceFalta, reservasDeCotizaciones,
         leerFechas, leerConfig } from '@/lib/datos';
import { comoIngresar } from '@/lib/fudo';
import { ASISTENCIA, ESTADO_PAGO } from '@/lib/columnas';
import { telefonoNormal, correoNormal } from '@/lib/contacto';
import { guardaDelDia } from '@/lib/guardaCierre';
import { firmaDe } from '@/lib/cambios';
import { yaAbrio } from '@/lib/cierres';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';   // nunca cachear: son datos vivos

export const GET = conLecturas([HOJA_RESERVAS, HOJA_MENUS, HOJA_PRESUPUESTOS, HOJA_FECHAS, HOJA_CONFIG], async function GET(req: Request) {
  const no = await exigirVer(req, 'ver');
  if (no) return no;
  try {
    // Los menus viajan junto a las reservas: las dos vistas que leen esto
    // los necesitan para agrupar, y asi no hay una peticion mas.
    const [reservas, menus, deCot, presupuestos] = await Promise.all([
      leerReservas(), leerMenus(), reservasDeCotizaciones().catch(() => new Map<string, string>()),
      leerPresupuestos().catch(() => [])
    ]);
    // **Quién vendió cada reserva que viene de una cotización** (2026-11-12,
    // lo pidió el cliente): el encargado lo ve en la lista del día para saber
    // con quién hablar. Sale de la misma tanda de lecturas.
    const vendedorDe: Record<string, string> = {};
    for (const p of presupuestos) if (p.idReserva) vendedorDe[p.idReserva] = p.creadoPor;
    const folioDeReserva: Record<string, string> = {};
    for (const p of presupuestos) if (p.idReserva) folioDeReserva[p.idReserva] = folioDe(p);
    // **Cómo ingresarla en Fudo**, armado acá (2026-11-11): la misma
    // instrucción en la página del día, en /turnos y en la recepción.
    // **Con `?dia=AAAA-MM-DD`, el cupo de ese día** (2026-11-12): lo pide la
    // página del día para el bloque de sobrecupo. Viene en la misma tanda de
    // lecturas, así que no cuesta una consulta más a Google.
    const pedido = new URL(req.url).searchParams.get('dia') ?? '';
    let dia = null;
    let capacidadMaxima: number | undefined;
    // Los días van en la misma tanda de lecturas: sirven para la firma
    // (ver `lib/cambios.ts`) sin costar una consulta más.
    const fechas = await leerFechas();
    let apertura = '';
    let abierto = false;
    let descuentos: number[] = [];
    if (esFecha(pedido)) {
      const cfg = await leerConfig();
      // **Desde cuándo se rectifica** (2026-11-12): la hora de apertura del
      // día y si ya llegó, con la hora de Chile del servidor.
      apertura = fechas.find((x) => x.fecha === pedido)?.apertura || cfg.horaApertura;
      abierto = yaAbrio(pedido, apertura, ahoraEnChile());
      descuentos = cfg.descuentos;
      const f = fechas.find((x) => x.fecha === pedido);
      if (f) {
        const o = ocupacionDe(reservas, f, cfg.cortes);
        dia = { fecha: pedido, capacidad: o.capacidad, tomadas: o.tomadas, sobrecupo: o.sobrecupo,
                quedanPagando: o.quedanPagando };
      }
      capacidadMaxima = cfg.capacidadMaxima;
    }
    return NextResponse.json({
      reservas: reservas.map((r) => ({ ...r, ingreso: comoIngresar(r, menus, deCot.has(r.id)) })),
      menus, dia, capacidadMaxima, firma: firmaDe(reservas, fechas), apertura, abierto, descuentos,
      // Qué reservas vienen de una cotización: esas no se sueltan acá, se
      // cancelan desde su cotización.
      deCotizacion: Object.fromEntries(deCot),
      vendedorDe, folioDeReserva
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const b = await req.json();
    if (!b.fecha || !b.nombre) {
      return NextResponse.json(
        { error: 'La fecha y el nombre son obligatorios.' }, { status: 400 });
    }
    if (!(Number(b.personas) > 0)) {
      return NextResponse.json(
        { error: 'Una reserva sin personas no es una reserva.' }, { status: 400 });
    }
    // Anotar una reserva en un día ya cerrado también es corregirlo.
    const guarda = await guardaDelDia(req, [String(b.fecha)], b.correccion);
    if ('error' in guarda) return guarda.error;

    // **Quién la anota se resuelve antes de escribirla**, no después: es un
    // campo de la fila, no solo una línea de bitácora. Ver `COL_RESERVAS`.
    const quien = await quienEs(req);

    const id = await crearReserva({
      fecha: b.fecha, nombre: b.nombre, email: correoNormal(b.email),
      // Se guarda con la misma forma que las de Shopify: una reserva
      // anotada a mano y una comprada tienen que ser indistinguibles para
      // lo que venga después. Ver `contacto.ts`.
      telefono: telefonoNormal(b.telefono), menu: b.menu ?? '', personas: Number(b.personas),
      // El monto viene del formulario, calculado con los precios de /menus y
      // corregible a mano. Antes esta línea era un `null` fijo, de cuando el
      // monto no se pedía: con eso el precio se perdía al crear y solo se
      // guardaba al editar. Vacío sigue siendo válido — es lo que pasa si
      // nadie puso precios todavía.
      monto: b.monto == null || b.monto === '' ? null : Number(b.monto),
      // **La modalidad no se recibe del navegador**: la escribe el
      // sincronizador de Shopify y nadie más. Una reserva anotada a mano
      // nace sin ella, que es lo que de verdad pasó.
      tipoPago: '', estadoPago: b.estadoPago ?? '',
      notaPago: String(b.notaPago ?? '').trim(),
      // Cuánto abonó, solo si quedó *Abonada* (2026-11-11).
      abonado: b.estadoPago === ESTADO_PAGO.abonado && Number(b.abonado) > 0
        ? Math.round(Number(b.abonado)) : null,
      // **De qué ganado del socio sale esta reserva**, cuando sale de uno.
      // Al revés que `tipoPago`, este campo SÍ se acepta del navegador: no
      // es una opinión sobre la reserva, es de dónde viene — y acá no se
      // puede usar para mentir, porque la misma llamada crea la reserva que
      // dice estar anotando. (El `ID Reserva` de un presupuesto no se acepta
      // justamente porque ahí sí se podría apagar el conteo de un día sin
      // que existiera ninguna reserva.)
      eventoCRM: String(b.eventoCRM ?? '').trim(),
      // Sin marcar: a una reserva que se acaba de crear todavía no se le
      // puede saber si la persona apareció.
      asistencia: ASISTENCIA.sinMarcar,
      // **El dueño sale de la sesión y NO del cuerpo**, igual que la
      // modalidad. Si se aceptara del navegador, un vendedor podría
      // adjudicarse la reserva de otro — y con eso, borrársela.
      anotadaPor: quien.usuario
    });
    await abrirElDiaSiHaceFalta(b.fecha);
    // Un día abierto sin reservas no se le manda al socio; con esta pasa a
    // tener algo que informar. Va después de abrir el día, que es lo que
    // decide el estado que se publica.
    await empujarDia(b.fecha);

    await anotar({ ...quien,
      accion: guarda.motivo ? 'Anotó una reserva en un día cerrado' : 'Anotó una reserva',
      detalle: `${b.nombre} · ${b.fecha} · ${b.personas} personas · ${b.menu ?? 'sin menú'}` +
               (guarda.motivo ? ` · motivo: ${guarda.motivo}` : '') });

    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { empujarDia } from '@/lib/crm-escribir';
import { anotar } from '@/lib/datos';
import { leerReservas, crearReserva, leerMenus, leerFechas, leerConfig,
         guardarFecha } from '@/lib/datos';
import { diaParaReservaManual } from '@/lib/dias';
import { ASISTENCIA } from '@/lib/columnas';
import { telefonoNormal, correoNormal } from '@/lib/contacto';
import { guardaDelDia } from '@/lib/guardaCierre';

export const dynamic = 'force-dynamic';   // nunca cachear: son datos vivos

export async function GET(req: Request) {
  const no = await exigir(req, 'ver');
  if (no) return no;
  try {
    // Los menus viajan junto a las reservas: las dos vistas que leen esto
    // los necesitan para agrupar, y asi no hay una peticion mas.
    const [reservas, menus] = await Promise.all([leerReservas(), leerMenus()]);
    return NextResponse.json({ reservas, menus });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
      asistencia: ASISTENCIA.sinMarcar
    });
    await abrirElDiaSiHaceFalta(b.fecha);
    // Un día abierto sin reservas no se le manda al socio; con esta pasa a
    // tener algo que informar. Va después de abrir el día, que es lo que
    // decide el estado que se publica.
    await empujarDia(b.fecha);

    const quien = await quienEs(req);
    await anotar({ ...quien,
      accion: guarda.motivo ? 'Anotó una reserva en un día cerrado' : 'Anotó una reserva',
      detalle: `${b.nombre} · ${b.fecha} · ${b.personas} personas · ${b.menu ?? 'sin menú'}` +
               (guarda.motivo ? ` · motivo: ${guarda.motivo}` : '') });

    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Deja el día usable después de anotarle una reserva a mano.
 *
 * **Si falla, la reserva ya está guardada y no se pierde.** El día se puede
 * abrir después desde el calendario; perder la reserva por esto sería
 * cambiar un problema chico por uno grande.
 */
async function abrirElDiaSiHaceFalta(fecha: string) {
  try {
    const [fechas, cfg] = await Promise.all([leerFechas(), leerConfig()]);
    const actual = fechas.find((f) => f.fecha === fecha);
    const nuevo = diaParaReservaManual(actual, fecha, cfg);
    if (nuevo) await guardarFecha(nuevo);
  } catch (e) {
    console.error('[reservas] abrir el dia', fecha, e);
  }
}

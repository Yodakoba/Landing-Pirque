import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { ESTADO_PAGO } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { puedeTocarReserva, puede, type Rol } from '@/lib/auth';
import { editarReserva, borrarReserva, anotar, leerReservas,
         reservasDeCotizaciones, leerFechas, leerConfig } from '@/lib/datos';
import { folioDe } from '@/lib/presupuestos';
import { empujarDias } from '@/lib/crm-escribir';
import { guardaDelDia } from '@/lib/guardaCierre';
import { yaLlego, yaAbrio } from '@/lib/cierres';
import { ahoraEnChile } from '@/lib/bitacora';
import { hoy } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Deja pasar solo si esta cuenta puede tocar **esta** reserva.
 *
 * El permiso `reservas` dice que puede editar y borrar; cuáles es otra
 * pregunta, y para un vendedor la respuesta es "las suyas". Ver
 * `puedeTocarReserva()`.
 *
 * **Se comprueba acá y no en la pantalla**: esconderle el botón es la cara
 * visible, pero una llamada directa a la API tiene que obedecer lo mismo.
 *
 * Una fila que no existe **no se delata**: devuelve el mismo 404 que
 * devolvería de todas formas, en vez de "esa no es tuya", que confirmaría
 * que existe.
 */
async function duenaDeLaReserva(req: Request, antes: { anotadaPor: string } | undefined) {
  if (!antes) {
    return NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 });
  }
  const quien = await quienEs(req);
  if (puedeTocarReserva(quien.rol as Rol, quien.usuario, antes.anotadaPor)) return null;
  // **Dice quién la anotó cuando lo hay**, que es lo que alguien necesita
  // para ir a pedírselo. Una de Shopify, o una de antes de que existiera la
  // columna, no la anotó nadie: decir "otra persona" ahí mandaría a buscar
  // a alguien que no existe.
  return NextResponse.json(
    {
      error: antes.anotadaPor
        ? `Esa reserva la anotó ${antes.anotadaPor}, así que no es tuya para cambiarla.`
        : 'Esa reserva no la anotaste tú, así que no es tuya para cambiarla.',
      permiso: true
    },
    { status: 403 }
  );
}

// La fila de la planilla es el identificador para editar: el ID Orden puede
// venir vacío en pedidos viejos, la fila nunca.
/**
 * **Lo que se cambia en la entrada** (2026-11-11): si vino, cuántos
 * llegaron y el aviso al jefe de turno. Es todo lo que puede tocar la
 * anfitriona, con el permiso `asistencia`; cualquier otro campo pide
 * `reservas`, igual que siempre.
 */
const DE_LA_ENTRADA = new Set(['asistencia', 'llegaron', 'avisoRecepcion']);

export const PATCH = conLecturas([], async function PATCH(req: Request, { params }: { params: { fila: string } }) {
  const cuerpo = await req.json().catch(() => ({}));
  const soloEntrada = Object.keys(cuerpo).length > 0
    && Object.keys(cuerpo).every((k) => DE_LA_ENTRADA.has(k));
  const quien0 = await quienEs(req);
  const conAsistencia = soloEntrada && puede(quien0.rol as Rol, 'asistencia');
  const no = await exigir(req, conAsistencia ? 'asistencia' : 'reservas');
  if (no) {
    // La anfitriona que intenta algo más recibe qué hacer, no solo un no.
    if (puede(quien0.rol as Rol, 'asistencia') && !puede(quien0.rol as Rol, 'reservas')) {
      return NextResponse.json({
        error: 'Eso no lo puedes cambiar tú: avísale al jefe de turno.', permiso: true
      }, { status: 403 });
    }
    return no;
  }
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    // **La modalidad no se acepta del navegador**, igual que al crear: sale
    // del `variant_title` del pedido y la escribe el sincronizador. Como la
    // edición es parcial, dejarla fuera conserva la que ya tenga la fila.
    // Se comprueba acá y no solo en el formulario porque una llamada directa
    // a la API tiene que obedecer la misma regla que un clic.
    //
    // `correccion` tampoco es un campo de la reserva: es el motivo para
    // tocar una de un día cerrado, y se saca antes de escribir.
    // `anotadaPor` sale de la lista igual que `tipoPago`: quién anotó una
    // reserva es un hecho de cuando se anotó, no algo que se edite después.
    const { tipoPago, id, creada, fila: _f, correccion, anotadaPor,
            ...cambios } = cuerpo;
    if (cambios.llegaron !== undefined) {
      const n = Number(cambios.llegaron);
      cambios.llegaron = cambios.llegaron === null || cambios.llegaron === '' || !Number.isFinite(n)
        ? null : Math.max(0, Math.round(n));
    }
    if (cambios.avisoRecepcion !== undefined) {
      cambios.avisoRecepcion = String(cambios.avisoRecepcion ?? '').trim().slice(0, 300);
    }
    // **Se lee ANTES de escribir, y sirve para dos cosas**: la guarda del día
    // cerrado necesita saber en qué día está la reserva, y el empujón al CRM
    // necesita el día del que sale —una edición puede moverla de fecha, y
    // entonces el día que la pierde también cambia para el socio—.
    const antes = (await leerReservas()).find((r) => r.fila === fila);
    // Cuánto abonó: un número, y solo si queda *Abonada*; cualquier otro
    // estado lo vacía, para que no quede un abono viejo colgando.
    if (cambios.abonado !== undefined || cambios.estadoPago !== undefined) {
      const abonada = (cambios.estadoPago ?? antes?.estadoPago) === ESTADO_PAGO.abonado;
      const n = Number(cambios.abonado);
      cambios.abonado = abonada && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
    }
    // **Y sirve para una tercera cosa desde el 2026-11-05**: saber de quién
    // es, porque un vendedor solo toca las suyas.
    // La anfitriona marca la entrada de cualquier reserva: no es dueña de
    // ninguna y no las edita.
    const ajena = conAsistencia ? (antes ? null
      : NextResponse.json({ error: 'Esa reserva ya no está.' }, { status: 404 }))
      : await duenaDeLaReserva(req, antes);
    if (ajena) return ajena;
    // **Una reserva que nació de una cotización se edita desde la
    // cotización** (2026-11-10): la escribe el sistema, y una edición acá
    // se perdería la próxima vez que alguien toque la cotización. Lo que sí
    // se cambia acá es lo del día: si vino, cómo va el pago y su nota.
    const deCotizacion = antes ? (await reservasDeCotizaciones()).get(antes.id) : undefined;
    if (deCotizacion) {
      const DEL_DIA = new Set(['asistencia', 'estadoPago', 'notaPago', 'abonado', 'llegaron', 'avisoRecepcion']);
      const ajenos = Object.keys(cambios).filter((k) => !DEL_DIA.has(k));
      if (ajenos.length) {
        return NextResponse.json({
          error: `Esta reserva viene de la cotización N° ${folioDe({ id: deCotizacion })}: `
               + 'la fecha, los menús, las personas y el monto se cambian ahí.'
        }, { status: 409 });
      }
    }
    // **Una reserva de un día cerrado solo se corrige** (2026-11-03): mirando
    // el día donde está y, si se la mueve, el día adonde va.
    const guarda = await guardaDelDia(
      req, [antes?.fecha ?? '', typeof cambios.fecha === 'string' ? cambios.fecha : ''],
      correccion);
    // La guarda va **antes** de escribir: es lo que puede rechazar la
    // edición. El empujón al socio va después, cuando ya es un hecho.
    if ('error' in guarda) return guarda.error;
    // **Quién vino se marca desde el mismo día** (2026-11-05). Acá se
    // rechaza en vez de descartarse, porque marcar es lo único que pide
    // esta llamada: descartarlo callado se vería como que se guardó.
    const diaDeLaReserva = typeof cambios.fecha === 'string' ? cambios.fecha : antes?.fecha ?? '';
    if (String(cambios.asistencia ?? '').trim() && diaDeLaReserva
        && !yaLlego(diaDeLaReserva, hoy())) {
      return NextResponse.json(
        { error: 'Ese día todavía no llega: quién vino se marca desde el mismo día.' },
        { status: 400 });
    }
    // **Lo de la entrada, desde la hora de apertura** (2026-11-11, lo pidió
    // el cliente): ni la anfitriona ni el jefe de turno anotan quién llegó,
    // cuántos ni avisos antes de que el día abra (`yaAbrio()`).
    const deEntrada = ['asistencia', 'llegaron', 'avisoRecepcion'].some((k) => cambios[k] !== undefined);
    if (deEntrada && diaDeLaReserva) {
      const [fechas, cfg] = await Promise.all([leerFechas(), leerConfig()]);
      const apertura = fechas.find((f) => f.fecha === diaDeLaReserva)?.apertura || cfg.horaApertura;
      if (!yaAbrio(diaDeLaReserva, apertura, ahoraEnChile())) {
        return NextResponse.json({
          error: `La recepción de ese día se abre ${diaDeLaReserva === hoy() ? `a las ${apertura}` : 'el mismo día, a la hora de apertura'}.`
        }, { status: 400 });
      }
      // La anfitriona solo trabaja el día de hoy: lo de otros días es del jefe.
      if (conAsistencia && !puede(quien0.rol as Rol, 'reservas') && diaDeLaReserva !== hoy()) {
        return NextResponse.json({
          error: 'Solo se anota la recepción de hoy. Para otro día, avísale al jefe de turno.', permiso: true
        }, { status: 403 });
      }
    }
    await editarReserva(fila, cambios);
    // Los dos días, el de antes y el de después. Si no se movió es el mismo y
    // `empujarDias()` lo manda una sola vez.
    await empujarDias([antes?.fecha ?? '', cambios.fecha ?? antes?.fecha ?? '']);
    const quien = await quienEs(req);
    // Qué campos se tocaron, no sus valores: la bitácora es un rastro para
    // poder preguntar, no una copia de la planilla. Ver bitacora.ts.
    await anotar({ ...quien,
      accion: guarda.motivo ? 'Corrigió una reserva de un día cerrado' : 'Editó una reserva',
      detalle: `fila ${fila} · ${Object.keys(cambios).join(', ')}` +
               (guarda.motivo ? ` · motivo: ${guarda.motivo}` : '') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

export const DELETE = conLecturas([], async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    // Se lee ANTES de borrarla: después no queda de dónde sacar el nombre,
    // y "se borró la fila 7" no le sirve a nadie dentro de un mes.
    const antes = (await leerReservas()).find((r) => r.fila === fila);
    const ajena = await duenaDeLaReserva(req, antes);
    if (ajena) return ajena;
    // Una reserva de una cotización no se borra: su cotización la volvería
    // a escribir, y quedaría ganada sin reserva. Si el cliente cancela, se
    // marca cancelada, que libera el cupo y deja el rastro.
    const deCotizacion = antes ? (await reservasDeCotizaciones()).get(antes.id) : undefined;
    if (deCotizacion) {
      return NextResponse.json({
        error: `Esta reserva viene de la cotización N° ${folioDe({ id: deCotizacion })}, `
             + 'así que no se borra. Si el cliente cancela, márcala como cancelada: libera el cupo.'
      }, { status: 409 });
    }
    // El cuerpo es opcional en un DELETE: solo trae algo cuando es una
    // corrección de un día cerrado.
    const cuerpo = await req.json().catch(() => ({}));
    const guarda = await guardaDelDia(req, [antes?.fecha ?? ''], cuerpo?.correccion);
    if ('error' in guarda) return guarda.error;
    await borrarReserva(fila);
    // Borrar la única reserva de un día abierto lo deja sin nada que
    // informar, y entonces hay que sacarlo del calendario del socio. Eso lo
    // decide `empujarDias()`; acá solo se le dice qué día mirar.
    await empujarDias([antes?.fecha ?? '']);
    const quien = await quienEs(req);
    await anotar({ ...quien,
      accion: guarda.motivo ? 'Borró una reserva de un día cerrado' : 'Borró una reserva',
      detalle: (antes ? `${antes.nombre} · ${antes.fecha} · ${antes.personas} personas`
                      : `fila ${fila}`) +
               (guarda.motivo ? ` · motivo: ${guarda.motivo}` : '') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

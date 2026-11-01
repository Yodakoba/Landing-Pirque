import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerPresupuestos, leerLineasPresupuesto, guardarPresupuesto, guardarLineas,
  borrarPresupuesto, leerMenus, leerConfig, anotar
} from '@/lib/datos';
import {
  nuevoId, validoHastaDe, ESTADO_PRESUPUESTO, aEntero, folioDe,
  type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import { nuevoToken } from '@/lib/equipo';
import { telefonoNormal, correoNormal } from '@/lib/contacto';
import { hoy, esFecha } from '@/lib/fechas';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * Los presupuestos, sus líneas y lo que hace falta para armar uno nuevo.
 *
 * Van juntos en una sola respuesta a propósito: la pantalla no sirve sin
 * los tres —la lista, los menús para proponer precios, y la vigencia para
 * calcular hasta cuándo vale— y pedirlos por separado sería dibujar tres
 * veces mientras llegan.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const [presupuestos, lineas, menus, cfg] = await Promise.all([
      leerPresupuestos(), leerLineasPresupuesto(), leerMenus(), leerConfig()
    ]);
    return NextResponse.json({
      presupuestos, lineas, menus,
      vigencia: cfg.vigenciaPresupuesto,
      hoy: hoy()
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Lo que llega del navegador, limpiado. El servidor no confía en el cliente. */
function lineasDelCuerpo(crudo: unknown, id: string): Omit<LineaPresupuesto, 'fila'>[] {
  if (!Array.isArray(crudo)) return [];
  return crudo.map((l) => ({
    presupuesto: id,
    concepto: String((l as Record<string, unknown>)?.concepto ?? '').trim(),
    cantidad: aEntero((l as Record<string, unknown>)?.cantidad),
    precio: aEntero((l as Record<string, unknown>)?.precio),
    personas: aEntero((l as Record<string, unknown>)?.personas)
  }));
}

/**
 * Crea un presupuesto.
 *
 * **El token se crea acá y no cuando se manda**, y esa es la diferencia con
 * la planilla semanal: ahí el link abre datos del equipo y por eso existir
 * tiene que ser una decisión. Un presupuesto, en cambio, **es** un
 * documento para mandar — nace para eso, y su link solo muestra lo que se
 * le va a cotizar a esa persona. Hacerlo en dos pasos sería pedir un clic
 * para habilitar lo único que esta pantalla hace.
 *
 * **La fecha de vencimiento se calcula en el servidor**, desde la vigencia
 * de la planilla. Aceptarla del navegador dejaría mandar un presupuesto que
 * dice valer un año porque alguien editó la petición.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = await req.json();
    const fecha = String(cuerpo?.fecha ?? '').slice(0, 10);
    if (!esFecha(fecha)) {
      return NextResponse.json({ error: 'Falta la fecha del evento.' }, { status: 400 });
    }
    const cliente = String(cuerpo?.cliente ?? '').trim();
    if (!cliente) {
      return NextResponse.json({ error: 'Falta el nombre del cliente.' }, { status: 400 });
    }

    const cfg = await leerConfig();
    const quien = await quienEs(req);
    const id = nuevoId();
    const p: Omit<Presupuesto, 'fila'> = {
      id,
      fecha,
      cliente,
      email: correoNormal(cuerpo?.email),
      telefono: telefonoNormal(cuerpo?.telefono),
      estado: ESTADO_PRESUPUESTO.borrador,
      validoHasta: validoHastaDe(hoy(), cfg.vigenciaPresupuesto),
      token: nuevoToken(),
      notas: String(cuerpo?.notas ?? '').trim(),
      // Nace sin reserva: es lo que lo mantiene contando como posible hasta
      // que de verdad se convierta. Ver `cuentaComoPosible()`.
      idReserva: '',
      creadoPor: quien.usuario,
      creado: ahoraEnChile()
    };
    await guardarPresupuesto(p);
    await guardarLineas(id, lineasDelCuerpo(cuerpo?.lineas, id));
    await anotar({ ...quien, accion: 'Creó un presupuesto',
      detalle: `${folioDe(p)} · ${cliente} · ${fecha}` });
    return NextResponse.json({ presupuesto: { ...p, fila: -1 } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Edita un presupuesto que ya existe.
 *
 * **Es parcial de verdad**: lo que no venga en el cuerpo se conserva. Sin
 * eso, una llamada que solo quisiera marcarlo enviado le borraría el
 * teléfono y las notas.
 *
 * **Dos campos no se aceptan nunca del navegador**, y es la misma regla que
 * la modalidad de una reserva:
 *
 * - **`token`**, porque cambiarlo es invalidar el link que el cliente ya
 *   tiene, y eso tiene su propia acción.
 * - **`idReserva`**, porque es lo que decide si este presupuesto todavía
 *   cuenta como gente posible. Dejarlo escribir desde afuera permitiría
 *   apagar o encender el conteo de un día sin que exista ninguna reserva.
 */
export async function PATCH(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const cuerpo = await req.json();
    const id = String(cuerpo?.id ?? '').trim();
    const lista = await leerPresupuestos();
    const previo = lista.find((x) => x.id === id);
    if (!previo) {
      return NextResponse.json({ error: 'Ese presupuesto ya no está.' }, { status: 404 });
    }

    const texto = (k: string, antes: string) =>
      cuerpo?.[k] === undefined ? antes : String(cuerpo[k] ?? '').trim();

    const fecha = cuerpo?.fecha === undefined
      ? previo.fecha
      : String(cuerpo.fecha ?? '').slice(0, 10);
    if (!esFecha(fecha)) {
      return NextResponse.json({ error: 'Esa fecha no se entiende.' }, { status: 400 });
    }

    const p: Omit<Presupuesto, 'fila'> = {
      id: previo.id,
      fecha,
      cliente: texto('cliente', previo.cliente) || previo.cliente,
      email: cuerpo?.email === undefined
        ? previo.email : correoNormal(cuerpo.email),
      telefono: cuerpo?.telefono === undefined
        ? previo.telefono : telefonoNormal(cuerpo.telefono),
      estado: texto('estado', previo.estado),
      // La vigencia se recalcula solo si lo piden explícitamente: al
      // mandarlo. Editar una línea no puede correrle el plazo al cliente.
      validoHasta: cuerpo?.renovarVigencia
        ? validoHastaDe(hoy(), (await leerConfig()).vigenciaPresupuesto)
        : previo.validoHasta,
      token: previo.token,
      notas: texto('notas', previo.notas),
      idReserva: previo.idReserva,
      creadoPor: previo.creadoPor,
      creado: previo.creado
    };
    await guardarPresupuesto(p);
    if (cuerpo?.lineas !== undefined) {
      await guardarLineas(id, lineasDelCuerpo(cuerpo.lineas, id));
    }
    await anotar({ ...(await quienEs(req)), accion: 'Editó un presupuesto',
      detalle: `${folioDe(p)} · ${p.cliente} · ${p.estado || 'Borrador'}` });
    return NextResponse.json({ presupuesto: { ...p, fila: previo.fila } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Borra un presupuesto y sus líneas.
 *
 * **Uno ya convertido en reserva no se borra**, y se comprueba acá y no
 * solo en la pantalla: su `ID Reserva` es el rastro de dónde salió esa
 * reserva, y borrarlo dejaría a la reserva sin explicación. Es la misma
 * regla que "a quien ya trabajó se le desactiva, no se le quita".
 */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'presupuestos');
  if (no) return no;
  try {
    const { id } = await req.json();
    const previo = (await leerPresupuestos()).find((x) => x.id === String(id ?? '').trim());
    if (!previo) return NextResponse.json({ ok: true });
    if (previo.idReserva) {
      return NextResponse.json({
        error: 'Este presupuesto ya se convirtió en reserva, así que no se borra. '
             + 'Si de verdad hay que sacarlo, borra antes la reserva.'
      }, { status: 409 });
    }
    await borrarPresupuesto(previo.id);
    await anotar({ ...(await quienEs(req)), accion: 'Borró un presupuesto',
      detalle: `${folioDe(previo)} · ${previo.cliente}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

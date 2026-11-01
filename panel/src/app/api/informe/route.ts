import { NextResponse } from 'next/server';
import { leerTurnos, leerTrabajadores, leerExtras, leerColaboradores,
         leerPagosEquipo, anotarPagoEquipo, borrarPagoEquipo, anotar } from '@/lib/datos';
import { exigir, quienEs } from '@/lib/permisos';
import { normalizar } from '@/lib/columnas';
import { pagoDelCuerpo } from '@/lib/remuneraciones';
import { puede } from '@/lib/auth';
import { enPesos } from '@/lib/ocupacion';
import type { Banco } from '@/lib/banco';

export const dynamic = 'force-dynamic';

/**
 * Lo que hay que pagar, y nada más, para armar el informe.
 *
 * Existe porque el informe lo lee también **quien hace los pagos**, y esa
 * cuenta no puede llamar a `/api/equipo`: ahí viajan las reservas del
 * calendario, la lista completa de trabajadores y los puestos, que no son
 * asunto suyo. Pedirle a esa persona permiso de "ver" para que pudiera
 * sacar sus cuentas habría sido abrirle el panel entero.
 *
 * **Desde el 2026-10-22 también devuelve las actividades extras**, porque
 * quien paga hace un solo pago a la semana y necesita verlo todo junto. Lo
 * que no se mezcla es el cálculo: el equipo cobra jornadas y recibe propina,
 * un jinete cobra lo acordado y no recibe ninguna.
 *
 * De las fichas salen **solo los datos de la transferencia** —titular, RUT,
 * banco, tipo, número, correo y la nota—, que es lo que falta para poder
 * pagar sin cruzar la planilla con otra lista a mano. Ni teléfonos, ni
 * sueldos de hoy, ni tokens: esta ruta la lee una cuenta que no tiene
 * permiso para ver el equipo.
 *
 * Es una ruta de solo lectura: el informe no escribe nada.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'informe');
  if (no) return no;
  try {
    const [turnos, extras, gente, colaboradores, pagos] = await Promise.all([
      leerTurnos(), leerExtras(), leerTrabajadores(), leerColaboradores(),
      leerPagosEquipo()
    ]);
    const cuentas: Record<string, Banco> = {};
    for (const p of [...gente, ...colaboradores]) {
      cuentas[normalizar(p.nombre)] = p.banco;
    }
    // Si esta cuenta puede registrar pagos. Se resuelve en el servidor y
    // no en la pantalla: el botón se esconde por comodidad, pero lo que de
    // verdad cierra la puerta es el `exigir('pagar')` del POST.
    return NextResponse.json({
      turnos, extras, cuentas, pagos,
      puedePagar: puede((await quienEs(req)).rol, 'pagar')
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Anota que a alguien ya se le pagó, entero o en parte.
 *
 * **Es del permiso `pagar`, no del de leer el informe.** El encargado ve el
 * informe pero no registra pagos: mirar cuánto se le debe a alguien y
 * declarar que esa plata salió son dos cosas distintas, y la segunda es un
 * hecho con nombre y hora, como cerrar un día.
 *
 * **El pago se agrega, nunca se edita el anterior.** Un pago parcial no es
 * un estado intermedio que haya que mantener: es un pago más chico, y pagar
 * el resto después es otra fila. La suma cierra sola.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const limpio = pagoDelCuerpo(await req.json());
    if (!limpio) {
      return NextResponse.json(
        { error: 'Falta el trabajador, el periodo o el monto.' }, { status: 400 }
      );
    }
    const quien = await quienEs(req);
    const pago = await anotarPagoEquipo(limpio, quien.usuario);
    await anotar({ ...quien, accion: 'Registró un pago',
      detalle: `${limpio.quien} · ${enPesos(limpio.monto)} · ${limpio.desde} a ${limpio.hasta}` });
    return NextResponse.json({ pago });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Borra un pago anotado por error. Queda en la bitácora. */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const { id } = await req.json();
    const borrado = await borrarPagoEquipo(String(id ?? ''));
    if (!borrado) {
      return NextResponse.json({ error: 'Ese pago ya no está.' }, { status: 404 });
    }
    await anotar({ ...(await quienEs(req)), accion: 'Borró un pago',
      detalle: String(id ?? '') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

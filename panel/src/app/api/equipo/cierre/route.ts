import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { cerrarDia, reabrirDia, leerTurnos, leerExtras, anotar } from '@/lib/datos';
import { sePuedeCerrar } from '@/lib/cierres';
import { esFecha } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

/**
 * Cerrar un día, o reabrirlo.
 *
 * **Cerrar es una declaración, no un cálculo**: alguien revisó el día y
 * dice que está todo anotado. Por eso queda con su nombre y su hora.
 *
 * Lo único que el servidor exige para dejar cerrar es que **no falte nadie
 * por marcar**: un turno sin marcar no suma, así que cerrar con turnos a
 * medias sería cerrar con el total mal. La propina y las actividades
 * extras se avisan en la pantalla pero no bloquean — un día sin propina
 * existe, y una actividad sin confirmar es plata de otro bolsillo.
 *
 * Y se comprueba acá y no solo en la interfaz, porque una llamada directa
 * a la API tiene que obedecer la misma regla.
 */
export async function PUT(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;
  try {
    const { fecha, cerrar } = await req.json();
    if (!esFecha(fecha)) {
      return NextResponse.json(
        { error: 'Falta la fecha, o no tiene el formato AAAA-MM-DD.' }, { status: 400 }
      );
    }

    const quien = await quienEs(req);
    if (cerrar === false) {
      await reabrirDia(fecha);
      await anotar({ ...quien, accion: 'Reabrió un día', detalle: fecha });
      return NextResponse.json({ cerrado: false });
    }

    const [turnos, extras] = await Promise.all([leerTurnos(), leerExtras()]);
    if (!sePuedeCerrar(turnos, extras, fecha)) {
      return NextResponse.json(
        { error: 'Para cerrar el día no puede quedar nadie sin marcar si vino o no.' },
        { status: 400 }
      );
    }

    await cerrarDia(fecha, quien.usuario);
    await anotar({ ...quien, accion: 'Cerró un día', detalle: fecha });
    return NextResponse.json({ cerrado: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

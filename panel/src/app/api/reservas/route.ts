import { NextResponse } from 'next/server';
import { leerReservas, crearReserva, leerMenus } from '@/lib/datos';
import { ASISTENCIA } from '@/lib/columnas';

export const dynamic = 'force-dynamic';   // nunca cachear: son datos vivos

export async function GET() {
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
    const id = await crearReserva({
      fecha: b.fecha, nombre: b.nombre, email: b.email ?? '',
      telefono: b.telefono ?? '', menu: b.menu ?? '', personas: Number(b.personas),
      // El monto viene del formulario, calculado con los precios de /menus y
      // corregible a mano. Antes esta línea era un `null` fijo, de cuando el
      // monto no se pedía: con eso el precio se perdía al crear y solo se
      // guardaba al editar. Vacío sigue siendo válido — es lo que pasa si
      // nadie puso precios todavía.
      monto: b.monto == null || b.monto === '' ? null : Number(b.monto),
      tipoPago: b.tipoPago ?? '', estadoPago: b.estadoPago ?? '',
      // Sin marcar: a una reserva que se acaba de crear todavía no se le
      // puede saber si la persona apareció.
      asistencia: ASISTENCIA.sinMarcar
    });
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { editarReserva, borrarReserva, anotar, leerReservas } from '@/lib/datos';
import { empujarDias } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

// La fila de la planilla es el identificador para editar: el ID Orden puede
// venir vacío en pedidos viejos, la fila nunca.
export async function PATCH(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    // **La modalidad no se acepta del navegador**, igual que al crear: sale
    // del `variant_title` del pedido y la escribe el sincronizador. Como la
    // edición es parcial, dejarla fuera conserva la que ya tenga la fila.
    // Se comprueba acá y no solo en el formulario porque una llamada directa
    // a la API tiene que obedecer la misma regla que un clic.
    const { tipoPago, id, creada, fila: _f, ...cambios } = await req.json();
    // Se lee ANTES para saber de qué día salió: una edición puede moverla de
    // fecha, y entonces el día que la pierde también cambia para el socio.
    const antes = (await leerReservas()).find((r) => r.fila === fila);
    await editarReserva(fila, cambios);
    // Los dos días, el de antes y el de después. Si no se movió es el mismo y
    // `empujarDias()` lo manda una sola vez.
    await empujarDias([antes?.fecha ?? '', cambios.fecha ?? antes?.fecha ?? '']);
    const quien = await quienEs(req);
    // Qué campos se tocaron, no sus valores: la bitácora es un rastro para
    // poder preguntar, no una copia de la planilla. Ver bitacora.ts.
    await anotar({ ...quien, accion: 'Editó una reserva',
      detalle: `fila ${fila} · ${Object.keys(cambios).join(', ')}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { fila: string } }) {
  const no = await exigir(req, 'reservas');
  if (no) return no;
  try {
    const fila = Number(params.fila);
    if (!(fila > 1)) return NextResponse.json({ error: 'Fila inválida.' }, { status: 400 });
    // Se lee ANTES de borrarla: después no queda de dónde sacar el nombre,
    // y "se borró la fila 7" no le sirve a nadie dentro de un mes.
    const antes = (await leerReservas()).find((r) => r.fila === fila);
    await borrarReserva(fila);
    // Borrar la única reserva de un día abierto lo deja sin nada que
    // informar, y entonces hay que sacarlo del calendario del socio. Eso lo
    // decide `empujarDias()`; acá solo se le dice qué día mirar.
    await empujarDias([antes?.fecha ?? '']);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Borró una reserva',
      detalle: antes ? `${antes.nombre} · ${antes.fecha} · ${antes.personas} personas`
                     : `fila ${fila}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import { editarReserva, borrarReserva, anotar, leerReservas } from '@/lib/datos';
import { guardaDelDia } from '@/lib/guardaCierre';

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
    //
    // `correccion` tampoco es un campo de la reserva: es el motivo para
    // tocar una de un día cerrado, y se saca antes de escribir.
    const { tipoPago, id, creada, fila: _f, correccion, ...cambios } = await req.json();
    // **Una reserva de un día cerrado solo se corrige** (2026-11-03): mirando
    // el día donde está y, si se la mueve, el día adonde va.
    const antes = (await leerReservas()).find((r) => r.fila === fila);
    const guarda = await guardaDelDia(
      req, [antes?.fecha ?? '', typeof cambios.fecha === 'string' ? cambios.fecha : ''],
      correccion);
    if ('error' in guarda) return guarda.error;
    await editarReserva(fila, cambios);
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
    // El cuerpo es opcional en un DELETE: solo trae algo cuando es una
    // corrección de un día cerrado.
    const cuerpo = await req.json().catch(() => ({}));
    const guarda = await guardaDelDia(req, [antes?.fecha ?? ''], cuerpo?.correccion);
    if ('error' in guarda) return guarda.error;
    await borrarReserva(fila);
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
}

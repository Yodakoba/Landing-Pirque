import { NextResponse } from 'next/server';
import { quienEs } from '@/lib/permisos';
import { ROL } from '@/lib/auth';
import { NOMBRE_ROL } from '@/lib/roles';
import { ahoraEnChile } from '@/lib/bitacora';
import { agregarFilaEnOtraPlanilla } from '@/lib/sheets';
import { limpiarComentario, filaComentario, HOJA_COMENTARIOS } from '@/lib/comentarios';

export const dynamic = 'force-dynamic';

/**
 * Anota un comentario del equipo en la planilla del testeo. Ver
 * `lib/comentarios.ts`.
 *
 * - **Cualquier cuenta con sesión puede comentar**: no es un permiso de la
 *   tabla, es la forma de avisar que algo falla o falta.
 * - **Nombre y rol salen de la sesión**, no del navegador. Un administrador
 *   mirando como otro rol queda anotado con los dos.
 * - **Cuesta una escritura y ninguna lectura** de Google.
 */
export async function POST(req: Request) {
  const quien = await quienEs(req);
  if (quien.rol === ROL.ninguno) {
    return NextResponse.json(
      { error: 'Tu sesión caducó o no estás identificado. Vuelve a entrar.' }, { status: 401 });
  }
  const id = process.env.COMENTARIOS_SHEET_ID?.trim();
  if (!id) {
    return NextResponse.json(
      { error: 'Los comentarios todavía no están conectados a su planilla (falta COMENTARIOS_SHEET_ID).' },
      { status: 503 });
  }

  const limpio = limpiarComentario(await req.json().catch(() => null));
  if ('error' in limpio) return NextResponse.json({ error: limpio.error }, { status: 400 });

  const rol = NOMBRE_ROL[quien.rol] ?? quien.rol;
  const fila = filaComentario(limpio.comentario, {
    nombre: quien.usuario,
    rol: quien.rolReal ? `${rol} (visto por ${NOMBRE_ROL[quien.rolReal] ?? quien.rolReal})` : rol
  }, ahoraEnChile());

  try {
    await agregarFilaEnOtraPlanilla(id, HOJA_COMENTARIOS, fila);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const x = e as { code?: number; status?: number; message?: string };
    const codigo = x?.code ?? x?.status;
    // Lo más probable al estrenarlo: la planilla no está compartida con la
    // cuenta de servicio, o no tiene la pestaña. Se dice así, no como "error".
    const error = codigo === 403 || codigo === 404
      ? 'El panel no puede escribir en la planilla de comentarios: compártela con la cuenta de servicio del panel como editor.'
      : codigo === 400
        ? `La planilla de comentarios no tiene una pestaña llamada "${HOJA_COMENTARIOS}".`
        : (x?.message ?? 'No se pudo guardar el comentario.');
    return NextResponse.json({ error }, { status: 500 });
  }
}

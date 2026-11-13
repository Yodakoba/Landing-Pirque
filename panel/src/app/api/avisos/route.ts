import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerUsuarios, guardarUsuarios } from '@/lib/datos';
import { HOJA_USUARIOS, esAvisoCerrable } from '@/lib/usuarios';
import { quienEs } from '@/lib/permisos';
import { normalizar } from '@/lib/columnas';

/**
 * **Cerrar un aviso para siempre** (2026-11-13, lo pidió el cliente: una ✕
 * *"que realmente funciona… lo he leído y ahora no me lo muestras más"*).
 *
 * Anota la clave en la columna *Avisos leídos* de la cuenta (`Usuarios`), así
 * que el aviso no vuelve en otro navegador ni en el teléfono. Lo puede hacer
 * cualquiera con sesión, y solo sobre **su** cuenta: la de la sesión, también
 * mirando *Ver como* —el que cerró el aviso es la persona, no el rol—.
 *
 * **La cuenta de emergencia del entorno** (`PANEL_USUARIO`) no tiene fila en
 * la planilla: ahí responde `enLaCuenta: false` y el aviso queda cerrado solo
 * en ese navegador. Una clave que no está en `AVISOS_CERRABLES` se rechaza.
 *
 * Lecturas de Google: una, la relectura de `Usuarios` antes de escribir.
 * Ocurre una vez por persona y por aviso.
 */
export const POST = conLecturas([HOJA_USUARIOS], async function POST(req: Request) {
  const quien = await quienEs(req);
  if (!quien.usuario) return NextResponse.json({ error: 'Entra de nuevo al panel.' }, { status: 401 });
  try {
    const { clave } = await req.json().catch(() => ({}));
    if (!esAvisoCerrable(clave)) return NextResponse.json({ error: 'Ese aviso no se puede cerrar.' }, { status: 400 });
    const lista = await leerUsuarios();
    const i = lista.findIndex((u) => normalizar(u.usuario) === normalizar(quien.usuario));
    if (i === -1) return NextResponse.json({ ok: true, enLaCuenta: false });
    if (!lista[i].avisosLeidos.includes(clave)) {
      lista[i] = { ...lista[i], avisosLeidos: [...lista[i].avisosLeidos, clave] };
      await guardarUsuarios(lista);
    }
    return NextResponse.json({ ok: true, enLaCuenta: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

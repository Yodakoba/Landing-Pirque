import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { leerUsuarios, guardarUsuarios } from '@/lib/datos';
import { HOJA_USUARIOS, esAvisoCerrable, cuentaDeSesion, type Usuario } from '@/lib/usuarios';
import { quienEs } from '@/lib/permisos';
import { cookieDe, COOKIE_SESION, leerSesion, resellarConAvisos, secretoDeSesion } from '@/lib/sesion';

/**
 * **Cerrar un aviso fijo para siempre** (2026-11-13, lo pidió el cliente: una
 * ✕ *"que realmente funciona… lo he leído y ahora no me lo muestras más"*).
 *
 * Hace dos cosas, y las dos importan:
 *
 * 1. **Lo anota en la cuenta**: columna *Avisos leídos* de `Usuarios`, en la
 *    fila de quien tiene la sesión —también mirando *Ver como*: el que lo
 *    leyó es la persona, no el rol—. Es lo que hace que no vuelva en otro
 *    navegador ni en el teléfono: al entrar, la sesión trae esa lista.
 * 2. **Vuelve a sellar la cookie** con la lista nueva, para que cada pantalla
 *    lo sepa desde ya sin leer la planilla.
 *
 * La cuenta se busca **por nombre**, que es lo que guarda la sesión
 * (`cuentaDeSesion()`); el primer corte la buscaba por usuario y en
 * producción no la encontraba. **La cuenta de emergencia del entorno**
 * (`PANEL_USUARIO`) no tiene fila: queda solo en su sesión (`enLaCuenta:
 * false`). Una clave que no está en `AVISOS_CERRABLES` se rechaza.
 *
 * Lecturas de Google: una, la relectura de `Usuarios` antes de escribir, una
 * vez por persona y por aviso.
 */
export const POST = conLecturas([HOJA_USUARIOS], async function POST(req: Request) {
  const quien = await quienEs(req);
  if (!quien.usuario) return NextResponse.json({ error: 'Entra de nuevo al panel.' }, { status: 401 });
  try {
    const { clave } = await req.json().catch(() => ({}));
    if (!esAvisoCerrable(clave)) return NextResponse.json({ error: 'Ese aviso no se puede cerrar.' }, { status: 400 });

    // **Si la planilla no responde, la sesión igual lo recuerda**: se sella
    // la cookie de todos modos y la pantalla avisa que no quedó en la cuenta.
    let cuenta: Usuario | undefined;
    let falla = '';
    try {
      const lista = await leerUsuarios();
      cuenta = cuentaDeSesion(lista, quien.usuario);
      if (cuenta && !cuenta.avisosLeidos.includes(clave)) {
        const i = lista.indexOf(cuenta);
        lista[i] = { ...cuenta, avisosLeidos: [...cuenta.avisosLeidos, clave] };
        await guardarUsuarios(lista);
      }
    } catch (e) {
      falla = (e as Error).message || 'No se pudo guardar en la cuenta.';
    }

    const res = NextResponse.json({ ok: true, enLaCuenta: !!cuenta && !falla, ...(falla ? { falla } : {}) });
    const secreto = secretoDeSesion(process.env);
    const token = cookieDe(req.headers.get('cookie'), COOKIE_SESION);
    const sesion = await leerSesion(token, secreto);
    if (sesion) {
      const avisos = [...new Set([...(sesion.avisos ?? []), ...(cuenta?.avisosLeidos ?? []), clave])];
      const nuevo = await resellarConAvisos(token, secreto, avisos);
      if (nuevo) {
        res.cookies.set(COOKIE_SESION, nuevo.token, {
          httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
          path: '/', maxAge: Math.max(60, nuevo.expira - Math.floor(Date.now() / 1000))
        });
      }
    }
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

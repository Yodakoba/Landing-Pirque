import { NextResponse } from 'next/server';
import { anotar } from '@/lib/datos';
import {
  leerSesion, firmarSesion, secretoDeSesion, cookieDe, COOKIE_SESION, ROLES_VER_COMO
} from '@/lib/sesion';

export const dynamic = 'force-dynamic';

/**
 * **Ver el panel como otro rol** (2026-11-12, lo pidió el cliente): el
 * administrador elige *Encargado, Pagos, Vendedor o Anfitrión* y el panel
 * entero pasa a comportarse como el de esa cuenta —el menú, las pantallas y
 * los permisos de cada ruta—, hasta que vuelve a administrador.
 *
 * - **Solo lo puede pedir quien de verdad es administrador**: se mira el rol
 *   real de la sesión firmada, no el que se está mirando. Así, mirando como
 *   vendedor, la única puerta de vuelta sigue abierta.
 * - **No da más permisos, quita**: mirando como otro rol se puede lo que ese
 *   rol puede, nada más. Lo que se haga queda en la bitácora con el nombre
 *   del administrador y *"admin (viendo como vendedor)"*.
 * - **No alarga la sesión**: el token nuevo vence cuando vencía el anterior.
 * - **Una vista dura como máximo una hora** (`DURACION_VER_COMO`, lo corta
 *   `firmarSesion()`). Pasada la hora la cookie vence y hay que entrar de
 *   nuevo, con contraseña. Al volver a administrador antes de la hora se
 *   recupera el vencimiento que tenía la sesión de administrador.
 */
export async function POST(req: Request) {
  const secreto = secretoDeSesion(process.env);
  const sesion = await leerSesion(cookieDe(req.headers.get('cookie'), COOKIE_SESION), secreto);
  if (!sesion) {
    return NextResponse.json({ error: 'Tu sesión caducó. Vuelve a entrar.' }, { status: 401 });
  }
  const real = sesion.rolReal ?? sesion.rol;
  if (real !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede ver el panel como otro rol.', permiso: true },
      { status: 403 });
  }
  const cuerpo = (await req.json().catch(() => ({}))) ?? {};
  const pedido = String(cuerpo.rol ?? '').trim();
  const como = (ROLES_VER_COMO as readonly string[]).includes(pedido) ? pedido : '';
  if (pedido && pedido !== 'admin' && !como) {
    return NextResponse.json({ error: 'Ese rol no existe.' }, { status: 400 });
  }

  const ahora = Math.floor(Date.now() / 1000);
  // Lo que le queda a la sesión de administrador, no a la vista de una hora.
  const queda = Math.max(60, (sesion.expiraReal ?? sesion.expira) - ahora);
  const token = await firmarSesion({ usuario: sesion.usuario, rol: 'admin', como, avisos: sesion.avisos },
    secreto, ahora, queda);
  const vista = (await leerSesion(token, secreto, ahora))?.expira ?? ahora + queda;
  const res = NextResponse.json({ ok: true, rol: como || 'admin' });
  res.cookies.set(COOKIE_SESION, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: vista - ahora
  });
  await anotar({ usuario: sesion.usuario, rol: 'admin',
    accion: como ? `Pasó a ver el panel como ${como}` : 'Volvió a ver el panel como administrador' });
  return res;
}

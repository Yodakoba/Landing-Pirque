/**
 * Entrar y salir del panel.
 *
 * Tres formas de que una credencial sea válida, en este orden:
 *
 *  1. **`PANEL_USUARIO` / `PANEL_CLAVE`** — el administrador de emergencia.
 *     Vive en el entorno, no en la planilla, y por eso funciona aunque la
 *     planilla no responda o alguien borre la última cuenta. **No se quita
 *     nunca**: es la puerta por la que se entra el día que algo salga mal.
 *  2. **`PANEL_ENCARGADO_USUARIO` / `PANEL_ENCARGADO_CLAVE`** — la clave
 *     compartida de encargado, que existía antes de las cuentas. Sigue
 *     funcionando para no romper lo que ya esté configurado, pero **en la
 *     bitácora aparece como "encargado (clave compartida)"**, a propósito:
 *     una línea así no identifica a nadie, y conviene que se note.
 *  3. **Las cuentas de la pestaña `Usuarios`**, con su huella scrypt. Son
 *     las que sirven para rastrear quién hizo qué.
 */
import { NextResponse } from 'next/server';
import { leerUsuarios, anotar } from '@/lib/datos';
import { buscarUsuario, claveCalza, ENCARGADO_COMPARTIDO } from '@/lib/usuarios';
import { iguales, ROL, type Rol } from '@/lib/auth';
import {
  firmarSesion, secretoDeSesion, COOKIE_SESION, DURACION_SESION
} from '@/lib/sesion';
import { quienEs } from '@/lib/permisos';

export const dynamic = 'force-dynamic';

async function identificar(
  usuario: string, clave: string
): Promise<{ usuario: string; rol: Rol } | null> {
  const env = process.env;

  if (env.PANEL_USUARIO && env.PANEL_CLAVE &&
      iguales(usuario, env.PANEL_USUARIO) && iguales(clave, env.PANEL_CLAVE)) {
    return { usuario: env.PANEL_USUARIO, rol: ROL.admin };
  }
  if (env.PANEL_ENCARGADO_USUARIO && env.PANEL_ENCARGADO_CLAVE &&
      iguales(usuario, env.PANEL_ENCARGADO_USUARIO) &&
      iguales(clave, env.PANEL_ENCARGADO_CLAVE)) {
    return { usuario: ENCARGADO_COMPARTIDO, rol: ROL.encargado };
  }

  const cuenta = buscarUsuario(await leerUsuarios(), usuario);
  if (cuenta && claveCalza(clave, cuenta.huella)) {
    // Se anota el NOMBRE de la persona, no su nombre de usuario: la bitácora
    // la va a leer alguien, y "Ana Pérez" se entiende mejor que "aperez".
    return { usuario: cuenta.nombre, rol: cuenta.rol };
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const { usuario, clave } = await req.json();
    const quien = await identificar(String(usuario ?? ''), String(clave ?? ''));

    // **El mismo mensaje para un usuario que no existe y para una clave
    // equivocada.** Distinguirlos le diría a quien prueba cuál de las dos
    // mitades acertó, que es justo la mitad del trabajo.
    if (!quien) {
      return NextResponse.json(
        { error: 'Usuario o contraseña incorrectos.' }, { status: 401 }
      );
    }

    const secreto = secretoDeSesion(process.env);
    if (!secreto) {
      return NextResponse.json(
        { error: 'El panel no tiene con qué firmar la sesión. Falta PANEL_CLAVE.' },
        { status: 503 }
      );
    }

    const token = await firmarSesion(quien, secreto);
    const res = NextResponse.json({ usuario: quien.usuario, rol: quien.rol });
    res.cookies.set(COOKIE_SESION, token, {
      httpOnly: true,                 // el JavaScript de la página no la ve
      sameSite: 'lax',                // no viaja desde otros sitios
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: DURACION_SESION
    });

    await anotar({ ...quien, accion: 'Entró al panel' });
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Salir. Borra la cookie; el token sigue firmado pero ya no lo manda nadie. */
export async function DELETE(req: Request) {
  const { usuario, rol } = await quienEs(req);
  const res = NextResponse.json({ listo: true });
  res.cookies.set(COOKIE_SESION, '', { path: '/', maxAge: 0 });
  if (usuario) await anotar({ usuario, rol, accion: 'Salió del panel' });
  return res;
}

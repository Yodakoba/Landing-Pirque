/**
 * El guardia de cada ruta.
 *
 * **El middleware autentica; esto autoriza.** Son dos preguntas distintas
 * —"¿quién eres?" y "¿puedes hacer esto?"— y las contesta código distinto a
 * propósito: si el permiso se comprobara solo en el middleware, cualquier
 * forma de saltárselo abriría de una vez todas las rutas. Es la forma exacta
 * del CVE-2025-29927, que obligó a subir Next hace unos días.
 *
 * Desde el 2026-10-21 quién es quien llama sale de la **cookie de sesión**,
 * firmada, y no de la cabecera `Authorization`. El principio es el mismo:
 * se verifica la firma acá, en cada ruta, en vez de confiar en algo que
 * haya puesto el middleware — una cabecera la puede mandar cualquiera.
 */
import { NextResponse } from 'next/server';
import { puede, ROL, type Rol, type Accion } from './auth.ts';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from './sesion.ts';
// Se vuelve a exportar porque media app la importa desde acá; vive en
// sesion.ts para que las pruebas puedan cargarla sin arrastrar next/server.
export { cookieDe };

export interface Quien {
  /** El nombre con el que se anota en la bitácora. */
  usuario: string;
  rol: Rol;
}

export const NADIE: Quien = { usuario: '', rol: ROL.ninguno };

/** Quién viene en esta petición. `NADIE` si no hay sesión válida. */
export async function quienEs(req: Request): Promise<Quien> {
  // Sin credenciales configuradas, en DESARROLLO se trabaja como
  // administrador. Es la misma regla que ya tiene el middleware, y por el
  // mismo motivo: levantar el panel en el computador no puede exigir
  // inventarse un usuario. En producción esta rama no existe —el middleware
  // devuelve 503 antes— así que no abre nada.
  if (process.env.NODE_ENV === 'development' && !process.env.PANEL_USUARIO) {
    return { usuario: 'desarrollo', rol: ROL.admin };
  }

  const token = cookieDe(req.headers.get('cookie'), COOKIE_SESION);
  const sesion = await leerSesion(token, secretoDeSesion(process.env));
  if (!sesion) return NADIE;
  return { usuario: sesion.usuario, rol: sesion.rol as Rol };
}

/**
 * Devuelve una respuesta 403 si no puede, o `null` si puede.
 *
 * Se usa así, y el `if` es lo primero de cada handler:
 *
 *     const no = await exigir(req, 'configurar');
 *     if (no) return no;
 */
export async function exigir(req: Request, accion: Accion): Promise<NextResponse | null> {
  const { rol } = await quienEs(req);
  if (puede(rol, accion)) return null;
  return NextResponse.json(
    {
      error: rol === ROL.ninguno
        ? 'Tu sesión caducó o no estás identificado. Vuelve a entrar.'
        : `Tu cuenta (${rol}) no puede hacer esto. Pídeselo al administrador.`,
      // Para que la pantalla pueda decir "no tienes permiso" en vez de "no
      // se pudo leer la planilla", que manda a buscar el problema donde no
      // está.
      permiso: true
    },
    { status: 403 }
  );
}

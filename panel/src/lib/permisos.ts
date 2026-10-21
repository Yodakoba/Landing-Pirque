/**
 * El guardia de cada ruta.
 *
 * **El middleware autentica; esto autoriza.** Son dos preguntas distintas
 * —"¿quién eres?" y "¿puedes hacer esto?"— y las contesta código distinto a
 * propósito: si el permiso se comprobara solo en el middleware, cualquier
 * forma de saltárselo abriría de una vez todas las rutas. Es la forma exacta
 * del CVE-2025-29927, que obligó a subir Next hace unos días.
 *
 * El rol se vuelve a derivar de la cabecera `Authorization` en cada ruta, y
 * no se lee de una cabecera que ponga el middleware: una cabecera la puede
 * mandar cualquiera.
 */
import { NextResponse } from 'next/server';
import { rolDe, puede, credencialesDelEntorno, ROL, type Rol, type Accion } from './auth.ts';

/**
 * El rol a partir de la cabecera suelta.
 *
 * Está separado de `rolDePeticion` porque el layout también lo necesita
 * —para no dibujarle al encargado enlaces que le van a devolver 403— y ahí
 * no hay un `Request`, hay `headers()`.
 */
export function rolDeCabecera(cabecera: string): Rol {
  const credenciales = credencialesDelEntorno(process.env);

  // Sin credenciales configuradas, en DESARROLLO se trabaja como
  // administrador. Es la misma regla que ya tiene el middleware, y por el
  // mismo motivo: levantar el panel en el computador no puede exigir
  // inventarse un usuario. En producción esta rama no existe —el middleware
  // devuelve 503 antes— así que no abre nada.
  if (process.env.NODE_ENV === 'development' && !credenciales.adminUsuario) {
    return ROL.admin;
  }
  return rolDe(cabecera, credenciales);
}

export function rolDePeticion(req: Request): Rol {
  return rolDeCabecera(req.headers.get('authorization') ?? '');
}

/**
 * Devuelve una respuesta 403 si no puede, o `null` si puede.
 *
 * Se usa así, y el `if` es lo primero de cada handler:
 *
 *     const no = exigir(req, 'configurar');
 *     if (no) return no;
 */
export function exigir(req: Request, accion: Accion): NextResponse | null {
  const rol = rolDePeticion(req);
  if (puede(rol, accion)) return null;
  return NextResponse.json(
    {
      error: rol === ROL.ninguno
        ? 'No estás identificado.'
        : `Tu cuenta (${rol}) no puede hacer esto. Pídeselo al administrador.`,
      // Para que la pantalla pueda decir "no tienes permiso" en vez de "no
      // se pudo leer la planilla", que manda a buscar el problema donde no
      // está.
      permiso: true
    },
    { status: 403 }
  );
}

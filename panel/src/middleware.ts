import { NextResponse, type NextRequest } from 'next/server';
import { leerSesion, secretoDeSesion, cookieDe, COOKIE_SESION } from './lib/sesion.ts';
import { puede, type Rol } from './lib/auth.ts';


/**
 * El cierre del panel: nadie entra sin sesión.
 *
 * **Desde el 2026-10-21 es una cookie firmada y no autenticación básica.**
 * El cambio lo pidió la bitácora: con una clave por rol, el registro solo
 * podía decir "lo hizo un encargado". Con cuentas hace falta una sesión, y
 * con una sesión aparecen dos cosas que la autenticación básica nunca tuvo:
 * un botón de **cerrar sesión** y saber **con qué cuenta** estás adentro.
 *
 * Lo que hay que saber de esta elección:
 *
 * - **La sesión dura 7 días** (decidido con el cliente). Pasado ese plazo se
 *   vuelve a pedir la contraseña.
 * - **Desactivar a alguien no corta su sesión en curso.** El rol viaja
 *   firmado dentro del token para no consultar la planilla en cada
 *   petición; ver `sesion.ts`. Para echar a alguien ya mismo hay que
 *   cambiar `PANEL_CLAVE` o `SESION_SECRETO`, lo que invalida todas.
 * - **`PANEL_USUARIO` / `PANEL_CLAVE` siguen siendo una cuenta válida**, de
 *   administrador. Es la puerta de emergencia para el día en que la planilla
 *   no responda o alguien borre la última cuenta.
 *
 * Este archivo corre en el runtime **Edge**, así que no puede importar
 * `node:crypto` — por eso la firma usa WebCrypto y las contraseñas se
 * verifican en otro lado, en la ruta de entrada.
 */

/**
 * Lo que se sirve sin sesión. **Va enumerado a mano y no por un patrón**,
 * para que agregar una ruta nueva no la deje expuesta por accidente.
 */
const PUBLICAS = [
  // Las fechas que dibuja el calendario del sitio.
  '/api/publico/fechas',
  // El webhook de Shopify. Público por fuerza: Shopify no puede
  // autenticarse con nuestra contraseña. Lo que lo protege es la firma
  // HMAC, que se verifica dentro de la ruta; ver src/lib/firma.ts.
  '/api/shopify/webhook',
  // La pantalla de entrada y la ruta que la atiende. Si pidieran sesión,
  // no habría forma de conseguir una.
  '/login',
  '/api/sesion'
];

/**
 * La única excepción por prefijo, y va aparte de PUBLICAS para que se vea.
 *
 * `/mi/<token>` es la página del trabajador. No puede pedir contraseña
 * —justamente la gracia es que entra con un link y nada más— así que lo que
 * la protege es el token de la URL, que la página verifica contra la lista
 * de trabajadores antes de mostrar nada.
 *
 * `/mi` a secas, sin token, no abre nada: `trabajadorPorToken()` no
 * encuentra a nadie con un token vacío.
 */
const PREFIJO_TRABAJADOR = '/mi/';

/**
 * La planilla semanal, el link que se manda al grupo. Misma idea que el del
 * trabajador: no puede pedir contraseña, y lo que la protege es la llave de
 * la URL, que la página compara contra la configuración antes de mostrar
 * nada. Lo que enseña no lleva plata ni datos de clientes.
 */
const PREFIJO_PLANILLA = '/semana/';

export async function middleware(req: NextRequest) {
  const ruta = req.nextUrl.pathname;
  if (PUBLICAS.includes(ruta)) return NextResponse.next();
  if (ruta.startsWith(PREFIJO_TRABAJADOR)) return NextResponse.next();
  if (ruta.startsWith(PREFIJO_PLANILLA)) return NextResponse.next();

  const secreto = secretoDeSesion(process.env);

  // Sin nada con qué firmar, en producción se CIERRA, no se abre. Desplegar
  // sin contraseña y quedar expuesto en internet es justo el accidente que
  // esto tiene que impedir.
  if (!secreto) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    return new NextResponse(
      'El panel no tiene PANEL_CLAVE configurada. Está cerrado hasta que la tenga.',
      { status: 503 }
    );
  }

  const sesion = await leerSesion(
    cookieDe(req.headers.get('cookie'), COOKIE_SESION), secreto
  );
  if (sesion) {
    // Quien no puede ver el calendario no tiene nada que hacer en la
    // portada: es el caso de la cuenta de pagos, que solo lee el informe.
    // Sin esto aterrizaría en una pantalla que carga y falla, y parecería
    // que el panel está roto en vez de que esa parte no es suya.
    if (ruta === '/' && !puede(sesion.rol as Rol, 'ver')
        && puede(sesion.rol as Rol, 'informe')) {
      const informe = req.nextUrl.clone();
      informe.pathname = '/informe';
      informe.search = '';
      return NextResponse.redirect(informe);
    }
    return NextResponse.next();
  }

  // Una página manda a entrar; una ruta de API responde 401 y no un
  // redirect. Si redirigiera, un `fetch` recibiría el HTML de la pantalla de
  // entrada con código 200 y la pantalla mostraría un error de JSON roto en
  // vez de decir que la sesión caducó.
  if (ruta.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Tu sesión caducó o no estás identificado. Vuelve a entrar.', sesion: false },
      { status: 401 }
    );
  }

  const entrada = req.nextUrl.clone();
  entrada.pathname = '/login';
  entrada.search = '';
  // Para volver a donde iba después de entrar. Solo la ruta, nunca una URL
  // completa: con una absoluta, un link preparado podría mandar a la persona
  // a otro sitio después de que entre.
  entrada.searchParams.set('volver', ruta);
  return NextResponse.redirect(entrada);
}

export const config = {
  // Todo el panel, incluidas las rutas de API y /api/diagnostico, que
  // muestra la estructura de la planilla. Quedan fuera solo los archivos
  // internos de Next y el favicon.
  //
  // Lo abierto NO se excluye acá sino dentro de middleware(), en PUBLICAS:
  // así sigue pasando por esta función y la lista se lee en un solo lugar,
  // en vez de quedar escondida en una expresión regular.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

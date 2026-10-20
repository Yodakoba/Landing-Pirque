import { NextResponse, type NextRequest } from 'next/server';
import { credencialValida } from './lib/auth.ts';

/**
 * Autenticación básica HTTP sobre todo el panel.
 *
 * Es Basic auth y no un sistema de cuentas a propósito: son una o dos
 * personas del local, no una organización. El navegador muestra el diálogo
 * solo, no hay pantalla de login que mantener, y son treinta líneas sin
 * una sola dependencia.
 *
 * Lo que hay que saber de esta elección:
 *
 * - **No hay botón de cerrar sesión.** El navegador recuerda la credencial
 *   hasta que se cierra. Para "salir" hay que cerrar el navegador o usar
 *   una ventana privada.
 * - **No hay usuarios distintos.** Una sola credencial compartida; no queda
 *   registro de quién hizo cada cambio.
 * - **Va sobre HTTPS obligatoriamente.** En Vercel eso es automático. Por
 *   HTTP plano, la credencial viaja legible en cada petición.
 *
 * Si algún día hacen falta cuentas separadas o un registro de quién tocó
 * qué, esto se reemplaza por Auth.js. Para hoy sería desproporcionado.
 */
/**
 * La única ruta pública del panel: la que consume el sitio.
 *
 * Está exenta a mano y no por un patrón, para que agregar una ruta nueva
 * no la deje expuesta por accidente. Lo que devuelve son tres campos
 * recortados en src/lib/publico.ts; ahí está escrito por qué y hay una
 * prueba que lo fija.
 */
const PUBLICAS = ['/api/publico/fechas'];

export function middleware(req: NextRequest) {
  if (PUBLICAS.includes(req.nextUrl.pathname)) return NextResponse.next();

  const usuario = process.env.PANEL_USUARIO;
  const clave = process.env.PANEL_CLAVE;

  // Sin credenciales configuradas: en producción se CIERRA, no se abre.
  // Desplegar sin contraseña y quedar expuesto en internet es justo el
  // accidente que esto tiene que impedir.
  if (!usuario || !clave) {
    if (process.env.NODE_ENV === 'development') return NextResponse.next();
    return new NextResponse(
      'El panel no tiene PANEL_USUARIO y PANEL_CLAVE configurados. ' +
      'Está cerrado hasta que los tenga.',
      { status: 503 }
    );
  }

  const cabecera = req.headers.get('authorization') ?? '';
  if (credencialValida(cabecera, usuario, clave)) return NextResponse.next();

  return new NextResponse('Necesitas autenticarte.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Panel de reservas", charset="UTF-8"' }
  });
}

export const config = {
  // Todo el panel, incluidas las rutas de API y /api/diagnostico, que
  // muestra la estructura de la planilla. Quedan fuera solo los archivos
  // internos de Next y el favicon.
  //
  // El endpoint del sitio NO se excluye acá sino dentro de middleware(),
  // en PUBLICAS: así sigue pasando por esta función y la lista de lo
  // abierto se lee en un solo lugar, en vez de quedar escondida en una
  // expresión regular.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

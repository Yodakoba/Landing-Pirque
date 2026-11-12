/**
 * Las pantallas del menú, en el orden en que se muestran. Puro: lo usan el
 * menú (`Nav`), la cabecera, la ayuda por rol (`ayudaRol.ts`) y las pruebas.
 */
import type { Accion } from './auth.ts';

/**
 * Cada página con el permiso que de verdad la abre.
 *
 * **Se consulta la misma tabla que usan las rutas**, no una lista aparte de
 * "esto es de administrador". Con tres roles, una segunda lista era una
 * segunda verdad: el día que alguien agregara un rol, el menú le ofrecería
 * puertas cerradas o le escondería las suyas.
 *
 * Esconder un enlace es cortesía, no seguridad: quien escriba /config a mano
 * igual recibe un 403 de la ruta, que es donde esto se decide.
 */
export const PAGINAS: {
  href: string; texto: string; accion: Accion;
  /** La llave de su explicación en `AYUDAS`: la usan el `?`, la ayuda por rol y el recorrido. */
  tema: string;
}[] = [
  { href: '/', texto: 'Calendario', accion: 'ver', tema: 'calendario' },
  // La pantalla de la entrada, el día de apertura (2026-11-11).
  { href: '/recepcion', texto: 'Recepción', accion: 'asistencia', tema: 'recepcion' },
  { href: '/equipo', texto: 'Equipo', accion: 'equipo', tema: 'equipo' },
  { href: '/turnos', texto: 'Turnos', accion: 'equipo', tema: 'turnos' },
  { href: '/extras', texto: 'Extras', accion: 'extras', tema: 'extras' },
  { href: '/presupuestos', texto: 'Cotizaciones', accion: 'presupuestos', tema: 'presupuestos' },
  { href: '/clientes', texto: 'Clientes', accion: 'clientes', tema: 'clientes' },
  // Desde el 2026-11-10 es el catálogo de todo lo que se vende y se cotiza,
  // no solo los menús del sitio. La ruta sigue siendo /menus para no romper
  // enlaces, y la pestaña de la planilla sigue llamándose `Menús`.
  { href: '/menus', texto: 'Productos', accion: 'configurar', tema: 'menus' },
  { href: '/config', texto: 'Configuración', accion: 'configurar', tema: 'configuracion' },
  { href: '/informe', texto: 'Informe', accion: 'informe', tema: 'informe' },
  // El equipo de ventas (2026-11-12): el vendedor la ve como *Mi resumen*.
  { href: '/vendedores', texto: 'Vendedores', accion: 'vendedores', tema: 'vendedores' },
  { href: '/usuarios', texto: 'Cuentas', accion: 'usuarios', tema: 'cuentas' },
  { href: '/bitacora', texto: 'Bitácora', accion: 'bitacora', tema: 'bitacora' }
];

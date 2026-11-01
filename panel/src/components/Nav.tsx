'use client';

/**
 * La barra de navegación, marcando dónde estás.
 *
 * Es un componente de cliente solo por eso: `usePathname` necesita el
 * navegador. El resto del layout sigue siendo de servidor.
 *
 * **Son pastillas, no una lista de enlaces** (2026-11-01). Lo pidió el
 * cliente mirándola en el teléfono: *"no se siente cero PlayStation, se
 * parece a una lista de máquina de escribir"*. Y era eso: nueve textos de
 * 14px al 70%, envueltos en dos renglones, sin nada que dijera que se
 * aprietan. **El menú no cambió** —las mismas páginas, el mismo orden, la
 * misma tabla de permisos—; cambió cómo se ve.
 *
 * La página actual se marca de tres formas a la vez y no solo con color:
 * `aria-current` para los lectores de pantalla, **la pastilla rellena de
 * dorado** —que se distingue por forma, no solo por color— y el contraste
 * del texto. Quien no distinga el dorado del hueso igual ve cuál es.
 */
import { usePathname } from 'next/navigation';
import { puede, type Rol, type Accion } from '@/lib/auth';

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
const PAGINAS: { href: string; texto: string; accion: Accion }[] = [
  { href: '/', texto: 'Calendario', accion: 'ver' },
  { href: '/equipo', texto: 'Equipo', accion: 'equipo' },
  { href: '/turnos', texto: 'Turnos', accion: 'equipo' },
  { href: '/extras', texto: 'Extras', accion: 'extras' },
  { href: '/presupuestos', texto: 'Presupuestos', accion: 'presupuestos' },
  { href: '/menus', texto: 'Menús', accion: 'configurar' },
  { href: '/config', texto: 'Configuración', accion: 'configurar' },
  { href: '/informe', texto: 'Informe', accion: 'informe' },
  { href: '/usuarios', texto: 'Cuentas', accion: 'usuarios' },
  { href: '/bitacora', texto: 'Bitácora', accion: 'bitacora' }
];

export default function Nav({ rol }: { rol: string }) {
  const ruta = usePathname();

  // `flex-wrap`: la barra envuelve en vez de empujar. Con nueve páginas ya no
  // cabe en un teléfono, y una barra que no cabe se lleva toda la página
  // hacia el costado — el panel entero quedaba con scroll horizontal.
  //
  // **Se descartó la fila que se desplaza de lado**, que es lo que haría una
  // app: esconde la mitad de las páginas detrás de un gesto que hay que
  // adivinar, y este panel lo usa gente a la que recién se le enseñó dónde
  // queda cada cosa. Envolver ocupa más alto y no esconde nada.

  return (
    <nav className="flex flex-wrap gap-2">
      {PAGINAS.filter((p) => puede(rol as Rol, p.accion))
              .map(({ href, texto }) => {
        // La raíz calza exacto; las demás también con lo que cuelgue de
        // ellas. /dia/2026-11-14 no es ninguna de las tres, así que ahí no
        // se marca nada, que es correcto: no es una página del menú.
        const aqui = href === '/' ? ruta === '/' : ruta.startsWith(href);
        return (
          <a key={href} href={href}
             aria-current={aqui ? 'page' : undefined}
             className={`tecla boton rounded-full ${aqui ? 'boton-relleno' : ''}`}>
            {texto}
          </a>
        );
      })}
    </nav>
  );
}

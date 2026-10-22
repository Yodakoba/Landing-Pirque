'use client';

/**
 * La barra de navegación, marcando dónde estás.
 *
 * Es un componente de cliente solo por eso: `usePathname` necesita el
 * navegador. El resto del layout sigue siendo de servidor.
 *
 * La página actual se marca de tres formas a la vez y no solo con color:
 * `aria-current` para los lectores de pantalla, el color dorado, y un
 * subrayado. Quien no distinga el dorado del hueso igual ve cuál es.
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
  { href: '/menus', texto: 'Menús', accion: 'configurar' },
  { href: '/config', texto: 'Configuración', accion: 'configurar' },
  { href: '/informe', texto: 'Informe', accion: 'informe' },
  { href: '/usuarios', texto: 'Cuentas', accion: 'usuarios' },
  { href: '/bitacora', texto: 'Bitácora', accion: 'bitacora' }
];

export default function Nav({ rol }: { rol: string }) {
  const ruta = usePathname();

  return (
    <nav className="flex gap-5 text-sm">
      {PAGINAS.filter((p) => puede(rol as Rol, p.accion))
              .map(({ href, texto }) => {
        // La raíz calza exacto; las demás también con lo que cuelgue de
        // ellas. /dia/2026-11-14 no es ninguna de las tres, así que ahí no
        // se marca nada, que es correcto: no es una página del menú.
        const aqui = href === '/' ? ruta === '/' : ruta.startsWith(href);
        return (
          <a key={href} href={href}
             aria-current={aqui ? 'page' : undefined}
             className={aqui
               ? 'text-oro underline decoration-oro/60 underline-offset-8'
               : 'text-hueso/70 hover:text-hueso'}>
            {texto}
          </a>
        );
      })}
    </nav>
  );
}

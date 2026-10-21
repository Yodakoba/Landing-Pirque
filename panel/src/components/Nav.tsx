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

/**
 * `soloAdmin` esconde el enlace para el encargado. Es cortesía, no
 * seguridad: quien escriba /config a mano igual recibe un 403 de la ruta,
 * que es donde esto se decide de verdad.
 */
const PAGINAS = [
  { href: '/', texto: 'Calendario', soloAdmin: false },
  { href: '/equipo', texto: 'Equipo', soloAdmin: false },
  { href: '/menus', texto: 'Menús', soloAdmin: true },
  { href: '/config', texto: 'Configuración', soloAdmin: true }
];

export default function Nav({ rol }: { rol: string }) {
  const ruta = usePathname();

  return (
    <nav className="flex gap-5 text-sm">
      {PAGINAS.filter((p) => !p.soloAdmin || rol === 'admin')
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

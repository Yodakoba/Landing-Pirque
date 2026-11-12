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
import { ROL, puedeVer, type Rol } from '@/lib/auth';
import { PAGINAS } from '@/lib/paginas';

// La lista vive en `lib/paginas.ts` (2026-11-12): la usan también la ayuda
// por rol y sus pruebas, que no pueden importar un componente.
export { PAGINAS };

export default function Nav({ rol, gerencia = false }: { rol: string; gerencia?: boolean }) {
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
      {/* Con vista gerencia aparecen también las que solo se miran. */}
      {PAGINAS.filter((p) => puedeVer(rol as Rol, p.accion, gerencia))
              .map(({ href, texto: rotulo }) => {
        const texto = href === '/vendedores' && rol === ROL.vendedor ? 'Mi resumen' : rotulo;
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

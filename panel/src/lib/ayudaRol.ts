/**
 * **La ayuda de cada rol** (2026-11-12, lo pidió el cliente: los recorridos del
 * testeo *"como opción de acceso de ayuda… cuando uno entra a su panel, en su
 * rol, para poder volver a revisar cosas"*).
 *
 * **No hay una lista escrita a mano por rol.** Se arma con las mismas dos
 * fuentes que ya existían: qué pantallas abre la cuenta (`PAGINAS` filtrada
 * por `puedeVer()`, igual que el menú) y cómo se explica cada una (`AYUDAS`,
 * los mismos textos del `?`). Si mañana un permiso cambia de manos o aparece
 * un rol, la ayuda cambia sola y nunca muestra una pantalla que la persona no
 * puede abrir. Una prueba fija que cada pantalla del menú tiene su texto.
 *
 * Puro: lo usan la página `/ayuda`, el recorrido de bienvenida y las pruebas.
 */
import { puedeVer, ROL, type Rol } from './auth.ts';
import { PAGINAS } from './paginas.ts';
import { AYUDAS, type Ayuda } from './ayudas.ts';

export interface PantallaDeAyuda {
  href: string;
  /** Su llave en `AYUDAS`, para abrir el `?`. */
  tema: string;
  /** Cómo se llama en el menú de esta cuenta. */
  texto: string;
  ayuda: Ayuda;
}

/** Las pantallas que esta cuenta abre, en el orden del menú, con su explicación. */
export function pantallasDe(rol: Rol, gerencia = false): PantallaDeAyuda[] {
  return PAGINAS
    .filter((p) => puedeVer(rol, p.accion, gerencia) && AYUDAS[p.tema])
    .map((p) => ({
      href: p.href,
      tema: p.tema,
      // El vendedor ve la pestaña de ventas como *Mi resumen* (igual que en `Nav`).
      texto: p.href === '/vendedores' && rol === ROL.vendedor ? 'Mi resumen' : p.texto,
      ayuda: AYUDAS[p.tema]
    }));
}

/**
 * Cómo se llama la pantalla de esta ruta, para anotarlo en un comentario:
 * *Cotizaciones*, *Día 2026-11-14*. La más larga que calce, como la cabecera.
 */
export function pantallaDeRuta(ruta: string): string {
  const dia = /^\/dia\/(\d{4}-\d{2}-\d{2})/.exec(ruta);
  if (dia) return `Día ${dia[1]}`;
  if (ruta.startsWith('/ayuda')) return 'Ayuda';
  const p = [...PAGINAS].sort((a, b) => b.href.length - a.href.length)
    .find((x) => (x.href === '/' ? ruta === '/' : ruta.startsWith(x.href)));
  return p ? p.texto : ruta.slice(0, 80);
}

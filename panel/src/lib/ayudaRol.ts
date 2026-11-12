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
import { AYUDAS, type Ayuda, type Paso } from './ayudas.ts';
import { NOMBRE_ROL, RESUMEN_ROL } from './roles.ts';

export interface PantallaDeAyuda {
  href: string;
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
      // El vendedor ve la pestaña de ventas como *Mi resumen* (igual que en `Nav`).
      texto: p.href === '/vendedores' && rol === ROL.vendedor ? 'Mi resumen' : p.texto,
      ayuda: AYUDAS[p.tema]
    }));
}

/**
 * El recorrido de bienvenida de esta cuenta: quién eres, un paso por cada
 * pantalla que abres, y dónde volver a encontrar todo esto.
 */
export function recorridoDe(rol: Rol, gerencia = false, conComentar = false): Paso[] {
  const pantallas = pantallasDe(rol, gerencia);
  const nombre = NOMBRE_ROL[rol] ?? rol;
  const cuantas = pantallas.length === 1
    ? 'Es una sola pantalla y te la muestro en un minuto.'
    : `Son ${pantallas.length} pantallas y te las muestro en un minuto. Puedes salir cuando quieras.`;
  return [
    {
      titulo: `Tu panel, como ${nombre}`,
      cuerpo: [RESUMEN_ROL[rol] ?? '', cuantas].filter(Boolean)
    },
    ...pantallas.map((p) => ({
      titulo: p.ayuda.titulo,
      cuerpo: p.ayuda.cuerpo.slice(0, 2),
      ir: { texto: `Ir a ${p.texto}`, url: p.href }
    })),
    {
      titulo: 'Y si algo no se entiende',
      cuerpo: [
        'Cada pantalla tiene un signo de interrogación al lado del título, con '
        + 'una explicación corta de para qué sirve y cómo se usa.',
        conComentar
          ? 'Esta ayuda vive en el botón ❓ Ayuda de arriba. Y con 💬 Comentar '
            + 'cuentas un error, una duda o algo que te falta para tu trabajo.'
          : 'Esta ayuda vive en el botón ❓ Ayuda de arriba: vuelve cuando quieras.'
      ]
    }
  ];
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

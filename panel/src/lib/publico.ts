/**
 * Lo que el SITIO PÚBLICO recibe, que es deliberadamente menos que lo que
 * ve el panel.
 *
 * Esta es una frontera de seguridad, no una transformación de datos más.
 * Al otro lado no hay contraseña: cualquiera en internet puede pedir esto.
 * Por eso vive en su propio archivo, con su propia prueba, en vez de ser
 * un `map` perdido dentro de una ruta.
 *
 * **Van tres campos y nada más.** Cuánta gente ya reservó, cuánto pagó,
 * de qué tamaño es el local y qué nota interna tiene un día no son datos
 * de un visitante. El criterio viene del backend de Apps Script, que ya
 * lo resolvía así, y acá se mantiene igual.
 *
 * Y es el contrato completo con el sitio: `assets/js/reserva.js` consume
 * `{fechas: [{fecha, quedan, pocos}]}` y nada más. Cada campo que se
 * agregue acá es un campo que cualquier reemplazo futuro tendrá que
 * imitar, así que conviene no engordarlo.
 */
import type { Ocupacion } from './tipos.ts';

export interface FechaPublica {
  fecha: string;
  quedan: number;
  pocos: boolean;
}

/**
 * El umbral para "quedan pocos lugares".
 *
 * El 10 no es inventado: es el `aviso_pocos_lugares` que ya traía el
 * backend de Apps Script. Se puede cambiar con AVISO_POCOS_LUGARES sin
 * tocar código, porque es un parámetro del negocio y no una constante
 * técnica.
 */
export function umbralPocos(): number {
  const n = Number(process.env.AVISO_POCOS_LUGARES);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

/**
 * Filtra y recorta la ocupación para el sitio.
 *
 * Se omiten los días cerrados y los llenos. Un día lleno no se manda como
 * "quedan 0": simplemente no está, porque el calendario del sitio solo
 * dibuja lo que se puede reservar y un cero invita a intentarlo.
 */
export function paraElSitio(dias: Ocupacion[], umbral = umbralPocos()): FechaPublica[] {
  const salida: FechaPublica[] = [];
  for (const d of dias) {
    if (d.bloqueada) continue;
    if (d.quedan <= 0) continue;
    salida.push({
      fecha: d.fecha,
      quedan: d.quedan,
      pocos: d.quedan <= umbral
    });
  }
  return salida;
}

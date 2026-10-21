/**
 * Fechas como texto AAAA-MM-DD de punta a punta, nunca como objetos Date.
 *
 * No es purismo: convertirlas en algún paso hace que una reserva hecha de
 * noche en Chile, o desde otro huso, caiga en el día equivocado. Ese error
 * aparece en una de cada tantas reservas, que es la peor forma de aparecer.
 */

export type Fecha = string; // AAAA-MM-DD

const RE = /^\d{4}-\d{2}-\d{2}$/;

export function esFecha(s: unknown): s is Fecha {
  return typeof s === 'string' && RE.test(s);
}

/** 0 es domingo y 6 sábado, igual que getDay(). */
export function diaSemana(f: Fecha): number {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).getDay();
}

export function sumarDias(f: Fecha, n: number): Fecha {
  const [a, m, d] = f.split('-').map(Number);
  const x = new Date(a, m - 1, d + n);
  return [
    x.getFullYear(),
    String(x.getMonth() + 1).padStart(2, '0'),
    String(x.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * La zona del negocio. "Hoy" en este proyecto significa siempre hoy en
 * Pirque, no donde corra el código.
 */
export const ZONA = 'America/Santiago';

/**
 * Qué día es un instante dado, en una zona dada.
 *
 * Se arma con Intl y no con los métodos de Date porque esos usan la zona
 * de la máquina. Es una función aparte de hoy() para poder probarla con
 * un instante fijo: con "ahora" no hay prueba posible.
 */
export function fechaEnZona(instante: Date, zona = ZONA): Fecha {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(instante);
  const p = (t: string) => partes.find((x) => x.type === t)?.value ?? '';
  return `${p('year')}-${p('month')}-${p('day')}`;
}

/**
 * Hoy en Chile, como texto.
 *
 * **No es la zona del servidor, y esa diferencia es un error que ya
 * estaba.** El panel corre en Vercel, o sea en UTC, y Chile va tres o
 * cuatro horas atrás: desde las 21:00 en Pirque el servidor ya cree que es
 * mañana. Con la zona del servidor, /api/ocupacion dejaba de mostrar el
 * día de hoy a partir de esa hora —justo la tarde de un sábado, que es
 * cuando se mira— y el endpoint del sitio dejaba de ofrecerlo.
 *
 * Es el mismo error de huso que el encabezado de este archivo advierte,
 * entrando por otra puerta: no por convertir una fecha a Date, sino por
 * preguntarle a Date qué día es hoy.
 */
export function hoy(): Fecha {
  return fechaEnZona(new Date());
}

/**
 * Los próximos días que caen en sábado o domingo, empezando por `desde`
 * inclusive. El horario base del negocio son esos dos días desde las 13h.
 */
export function proximosFinesDeSemana(
  desde: Fecha, cuantos: number, diasAbiertos: number[] = [6, 0]
): Fecha[] {
  const salida: Fecha[] = [];
  // Si lo que llega no sirve se usan sábado y domingo, en vez de devolver
  // una lista vacía que dejaría el panel sin ningún día que mostrar.
  const abre = diasAbiertos.length ? diasAbiertos : [6, 0];
  for (let i = 0; salida.length < cuantos && i < 400; i++) {
    const f = sumarDias(desde, i);
    if (abre.includes(diaSemana(f))) salida.push(f);
  }
  return salida;
}

/**
 * Todos los días que se abren entre dos fechas, inclusive.
 *
 * Distinto de proximosFinesDeSemana(), que cuenta días abiertos: acá manda
 * **el rango**. Es lo que hace falta para respetar `dias_a_futuro` de la
 * configuración, que está en días de calendario y no en "los próximos ocho
 * sábados".
 */
export function diasAbiertosEntre(
  desde: Fecha, hasta: Fecha, diasAbiertos: number[] = [6, 0]
): Fecha[] {
  const abre = diasAbiertos.length ? diasAbiertos : [6, 0];
  const salida: Fecha[] = [];
  // El tope de 800 vueltas es una red por si llegan fechas al revés o un
  // rango absurdo: más de dos años no se dibuja en una pantalla igual.
  for (let f = desde, i = 0; f <= hasta && i < 800; f = sumarDias(f, 1), i++) {
    if (abre.includes(diaSemana(f))) salida.push(f);
  }
  return salida;
}

/** "2026-11-14" -> "2026-11". Para agrupar. */
export function mesDe(f: Fecha): string {
  return f.slice(0, 7);
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

/** "2026-11-14" -> "sábado 14 de noviembre". Para títulos. */
export function enPalabras(f: Fecha): string {
  const [, m, d] = f.split('-').map(Number);
  return `${DIAS[diaSemana(f)]} ${d} de ${MESES[m - 1]}`;
}

/** "2026-11" -> "noviembre 2026". Para los encabezados de mes. */
export function mesEnPalabras(mes: string): string {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1] ?? mes} ${a}`;
}

/**
 * El lunes de la semana de una fecha, como texto. Para agrupar.
 *
 * La semana parte en lunes, que es la convención chilena y la que ya usa el
 * calendario del sitio.
 */
export function semanaDe(f: Fecha): Fecha {
  const d = diaSemana(f);            // 0 domingo … 6 sábado
  return sumarDias(f, -(d === 0 ? 6 : d - 1));
}

/**
 * "24 – 25 de octubre" para un grupo de días, o "31 de octubre" si es uno
 * solo. Si el grupo cruza de mes, se nombran los dos: "31 de octubre – 1 de
 * noviembre", que es justo el caso en que no nombrarlos confunde.
 */
export function rangoEnPalabras(fechas: Fecha[]): string {
  if (!fechas.length) return '';
  const dia = (f: Fecha) => Number(f.slice(8, 10));
  const mes = (f: Fecha) => MESES[Number(f.slice(5, 7)) - 1] ?? '';
  const a = fechas[0];
  const b = fechas[fechas.length - 1];
  if (a === b) return `${dia(a)} de ${mes(a)}`;
  if (mes(a) === mes(b)) return `${dia(a)} – ${dia(b)} de ${mes(a)}`;
  return `${dia(a)} de ${mes(a)} – ${dia(b)} de ${mes(b)}`;
}

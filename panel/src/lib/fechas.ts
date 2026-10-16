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

/** Hoy en la zona del servidor, como texto. */
export function hoy(): Fecha {
  const x = new Date();
  return [
    x.getFullYear(),
    String(x.getMonth() + 1).padStart(2, '0'),
    String(x.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Los próximos días que caen en sábado o domingo, empezando por `desde`
 * inclusive. El horario base del negocio son esos dos días desde las 13h.
 */
export function proximosFinesDeSemana(desde: Fecha, cuantos: number): Fecha[] {
  const salida: Fecha[] = [];
  for (let i = 0; salida.length < cuantos && i < 400; i++) {
    const f = sumarDias(desde, i);
    const d = diaSemana(f);
    if (d === 6 || d === 0) salida.push(f);
  }
  return salida;
}

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

/** "2026-11-14" -> "sábado 14 de noviembre". Para títulos. */
export function enPalabras(f: Fecha): string {
  const [, m, d] = f.split('-').map(Number);
  return `${DIAS[diaSemana(f)]} ${d} de ${MESES[m - 1]}`;
}

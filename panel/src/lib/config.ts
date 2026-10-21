/**
 * Los parámetros del negocio, que viven en la planilla y no en el código.
 *
 * **Por qué en la planilla:** cambiar un 10 por un 8 no puede obligar a
 * redesplegar. El backend de Apps Script ya lo resolvía así, con una
 * pestaña `Config` de filas clave/valor, y acá se replica — no son
 * parámetros nuevos, son los mismos.
 *
 * Este archivo no toca la red: recibe las filas y devuelve la
 * configuración. Toda la tolerancia a lo que una persona escriba a mano
 * vive acá y se prueba acá.
 */
import { normalizar } from './columnas.ts';

export const HOJA_CONFIG = 'Config';
export const COL_CONFIG = { clave: 'Clave', valor: 'Valor' } as const;

export interface Config {
  /** Desde cuántos lugares libres el sitio avisa "últimos lugares". */
  avisoPocosLugares: number;
  /** El cupo que se le pone a un día nuevo. Personas totales, niños incluidos. */
  cupoNormal: number;
  /** La hora a la que abre, como texto. */
  horaApertura: string;
  /**
   * La hora a la que cierra. Hoy solo la usa el evento de Google Calendar,
   * para saber hasta cuándo dura. El sitio no la muestra.
   */
  horaCierre: string;
  /** Qué días de la semana se abre. 0 es domingo y 6 sábado, como getDay(). */
  diasAbiertos: number[];
  /** Hasta cuántos días adelante se puede reservar. */
  diasAFuturo: number;
  /** Desde qué fracción de ocupación un día pasa a amarillo y a rojo. */
  cortes: { amarillo: number; rojo: number };
}

/**
 * Los valores de hoy, que son los del backend viejo.
 *
 * Se usan cuando la pestaña `Config` no existe o le falta una fila, así que
 * **el panel funciona sin esa pestaña**: no hay que preparar nada para que
 * arranque, y agregarla solo sirve para cambiar algo.
 */
export const POR_DEFECTO: Config = {
  avisoPocosLugares: 10,
  cupoNormal: 60,
  horaApertura: '13:00',
  // 13:00 a 18:00 es el horario del negocio, una sola jornada por día.
  horaCierre: '18:00',
  diasAbiertos: [6, 0],          // sábado y domingo
  diasAFuturo: 90,
  cortes: { amarillo: 0.6, rojo: 0.85 }
};

/** Las claves como se escriben en la planilla, en el orden en que se muestran. */
export const CLAVES = {
  avisoPocosLugares: 'aviso_pocos_lugares',
  cupoNormal: 'cupo_normal',
  horaApertura: 'hora_apertura',
  horaCierre: 'hora_cierre',
  diasAbiertos: 'dias_abiertos',
  diasAFuturo: 'dias_a_futuro',
  corteAmarillo: 'corte_amarillo',
  corteRojo: 'corte_rojo'
} as const;

/**
 * Los días de la semana como los escribe una persona.
 *
 * Se aceptan con y sin tilde, en singular, y abreviados a tres letras,
 * porque la planilla la llena alguien a mano y "sab", "sáb" y "sábado" son
 * la misma intención. `normalizar()` ya saca tildes y mayúsculas.
 */
const DIAS: Record<string, number> = {
  domingo: 0, dom: 0,
  lunes: 1, lun: 1,
  martes: 2, mar: 2,
  miercoles: 3, mie: 3,
  jueves: 4, jue: 4,
  viernes: 5, vie: 5,
  sabado: 6, sab: 6
};

/** "sáb,dom" -> [6, 0]. Devuelve null si no se entiende ni un día. */
export function aDiasSemana(texto: unknown): number[] | null {
  const partes = String(texto ?? '').split(/[,;/\s]+/).filter(Boolean);
  const salida: number[] = [];
  for (const p of partes) {
    const d = DIAS[normalizar(p)];
    if (d === undefined) continue;
    if (!salida.includes(d)) salida.push(d);
  }
  return salida.length ? salida : null;
}

/** [6, 0] -> "sáb,dom", para mostrarlo en el panel. */
export function deDiasSemana(dias: number[]): string {
  const nombre = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  return dias.map((d) => nombre[d] ?? '?').join(',');
}

/**
 * Un número, o el valor por defecto si lo escrito no sirve.
 *
 * **Nunca lanza y nunca devuelve algo fuera de rango**, y eso es a
 * propósito: un cupo en cero o un umbral negativo escritos por error no
 * pueden dejar el panel sin dibujar. Se ignora el valor malo y se sigue con
 * el de siempre, que es visible y correcto.
 */
function numero(v: unknown, porDefecto: number, min: number, max: number): number {
  const crudo = String(v ?? '').trim();
  // Una celda vacía es "no configurado", no un cero. Sin esta línea
  // Number('') daba 0, y un 0 dentro del rango se tomaba como el valor
  // elegido: el umbral de "pocos lugares" se apagaba solo.
  if (crudo === '') return porDefecto;
  const n = Number(crudo.replace(',', '.').replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n) || n < min || n > max) return porDefecto;
  return n;
}

/**
 * Un corte del semáforo. Se acepta `0.6` y también `60`, porque quien lo
 * escriba en una planilla va a poner un porcentaje.
 */
function fraccion(v: unknown, porDefecto: number): number {
  const n = Number(String(v ?? '').replace('%', '').replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return porDefecto;
  const f = n > 1 ? n / 100 : n;
  return f > 0 && f <= 1 ? f : porDefecto;
}

/** Las filas de la pestaña `Config` como configuración. */
export function leerConfigDe(filas: string[][]): Config {
  const mapa = new Map<string, string>();
  for (let i = 1; i < filas.length; i++) {
    const clave = normalizar(String(filas[i]?.[0] ?? '')).replace(/\s/g, '_');
    if (clave) mapa.set(clave, String(filas[i]?.[1] ?? ''));
  }
  const v = (k: string) => mapa.get(normalizar(k).replace(/\s/g, '_'));

  const cortes = {
    amarillo: fraccion(v(CLAVES.corteAmarillo), POR_DEFECTO.cortes.amarillo),
    rojo: fraccion(v(CLAVES.corteRojo), POR_DEFECTO.cortes.rojo)
  };
  // Amarillo tiene que entrar antes que rojo. Al revés, el amarillo nunca se
  // vería: se evalúa rojo primero. Se ignoran los dos en vez de dibujar un
  // semáforo que no significa nada.
  if (cortes.amarillo >= cortes.rojo) {
    cortes.amarillo = POR_DEFECTO.cortes.amarillo;
    cortes.rojo = POR_DEFECTO.cortes.rojo;
  }

  return {
    avisoPocosLugares: numero(v(CLAVES.avisoPocosLugares),
      POR_DEFECTO.avisoPocosLugares, 0, 10000),
    cupoNormal: numero(v(CLAVES.cupoNormal), POR_DEFECTO.cupoNormal, 1, 100000),
    horaApertura: String(v(CLAVES.horaApertura) ?? '').trim() || POR_DEFECTO.horaApertura,
    horaCierre: String(v(CLAVES.horaCierre) ?? '').trim() || POR_DEFECTO.horaCierre,
    diasAbiertos: aDiasSemana(v(CLAVES.diasAbiertos)) ?? POR_DEFECTO.diasAbiertos,
    diasAFuturo: numero(v(CLAVES.diasAFuturo), POR_DEFECTO.diasAFuturo, 1, 3650),
    cortes
  };
}

/** La configuración como filas, para escribirla de vuelta. */
export function aFilasConfig(c: Config): string[][] {
  return [
    [COL_CONFIG.clave, COL_CONFIG.valor],
    [CLAVES.avisoPocosLugares, String(c.avisoPocosLugares)],
    [CLAVES.cupoNormal, String(c.cupoNormal)],
    [CLAVES.horaApertura, c.horaApertura],
    [CLAVES.horaCierre, c.horaCierre],
    [CLAVES.diasAbiertos, deDiasSemana(c.diasAbiertos)],
    [CLAVES.diasAFuturo, String(c.diasAFuturo)],
    [CLAVES.corteAmarillo, String(Math.round(c.cortes.amarillo * 100))],
    [CLAVES.corteRojo, String(Math.round(c.cortes.rojo * 100))]
  ];
}

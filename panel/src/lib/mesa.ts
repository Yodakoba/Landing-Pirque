/**
 * **La mesa de una reserva: lo que se agregó y el valor final** (2026-11-17,
 * lo pidió el cliente).
 *
 * *"Pasa mucho que viene una reserva, comen los menús, pero vienen dos
 * personas más o un niño más que come a la carta."* Desde la apertura del
 * día, la anfitriona y el jefe de turno **agregan gente a la mesa** —cada uno
 * con un menú o *a la carta*— y, al cerrarla, **anotan el valor final**: el
 * total de la cuenta en Fudo, con lo ya pagado incluido (lo decidió el
 * cliente). Los productos de la carta y las bebidas no se registran: basta
 * el total. **No hay marca de "cuadra con Fudo"**: *"solo importante el
 * registro"*; la gerencia lo lee en la página del día.
 *
 * - **Agregar no es rectificar.** Rectificar corrige lo pactado —llegaron
 *   menos, otro menú, un descuento— con motivo. Agregar suma gente que no
 *   estaba en la reserva, y no pide motivo.
 * - **Se guarda aparte** (`Agregados`, `Valor final`, `Mesa cerrada`), con el
 *   formato de siempre de los menús: *"1 × Tradiciones + 2 × A la carta"*.
 *   Shopify y la cotización no lo tocan.
 * - **Suma a los números del día** (`personasEnLaMesa()`, `menuEnLaMesa()`):
 *   la gente cuenta, y los menús agregados entran en lo que hay que preparar.
 *   *A la carta* suma gente pero no menús.
 *
 * Puro, sin red ni planilla, para poder probarlo.
 */
import type { Reserva } from './tipos.ts';
import { personasEfectivas, menuEfectivo, type Rectificacion } from './rectificacion.ts';

/** El nombre de lo que no es menú: comen de la carta. */
export const A_LA_CARTA = 'A la carta';

/** Más que esto en una línea es un error de dedo, no una mesa. */
export const MAXIMO_AGREGADOS = 40;

/** Un valor final sobre esto es un cero de más. */
export const MAXIMO_VALOR_FINAL = 50_000_000;

export interface Agregado { menu: string; cantidad: number }

const esCarta = (m: string) => m.trim().toLowerCase() === A_LA_CARTA.toLowerCase();

/** *"1 × Tradiciones + 2 × A la carta"* → la lista. Lo que no se entiende se salta. */
export function leerAgregados(texto: unknown): Agregado[] {
  const salida: Agregado[] = [];
  for (const parte of String(texto ?? '').split('+')) {
    const m = /^\s*(\d+)\s*[×x]\s*(.+?)\s*$/i.exec(parte);
    if (!m) continue;
    const cantidad = Number(m[1]);
    const menu = esCarta(m[2]) ? A_LA_CARTA : m[2];
    if (!(cantidad > 0)) continue;
    const ya = salida.find((x) => x.menu.toLowerCase() === menu.toLowerCase());
    if (ya) ya.cantidad += cantidad;
    else salida.push({ menu, cantidad });
  }
  return salida;
}

/** La lista → el texto que se guarda. Los menús primero, *a la carta* al final. */
export function escribirAgregados(lista: Agregado[]): string {
  const juntos = leerAgregados(lista.map((a) => `${Math.round(a.cantidad)} × ${a.menu}`).join(' + '));
  return [...juntos.filter((a) => !esCarta(a.menu)), ...juntos.filter((a) => esCarta(a.menu))]
    .map((a) => `${a.cantidad} × ${a.menu}`).join(' + ');
}

export function cuantosAgregados(texto: unknown): number {
  return leerAgregados(texto).reduce((n, a) => n + a.cantidad, 0);
}

/** Solo los menús agregados, sin *a la carta*: lo que va a la cocina. */
export function menusAgregados(texto: unknown): string {
  return leerAgregados(texto).filter((a) => !esCarta(a.menu)).map((a) => `${a.cantidad} × ${a.menu}`).join(' + ');
}

/** Cuántos comen a la carta. */
export function aLaCarta(texto: unknown): number {
  return leerAgregados(texto).filter((a) => esCarta(a.menu)).reduce((n, a) => n + a.cantidad, 0);
}

type ConMesa = Pick<Reserva, 'personas' | 'menu'> & Rectificacion & { agregados?: string };

/** La gente de la mesa: la de la reserva (o la rectificada) más la agregada. */
export function personasEnLaMesa(r: ConMesa): number {
  return personasEfectivas(r) + cuantosAgregados(r.agregados);
}

/** Lo que se sirve en la mesa: el menú de la reserva más los menús agregados. */
export function menuEnLaMesa(r: ConMesa): string {
  return [menuEfectivo(r), menusAgregados(r.agregados)].filter((x) => String(x ?? '').trim()).join(' + ');
}

/**
 * **Lo que llega del navegador, limpio.** `null` si no se entiende: una línea
 * sin número, un nombre con símbolos o una cantidad que no es de una mesa. Un
 * texto vacío es válido: no hay agregados.
 */
export function limpiarAgregados(valor: unknown): string | null {
  const t = String(valor ?? '').trim();
  if (!t) return '';
  const partes = t.split('+').map((p) => p.trim()).filter(Boolean);
  for (const p of partes) {
    const m = /^(\d+)\s*[×x]\s*(.+)$/i.exec(p);
    if (!m) return null;
    const n = Number(m[1]);
    if (!(n >= 0 && n <= MAXIMO_AGREGADOS)) return null;
    if (m[2].length > 60 || /[<>{}|\\]/.test(m[2])) return null;
  }
  const lista = leerAgregados(t);
  if (lista.reduce((n, a) => n + a.cantidad, 0) > MAXIMO_AGREGADOS) return null;
  return escribirAgregados(lista);
}

/** El valor final: un entero en pesos, o `null` si se borró. `undefined` si no se entiende. */
export function limpiarValorFinal(valor: unknown): number | null | undefined {
  if (valor === null || valor === '' || valor === undefined) return null;
  const n = Number(String(valor).replace(/[$.\s]/g, '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0 || n > MAXIMO_VALOR_FINAL) return undefined;
  return Math.round(n);
}

/**
 * **Cuántos llegaron, después de agregar.** Si la recepción ya había anotado
 * cuántos llegaron, los agregados se suman (o restan) ahí también: son gente
 * que está en la mesa. Si no había nada anotado, sigue sin haber.
 */
export function llegaronDespues(llegaron: number | null | undefined, antes: unknown, despues: unknown): number | null {
  if (llegaron == null) return null;
  return Math.max(0, Number(llegaron) + cuantosAgregados(despues) - cuantosAgregados(antes));
}

/** *"+3: 1 × Tradiciones · 2 a la carta"*, o vacío. */
export function resumenAgregados(texto: unknown): string {
  const lista = leerAgregados(texto);
  if (!lista.length) return '';
  const n = lista.reduce((s, a) => s + a.cantidad, 0);
  return `+${n}: ` + lista.map((a) => esCarta(a.menu) ? `${a.cantidad} a la carta` : `${a.cantidad} × ${a.menu}`).join(' · ');
}

/**
 * **Las opciones para agregar**: los menús de la propia reserva primero —una
 * mesa de un evento con Lo Pirque ofrece Lo Pirque—, después los del
 * formulario de reserva, y *a la carta* al final. Sin repetir.
 */
export function opcionesParaAgregar(menuDeLaReserva: string, menusDelSitio: string[]): string[] {
  const propios = String(menuDeLaReserva ?? '').split('+')
    .map((p) => /^\s*\d+\s*[×x]\s*(.+?)\s*$/i.exec(p)?.[1] ?? '').filter(Boolean);
  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const m of [...propios, ...menusDelSitio]) {
    const k = m.toLowerCase().replace(/^men[uú]\s+/, '');
    if (!m || esCarta(m) || vistos.has(k)) continue;
    vistos.add(k); salida.push(m);
  }
  return [...salida, A_LA_CARTA];
}

/** La mesa que dice *Mesa cerrada*: *"2026-11-17 17:40 · Fernanda"*. */
export function marcaMesa(cuando: string, quien: string): string {
  return `${cuando} · ${quien || 'alguien'}`;
}

export function partesMarcaMesa(m: unknown): { cuando: string; quien: string } | null {
  const t = String(m ?? '').trim();
  if (!t) return null;
  const [cuando = '', quien = ''] = t.split(' · ');
  return { cuando, quien };
}

/** El registro de las mesas de un día: para la gerencia. */
export function mesasDelDia(reservas: (Reserva & { agregados?: string; valorFinal?: number | null })[]): {
  conValor: number; total: number; sinValor: number; agregadas: number; aLaCarta: number;
} {
  const vinieron = reservas.filter((r) => /^s[ií]$/i.test(String(r.asistencia ?? '').trim()) || r.valorFinal != null);
  const conValor = vinieron.filter((r) => r.valorFinal != null);
  return {
    conValor: conValor.length,
    total: conValor.reduce((s, r) => s + (Number(r.valorFinal) || 0), 0),
    sinValor: vinieron.length - conValor.length,
    agregadas: reservas.reduce((s, r) => s + cuantosAgregados(r.agregados), 0),
    aLaCarta: reservas.reduce((s, r) => s + aLaCarta(r.agregados), 0)
  };
}

/** *$264.000* */
export const pesosCL = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

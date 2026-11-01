/**
 * Lo que se escribe en una celda de la planilla, a salvo de Sheets.
 *
 * **Vive aparte de `sheets.ts` a propósito**, por el mismo motivo que
 * `filas.ts`: acá no se importa `googleapis`, así que esto se puede probar
 * sin red y sin credenciales. Y hace falta probarlo, porque es justo la
 * pieza cuyo error se ve recién en la planilla del cliente, ya escrito.
 */

/**
 * Lo que se le manda a Sheets, **a salvo de que lo lea como fórmula**.
 *
 * `valueInputOption: 'USER_ENTERED'` hace que la API interprete cada celda
 * igual que si alguien la tecleara: un `=`, un `+`, un `-` o un `@` adelante
 * abren una fórmula. Eso destruyó dos datos reales de este proyecto, y los
 * dos en silencio —la celda queda con `#ERROR!` y el panel la lee así:
 *
 * - **El teléfono.** `telefonoNormal()` escribe `+56 9 1234 5678`, y la
 *   planilla guardaba `#ERROR! (Formula parse error.)` en vez del número. Lo
 *   pilló el cliente el 2026-11-01, con una compra de prueba: la columna de
 *   contacto de la reserva decía eso.
 * - **Los ajustes de un turno.** Con dos o más, la celda es `-5000|12000`, y
 *   `|` no es un operador de Sheets: el mismo `#ERROR!`, esta vez sobre
 *   plata que alguien tiene que cobrar.
 *
 * El `'` adelante es la forma que tiene Sheets de decir "esto es texto".
 * **No se guarda ni se lee**: lo que vuelve por la API es el valor tal cual.
 *
 * **Solo se escapa lo que no es un número**, y eso importa: un ajuste de
 * `-5000` solo tiene que seguir siendo el número -5000, porque esta planilla
 * la abre una persona y suma columnas con sus propias fórmulas.
 *
 * Ojo para quien pruebe esto: **la planilla falsa del entorno de desarrollo
 * no puede reproducirlo**. Es un archivo JSON que guarda las cadenas tal
 * cual, así que `-5000|12000` "funciona" ahí y revienta en la planilla de
 * verdad. Por eso lo que lo fija es una prueba sobre `valorSeguro()`.
 */
export function valorSeguro(v: unknown): unknown {
  if (typeof v !== 'string') return v;
  if (!/^[=+\-@]/.test(v)) return v;
  // Un número con signo es un número: -5000 se queda como -5000.
  if (v.trim() !== '' && Number.isFinite(Number(v))) return v;
  return `'${v}`;
}

/** Una fila entera, celda por celda. */
export const celdas = (fila: unknown[]) => fila.map(valorSeguro);

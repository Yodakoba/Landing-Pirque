/**
 * **Los comentarios del equipo** (2026-11-12): errores, dudas, ideas y lo que
 * le falta a cada uno para su trabajo, mandados desde el botón 💬 Comentar
 * de cualquier pantalla.
 *
 * **Van a la planilla del testeo, no a la del panel.** El cliente ya trabaja
 * los comentarios en *Gran Testeo - Panel* (cuenta contacto@), con su hoja
 * `Comentarios` y un `Panel` que arma un Apps Script. El panel escribe ahí
 * una fila con **las mismas once columnas y en el mismo orden**, así que su
 * forma de trabajarlos no cambia. La planilla se elige con la variable
 * `COMENTARIOS_SHEET_ID` y tiene que estar compartida con la cuenta de
 * servicio del panel como editor.
 *
 * **Quién, con qué rol y desde qué pantalla no lo escribe la persona**: lo
 * pone el servidor desde la sesión. Son menos campos y datos exactos.
 *
 * Puro, para probarlo sin red.
 */

/** Las cuatro clases, con el mismo texto que usa la planilla para contarlas. */
export const TIPOS_COMENTARIO = ['🧩 Me falta', '🐞 Algo falla', '🤔 No se entiende', '💡 Idea'] as const;
export type TipoComentario = (typeof TIPOS_COMENTARIO)[number];

/** La pestaña y sus columnas, en el orden de la planilla del testeo. */
export const HOJA_COMENTARIOS = 'Comentarios';
export const COLUMNAS_COMENTARIOS = ['Fecha', 'Rol', 'Nombre', 'Tipo', 'Dónde', 'Qué pasó / qué necesita',
  'Para qué lo necesita', 'Estado', 'Prioridad', 'Respuesta / qué se hizo', 'Fecha resuelto'] as const;

export const LARGO_TEXTO = 2000;
export const LARGO_PARA = 1000;

export interface Comentario {
  tipo: TipoComentario;
  texto: string;
  para: string;
  pantalla: string;
}

/** Lo que llega del navegador, limpio; o el error en palabras. */
export function limpiarComentario(cuerpo: unknown): { comentario: Comentario } | { error: string } {
  const c = (cuerpo ?? {}) as Record<string, unknown>;
  const t = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);
  const tipo = TIPOS_COMENTARIO.find((x) => x === c.tipo);
  if (!tipo) return { error: 'Elige qué es: me falta, algo falla, no se entiende o una idea.' };
  const texto = t(c.texto, LARGO_TEXTO);
  if (!texto) return { error: 'Escribe qué pasó o qué necesitas.' };
  return { comentario: { tipo, texto, para: t(c.para, LARGO_PARA), pantalla: t(c.pantalla, 80) } };
}

/**
 * La fila tal como va a la planilla. El estado nace en *Nuevo*, que es lo que
 * el Panel del cliente cuenta como pendiente; prioridad, respuesta y fecha
 * resuelto quedan para quien los trabaja.
 */
export function filaComentario(c: Comentario, quien: { nombre: string; rol: string }, fecha: string): string[] {
  return [fecha, quien.rol, quien.nombre, c.tipo, c.pantalla, c.texto, c.para, 'Nuevo', '', '', ''];
}

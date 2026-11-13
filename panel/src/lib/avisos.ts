/**
 * **Los avisos fijos que cada persona puede cerrar para siempre**
 * (2026-11-13, lo pidió el cliente: una ✕ *"que realmente funciona… ok, lo he
 * leído y ahora no me lo muestras más"*, primero en Cotizaciones y después
 * en *"los otros avisos fijos del panel"*).
 *
 * Un aviso fijo es un texto que explica la pantalla y no cambia con los
 * datos. **Los avisos que dependen de los datos no se cierran** —sobrecupo,
 * días por cerrar, pendientes, avisos de la recepción—: tienen que volver
 * cada vez que haya algo.
 *
 * Esta lista es la única puerta: una clave que no está acá no se guarda en
 * la cuenta ni se lee de ella. Archivo puro, sin `node:crypto`, para que lo
 * usen la cookie de sesión (Edge), las rutas y la pantalla.
 */
export const AVISOS_CERRABLES = [
  'cotizaciones-cupo',
  'equipo-intro', 'equipo-propina', 'equipo-contratado', 'equipo-desactivar',
  'turnos-intro', 'turnos-cerrado', 'turnos-preparacion',
  'extras-intro', 'extras-sin-confirmar', 'extras-fichas',
  'informe-masiva', 'informe-copiar', 'informe-contratado', 'informe-planilla',
  'menus-intro', 'menus-desactivar',
  'clientes-intro',
  'config-intro', 'config-clave',
  'usuarios-intro', 'usuarios-emergencia',
  'bitacora-intro',
  'vendedores-comision',
  'recepcion-avisar'
] as const;
export type AvisoCerrable = typeof AVISOS_CERRABLES[number];

export const esAvisoCerrable = (x: unknown): x is AvisoCerrable =>
  (AVISOS_CERRABLES as readonly string[]).includes(String(x));

/** Una lista cualquiera, limpia: solo claves conocidas y sin repetir. */
export function soloAvisosConocidos(lista: unknown): AvisoCerrable[] {
  const salida: AvisoCerrable[] = [];
  for (const x of Array.isArray(lista) ? lista : String(lista ?? '').split(',')) {
    const c = String(x).trim();
    if (esAvisoCerrable(c) && !salida.includes(c)) salida.push(c);
  }
  return salida;
}

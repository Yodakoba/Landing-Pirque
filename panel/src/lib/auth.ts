/**
 * La comprobación de la credencial, aparte del middleware para poder
 * probarla con node sin levantar Next.
 */

/**
 * Comparación en tiempo constante.
 *
 * No corta al primer carácter distinto: si lo hiciera, el tiempo de
 * respuesta diría cuántos caracteres se acertaron, y una clave se puede
 * adivinar letra por letra midiendo eso.
 *
 * La diferencia de largo sí se nota —se devuelve antes—, pero eso solo
 * revela el LARGO de la clave, no su contenido.
 */
export function iguales(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let distintos = 0;
  for (let i = 0; i < a.length; i++) {
    distintos |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return distintos === 0;
}

/**
 * Valida una cabecera `Authorization: Basic <base64>` contra el usuario y
 * la clave esperados.
 */
export function credencialValida(cabecera: string, usuario: string, clave: string): boolean {
  const m = /^Basic\s+(.+)$/i.exec(String(cabecera).trim());
  if (!m) return false;

  let plano: string;
  try {
    plano = atob(m[1]);
  } catch {
    return false;                       // base64 inválido
  }

  // El usuario no puede llevar ":", así que el primero separa. La clave sí
  // puede llevarlos, y por eso NO se usa split.
  const corte = plano.indexOf(':');
  if (corte === -1) return false;

  // Las dos comparaciones se hacen SIEMPRE, sin cortocircuito: con `&&`,
  // un usuario equivocado respondería sin llegar a comparar la clave, y
  // ese atajo también se mide.
  const okUsuario = iguales(plano.slice(0, corte), usuario);
  const okClave = iguales(plano.slice(corte + 1), clave);
  return okUsuario && okClave;
}

/**
 * La sesión: un token firmado que viaja en una cookie.
 *
 * **Reemplaza a la autenticación básica**, y el motivo no es estético: con
 * una clave por rol, la bitácora solo podía decir "lo hizo un encargado".
 * Para decir *quién* hacen falta cuentas con nombre, y para eso hace falta
 * una sesión.
 *
 * Dos cosas de implementación que mandan sobre el resto del archivo:
 *
 * - **Firma con WebCrypto (`crypto.subtle`), no con `node:crypto`.** El
 *   middleware de Next corre en el runtime Edge, donde `node:crypto` no
 *   existe. WebCrypto sí, y existe igual en Node, así que el mismo archivo
 *   sirve en los dos lados. Por eso todo acá es asíncrono.
 * - **El token lleva el rol adentro, firmado.** Así una ruta sabe quién es
 *   quien llama sin ir a la planilla en cada petición. El costo a asumir:
 *   cambiarle el rol a alguien no le cambia la sesión en curso; empieza a
 *   regir cuando vuelve a entrar. Con sesiones de 7 días eso puede tardar,
 *   así que para sacar a alguien de verdad hay que desactivarlo **y** que
 *   su sesión caduque, o cambiar el secreto, que cierra todas.
 *
 * El token NO está cifrado, solo firmado: cualquiera que lo tenga puede leer
 * el usuario y el rol que dice. Da lo mismo —esa persona ya tiene la cookie,
 * o sea la sesión entera— y lo que importa es que no pueda **cambiarlos**,
 * que es lo que impide la firma.
 */

/** Siete días. Ver DESPLIEGUE.md: se eligió con el cliente el 2026-10-21. */
export const DURACION_SESION = 7 * 24 * 60 * 60;

export interface Sesion {
  /** El usuario con el que entró. */
  usuario: string;
  /** Su rol al momento de entrar. */
  rol: string;
  /** Cuándo caduca, en segundos desde epoch. */
  expira: number;
}

export const COOKIE_SESION = 'sesion';

/* ---------- base64 apto para una URL ---------- */

function aBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(s: string): Uint8Array {
  const normal = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* ---------- la firma ---------- */

// Importar la clave cuesta, y el secreto no cambia dentro de un proceso.
const claves = new Map<string, Promise<CryptoKey>>();

function clave(secreto: string): Promise<CryptoKey> {
  let c = claves.get(secreto);
  if (!c) {
    c = crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secreto),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
    );
    claves.set(secreto, c);
  }
  return c;
}

/**
 * Arma el token de una sesión.
 *
 * `ahora` se puede pasar para poder probar la caducidad sin esperar siete
 * días.
 */
export async function firmarSesion(
  datos: { usuario: string; rol: string },
  secreto: string,
  ahora = Math.floor(Date.now() / 1000),
  duracion = DURACION_SESION
): Promise<string> {
  const cuerpo: Sesion = {
    usuario: datos.usuario, rol: datos.rol, expira: ahora + duracion
  };
  const payload = aBase64Url(new TextEncoder().encode(JSON.stringify(cuerpo)));
  const firma = await crypto.subtle.sign(
    'HMAC', await clave(secreto), new TextEncoder().encode(payload)
  );
  return `${payload}.${aBase64Url(new Uint8Array(firma))}`;
}

/**
 * Lee un token y devuelve la sesión, o `null` si no sirve.
 *
 * **Null para todo lo que falle**: firma mala, token manoseado, basura,
 * caducado. Quien llama no necesita distinguirlos —en todos los casos la
 * respuesta es "vuelve a entrar"— y devolver motivos distintos solo le
 * enseñaría a alguien qué parte acertó.
 *
 * La comparación de la firma la hace `crypto.subtle.verify`, que no corta al
 * primer byte distinto.
 */
export async function leerSesion(
  token: unknown, secreto: string, ahora = Math.floor(Date.now() / 1000)
): Promise<Sesion | null> {
  const texto = String(token ?? '');
  if (!secreto || !texto) return null;

  const corte = texto.indexOf('.');
  if (corte === -1) return null;
  const payload = texto.slice(0, corte);
  const firma = texto.slice(corte + 1);
  if (!payload || !firma) return null;

  try {
    const ok = await crypto.subtle.verify(
      'HMAC', await clave(secreto), deBase64Url(firma),
      new TextEncoder().encode(payload)
    );
    if (!ok) return null;

    const datos = JSON.parse(new TextDecoder().decode(deBase64Url(payload)));
    const sesion: Sesion = {
      usuario: String(datos?.usuario ?? ''),
      rol: String(datos?.rol ?? ''),
      expira: Number(datos?.expira ?? 0)
    };
    if (!sesion.usuario || !sesion.rol) return null;
    if (!Number.isFinite(sesion.expira) || sesion.expira <= ahora) return null;
    return sesion;
  } catch {
    // base64 inválido, JSON roto, lo que sea: no es una sesión.
    return null;
  }
}

/**
 * El secreto con el que se firman las sesiones.
 *
 * **Si no hay `SESION_SECRETO`, se deriva de `PANEL_CLAVE`.** No es una
 * comodidad: sin esto, el primer despliegue después de este cambio dejaría
 * a todo el mundo sin poder entrar hasta que alguien creara una variable
 * nueva, y descubrirlo en ese momento es caro. `PANEL_CLAVE` ya existe y ya
 * es secreta.
 *
 * La consecuencia, que conviene saber: **cambiar `PANEL_CLAVE` cierra todas
 * las sesiones abiertas.** Eso es más bien bueno —es la forma de echar a
 * todos de una vez— pero sorprende si no se espera.
 */
export function secretoDeSesion(env: Record<string, string | undefined>): string {
  const propio = String(env.SESION_SECRETO ?? '').trim();
  if (propio) return propio;
  const prestado = String(env.PANEL_CLAVE ?? '').trim();
  // El prefijo evita que el secreto de firma sea literalmente la contraseña
  // del panel, por si alguna vez una de las dos se filtra sola.
  return prestado ? `sesion:${prestado}` : '';
}

/* ---------- La cookie ---------- */

/**
 * Una cookie por su nombre, leída de la cabecera.
 *
 * Se parsea a mano en vez de usar `cookies()` de Next por dos razones: esto
 * tiene que servir con un `Request` pelado —lo que reciben las rutas— y
 * tiene que poder cargarse en las pruebas, que corren con node y no pueden
 * importar `next/server`.
 */
export function cookieDe(cabecera: unknown, nombre: string): string {
  for (const trozo of String(cabecera ?? '').split(';')) {
    const corte = trozo.indexOf('=');
    if (corte === -1) continue;
    if (trozo.slice(0, corte).trim() !== nombre) continue;
    try {
      return decodeURIComponent(trozo.slice(corte + 1).trim());
    } catch {
      return trozo.slice(corte + 1).trim();
    }
  }
  return '';
}

/**
 * Las cuentas del panel: quién entra, con qué nombre y con qué rol.
 *
 * Nacieron el 2026-10-21 porque la bitácora las necesitaba: con una clave
 * compartida por rol, el registro solo podía decir "lo hizo un encargado",
 * y eso no sirve para rastrear quién tocó un monto.
 *
 * **Este archivo usa `node:crypto` y por eso NO lo puede importar el
 * middleware**, que corre en Edge. La división es a propósito y vale la pena
 * tenerla presente al tocar imports: verificar una contraseña ocurre una vez,
 * al entrar, en una ruta normal; leer la sesión ocurre en cada petición,
 * también en el middleware, y eso vive en `sesion.ts` con WebCrypto.
 */
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { normalizar } from './columnas.ts';
import { ROL, ROLES_DE_CUENTA, esRolDeCuenta, LARGO_MINIMO_CLAVE,
         ENCARGADO_COMPARTIDO, type Rol } from './auth.ts';
// Se vuelven a exportar para que quien trabaje con cuentas los encuentre
// acá, aunque vivan en auth.ts por el bundle del navegador.
export { ROLES_DE_CUENTA, esRolDeCuenta, LARGO_MINIMO_CLAVE, ENCARGADO_COMPARTIDO };
import { esSi } from './equipo.ts';

export const HOJA_USUARIOS = 'Usuarios';

export const COL_USUARIOS = {
  nombre: 'Nombre',
  usuario: 'Usuario',
  rol: 'Rol',
  activo: 'Activo',
  clave: 'Clave (huella)'
} as const;

export interface Usuario {
  /** Cómo se llama la persona. Es lo que sale en la bitácora. */
  nombre: string;
  /** Con qué escribe al entrar. Sin espacios y sin distinguir mayúsculas. */
  usuario: string;
  rol: Rol;
  activo: boolean;
  /**
   * La huella de su contraseña, nunca la contraseña.
   *
   * En blanco significa **sin contraseña puesta todavía**, y alguien así no
   * puede entrar: `claveCalza()` rechaza el vacío. Es el estado de una
   * cuenta recién creada a la que aún no le asignaron clave.
   */
  huella: string;
}

/* ---------- La huella de la contraseña ---------- */

/**
 * `scrypt`, no un HMAC ni un SHA pelado.
 *
 * La diferencia importa porque **la huella vive en la planilla**, y quien la
 * abra la va a ver. Con un SHA, una lista de contraseñas comunes la rompe en
 * segundos. `scrypt` está hecho para que cada intento cueste memoria y
 * tiempo, así que probar un diccionario entero deja de ser gratis.
 *
 * El costo a asumir: verificar una contraseña tarda decenas de milisegundos.
 * Es aceptable porque **ocurre una sola vez, al entrar** — después manda la
 * cookie de sesión, que se verifica con una firma barata.
 */
const LARGO = 32;

export function hashDeClave(clave: string, sal = randomBytes(16).toString('hex')): string {
  const derivada = scryptSync(String(clave), sal, LARGO).toString('hex');
  return `scrypt$${sal}$${derivada}`;
}

/**
 * Si una contraseña corresponde a una huella.
 *
 * **El vacío nunca calza**, ni la contraseña vacía ni la huella vacía. Una
 * cuenta sin clave puesta no es una cuenta que se abre con nada: es una
 * cuenta que todavía no se puede usar.
 */
export function claveCalza(clave: string, huella: string): boolean {
  const texto = String(clave ?? '');
  const guardada = String(huella ?? '').trim();
  if (!texto || !guardada) return false;

  const partes = guardada.split('$');
  if (partes.length !== 3 || partes[0] !== 'scrypt') return false;
  const [, sal, esperada] = partes;
  if (!sal || !esperada) return false;

  try {
    const derivada = scryptSync(texto, sal, LARGO);
    const contra = Buffer.from(esperada, 'hex');
    // Largos distintos revientan timingSafeEqual, así que se descartan antes.
    if (contra.length !== derivada.length) return false;
    return timingSafeEqual(derivada, contra);
  } catch {
    return false;
  }
}

/* ---------- La pestaña ---------- */

export function leerUsuariosDe(filas: string[][]): Usuario[] {
  const salida: Usuario[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const usuario = String(filas[i]?.[1] ?? '').trim();
    if (!usuario || vistos.has(normalizar(usuario))) continue;
    vistos.add(normalizar(usuario));
    const rol = normalizar(String(filas[i]?.[2] ?? ''));
    salida.push({
      nombre: String(filas[i]?.[0] ?? '').trim() || usuario,
      usuario,
      // Un rol que no se reconoce cae a encargado, NO a administrador: un
      // error de tecleo en esa celda no puede repartir permisos de más.
      rol: esRolDeCuenta(rol) ? (rol as Rol) : ROL.encargado,
      activo: esSi(filas[i]?.[3]),
      huella: String(filas[i]?.[4] ?? '').trim()
    });
  }
  return salida;
}

export function aFilasUsuarios(lista: Usuario[]): string[][] {
  return [
    [COL_USUARIOS.nombre, COL_USUARIOS.usuario, COL_USUARIOS.rol,
     COL_USUARIOS.activo, COL_USUARIOS.clave],
    ...lista.map((u) => [u.nombre, u.usuario, u.rol, u.activo ? 'Sí' : 'No', u.huella])
  ];
}

/**
 * La cuenta que corresponde a un nombre de usuario, si puede entrar.
 *
 * **Una cuenta desactivada no se encuentra.** Es la forma de echar a alguien
 * sin borrar su historia: sus líneas de la bitácora siguen diciendo quién
 * fue, y la puerta queda cerrada.
 *
 * El nombre de usuario no distingue mayúsculas ni tildes, igual que el resto
 * del panel. La contraseña sí: es una credencial.
 */
export function buscarUsuario(lista: Usuario[], usuario: unknown): Usuario | undefined {
  const buscado = normalizar(String(usuario ?? ''));
  if (!buscado) return undefined;
  return lista.find((u) => u.activo && normalizar(u.usuario) === buscado);
}

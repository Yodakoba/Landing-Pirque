/**
 * Los roles en palabras, para explicarlos **en el momento de elegirlos**
 * (2026-11-11, lo pidió el cliente: *"debo tener una explicación cuando
 * pongo este rol… va a haber más roles con distintos derechos"*).
 *
 * **Lo que cada rol puede no se escribe acá: se deduce de `PERMISOS`**, la
 * misma tabla que comprueban las rutas. Acá solo vive cómo se dice cada
 * permiso en castellano. Así la explicación no puede quedar vieja: el día
 * que un permiso cambie de manos, la lista que ve quien elige el rol cambia
 * sola. Y como `PALABRAS` es un `Record<Accion, …>`, un permiso nuevo sin
 * su frase no compila.
 *
 * Puro y sin `node:crypto`: lo importa la pantalla de cuentas.
 */
import { PERMISOS, ROL, puede, type Accion, type Rol } from './auth.ts';

/** Cómo se dice cada permiso, en el orden en que se lee la lista. */
export const PALABRAS: Record<Accion, string> = {
  ver: 'Ver el calendario y las reservas',
  reservas: 'Anotar, editar y borrar reservas',
  presupuestos: 'Cotizar: crear cotizaciones, marcarlas ganadas, cancelarlas',
  clientes: 'Ver y editar las fichas de clientes',
  dias: 'Abrir, cerrar y editar días del calendario',
  equipo: 'Planificar el equipo y marcar quién vino',
  extras: 'Agendar actividades extras (jinetes, pintacaritas)',
  cerrar: 'Cerrar el día',
  planilla: 'Mandar la planilla semanal al grupo',
  informe: 'Ver el informe de lo que se paga al equipo',
  pagar: 'Registrar pagos, revisar comprobantes y devoluciones',
  sueldos: 'Ver y editar sueldos y cuentas bancarias',
  links: 'Crear y copiar los links personales',
  puestos: 'Editar los puestos del equipo',
  corregir: 'Corregir un día ya cerrado',
  configurar: 'Cambiar precios, productos y Configuración',
  bitacora: 'Ver la bitácora de quién hizo qué',
  usuarios: 'Crear cuentas y cambiar roles',
  mantencion: 'Mantención técnica (Shopify a mano, diagnóstico)'
};

/** El nombre del rol tal como se lee en pantalla. */
export const NOMBRE_ROL: Record<string, string> = {
  [ROL.admin]: 'Administrador',
  [ROL.encargado]: 'Encargado',
  [ROL.pagos]: 'Pagos',
  [ROL.vendedor]: 'Vendedor'
};

/**
 * La línea corta que va bajo el rol elegido. Es lo único escrito a mano, y
 * por eso es una sola frase: el detalle es la lista de `resumenRol()`.
 */
export const RESUMEN_ROL: Record<string, string> = {
  [ROL.admin]: 'Puede todo, incluidas las cuentas del panel.',
  [ROL.encargado]: 'El día a día: reservas, días, equipo y cotizaciones. Sin plata ni configuración.',
  [ROL.pagos]: 'Lo del encargado, más la plata y la configuración. No toca cuentas.',
  [ROL.vendedor]: 'Ve todo el calendario; anota y cotiza, y solo toca lo suyo.'
};

/**
 * Qué puede y qué no un rol, en palabras, sacado de `PERMISOS`.
 *
 * El vendedor ve todo pero toca solo lo que anotó o cotizó él
 * (`puedeTocarReserva()`, `puedeTocarPresupuesto()`): eso no está en la
 * tabla, así que se dice al lado del permiso.
 */
export function resumenRol(rol: Rol): { puede: string[]; noPuede: string[] } {
  const si: string[] = [];
  const no: string[] = [];
  for (const a of Object.keys(PALABRAS) as Accion[]) {
    if (!(a in PERMISOS)) continue;
    let frase = PALABRAS[a];
    if (rol === ROL.vendedor && (a === 'reservas' || a === 'presupuestos')) {
      frase += ' — solo las suyas';
    }
    (puede(rol, a) ? si : no).push(frase);
  }
  return { puede: si, noPuede: no };
}

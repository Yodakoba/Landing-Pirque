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
  reservas: 'Editar y borrar reservas',
  anotar: 'Anotar una reserva nueva directo en el calendario',
  asistencia: 'Marcar si cada reserva vino o no',
  presupuestos: 'Cotizar: crear cotizaciones, marcarlas ganadas, cancelarlas',
  clientes: 'Ver y editar las fichas de clientes',
  dias: 'Agregar, abrir, cerrar y editar días del calendario',
  operarDia: 'Llevar el día: pedir más cupo, soltar reservas por cupo y avisar a los clientes',
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
  rectificar: 'Rectificar una reserva el día del servicio (personas, menús, descuento)',
  aprobar: 'Aprobar descuentos sobre el estándar',
  cupo: 'Subir el cupo de un día y aprobar los pedidos de más cupo',
  boleta: 'Marcar en el informe que llegó la boleta',
  exclusividad: 'Decidir si se libera un día para un evento exclusivo',
  vendedores: 'Ver el resumen de ventas y comisiones (el vendedor, solo el suyo)',
  configurar: 'Cambiar precios, productos y Configuración',
  bitacora: 'Ver la bitácora de quién hizo qué',
  usuarios: 'Crear cuentas y cambiar roles',
  mantencion: 'Mantención técnica (Shopify a mano, diagnóstico)'
};

/** El nombre del rol tal como se lee en pantalla. */
export const NOMBRE_ROL: Record<string, string> = {
  [ROL.admin]: 'Administrador',
  [ROL.gerencia]: 'Gerencia general',
  [ROL.operaciones]: 'Encargado de operaciones',
  [ROL.encargado]: 'Encargado de turno',
  [ROL.pagos]: 'Encargado de pagos',
  [ROL.vendedor]: 'Vendedor',
  [ROL.anfitrion]: 'Anfitrión'
};

/**
 * La línea corta que va bajo el rol elegido. Es lo único escrito a mano, y
 * por eso es una sola frase: el detalle es la lista de `resumenRol()`.
 */
export const RESUMEN_ROL: Record<string, string> = {
  [ROL.admin]: 'Puede todo, incluidas las cuentas del panel.',
  [ROL.gerencia]: 'Por ahora, lo mismo que el encargado de pagos. Sus derechos propios se definen después.',
  [ROL.operaciones]: 'Lo del encargado de turno, más aprobar descuentos, subir cupos, corregir días cerrados, decidir los eventos exclusivos y ver el informe. Sin pagos ni configuración.',
  [ROL.encargado]: 'El día a día: reservas, equipo —con la ficha completa, sueldos y cuenta— y cotizaciones. No agrega ni edita fechas. Sin el informe, pagos ni configuración.',
  [ROL.pagos]: 'Lo del encargado de turno, más la plata y la configuración. No toca cuentas.',
  [ROL.vendedor]: 'Ve todo el calendario y cotiza; sus reservas nacen de una cotización ganada, y solo toca lo suyo.',
  [ROL.anfitrion]: 'Recibe a los clientes: ve las reservas del día y marca si vinieron.'
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
    if (rol === ROL.encargado && a === 'reservas') frase += ' — las que anotó él y las de Shopify';
    (puede(rol, a) ? si : no).push(frase);
  }
  return { puede: si, noPuede: no };
}

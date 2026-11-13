/**
 * **El contacto de los clientes, recortado por rol en el servidor**
 * (2026-11-13, lo pidió el cliente: *"cada rol, cada persona, cada perfil
 * tiene que tener su… piensa bien la seguridad"*).
 *
 * Hasta ese día `/api/reservas` le mandaba a todo el que ve el calendario
 * —vendedor incluido— **todas las reservas de todos los días con teléfono,
 * correo, monto y nota de pago**, y `/api/presupuestos` y `/api/clientes`
 * le mandaban al vendedor las fichas de todos los clientes, con RUT y
 * domicilio. La pantalla dibujaba menos de lo que llegaba, pero lo que llega
 * al navegador ya salió: **lo que no se manda no se puede filtrar.**
 *
 * | Alcance | Quién | Qué ve del contacto |
 * |---|---|---|
 * | `todo` | administrador, operaciones, pagos, gerencia, y cualquier cuenta con *Vista gerencia* | todo |
 * | `desdeHoy` | encargado de turno | el de las reservas de hoy en adelante: lo necesita para avisar o llamar a un atrasado, no el historial |
 * | `propio` | vendedor | el de sus reservas y sus clientes; de los demás, el nombre y el teléfono tapado (`···· 5678`), para reconocer un cliente repetido sin tener el dato. Tampoco la plata de reservas ajenas |
 * | `nada` | anfitriona y cualquier rol que no se conozca | nada |
 *
 * **Un rol que no está en la lista cae en `nada`**: si mañana aparece un rol
 * nuevo, ve de menos hasta que alguien decida, nunca de más.
 *
 * Todo esto es puro y con pruebas; lo aplican las rutas.
 */
import { ROL, esSuya } from './auth.ts';
import type { Reserva } from './tipos.ts';
import type { Cliente } from './clientes.ts';

export type Alcance = 'todo' | 'desdeHoy' | 'propio' | 'nada';

export function alcanceDeContacto(rol: string, gerencia = false): Alcance {
  if (rol === ROL.admin || rol === ROL.operaciones || rol === ROL.pagos || rol === ROL.gerencia) return 'todo';
  // *Vista gerencia* amplía lo que se ve (`puedeVer()`): ve lo de la gerencia.
  if (gerencia && rol !== ROL.ninguno) return 'todo';
  if (rol === ROL.encargado) return 'desdeHoy';
  if (rol === ROL.vendedor) return 'propio';
  return 'nada';
}

/** Marca de un dato tapado: la pantalla no ofrece llamar ni escribir. */
const TAPA = '····';

/** `+56 9 4009 6228` → `···· 6228`. Sin número, vacío. */
export function taparTelefono(t: unknown): string {
  const d = String(t ?? '').replace(/\D/g, '');
  if (!d) return '';
  return d.length <= 4 ? TAPA : `${TAPA} ${d.slice(-4)}`;
}

export const estaTapado = (t: unknown) => String(t ?? '').includes(TAPA);

/**
 * Una reserva tal como la puede ver esta cuenta. `propia` la decide la ruta:
 * para el vendedor, la que anotó él o la que salió de una cotización suya.
 */
export function recortarReserva<T extends Reserva>(r: T, alcance: Alcance, { hoy, propia }: {
  hoy: string; propia: boolean;
}): T {
  if (alcance === 'todo') return r;
  if (alcance === 'desdeHoy' && r.fecha >= hoy) return r;
  if (alcance === 'propio' && propia) return r;
  const sinContacto = { ...r, telefono: taparTelefono(r.telefono), email: '', contactoTapado: true };
  // El encargado ve la plata de cualquier día —cierra los días—; el
  // vendedor y los demás, solo la de lo suyo.
  if (alcance === 'desdeHoy') return sinContacto;
  return { ...sinContacto, monto: null, notaPago: '', abonado: null, ingreso: null, descuento: null };
}

/**
 * Si un cliente es de este vendedor: lo creó él, o tiene una cotización
 * suya. Cotizarle a un cliente de otro lo vuelve suyo también —es atenderlo—
 * y queda en la bitácora como toda cotización.
 */
export function clientePropio(c: Pick<Cliente, 'id' | 'creadoPor'>, usuario: string,
  presupuestos: { idCliente?: string; creadoPor: string }[]): boolean {
  if (esSuya(usuario, c.creadoPor)) return true;
  return presupuestos.some((p) => p.idCliente === c.id && esSuya(usuario, p.creadoPor));
}

/** Una ficha de cliente tal como la puede ver esta cuenta. */
export function recortarCliente<T extends Cliente>(c: T, alcance: Alcance, propio: boolean): T {
  if (alcance === 'todo' || (alcance === 'propio' && propio)) return c;
  return { ...c, telefono: taparTelefono(c.telefono), correo: '', rut: '', domicilio: '', giro: '', notas: '',
    contactoTapado: true };
}

/** El contacto que una cotización trae copiado (`conCliente()`), tapado si no es suya. */
export function recortarContactoDeCotizacion<T extends { telefono?: string; email?: string; creadoPor: string }>(
  p: T, alcance: Alcance, usuario: string): T {
  if (alcance === 'todo' || (alcance === 'propio' && esSuya(usuario, p.creadoPor))) return p;
  return { ...p, telefono: taparTelefono(p.telefono), email: '' };
}

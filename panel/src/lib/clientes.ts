/**
 * Los clientes: **una ficha por cliente** (2026-11-10).
 *
 * Nace del primer error que reportó la vendedora en el CRM del socio: *"que
 * se ponga la información del cliente una vez"*. Allá el cliente quedaba
 * copiado tres veces —en el contacto, dentro de cada cotización y otra vez
 * en el contrato, que pedía de nuevo el RUT y el domicilio— y cada
 * cotización sin contacto creaba un cliente nuevo sin mirar si ya existía.
 *
 * Acá la ficha es **la única verdad sobre quién es el cliente**. Las
 * cotizaciones guardan solo su `ID Cliente`; la reserva que nazca de una
 * cotización lleva también el id, y el nombre y el teléfono se copian ahí
 * solo para que la planilla se lea a mano (ver la Fase 2).
 *
 * **No hay columna "empresa" en el sentido de Brasas o Calicanto**: cada
 * panel lee su propia planilla, y todo lo que hay en ella es de esa
 * empresa. La columna `Empresa del cliente` es otra cosa: la razón social de
 * quien cotiza, cuando es una empresa.
 *
 * Este archivo no toca la red: recibe filas y devuelve clientes.
 */
import { indices, normalizar } from './columnas.ts';
import { telefonoNormal, correoNormal, telefonoParaEnlace } from './contacto.ts';
import { rutLimpio } from './banco.ts';

export const HOJA_CLIENTES = 'Clientes';

/** Por nombre de columna: se agregan y se borran filas de a una. */
export const COL_CLIENTES = {
  id: 'ID',
  nombre: 'Nombre',
  empresa: 'Empresa del cliente',
  rut: 'RUT',
  domicilio: 'Domicilio',
  telefono: 'Teléfono',
  correo: 'Correo',
  notas: 'Notas',
  creadoPor: 'Creado por',
  creado: 'Creado',
  /**
   * El giro, para la factura (2026-11-10). **Al final y por nombre**: se
   * agrega sola la primera vez que se guarda una ficha.
   */
  giro: 'Giro'
} as const;

export const ENCABEZADO_CLIENTES: string[] = Object.values(COL_CLIENTES);

export interface Cliente {
  id: string;
  nombre: string;
  /** La razón social, si el cliente es una empresa. */
  empresa: string;
  rut: string;
  domicilio: string;
  /** El giro del cliente, para facturarle. */
  giro: string;
  telefono: string;
  correo: string;
  notas: string;
  creadoPor: string;
  creado: string;
  /** La fila en la planilla, 1-based. 0 si todavía no está escrita. */
  fila: number;
  /** El servidor tapó el contacto para esta cuenta: ver `privacidad.ts`. */
  contactoTapado?: boolean;
}

export type DatosCliente = Pick<Cliente,
  'nombre' | 'empresa' | 'rut' | 'domicilio' | 'giro' | 'telefono' | 'correo' | 'notas'>;

export function leerClientesDe(filas: string[][]): Cliente[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_CLIENTES);
  if (i.id === -1 || i.nombre === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? '').trim());
  const salida: Cliente[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n] ?? [];
    const id = en(f, i.id);
    const nombre = en(f, i.nombre);
    // Sin id no hay a qué apuntar; sin nombre no hay a quién mostrar.
    if (!id || !nombre) continue;
    salida.push({
      id, nombre,
      empresa: en(f, i.empresa), rut: en(f, i.rut), domicilio: en(f, i.domicilio),
      giro: en(f, i.giro),
      telefono: en(f, i.telefono), correo: en(f, i.correo), notas: en(f, i.notas),
      creadoPor: en(f, i.creadoPor), creado: en(f, i.creado),
      fila: n + 1
    });
  }
  return salida;
}

export function filaCliente(encabezado: string[], c: Omit<Cliente, 'fila'>): string[] {
  const i = indices(encabezado, COL_CLIENTES);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_CLIENTES.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  poner(i.id, c.id);
  poner(i.nombre, c.nombre);
  poner(i.empresa, c.empresa);
  poner(i.rut, c.rut);
  poner(i.domicilio, c.domicilio);
  poner(i.telefono, c.telefono);
  poner(i.correo, c.correo);
  poner(i.notas, c.notas);
  poner(i.creadoPor, c.creadoPor);
  poner(i.creado, c.creado);
  poner(i.giro, c.giro);
  return fila;
}

/**
 * Lo que llega del navegador, ordenado como lo guarda el resto del panel:
 * el teléfono con `+56`, el correo en minúsculas y el RUT con guion.
 */
export function limpiarCliente(e: Partial<Record<keyof DatosCliente, unknown>>): DatosCliente {
  const t = (v: unknown) => String(v ?? '').trim();
  return {
    nombre: t(e.nombre),
    empresa: t(e.empresa),
    rut: t(e.rut) ? rutLimpio(t(e.rut)) : '',
    domicilio: t(e.domicilio),
    giro: t(e.giro),
    telefono: t(e.telefono) ? telefonoNormal(e.telefono) : '',
    correo: correoNormal(e.correo),
    notas: t(e.notas)
  };
}

/**
 * Qué le falta a una ficha para guardarse, o vacío si nada.
 *
 * **Un nombre y una forma de contactarlo**, y nada más: el RUT y el
 * domicilio los pide el contrato, no la primera llamada. Pedirlos al
 * cotizar es justo lo que hace que alguien invente un RUT para poder seguir.
 */
export function faltaEnCliente(c: DatosCliente): string {
  if (!c.nombre) return 'Falta el nombre.';
  if (!c.telefono && !c.correo) return 'Falta un teléfono o un correo.';
  return '';
}

/**
 * Lo que le falta a una ficha **para facturarle**: razón social, RUT, giro
 * y dirección (2026-11-10). Vacío si está todo.
 *
 * Solo se pregunta cuando la cotización es con factura, y **avisa, no
 * bloquea**: el dato puede llegar después, igual que la boleta del equipo.
 */
export function faltaParaFactura(c: Pick<Cliente, 'empresa' | 'rut' | 'giro' | 'domicilio'>): string[] {
  const falta: string[] = [];
  if (!c.empresa.trim()) falta.push('razón social');
  if (!c.rut.trim()) falta.push('RUT');
  if (!c.giro.trim()) falta.push('giro');
  if (!c.domicilio.trim()) falta.push('dirección');
  return falta;
}

/** Solo los dígitos, para comparar dos teléfonos escritos distinto. */
const digitos = (v: string) => telefonoParaEnlace(v) || v.replace(/\D/g, '');

/**
 * Las fichas que **parecen el mismo cliente**: mismo RUT, mismo teléfono o
 * mismo correo. Se pregunta antes de crear otra —*"¿es este cliente?"*—
 * en vez de crearla en silencio, que es el error del CRM del socio.
 *
 * El nombre solo **no** cuenta: dos "Juan Pérez" son dos personas hasta que
 * algo más diga lo contrario. Un dato vacío tampoco: dos fichas sin correo
 * no se parecen por eso.
 */
export function parecidos(c: DatosCliente, lista: Cliente[], salvo = ''): Cliente[] {
  const rut = c.rut ? rutLimpio(c.rut).toUpperCase() : '';
  const tel = c.telefono ? digitos(c.telefono) : '';
  const correo = c.correo ? correoNormal(c.correo) : '';
  return lista.filter((x) => x.id !== salvo && (
    (rut && rutLimpio(x.rut).toUpperCase() === rut) ||
    (tel && x.telefono && digitos(x.telefono) === tel) ||
    (correo && correoNormal(x.correo) === correo)
  ));
}

/**
 * Un id que no choca con ninguno: `C-` y un número correlativo. Corto a
 * propósito, porque se lee en la planilla y se dice por teléfono.
 *
 * Si dos personas crean un cliente en el mismo segundo pueden sacar el mismo
 * número; por eso `crearCliente()` vuelve a mirar justo antes de escribir.
 */
export function nuevoIdCliente(lista: Pick<Cliente, 'id'>[]): string {
  let max = 0;
  for (const c of lista) {
    const m = c.id.match(/^C-(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `C-${String(max + 1).padStart(4, '0')}`;
}

/** Busca por nombre, empresa, teléfono, correo o RUT, sin tildes ni mayúsculas. */
export function buscarClientes(lista: Cliente[], texto: string): Cliente[] {
  const q = normalizar(texto).trim();
  if (!q) return lista;
  const qDig = q.replace(/\D/g, '');
  return lista.filter((c) =>
    normalizar(`${c.nombre} ${c.empresa} ${c.correo} ${c.rut}`).includes(q) ||
    (qDig.length >= 4 && c.telefono.replace(/\D/g, '').includes(qDig)));
}

/** Ordenados por nombre, como todas las listas de gente del panel. */
export function porNombreCliente(a: Cliente, b: Cliente): number {
  return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
}

/**
 * **La migración de los presupuestos que ya existen** a fichas.
 *
 * Hasta el 2026-11-10 cada presupuesto llevaba el cliente copiado adentro.
 * Esto decide, para cada uno sin `ID Cliente`, a qué ficha apunta: a una que
 * ya exista y se le parezca (mismo teléfono, correo o RUT, o el mismo
 * nombre escrito igual), o a una nueva. Dos presupuestos del mismo cliente
 * terminan en **una** ficha.
 *
 * Es pura: devuelve qué crear y qué vincular, y quien la llame escribe.
 */
export function migrarAClientes(
  presupuestos: { id: string; cliente: string; email: string; telefono: string; idCliente: string }[],
  existentes: Cliente[],
  quien: string,
  ahora: string
): { nuevos: Omit<Cliente, 'fila'>[]; vinculos: Record<string, string> } {
  const todos: Cliente[] = [...existentes];
  const nuevos: Omit<Cliente, 'fila'>[] = [];
  const vinculos: Record<string, string> = {};
  for (const p of presupuestos) {
    if (p.idCliente) continue;
    const datos = limpiarCliente({ nombre: p.cliente, telefono: p.telefono, correo: p.email });
    if (!datos.nombre) continue;
    const igual = parecidos(datos, todos)[0] ??
      todos.find((c) => normalizar(c.nombre) === normalizar(datos.nombre));
    if (igual) { vinculos[p.id] = igual.id; continue; }
    const nuevo = {
      id: nuevoIdCliente(todos), ...datos,
      creadoPor: quien, creado: ahora
    };
    nuevos.push(nuevo);
    todos.push({ ...nuevo, fila: 0 });
    vinculos[p.id] = nuevo.id;
  }
  return { nuevos, vinculos };
}

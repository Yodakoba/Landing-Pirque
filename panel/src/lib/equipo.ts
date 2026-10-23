/**
 * El equipo: quién trabaja, en qué puesto, y qué día.
 *
 * Son tres listas y una regla. Las listas viven en la planilla —`Puestos`,
 * `Trabajadores`, `Turnos`— y la regla es cuánta gente hace falta por puesto
 * según cuántos comensales hay. Este archivo no toca la red: recibe filas y
 * devuelve objetos, así que todo lo de acá se prueba con node.
 *
 * **Nada de esto llega al sitio público.** Quién trabaja mañana no es dato de
 * un visitante: `/api/publico/fechas` sigue devolviendo tres campos y el
 * recorte está fijado por una prueba en `publico.ts`. Las pestañas de este
 * archivo simplemente no las lee esa ruta.
 */
import { normalizar, indices } from './columnas.ts';
import { esFecha, semanaDe, sumarDias, type Fecha } from './fechas.ts';
import { iguales } from './auth.ts';
import { bancoVacio, leerBanco, filaBanco, COL_BANCO,
         type Banco } from './banco.ts';

export const HOJA_PUESTOS = 'Puestos';
export const HOJA_TRABAJADORES = 'Trabajadores';
export const HOJA_TURNOS = 'Turnos';

export const COL_PUESTOS = {
  puesto: 'Puesto',
  cadaCuantas: 'Uno cada N personas'
} as const;

export const COL_TRABAJADORES = {
  nombre: 'Nombre',
  telefono: 'Teléfono',
  puesto: 'Puesto habitual',
  activo: 'Activo',
  token: 'Token de acceso',
  modalidad: 'Modalidad',
  pagoJornada: 'Pago por jornada',
  valorHora: 'Valor hora extra',
  propina: 'Participa en propina',
  // La columna que hasta el 2026-10-22 era toda la cuenta bancaria en texto
  // libre. **Se queda en su lugar y cambia de nombre**: lo que alguien haya
  // escrito ahí no se pierde, pasa a leerse como lo que siempre fue, una
  // nota. Los datos de la transferencia van en los seis campos de después.
  nota: 'Nota de pago',
  ...COL_BANCO
} as const;

/**
 * Cómo se le paga a alguien, que no es lo mismo que cuánto.
 *
 * - **Por turno** — se le paga por jornada trabajada. Cada turno suma al
 *   costo del día.
 * - **Contratado** — tiene sueldo, y ese sueldo no sale de acá. Sus turnos
 *   **no suman jornada** al costo del día: contarlos sería sumar dos veces
 *   lo mismo, una en la liquidación y otra en la caja del sábado.
 *
 * Lo que sí se le puede anotar a un contratado son **horas extra y
 * ajustes**, porque esos sí son del día y se pagan aparte.
 *
 * La celda en blanco es **Por turno**, que es como funcionaba el panel antes
 * de que existiera esta distinción: así las fichas ya escritas siguen
 * significando lo mismo.
 */
export const MODALIDAD = { porTurno: 'Por turno', contratado: 'Contratado' } as const;

export function esContratado(v: unknown): boolean {
  const s = normalizar(String(v ?? ''));
  return s === 'contratado' || s === 'contratada' || s === 'contrato';
}

export const COL_TURNOS = {
  fecha: 'Fecha',
  trabajador: 'Trabajador',
  puesto: 'Puesto',
  asistencia: 'Asistencia',
  modalidad: 'Modalidad',
  propina: 'Propina',
  pagoJornada: 'Pago jornada',
  horasExtra: 'Horas extra',
  valorHora: 'Valor hora',
  ajuste: 'Ajuste',
  motivo: 'Motivo del ajuste'
} as const;

/**
 * La asistencia de un trabajador. Vacío es **todavía no se pasó lista**, que
 * no es lo mismo que no haber venido: antes del día no se puede saber.
 */
export const VINO = { sinMarcar: '', si: 'Sí', no: 'No' } as const;

export interface Puesto {
  /** Como se escribe y como se muestra. */
  nombre: string;
  /**
   * Uno cada cuántos comensales. **Cero significa "sin regla puesta", no
   * "ninguno hace falta".**
   *
   * Es la única forma en que el panel puede contestar "¿estoy bien con este
   * equipo?", y es dato del negocio: cuántos garzones por mesa se atiende
   * bien no lo sabe el código. Por eso arranca vacío y, mientras lo esté, el
   * panel no opina en vez de inventar un número.
   */
  cadaCuantas: number;
}

export interface Trabajador {
  nombre: string;
  telefono: string;
  /** El puesto que hace normalmente. Solo preselecciona: no obliga a nada. */
  puesto: string;
  /**
   * Si sigue en el equipo. **Se desactiva en vez de borrarse** cuando alguien
   * deja de trabajar: borrarlo dejaría sus turnos pasados sin dueño, y esos
   * turnos son el registro de quién trabajó qué día.
   */
  activo: boolean;
  /**
   * Lo que gana por una jornada, y lo que vale su hora extra. En pesos.
   *
   * **Son el valor de HOY**, el que se propone al pasar lista. Lo que
   * efectivamente se le pagó un día queda anotado en el turno, no acá: si
   * en marzo le subes la jornada, los turnos de noviembre no pueden cambiar
   * de monto solos.
   *
   * Cero significa **sin poner**, no gratis. El panel no inventa sueldos.
   */
  pagoJornada: number;
  valorHora: number;
  /** `Por turno` o `Contratado`. Ver MODALIDAD. */
  modalidad: string;
  /**
   * Si entra en el reparto de la propina.
   *
   * **La celda en blanco es SÍ**, porque la regla del negocio es que la
   * propina se reparte entre todo el equipo; quien no entra es la excepción,
   * y una excepción se marca, no se asume.
   */
  propina: boolean;
  /**
   * Dónde se le transfiere, con los campos que pide un banco. **Vive en la
   * ficha y no en el turno**: si alguien cambia de banco, se le paga a la
   * cuenta nueva, también lo que quedó pendiente de semanas anteriores. No
   * es un hecho de un día, es un dato de la persona.
   *
   * Existe para que la planilla que descarga quien paga **se pueda pegar en
   * la carga masiva del banco** sin separar nada a mano. Ver `banco.ts`.
   */
  banco: Banco;
  /**
   * La llave de su link personal, o vacío si todavía no tiene acceso.
   *
   * **Se guarda tal cual, no como hash, y es a propósito.** Un hash sería
   * más prudente si esto fuera una contraseña, pero no lo es: es un link que
   * el administrador tiene que poder volver a copiar y mandar por WhatsApp
   * cuando alguien lo pierda. Con un hash habría que renovarlo cada vez, o
   * sea cambiarle el link a la persona por haberlo extraviado.
   *
   * Lo que abre es **solo lectura y solo de lo suyo**: sus días y su puesto.
   * No hay plata, no hay reservas, no hay datos de otros trabajadores. Quien
   * ve la planilla ya es el administrador, así que no le revela nada que no
   * tenga.
   */
  token: string;
}

/**
 * Una suma o una resta del día, con su motivo.
 *
 * **Van varios por turno** y se guardan en las dos columnas que ya existían
 * —`Ajuste` y `Motivo del ajuste`—, como dos listas en paralelo separadas
 * por `|`. Se decidió así sobre abrir una pestaña nueva por una razón
 * concreta: el caso corriente es **un** ajuste, y en ese caso la celda se
 * ve exactamente como antes (`-5000` · `llegó tarde`), así que la planilla
 * sigue siendo legible y editable a mano para quien no sepa de esto. Con
 * dos, dice `5000|-20000` · `hora extra|adelanto`, que también se entiende.
 *
 * **Manda la lista de montos**: si alguien edita una celda y no la otra, los
 * motivos que falten se leen vacíos en vez de desalinear los pares.
 */
export interface Ajuste {
  monto: number;
  motivo: string;
}

/** Lo que separa un ajuste del siguiente dentro de la celda. */
const SEPARADOR = '|';

/** Lo que suman todos los ajustes de un turno. */
export const totalAjustes = (a: Ajuste[] | undefined) =>
  (a ?? []).reduce((n, x) => n + (x.monto || 0), 0);

/** Los motivos de los que tienen algo que decir, para mostrarlos juntos. */
export const motivosDe = (a: Ajuste[] | undefined) =>
  (a ?? []).map((x) => x.motivo.trim()).filter(Boolean).join(' · ');

/**
 * Lee las dos celdas como una lista de ajustes.
 *
 * Un ajuste en cero **con motivo** se conserva: alguien lo escribió, y
 * borrárselo por valer cero sería decidir por esa persona. Uno en cero y
 * sin motivo, en cambio, es una fila que quedó vacía y no se guarda.
 */
export function leerAjustes(montos: string, motivos: string): Ajuste[] {
  const m = String(montos ?? '').split(SEPARADOR);
  const r = String(motivos ?? '').split(SEPARADOR);
  const salida: Ajuste[] = [];
  for (let i = 0; i < m.length; i++) {
    const monto = aEntero(m[i], true);
    const motivo = String(r[i] ?? '').trim();
    if (!monto && !motivo) continue;
    salida.push({ monto, motivo });
  }
  return salida;
}

/** Las dos celdas, en el orden en que se leen. */
export function escribirAjustes(a: Ajuste[] | undefined): [string, string] {
  const lista = (a ?? []).filter((x) => x.monto || x.motivo.trim());
  if (!lista.length) return ['', ''];
  return [
    lista.map((x) => (x.monto ? String(x.monto) : '0')).join(SEPARADOR),
    // El separador se saca de los motivos: si alguien lo escribe, partiría
    // su propio ajuste en dos al volver a leerlo.
    lista.map((x) => x.motivo.replace(/\|/g, ' ').trim()).join(SEPARADOR)
  ];
}

export interface Turno {
  fecha: Fecha;
  trabajador: string;
  puesto: string;
  /** '' sin pasar lista · 'Sí' vino · 'No' no llegó. */
  asistencia: string;
  /**
   * Cómo se le pagaba a esta persona **ese día**.
   *
   * Se congela igual que el monto, y por el mismo motivo: si alguien pasa de
   * pagado por turno a contratado, los turnos de antes no pueden dejar de
   * contar solos. Además explica por qué una fila vale cero — "contratado"
   * se entiende, un cero pelado parece un error.
   */
  modalidad: string;
  /**
   * Lo que se le pagó ese día, **congelado al pasar lista**.
   *
   * No se recalcula desde la ficha del trabajador. Si se recalculara,
   * cambiarle el sueldo a alguien reescribiría su historia completa, y las
   * cuentas de meses cerrados dejarían de cuadrar.
   */
  pagoJornada: number;
  horasExtra: number;
  valorHora: number;
  /**
   * **Los ajustes del día, que pueden ser varios.**
   *
   * Lo pidió el cliente con el ejemplo exacto: *"extra positivo por hora
   * extra y extra negativo por adelanto"*. Con un solo ajuste había que
   * sumarlos a mano y escribir un motivo que explicara los dos, o sea
   * perder justo lo que hace útil al ajuste: **que quede escrito el
   * porqué**, uno por uno, para quien revise ese pago un mes después.
   *
   * Cada uno es una suma o una resta en pesos, con su motivo. Negativo es
   * un descuento.
   */
  ajustes: Ajuste[];
  /**
   * Lo que le tocó de propina ese día, **ya repartido y congelado**.
   *
   * Se guarda la parte de cada uno y no el total del día, por dos razones:
   * la parte es lo que la persona recibe y lo que tiene que poder mirar, y
   * guardar lo repartido deja la suma cerrada — cambiar después quién
   * participa no puede reescribir lo que ya se entregó. El total del día se
   * recupera sumando las partes.
   */
  propina: number;
  /** Fila en la planilla, para poder borrarla. */
  fila: number;
}

/**
 * Lo que suma un turno: jornada + horas extra + ajuste.
 *
 * **Un turno sin pasar lista vale cero**, igual que uno marcado "no vino".
 * Antes de que alguien diga que la persona llegó, el panel no tiene por qué
 * dar por pagada una jornada; lo que se anota al pasar lista es lo que
 * manda, y ahí el monto se puede corregir.
 *
 * Nunca baja de cero: un descuento mayor que la jornada deja el día en cero,
 * no en negativo. Si de verdad hay que cobrarle algo a alguien, eso no es un
 * turno con monto negativo, es otra conversación.
 */
export function pagoDe(t: Pick<Turno,
  'asistencia' | 'modalidad' | 'pagoJornada' | 'horasExtra' | 'valorHora' | 'ajustes'>
): number {
  if (t.asistencia !== VINO.si) return 0;
  // Un contratado no suma jornada: su sueldo no sale de esta caja. Sus horas
  // extra y sus ajustes sí, porque esos son del día y se pagan aparte.
  const jornada = esContratado(t.modalidad) ? 0 : (t.pagoJornada || 0);
  const bruto = jornada + (t.horasExtra || 0) * (t.valorHora || 0)
                + totalAjustes(t.ajustes);
  return Math.max(0, Math.round(bruto));
}

/* ---------- La propina ---------- */

/**
 * Reparte la propina del día **en partes iguales** entre quienes la reciben.
 *
 * Recibe propina quien **vino** ese día y **participa**. Las dos condiciones
 * importan y son distintas: no venir es un hecho del día, no participar es
 * una decisión sobre la persona. Alguien puede estar en la planilla de
 * trabajo todos los sábados y no entrar nunca en el reparto — eso es
 * exactamente lo que pidió el cliente.
 *
 * **La división reparte hasta el último peso.** Dividir 100.000 entre tres
 * da 33.333 y sobran 2: en vez de perderlos o de dejar decimales que nadie
 * puede entregar en efectivo, se le da un peso de más a los primeros. La
 * suma de las partes es siempre exactamente el total.
 *
 * **No se mezcla con el sueldo.** La propina no sale del negocio, pasa por
 * él: meterla en `pagoDe()` haría que el costo de un sábado subiera porque
 * los clientes dejaron más propina. Va en su propia columna, al lado.
 */
export function repartirPropina<
  T extends { trabajador: string; asistencia: string; propina: number }
>(turnos: T[], total: number, participa: (nombre: string) => boolean): T[] {
  const reciben = turnos.filter((t) => t.asistencia === VINO.si && participa(t.trabajador));
  const monto = Math.max(0, Math.round(total || 0));

  if (reciben.length === 0 || monto === 0) {
    // Sin nadie a quien repartirle, la propina no se queda en el aire a
    // nombre de alguien que no la recibe: todos quedan en cero.
    return turnos.map((t) => ({ ...t, propina: 0 }));
  }

  const base = Math.floor(monto / reciben.length);
  const sobran = monto - base * reciben.length;
  const extra = new Set(reciben.slice(0, sobran).map((t) => normalizar(t.trabajador)));

  return turnos.map((t) => {
    if (!reciben.includes(t)) return { ...t, propina: 0 };
    return { ...t, propina: base + (extra.has(normalizar(t.trabajador)) ? 1 : 0) };
  });
}

/** La propina total de un día: la suma de lo que se repartió. */
export function propinaDelDia(turnos: Turno[], fecha: Fecha): number {
  return turnos.filter((t) => t.fecha === fecha).reduce((s, t) => s + (t.propina || 0), 0);
}

/** Cuántos contratados vinieron ese día. Se cuentan aparte porque no suman. */
export function contratadosDelDia(turnos: Turno[], fecha: Fecha): number {
  return turnos.filter(
    (t) => t.fecha === fecha && t.asistencia === VINO.si && esContratado(t.modalidad)
  ).length;
}

/** Lo que cuesta el equipo de un día. Solo cuenta a quien vino. */
export function costoDelDia(turnos: Turno[], fecha: Fecha): number {
  return turnos.filter((t) => t.fecha === fecha).reduce((s, t) => s + pagoDe(t), 0);
}

/**
 * Los puestos que nombró el cliente, en su orden.
 *
 * **Son el punto de partida, no la lista definitiva**: viven en la planilla y
 * se editan en /equipo. Están en el código solo para que el panel arranque
 * contra una planilla recién creada, igual que los menús.
 *
 * Los corrigió el cliente el 2026-10-22, y el cambio no es cosmético: la
 * lista de antes —`Cocina`, `Barra`, `Asistente`— juntaba en una palabra
 * cosas que en el local son puestos distintos. Quien manda la parrilla no
 * hace lo mismo que quien lo asiste, y `Asistente` a secas no dice de qué.
 * Un puesto que no distingue no sirve para contestar si el equipo alcanza,
 * que es para lo único que existe esta lista.
 *
 * Las razones nacen en CERO, o sea sin poner. Cuántos garzones por comensal
 * es dato del negocio y no está escrito en ninguna parte del proyecto;
 * sembrarlo con un número plausible haría que el panel diera consejos que
 * nadie dio.
 */
export const POR_DEFECTO_PUESTOS: Puesto[] = [
  { nombre: 'Jefe de turno', cadaCuantas: 0 },
  { nombre: 'Parrillero', cadaCuantas: 0 },
  { nombre: 'Asistente parrillero', cadaCuantas: 0 },
  { nombre: 'Jefe de cocina', cadaCuantas: 0 },
  { nombre: 'Asistente de cocina', cadaCuantas: 0 },
  { nombre: 'Garzón', cadaCuantas: 0 },
  { nombre: 'Runner', cadaCuantas: 0 },
  { nombre: 'Barman', cadaCuantas: 0 },
  { nombre: 'Asistente de bar', cadaCuantas: 0 }
];

/**
 * Un número escrito a mano en la planilla.
 *
 * Por defecto lo que no sea un entero mayor que cero es 0: casi todos los
 * campos del equipo son cuentas o montos que no tienen sentido en negativo.
 * **El ajuste es la excepción** —un descuento es justamente un número
 * negativo— y por eso pide `conSigno`.
 */
export function aEntero(v: unknown, conSigno = false): number {
  const limpio = String(v ?? '').trim().replace(/\.(?=\d{3}\b)/g, '');
  const n = Number(limpio.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(n)) return 0;
  if (conSigno) return Math.round(n);
  return n > 0 ? Math.round(n) : 0;
}

/**
 * Lo que una persona escribe en una celda de sí/no.
 *
 * **La celda en blanco cuenta como SÍ**, al revés de lo que uno supondría.
 * El motivo: la fila existe porque alguien agregó a esa persona al equipo, y
 * un "Activo" vacío es descuido, no una baja. Si el blanco contara como no,
 * agregar un trabajador a mano en la planilla lo dejaría invisible en el
 * panel sin ningún aviso.
 */
export function esSi(v: unknown): boolean {
  const s = normalizar(String(v ?? ''));
  if (s === '') return true;
  return !['no', 'n', 'false', '0', 'inactivo', 'inactiva', 'baja'].includes(s);
}

/* ---------- Puestos ---------- */

export function leerPuestosDe(filas: string[][]): Puesto[] {
  const salida: Puesto[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({ nombre, cadaCuantas: aEntero(filas[i]?.[1]) });
  }
  return salida;
}

export function aFilasPuestos(puestos: Puesto[]): string[][] {
  // Una razón en cero se escribe en blanco: en la planilla un "0" se lee
  // como "cero hacen falta" y lo que queremos decir es "sin poner".
  return [
    [COL_PUESTOS.puesto, COL_PUESTOS.cadaCuantas],
    ...puestos.map((p) => [p.nombre, p.cadaCuantas > 0 ? String(p.cadaCuantas) : ''])
  ];
}

/* ---------- Trabajadores ---------- */

export function leerTrabajadoresDe(filas: string[][]): Trabajador[] {
  const salida: Trabajador[] = [];
  const vistos = new Set<string>();
  for (let i = 1; i < filas.length; i++) {
    const nombre = String(filas[i]?.[0] ?? '').trim();
    if (!nombre || vistos.has(normalizar(nombre))) continue;
    vistos.add(normalizar(nombre));
    salida.push({
      nombre,
      telefono: String(filas[i]?.[1] ?? '').trim(),
      puesto: String(filas[i]?.[2] ?? '').trim(),
      activo: esSi(filas[i]?.[3]),
      // La columna puede no existir todavía: una planilla escrita antes de
      // que hubiera links personales se lee igual, con todos sin acceso.
      token: String(filas[i]?.[4] ?? '').trim(),
      modalidad: esContratado(filas[i]?.[5]) ? MODALIDAD.contratado : MODALIDAD.porTurno,
      pagoJornada: aEntero(filas[i]?.[6]),
      valorHora: aEntero(filas[i]?.[7]),
      propina: esSi(filas[i]?.[8]),
      // Igual que el token: las columnas pueden no existir todavía y se leen
      // en blanco, sin romper una planilla escrita antes de que esto
      // existiera. La nota es la 9, que era la cuenta en texto libre.
      banco: leerBanco(filas[i] ?? [], 10, 9)
    });
  }
  return salida;
}

export function aFilasTrabajadores(gente: Trabajador[]): string[][] {
  return [
    [COL_TRABAJADORES.nombre, COL_TRABAJADORES.telefono,
     COL_TRABAJADORES.puesto, COL_TRABAJADORES.activo, COL_TRABAJADORES.token,
     COL_TRABAJADORES.modalidad,
     COL_TRABAJADORES.pagoJornada, COL_TRABAJADORES.valorHora,
     COL_TRABAJADORES.propina, COL_TRABAJADORES.nota,
     ...Object.values(COL_BANCO)],
    // Un monto en cero se escribe en blanco: en la planilla un "0" se lee
    // como "gana cero" y lo que queremos decir es "sin poner".
    ...gente.map((t) => [t.nombre, t.telefono, t.puesto,
                         t.activo ? 'Sí' : 'No', t.token, t.modalidad,
                         t.pagoJornada > 0 ? String(t.pagoJornada) : '',
                         t.valorHora > 0 ? String(t.valorHora) : '',
                         t.propina ? 'Sí' : 'No', t.banco.nota,
                         ...filaBanco(t.banco)])
  ];
}

/* ---------- Turnos ---------- */

/**
 * Los turnos de la pestaña, buscando cada columna POR SU ENCABEZADO.
 *
 * No por posición, al revés de `Puestos` y `Trabajadores`. La diferencia no
 * es gusto: esas dos se reescriben enteras cada vez que se guardan, así que
 * la posición la fija el panel. A `Turnos` se le agregan y se le borran
 * filas de a una, y le van a crecer columnas —asistencia, horas, ajustes—,
 * así que con posiciones fijas agregar una obligaría a reescribir todas las
 * filas ya guardadas. Es el mismo criterio que usa `Reservas`.
 */
export function leerTurnosDe(filas: string[][]): Turno[] {
  if (filas.length < 2) return [];
  const i = indices(filas[0], COL_TURNOS);
  // Sin columna de fecha no hay nada que leer: inventar turnos a partir de
  // filas que no sabemos interpretar sería peor que no mostrar ninguno.
  if (i.fecha === -1 || i.trabajador === -1) return [];
  const en = (f: string[], k: number) => (k === -1 ? '' : String(f[k] ?? ''));

  const salida: Turno[] = [];
  for (let n = 1; n < filas.length; n++) {
    const f = filas[n];
    const fecha = en(f, i.fecha).slice(0, 10);
    const trabajador = en(f, i.trabajador).trim();
    // Una fila sin fecha válida o sin nombre es basura o una fila vacía.
    // Un puesto en blanco sí se lee: significa "viene, sin puesto definido".
    if (!esFecha(fecha) || !trabajador) continue;
    salida.push({
      fecha, trabajador, puesto: en(f, i.puesto).trim(),
      asistencia: en(f, i.asistencia).trim(),
      modalidad: esContratado(en(f, i.modalidad))
        ? MODALIDAD.contratado : MODALIDAD.porTurno,
      pagoJornada: aEntero(en(f, i.pagoJornada)),
      horasExtra: aEntero(en(f, i.horasExtra)),
      valorHora: aEntero(en(f, i.valorHora)),
      // El ajuste SÍ puede ser negativo: es lo que lo distingue de los demás
      // montos. `aEntero()` recorta en cero, así que acá se lee aparte.
      ajustes: leerAjustes(en(f, i.ajuste), en(f, i.motivo)),
      propina: aEntero(en(f, i.propina)),
      fila: n + 1
    });
  }
  return salida;
}

/**
 * Un turno como fila, cada valor en la columna que le toca según el
 * encabezado. Las columnas que no manejamos quedan vacías en vez de
 * desplazar lo demás.
 */
export function filaTurno(encabezado: string[], t: Omit<Turno, 'fila'>): string[] {
  const i = indices(encabezado, COL_TURNOS);
  const fila = new Array(Math.max(encabezado.length, ENCABEZADO_TURNOS.length)).fill('');
  const poner = (k: number, v: string) => { if (k !== -1) fila[k] = v; };
  // Un monto en cero va en blanco, igual que en las demás pestañas: "0" se
  // lee como un valor puesto, y lo que decimos es que no lo pusieron.
  const monto = (n: number) => (n ? String(n) : '');
  poner(i.fecha, t.fecha);
  poner(i.trabajador, t.trabajador);
  poner(i.puesto, t.puesto);
  poner(i.asistencia, t.asistencia);
  poner(i.modalidad, t.modalidad);
  poner(i.pagoJornada, monto(t.pagoJornada));
  poner(i.horasExtra, monto(t.horasExtra));
  poner(i.valorHora, monto(t.valorHora));
  const [montos, motivos] = escribirAjustes(t.ajustes);
  poner(i.ajuste, montos);
  poner(i.motivo, motivos);
  poner(i.propina, monto(t.propina));
  return fila;
}

export const ENCABEZADO_TURNOS: string[] = Object.values(COL_TURNOS);

/**
 * Deja un plan del día listo para guardar: **una persona, un puesto.**
 *
 * Asignar a alguien a un segundo puesto el mismo día lo MUEVE, no lo duplica.
 * No es una limitación técnica, es lo que hace que el conteo sirva: una
 * persona contada como garzón y como barman al mismo tiempo haría decir al
 * panel que hay dos personas donde hay una, y justo ahí es donde se mira
 * para saber si alcanza el equipo.
 *
 * Gana la ÚLTIMA asignación, que es la que la persona acaba de hacer.
 */
export function normalizarPlan(turnos: Omit<Turno, 'fila'>[]): Omit<Turno, 'fila'>[] {
  const porPersona = new Map<string, Omit<Turno, 'fila'>>();
  for (const t of turnos) {
    const nombre = String(t.trabajador ?? '').trim();
    if (!nombre || !esFecha(t.fecha)) continue;
    porPersona.set(normalizar(nombre),
      { ...t, fecha: t.fecha, trabajador: nombre, puesto: String(t.puesto ?? '').trim() });
  }
  return [...porPersona.values()];
}

/* ---------- Lo que se mira ---------- */

export interface LineaDePlan {
  puesto: string;
  asignados: string[];
  /** Cuántos sugiere la razón del puesto. 0 = sin regla puesta. */
  sugeridos: number;
  /** Cuántos faltan para llegar a la sugerencia. 0 si alcanza o si no hay regla. */
  faltan: number;
}

/** Cuántos hacen falta en un puesto para tanta gente. 0 = sin regla puesta. */
export function sugeridos(p: Puesto | undefined, personas: number): number {
  if (!p || p.cadaCuantas <= 0 || personas <= 0) return 0;
  return Math.ceil(personas / p.cadaCuantas);
}

/**
 * El plan de un día, puesto por puesto, con lo asignado y lo que sugiere la
 * razón.
 *
 * Incluye los puestos VACÍOS a propósito: el que no tiene a nadie es
 * precisamente el que hay que ver. Y al final agrega los puestos que
 * aparecen en los turnos pero no en la lista —alguien los escribió a mano en
 * la planilla, o se renombró un puesto— porque esconderlos escondería gente
 * que sí está asignada a trabajar.
 */
export function planDelDia(
  turnos: Turno[], puestos: Puesto[], fecha: Fecha, personas: number
): LineaDePlan[] {
  const delDia = turnos.filter((t) => t.fecha === fecha);
  const porPuesto = new Map<string, string[]>();
  for (const t of delDia) {
    const clave = normalizar(t.puesto);
    if (!porPuesto.has(clave)) porPuesto.set(clave, []);
    porPuesto.get(clave)!.push(t.trabajador);
  }

  const salida: LineaDePlan[] = [];
  const usados = new Set<string>();
  for (const p of puestos) {
    const clave = normalizar(p.nombre);
    usados.add(clave);
    const asignados = porPuesto.get(clave) ?? [];
    const quiero = sugeridos(p, personas);
    salida.push({
      puesto: p.nombre,
      asignados,
      sugeridos: quiero,
      faltan: Math.max(0, quiero - asignados.length)
    });
  }
  // Los que no están en la lista, con el nombre tal como se escribió.
  for (const t of delDia) {
    const clave = normalizar(t.puesto);
    if (usados.has(clave)) continue;
    usados.add(clave);
    salida.push({
      puesto: t.puesto || 'Sin puesto',
      asignados: porPuesto.get(clave) ?? [],
      sugeridos: 0,
      faltan: 0
    });
  }
  return salida;
}

export interface ResumenEquipo {
  /** Cuánta gente hay asignada en total. */
  total: number;
  /** Solo los puestos con alguien, para el resumen corto de la tarjeta. */
  porPuesto: { puesto: string; cuantos: number }[];
  /** Cuántos faltan en total según las razones puestas. 0 = alcanza o sin reglas. */
  faltan: number;
}

/**
 * El resumen chico, el que va al dorso de la tarjeta del día.
 *
 * Omite los puestos vacíos: en cuatro líneas de una tarjeta lo que importa
 * es qué hay, y lo que falta va en un solo número.
 */
export function resumenEquipo(
  turnos: Turno[], puestos: Puesto[], fecha: Fecha, personas: number
): ResumenEquipo {
  const plan = planDelDia(turnos, puestos, fecha, personas);
  return {
    total: turnos.filter((t) => t.fecha === fecha).length,
    porPuesto: plan
      .filter((l) => l.asignados.length > 0)
      .map((l) => ({ puesto: l.puesto, cuantos: l.asignados.length })),
    faltan: plan.reduce((n, l) => n + l.faltan, 0)
  };
}

/**
 * Un día en que se trabaja sin que entre nadie: preparación, montaje, cierre.
 *
 * **No es un dato que alguien marque.** Es lo que queda cuando un día tiene
 * equipo asignado y no recibe público — se decidió así con el cliente el
 * 2026-10-22, sobre la alternativa de agregar una columna y una casilla. Una
 * marca a mano sería una segunda verdad que puede contradecir a la primera:
 * un día marcado "preparación" que después se abre al público, o al revés.
 *
 * Vive acá, en una sola función, porque lo preguntan tres pantallas —el
 * calendario del equipo, la planilla semanal y el link personal— y tres
 * copias de la misma condición es justo lo que se desalinea cuando cambie.
 */
export function esPreparacion(
  { conEquipo, abierto, personas }:
  { conEquipo: boolean; abierto: boolean; personas: number }
): boolean {
  return conEquipo && !abierto && personas === 0;
}

/**
 * Los nombres que aparecen en los turnos y NO están en la lista de
 * trabajadores.
 *
 * Mismo mecanismo que `desconocidos()` para los menús, y por el mismo
 * motivo: sin alias ni equivalencias, lo único que mantiene alineadas las
 * dos listas es que alguien se entere cuando dejan de estarlo. Pasa al
 * renombrar a una persona que ya tenía turnos asignados.
 */
export function sinFicha(turnos: Turno[], gente: Trabajador[]): string[] {
  const conocidos = new Set(gente.map((t) => normalizar(t.nombre)));
  const salida: string[] = [];
  const ya = new Set<string>();
  for (const t of turnos) {
    const clave = normalizar(t.trabajador);
    if (!clave || conocidos.has(clave) || ya.has(clave)) continue;
    ya.add(clave);
    salida.push(t.trabajador);
  }
  return salida;
}

/* ---------- El link personal del trabajador ---------- */

/**
 * Una llave nueva: 24 bytes al azar, en base64 apto para una URL.
 *
 * Son 192 bits. No hace falta tanto para proteger "qué días trabajo", pero
 * un token corto invita a probar suerte y alargarlo no cuesta nada.
 *
 * Usa `crypto.getRandomValues`, que existe igual en Node y en el navegador,
 * y **no `Math.random()`**: ese es predecible y sirve para barajar una
 * lista, no para una credencial.
 */
export function nuevoToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * De quién es este link.
 *
 * **Un token vacío no encuentra a nadie**, aunque haya trabajadores sin
 * token. Si no, entrar a `/mi/` sin nada detrás abriría la ficha del primero
 * de la lista, que es justo el tipo de agujero que se descubre tarde.
 *
 * **Y un trabajador dado de baja tampoco entra.** Desmarcar "activo" es la
 * forma de sacar a alguien del equipo, así que tiene que cerrarle también
 * la puerta; si no, seguiría viendo la planificación después de irse.
 *
 * La comparación es en tiempo constante por la misma razón que la del
 * panel: el tiempo de respuesta no debe decir cuántos caracteres se
 * acertaron.
 */
export function trabajadorPorToken(
  gente: Trabajador[], token: unknown
): Trabajador | undefined {
  const buscado = String(token ?? '').trim();
  if (!buscado) return undefined;
  let encontrado: Trabajador | undefined;
  for (const t of gente) {
    if (!t.token || !t.activo) continue;
    // Sin cortar al primer acierto: recorrer siempre la lista entera hace
    // que el tiempo no dependa de en qué posición está la persona.
    if (iguales(t.token, buscado)) encontrado = t;
  }
  return encontrado;
}

/** Los turnos de una persona, de hoy en adelante y ordenados. */
export function turnosDe(turnos: Turno[], nombre: string, desde: Fecha): Turno[] {
  const quien = normalizar(nombre);
  return turnos
    .filter((t) => normalizar(t.trabajador) === quien && t.fecha >= desde)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

/* ---------- El informe del mes ---------- */

export interface LineaInforme {
  trabajador: string;
  /** Cómo se le pagó. Si cambió a mitad de mes, queda la del último turno. */
  modalidad: string;
  /** Turnos en los que vino. */
  dias: number;
  /** Turnos en los que no llegó. */
  noVino: number;
  /** Turnos del mes a los que nadie les pasó lista todavía. */
  sinMarcar: number;
  /** Suma de jornadas de los días que vino. Un contratado suma cero. */
  jornadas: number;
  /** Cuántas horas extra, y cuánto suman. */
  horasExtra: number;
  montoHorasExtra: number;
  /** Ajustes, con su signo. */
  ajustes: number;
  /**
   * Lo que le tocó de propina en el periodo.
   *
   * **Va aparte de `total`, no sumada**, por la misma razón por la que no
   * entra en `pagoDe()`: esa plata no sale del negocio, pasa por él.
   * Juntarlas haría imposible contestar "¿cuánto me costó el equipo?".
   */
  propina: number;
  total: number;
}

/**
 * Lo que se le debe a cada persona en un periodo, de `desde` a `hasta`
 * **inclusive**, los dos como `AAAA-MM-DD`.
 *
 * Es por periodo y no por mes porque quien paga a veces paga por semana:
 * la misma cuenta sirve para las dos, y tener dos funciones habría sido
 * tener dos lugares donde arreglar el mismo error.
 *
 * **Incluye a quien no vino y a quien está sin marcar, con total cero.** Es a
 * propósito: una persona que desaparece del informe se lee como que no
 * trabajó, y lo que pasó puede ser que nadie cerró ese día. Ver esas
 * columnas es lo que permite darse cuenta a tiempo.
 *
 * Las sumas salen de lo que quedó **escrito en cada turno**, no de la ficha
 * del trabajador. Es la misma razón de siempre: subirle el sueldo a alguien
 * en marzo no puede cambiar lo que se le pagó en noviembre.
 */
export function informeDelPeriodo(
  turnos: Turno[], desde: Fecha, hasta: Fecha
): LineaInforme[] {
  const porPersona = new Map<string, LineaInforme>();

  for (const t of turnos) {
    if (t.fecha < desde || t.fecha > hasta) continue;
    const clave = normalizar(t.trabajador);
    if (!clave) continue;

    let l = porPersona.get(clave);
    if (!l) {
      l = {
        trabajador: t.trabajador, modalidad: t.modalidad,
        dias: 0, noVino: 0, sinMarcar: 0,
        jornadas: 0, horasExtra: 0, montoHorasExtra: 0, ajustes: 0,
        propina: 0, total: 0
      };
      porPersona.set(clave, l);
    }
    l.modalidad = t.modalidad;

    if (t.asistencia === VINO.no) { l.noVino++; continue; }
    if (t.asistencia !== VINO.si) { l.sinMarcar++; continue; }

    l.dias++;
    if (!esContratado(t.modalidad)) l.jornadas += t.pagoJornada || 0;
    l.horasExtra += t.horasExtra || 0;
    l.montoHorasExtra += (t.horasExtra || 0) * (t.valorHora || 0);
    l.ajustes += totalAjustes(t.ajustes);
    l.propina += t.propina || 0;
    l.total += pagoDe(t);
  }

  // De lo que más se paga a lo que menos, y a igual monto por nombre: quien
  // lee esto está repartiendo plata, y lo primero que busca es el total.
  return [...porPersona.values()].sort(
    (a, b) => b.total - a.total || a.trabajador.localeCompare(b.trabajador)
  );
}

/** Los meses que tienen algún turno, del más nuevo al más viejo. */
export function mesesConTurnos(turnos: Turno[]): string[] {
  return [...new Set(turnos.map((t) => t.fecha.slice(0, 7)))].sort().reverse();
}

/**
 * Las semanas que tienen algún turno, del lunes de cada una, de la más nueva
 * a la más vieja.
 */
export function semanasConTurnos(turnos: Turno[]): Fecha[] {
  return [...new Set(turnos.map((t) => semanaDe(t.fecha)))].sort().reverse();
}

/**
 * El primer y el último día de un periodo.
 *
 * Un mes se escribe `AAAA-MM` y una semana `AAAA-MM-DD` (su lunes). Se
 * distinguen por el largo, que es feo de mirar pero evita arrastrar un
 * segundo parámetro por media aplicación.
 */
export function rangoDelPeriodo(periodo: string): { desde: Fecha; hasta: Fecha } {
  if (periodo.length === 7) {
    // Fin de mes sin aritmética de fechas: el día 1 del mes siguiente, menos
    // uno. Así febrero y los años bisiestos salen solos.
    const [a, m] = periodo.split('-').map(Number);
    const siguiente = m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`;
    return { desde: `${periodo}-01`, hasta: sumarDias(siguiente, -1) };
  }
  const lunes = semanaDe(periodo);
  return { desde: lunes, hasta: sumarDias(lunes, 6) };
}

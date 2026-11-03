/**
 * Los eventos del CRM del socio, leídos para mostrarlos en el panel.
 *
 * El socio —Asados y Corderos— vende eventos para varios negocios, **Brasas
 * de Lo Pirque entre ellos**, desde su propio CRM. Hasta el 2026-11-02 eso
 * no llegaba acá de ninguna forma, y el resultado se pudo medir: el sitio
 * estaba ofreciendo el sábado 7 de noviembre con 112 lugares mientras el
 * CRM tenía ese día un evento ganado de 58 personas en nuestro recinto, y el
 * domingo 22 con 120 contra uno de 150. Nadie en el panel tenía cómo saberlo.
 *
 * ## Lo que esto hace, y lo que NO
 *
 * **No toca el cupo**, y ésa es la decisión que fija todo lo demás. Lo que
 * entrega es una capa aparte, como `posibles` en los presupuestos: se ve en
 * el día, no entra en `tomadas`, no descuenta de `quedan` y no mueve el
 * semáforo. El motivo es del cliente y vale repetirlo: **un sistema que no
 * controlamos no puede cerrarle un sábado al sitio público sin que nadie lo
 * mire.** Si en unas semanas los datos calzan, que cuente es cambiar una
 * condición — y esa condición todavía no existe a propósito.
 *
 * ## El filtro es `lugar`, no `empresa`
 *
 * La guía del socio recomienda `?empresa=brasas` como "más fiable". **Para
 * contar ocupación del recinto no lo es**, y los datos lo demuestran:
 *
 * - 4 eventos con `empresa: brasas` y `lugar: 'Otro'` —uno de ellos un
 *   ganado de 60 personas— que **no ocurren en nuestro recinto**.
 * - 1 evento en `Lo Pirque` vendido por `ayc`, que **sí lo ocupa**.
 *
 * `empresa` sale de la cotización del contacto: contesta **quién lo vendió**.
 * `lugar` contesta **dónde ocurre**, que es lo que ocupa sillas. Se filtra
 * por `lugar` en la query *y otra vez acá*: el 2026-11-02, antes de que el
 * socio lo implementara, ese parámetro se ignoraba y devolvía los 221
 * eventos de todos los negocios. Sin el segundo filtro habríamos pintado
 * Calicanto en nuestro calendario.
 *
 * ## Dos cosas que el panel no muestra
 *
 * - **El nombre del cliente.** La API lo entrega y acá no se lee: Felipe
 *   está decidiendo si corresponde, y hasta entonces pidió no mostrarlo. Lo
 *   que no se lee no se puede filtrar mal más adelante. Si se autoriza, es
 *   agregar el campo en `leerEventos()`.
 * - **Los períodos, como día.** Un evento `periodo` es un mes aproximado
 *   —"entre enero y marzo"— y **no ocupa ninguna fecha concreta**. Meterlo
 *   en un día sería inventar: el propio CRM no sabe cuál es.
 *
 * Sin red y sin `googleapis`, como `filas.ts` y `presupuestos.ts`, así que
 * `prueba.ts` lo corre sin credenciales.
 */
import { esFecha, type Fecha } from './fechas.ts';
import { normalizar } from './columnas.ts';

/** La base de la API del socio. Si cambia, se cambia acá y nada más. */
export const CRM_API = 'https://lgggwnkcoyqivulxcvrf.supabase.co/functions/v1/api-eventos';

/**
 * El lugar que es nuestro recinto, tal como lo escribe el CRM.
 *
 * Es una lista cerrada de su lado —`Calicanto`, `Lo Pirque`, `A domicilio`,
 * `Otro`— así que comparar el texto es correcto. Se compara normalizado
 * igual, por lo mismo que los encabezados de la planilla: un espacio de más
 * no puede hacer desaparecer un evento.
 */
export const NUESTRO_LUGAR = 'Lo Pirque';

/** `Ganado` es lo único que el CRM da por confirmado. */
export const ETAPA_GANADO = 'Ganado';

/**
 * Un evento del CRM, con lo que el panel usa.
 *
 * `etapa` se trata como **texto libre y no como lista cerrada**: la guía
 * nombra cinco —Nuevo, Contactado, Cotizado, Negociación, Ganado— y los
 * datos de hoy solo traen cuatro. Una lista cerrada acá convertiría una
 * etapa nueva en un evento que no se dibuja.
 */
export interface EventoCRM {
  id: string;
  /** Tal cual la manda el CRM; `confirmado` es lo que se mira para contar. */
  etapa: string;
  confirmado: boolean;
  /** `Matrimonio`, `Corporativo`, … o vacío si el vendedor no lo puso. */
  tipo: string;
  lugar: string;
  /** El día exacto, o vacío si el evento todavía es un período. */
  fecha: Fecha | '';
  /** Meses aproximados, el día 1 de cada mes. Vacíos si tiene fecha. */
  periodoInicio: Fecha | '';
  periodoFin: Fecha | '';
  /** Puede venir en cero: el vendedor no lo registró. */
  invitados: number;
  /** El vendedor del CRM a cargo, para saber a quién preguntarle. */
  vendedor: string;
}

const texto = (v: unknown): string => String(v ?? '').trim();
const fechaO = (v: unknown): Fecha | '' => {
  const f = texto(v).slice(0, 10);
  return esFecha(f) ? f : '';
};
const entero = (v: unknown): number => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Lee la respuesta del CRM. **Tolera basura a propósito**: la data real
 * trae un evento fechado en 2007 por un error de tipeo, once con los
 * invitados en `null` y uno sin tipo. Nada de eso puede tumbar el
 * calendario, así que cada campo cae a un valor vacío y el evento se queda.
 */
export function leerEventos(crudo: unknown): EventoCRM[] {
  const c = (crudo ?? {}) as Record<string, unknown>;
  const lista = Array.isArray(c.eventos) ? c.eventos : [];
  const salida: EventoCRM[] = [];
  for (const it of lista) {
    const e = (it ?? {}) as Record<string, unknown>;
    const id = texto(e.id);
    if (!id) continue;              // sin id no hay evento que mostrar
    salida.push({
      id,
      etapa: texto(e.etapa),
      // Se deriva de la etapa y no se lee `confirmado`: así el panel no
      // depende de que los dos campos del CRM digan lo mismo.
      confirmado: normalizar(texto(e.etapa)) === normalizar(ETAPA_GANADO),
      tipo: texto(e.tipo_evento),
      lugar: texto(e.lugar),
      fecha: fechaO(e.fecha),
      periodoInicio: fechaO(e.periodo_inicio),
      periodoFin: fechaO(e.periodo_fin),
      invitados: entero(e.invitados),
      vendedor: texto(e.vendedor)
    });
  }
  return salida;
}

/** Si el evento ocurre en nuestro recinto. */
export const esNuestro = (e: EventoCRM) =>
  normalizar(e.lugar) === normalizar(NUESTRO_LUGAR);

/**
 * Si el evento cae en un día concreto.
 *
 * Un período no: son meses aproximados y el propio CRM no sabe qué día
 * será. Ponerlo en uno sería publicar una fecha que nadie dio.
 */
export const tieneDia = (e: EventoCRM) => !!e.fecha;

/** Lo que el panel muestra de un día: dos grupos y nada más. */
export interface EventosDelDia {
  /** Ganados: gente que de verdad viene a nuestro recinto ese día. */
  confirmados: EventoCRM[];
  /** El resto del embudo: todavía no se sabe. */
  tentativos: EventoCRM[];
  /** Personas de los ganados. Es lo que puede chocar con el cupo. */
  personasConfirmadas: number;
  /** Personas de los tentativos, aparte. */
  personasTentativas: number;
}

export const DIA_VACIO: EventosDelDia = {
  confirmados: [], tentativos: [], personasConfirmadas: 0, personasTentativas: 0
};

/**
 * Agrupa por fecha **solo lo nuestro y solo lo que tiene día**.
 *
 * Los dos filtros van acá y no en quien llama: son la definición de "este
 * evento ocupa este día de nuestro recinto", y repartirla en dos pantallas
 * es lo que se desalinea cuando cambie.
 */
export function eventosPorFecha(eventos: EventoCRM[]): Map<Fecha, EventosDelDia> {
  const mapa = new Map<Fecha, EventosDelDia>();
  for (const e of eventos) {
    if (!esNuestro(e) || !tieneDia(e)) continue;
    const dia = mapa.get(e.fecha) ?? {
      confirmados: [], tentativos: [], personasConfirmadas: 0, personasTentativas: 0
    };
    if (e.confirmado) {
      dia.confirmados.push(e);
      dia.personasConfirmadas += e.invitados;
    } else {
      dia.tentativos.push(e);
      dia.personasTentativas += e.invitados;
    }
    mapa.set(e.fecha, dia);
  }
  return mapa;
}

/**
 * Los períodos nuestros, que no caen en ningún día.
 *
 * Se devuelven aparte en vez de descartarse: son **más de la mitad** de los
 * eventos del CRM, y un matrimonio de 120 personas que dice "marzo o abril"
 * es una conversación abierta aunque no tenga fecha. Lo que no puede es
 * aparecer en un día del calendario.
 */
export const periodosNuestros = (eventos: EventoCRM[]) =>
  eventos.filter((e) => esNuestro(e) && !tieneDia(e));

/**
 * Si un día nuestro está sobrevendido contra un evento ganado del CRM.
 *
 * **Es el aviso, no el cálculo.** El cupo del panel no cambia; lo que esto
 * contesta es si lo que el panel ofrece y lo que el CRM tiene dado por
 * cerrado no caben juntos — que es exactamente lo que pasó el 7 y el 22 de
 * noviembre y nadie vio.
 */
export const haySobreventa = (dia: EventosDelDia, quedan: number) =>
  dia.personasConfirmadas > quedan;

// ---------------------------------------------------------------------------
// El otro sentido: publicar NUESTROS días en el calendario del socio
// ---------------------------------------------------------------------------
//
// Lo de arriba lee. Esto escribe, y existe porque el problema es simétrico:
// su vendedor cotizaba el sábado 7 sin saber que acá había un evento ganado
// de 58 personas, y nosotros ofrecíamos ese mismo día con 112 lugares. Las
// dos mitades eran la misma ceguera.
//
// **Rojo dejó de significar "cerrado" y pasó a significar "no cabe nadie
// más".** El primer corte mandaba todo privado en rojo y el cliente lo
// corrigió: *"privado también debería ser naranjo, porque hay eventos que se
// hacen sin que sea exclusivo… pero sí debería saber de este evento privado
// y cuántas reservas hay"*. De ahí salió el estado `Privada exclusiva` del
// panel, y de ahí sale que la regla sea **una sola pregunta**: ¿puede pasar
// otro evento acá ese día?
//
// | Nuestro día | ¿Se manda? | `bloquea` | Qué ve el vendedor |
// |---|---|---|---|
// | Cerrado | sí | `true` | rojo, fecha tomada |
// | Privado exclusivo | sí | `true` | rojo, el recinto completo |
// | Privado no exclusivo | sí | `false` | naranjo, con su ocupación |
// | Abierto con reservas | sí | `false` | naranjo, "8/120 personas" |
// | Abierto y vacío | **no** | — | nada |
//
// Un día abierto y vacío no se manda porque no tiene nada que informar y
// llenaría su calendario de naranjo sin dato. Medido el 2026-11-02: de 18
// días abiertos hasta el 3 de enero, 3 tenían alguna reserva.
//
// **Los días de preparación tampoco se mandan, y no por un `if`.** Un día de
// preparación es uno con equipo asignado que no recibe público; si no está en
// `Fechas Hábiles` ni tiene reservas, no aparece en la ocupación, así que no
// hay desde dónde publicarlo. Y si está cerrado, se manda por la fila de
// "Cerrado", que es lo correcto. La garantía es la forma de los datos, no una
// condición que alguien pueda cambiar sin darse cuenta.
//
// **Lo que NUNCA sale de acá**: las `Notas` internas de un día y el nombre de
// un cliente. El socio recibe un título, una descripción que arma este
// archivo y dos enteros. Nada más viaja, así que nada más se puede filtrar.

/**
 * El prefijo de nuestros `external_id`, y **la única cosa que este panel
 * borra**.
 *
 * La tabla del socio es compartida: con nuestra clave se puede escribir y
 * borrar, así que la reconciliación tiene que poder distinguir lo nuestro de
 * lo de cualquier otro origen. Un id con otro prefijo se deja quieto siempre,
 * aunque su fecha calce con uno de nuestros días.
 */
export const PREFIJO = 'brasas-';

/**
 * El id de un día. **Sale de la fecha y de nada más**, así que es estable:
 * publicar el mismo día dos veces es un `upsert`, no dos filas. Es lo que
 * permite que la reconciliación sea idempotente y que un empujón perdido se
 * recupere solo al día siguiente.
 */
export const idExterno = (f: Fecha) => `${PREFIJO}${f}`;

/** Si un id publicado es de este panel. */
export const esNuestroId = (id: string) => id.startsWith(PREFIJO);

/** La fecha que lleva uno de nuestros ids, o vacío si no es nuestro. */
export const fechaDelId = (id: string): Fecha | '' =>
  esNuestroId(id) ? fechaO(id.slice(PREFIJO.length)) : '';

/**
 * Un día tal como viaja al CRM.
 *
 * **El texto va en `titulo` y la ocupación en `ocupacion`/`capacidad`**, no
 * escrita dentro del título: el CRM arma solo el chip —"Abierto con reservas
 * · 8/120"— y escribirla a mano daría dos formatos distintos el día que él
 * cambie el suyo. Lo confirmó el socio el 2026-11-03.
 *
 * El título se queda bajo ~30 caracteres porque el chip lo trunca en
 * escritorio; el detalle va en `descripcion`, que se ve en celular y al pasar
 * el mouse.
 *
 * `ocupacion` y `capacidad` son `null` cuando no hay nada que contar, y en el
 * cuerpo del POST se omiten. Se guardan como `null` y no como `0` porque son
 * cosas distintas: cero personas de un cupo de 120 es un dato, y "este día no
 * tiene cupo que informar" es otro.
 */
export interface DiaPublicado {
  external_id: string;
  fecha: Fecha;
  titulo: string;
  descripcion: string;
  bloquea: boolean;
  ocupacion: number | null;
  capacidad: number | null;
}

/** Los títulos, cortos porque el chip del CRM los trunca. */
export const TITULOS = {
  cerrado: 'Cerrado',
  exclusivo: 'Recinto arrendado completo',
  privado: 'Evento privado',
  abierto: 'Abierto con reservas'
} as const;

/** Lo que el panel necesita de un día para decidir qué publicar. */
export interface DiaDelPanel {
  fecha: Fecha;
  capacidad: number;
  tomadas: number;
  bloqueada: boolean;
  privada: boolean;
  exclusiva: boolean;
}

/**
 * Qué se publica de un día nuestro, o `null` si no se publica.
 *
 * **El orden de las preguntas es deliberado.** Cerrado se pregunta primero
 * porque `estaCerrado()` falla cerrando: un estado que el panel no sabe leer
 * se trata como cerrado acá también, y entonces sale en rojo. Es consistente
 * con el resto del panel y es la dirección correcta para un día propio — si
 * no entendemos su estado, nosotros tampoco deberíamos estar vendiéndolo.
 *
 * Después exclusivo y recién después privado, porque **un día exclusivo
 * también es privado**: al revés, todo exclusivo saldría naranjo y el
 * vendedor podría vender un recinto arrendado completo.
 */
export function diaParaElCRM(d: DiaDelPanel): DiaPublicado | null {
  const base = {
    external_id: idExterno(d.fecha),
    fecha: d.fecha,
    // Los números van **solo cuando hay gente**. Un día que bloquea se
    // entiende con su título —"Cerrado", "Recinto arrendado completo"— y
    // "0/120" al lado se lee como un dato cuando es la ausencia de uno.
    // Cuando sí hay reservas, decirlas es lo útil: el socio pidió
    // explícitamente "manden todos los días con ocupación".
    ocupacion: d.tomadas > 0 ? d.tomadas : null,
    capacidad: d.tomadas > 0 && d.capacidad > 0 ? d.capacidad : null
  };
  const conGente = d.tomadas > 0
    ? ` Hay ${d.tomadas} ${d.tomadas === 1 ? 'persona' : 'personas'} con reserva.`
    : '';

  if (d.bloqueada) {
    return { ...base, bloquea: true, titulo: TITULOS.cerrado,
      descripcion: `El restaurante no abre ese día.${conGente}` };
  }
  if (d.exclusiva) {
    return { ...base, bloquea: true, titulo: TITULOS.exclusivo,
      descripcion: 'El recinto está arrendado completo y en exclusiva: ' +
        `no se puede agendar otro evento ese día.${conGente}` };
  }
  if (d.privada) {
    return { ...base, bloquea: false, titulo: TITULOS.privado,
      descripcion: 'Hay un evento privado, pero el recinto no está tomado en ' +
        `exclusiva: se puede agendar otro en paralelo.${conGente}` };
  }
  // Abierto al público. Sin reservas no se manda: no hay nada que informar.
  if (d.tomadas <= 0) return null;
  return { ...base, bloquea: false, titulo: TITULOS.abierto,
    descripcion: `El restaurante abre al público ese día.${conGente}` };
}

/**
 * Lee la lista de lo ya publicado, tal como la devuelve `GET /externos`.
 *
 * Tolera basura por lo mismo que `leerEventos()`: esto solo sirve para
 * comparar contra lo que queremos publicar, y una fila rara no puede dejar
 * sin reconciliar a las demás.
 */
export function leerPublicados(crudo: unknown): DiaPublicado[] {
  const c = (crudo ?? {}) as Record<string, unknown>;
  const lista = Array.isArray(c.externos) ? c.externos : [];
  const salida: DiaPublicado[] = [];
  for (const it of lista) {
    const e = (it ?? {}) as Record<string, unknown>;
    const id = texto(e.external_id);
    if (!id) continue;
    salida.push({
      external_id: id,
      fecha: fechaO(e.fecha),
      titulo: texto(e.titulo),
      descripcion: texto(e.descripcion),
      bloquea: e.bloquea === true,
      ocupacion: e.ocupacion == null ? null : entero(e.ocupacion) || null,
      capacidad: e.capacidad == null ? null : entero(e.capacidad) || null
    });
  }
  return salida;
}

/** Si lo publicado dice exactamente lo que queremos decir. */
export const iguales = (a: DiaPublicado, b: DiaPublicado) =>
  a.fecha === b.fecha && a.titulo === b.titulo &&
  a.descripcion === b.descripcion && a.bloquea === b.bloquea &&
  a.ocupacion === b.ocupacion && a.capacidad === b.capacidad;

/** El plan de una reconciliación: qué mandar y qué sacar. */
export interface AccionesCRM {
  publicar: DiaPublicado[];
  borrar: string[];
}

/**
 * Qué hay que mandar y qué hay que borrar para que el calendario del socio
 * diga lo que el panel dice.
 *
 * **Esto es reconciliación y no un evento por cambio**, y la razón es la
 * mitad que falta de cualquier diseño de empujón: si un día deja de
 * calificar —se cancela la única reserva, se reabre un día cerrado— hay que
 * ir a sacarlo, o le queda un día naranjo fantasma. Un sistema que solo manda
 * novedades no tiene cómo enterarse de una ausencia.
 *
 * ## Qué se borra, y qué se deja quieto a propósito
 *
 * - **Lo que no es nuestro no se toca nunca**, aunque caiga en uno de
 *   nuestros días: la tabla es compartida.
 * - **Dentro de la ventana**, un id nuestro que ya no califica se borra. Es
 *   el caso corriente y el que mantiene el calendario limpio.
 * - **Antes de la ventana** —un día que ya pasó— se borra: nadie vende el
 *   pasado, y sin esto la tabla crece para siempre.
 * - **Después de la ventana NO se borra nada.** Es la decisión con filo de
 *   esta función, y se eligió mirando cuál de los dos errores cuesta más: un
 *   día rojo que quedó viejo le hace perder al socio una venta que sí se
 *   podía hacer; un día rojo borrado de más le deja vender un recinto que
 *   está arrendado en exclusiva. Lo segundo es un doble arriendo, así que más
 *   allá de la ventana esta función **no opina**. La limpieza llega cuando el
 *   día entra en la ventana, que son 90 días antes del evento — tiempo de
 *   sobra.
 */
export function reconciliar(
  deseados: DiaPublicado[],
  publicados: DiaPublicado[],
  desde: Fecha,
  hasta: Fecha
): AccionesCRM {
  const yaEsta = new Map(publicados.map((p) => [p.external_id, p]));
  const publicar = deseados.filter((d) => {
    const antes = yaEsta.get(d.external_id);
    return !antes || !iguales(antes, d);
  });

  const queremos = new Set(deseados.map((d) => d.external_id));
  const borrar: string[] = [];
  for (const p of publicados) {
    if (queremos.has(p.external_id)) continue;
    // **La fecha sale del id y no del campo `fecha`.** El id es lo que
    // identifica la fila —una con el `fecha` en blanco igual hay que poder
    // sacarla— y es también lo que dice si es nuestra: `fechaDelId()`
    // devuelve vacío para cualquier otro origen. Por eso acá hay UNA
    // condición y no dos: "no toques lo ajeno" y "no toques un id nuestro
    // que no sabés leer" son la misma pregunta, y partirla en dos guardas
    // dejaba una de las dos sin poder probarse — una prueba que no falla
    // cuando se le saca la guarda no está protegiendo nada.
    const f = fechaDelId(p.external_id);
    if (!f) continue;
    if (f < desde) { borrar.push(p.external_id); continue; }   // ya pasó
    if (f <= hasta) borrar.push(p.external_id);                // en la ventana
    // Más allá de `hasta` no se borra: ver arriba.
  }
  return { publicar, borrar };
}

/**
 * El cuerpo de un `POST /externos`: **un array pelado**, no un objeto con una
 * llave.
 *
 * Comprobado contra la API de verdad el 2026-11-03: `{"eventos":[…]}` y
 * `{"items":[…]}` devuelven `Ítem 0: falta external_id` —el endpoint ve el
 * objeto como un solo ítem— y el array pelado guarda bien. Un objeto solo
 * también funciona; se manda siempre el array para tener un camino y no dos.
 *
 * Los `null` se omiten en vez de mandarse: es lo que el socio documentó, y un
 * campo ausente y uno en `null` no tienen por qué significar lo mismo del
 * otro lado.
 */
export function cuerpoDe(dias: DiaPublicado[]): unknown[] {
  return dias.map((d) => {
    const o: Record<string, unknown> = {
      external_id: d.external_id,
      fecha: d.fecha,
      lugar: NUESTRO_LUGAR,
      titulo: d.titulo,
      descripcion: d.descripcion,
      bloquea: d.bloquea
    };
    if (d.ocupacion != null) o.ocupacion = d.ocupacion;
    if (d.capacidad != null) o.capacidad = d.capacidad;
    return o;
  });
}

/**
 * Cuántos días caben en un `POST`. El socio documentó 500 por llamada; con
 * una ventana de 90 días nunca se llega, y el corte está igual para que el
 * día que la ventana crezca esto no empiece a fallar en silencio.
 */
export const POR_LLAMADA = 500;

/** Parte una lista en tandas de `POR_LLAMADA`. */
export function tandas<T>(lista: T[], de = POR_LLAMADA): T[][] {
  const salida: T[][] = [];
  for (let i = 0; i < lista.length; i += de) salida.push(lista.slice(i, i + de));
  return salida;
}

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

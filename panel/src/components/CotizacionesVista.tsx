'use client';

/**
 * Las cotizaciones (Fase 2, 2026-11-10): la pantalla de `/presupuestos`.
 *
 * **Parte de un calendario**, con el formato del de la portada —semanas en
 * cajas, una tarjeta por día— y no el de `/turnos`. Cada tarjeta dice de un
 * vistazo cuántos candidatos y cuántas cotizaciones activas tiene ese día,
 * cuánta gente sumarían y si alguna ya se ganó, con un botón grande
 * **Cotizar** que abre la ventana con la fecha puesta.
 *
 * Tres vistas, con botones arriba:
 * - **Calendario**: los días que tienen algo cotizado o que están en el
 *   calendario del local, de la semana en curso en adelante.
 * - **Sin fecha**: las que todavía no tienen día exacto ("marzo o abril"),
 *   que no caben en ningún día.
 * - **Todas**: la lista entera, con filtro por estado y buscador.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Ayuda from './Ayuda';
import { usarSoloMira } from './SesionCliente';
import { Aviso } from './CalendarView';
import CotizacionDialogo, { type DatosCotizar } from './CotizacionDialogo';
import {
  estadoVisible, folioDe, lineasDe, totalDe, gentePosible, cuentaComoPosible,
  porVencer, vencidoSinCerrar, diasParaVencer, ESTADO_PRESUPUESTO, seguimientoDe,
  type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import { normalizar, estaCerrado, esPrivada, esExclusiva } from '@/lib/columnas';
import { semanaDe, sumarDias, rangoEnPalabras, enPalabras, esFecha } from '@/lib/fechas';
import { enPesos } from '@/lib/ocupacion';
import { grupoDe, alternativasDe, principalDe } from '@/lib/cotizar';
import { avisosDeCobro, porRevisar } from '@/lib/cobros';
import { faltaDevolver } from '@/lib/cancelacion';
import { puede, puedeTocarPresupuesto, esSuya, ROL, type Rol } from '@/lib/auth';
import EsperandoRespuesta, { type PorSeguir } from './EsperandoRespuesta';
import type { Ocupacion } from '@/lib/tipos';
import PuntoDia, { PuntoYPalabra } from './PuntoDia';
import FechaDia, { MarcaAhora } from './FechaDia';
import BandaSeccion, { TONO } from './BandaSeccion';
import { BarraDia, COLOR_TARJETA } from './TarjetaDia';

import AvisoSobrecupo, { type SobrecupoCorto } from './AvisoSobrecupo';
import Pendientes, { FilaPendiente } from './Pendientes';
import AvisoFijo from './AvisoFijo';
import { BotonMias, BotonTodos } from './BotonMias';

type Datos = DatosCotizar & {
  presupuestos: Presupuesto[]; lineas: LineaPresupuesto[];
  /** Los avisos que esta cuenta cerró para siempre (2026-11-13). */
  avisosLeidos?: string[];
  cobros?: { presupuesto: string; monto: number; revisadoPor?: string; concepto?: string }[];
  /** Los días que se pasaron del cupo (2026-11-12). Ver `AvisoSobrecupo`. */
  sobrecupo?: SobrecupoCorto[];
};

/** El color de cada estado: se distingue por la pastilla con borde. */
const COLOR: Record<string, string> = {
  [ESTADO_PRESUPUESTO.candidato]: 'border-cielo/60 text-cielo-texto',
  [ESTADO_PRESUPUESTO.borrador]: 'border-hueso/30 text-hueso/80',
  [ESTADO_PRESUPUESTO.enviado]: 'border-rosa/60 text-rosa-texto',
  [ESTADO_PRESUPUESTO.negociacion]: 'border-ambar/60 text-ambar-texto',
  [ESTADO_PRESUPUESTO.aceptado]: 'border-verde-fuerte bg-verde/15 text-verde-texto',
  [ESTADO_PRESUPUESTO.rechazado]: 'border-hueso/20 text-hueso/55',
  [ESTADO_PRESUPUESTO.noElegida]: 'border-hueso/20 text-hueso/55',
  [ESTADO_PRESUPUESTO.cancelada]: 'border-rojo-fuerte/70 text-rojo-texto',
  Vencida: 'border-ambar/50 text-ambar-texto'
};

export function PastillaEstado({ estado }: { estado: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[13px] font-semibold
                      ${COLOR[estado] ?? 'border-hueso/30 text-hueso/80'}`}>
      {estado}
    </span>
  );
}


/**
 * Qué es ese día cuando no trae ocupación —uno cerrado sin reservas, o uno
 * que no está en el calendario—, con el mismo punto y los mismos colores que
 * `PuntoDia`. Con ocupación manda `PuntoDia`, que además pinta el semáforo.
 */
function palabraDelDia(estado: string | undefined): { punto: string; texto: string; clase: string } {
  if (estado === undefined) return { punto: '⚪', texto: 'sin abrir', clase: 'text-hueso/60' };
  if (estaCerrado(estado)) return { punto: '🔴', texto: 'cerrado', clase: 'text-rojo-texto' };
  if (esExclusiva(estado)) return { punto: '🟣', texto: 'exclusivo', clase: 'text-morado-texto' };
  if (esPrivada(estado)) return { punto: '🔵', texto: 'privado', clase: 'text-cielo-texto' };
  return { punto: '🟢', texto: 'público', clase: 'text-hueso/65' };
}

export default function CotizacionesVista() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [vista, setVista] = useState<'calendario' | 'sinFecha' | 'todas'>('calendario');
  /** Vista gerencia sin el permiso de cotizar: se mira y no se crea nada. */
  const soloMira = usarSoloMira('presupuestos');
  const [filtro, setFiltro] = useState<'activas' | 'candidatos' | 'ganadas' | 'cerradas' | 'todas'>('activas');
  const [busqueda, setBusqueda] = useState('');
  /**
   * **Mías o de todos** (2026-11-12, lo pidió el cliente). Filtra la pantalla
   * entera —el calendario, *Sin fecha*, *Todas* y los avisos de arriba— y no
   * lo que cada uno puede tocar, que sigue igual. El vendedor parte en las
   * suyas; los demás, en todas. La elección se recuerda en este navegador.
   */
  const [de, setDe] = useState<'' | 'mias' | 'todos'>('');
  useEffect(() => {
    try {
      const g = localStorage.getItem('blp-cotizaciones-de');
      if (g === 'mias' || g === 'todos') setDe(g);
    } catch { /* sin almacenamiento: vale el de siempre */ }
  }, []);
  function elegirDe(v: 'mias' | 'todos') {
    setDe(v);
    try { localStorage.setItem('blp-cotizaciones-de', v); } catch { /* da igual */ }
  }
  const [semanas, setSemanas] = useState(10);
  /** Qué día está abierto en el calendario, para ver sus cotizaciones. */
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  /** La ventana: una cotización existente, o una nueva (con fecha opcional). */
  const [abierta, setAbierta] = useState<
    { p: Presupuesto | null; fecha?: string; cliente?: string; paso?: number } | null>(null);
  /**
   * **Abriendo otra cotización** —la recién creada, una alternativa nueva o
   * la otra pestaña del grupo— mientras llega la lista recargada.
   *
   * **La ventana de antes se queda a la vista** (2026-11-12, lo reclamó el
   * cliente: *"desaparece todo el pop-up"*). Antes se cerraba y se volvía a
   * abrir cuando la planilla contestaba, y con la planilla de verdad eso era
   * un par de segundos de pantalla vacía. Ahora se queda, tapada por un
   * *Abriendo…* que además impide apretar dos veces lo mismo, y se cambia
   * por la nueva recién cuando está. La nueva se abre ya guardada: con sus
   * pagos, sus comprobantes y su link.
   */
  const [abriendo, setAbriendo] = useState(false);

  const cargar = (): Promise<Datos | null> => fetch('/api/presupuestos').then((r) => r.json()).then((d) => {
    if (d.error) { setSinPermiso(!!d.permiso); setError(d.error); return null; }
    setDatos(d);
    return d as Datos;
  }).catch((e) => { setError(String(e)); return null; });

  async function abrirOtra(id: string, paso?: number) {
    setAbriendo(true);
    try {
      const d = await cargar();
      const p = d?.presupuestos.find((x) => x.id === id);
      if (p) setAbierta({ p, paso });
    } finally { setAbriendo(false); }
  }

  /**
   * **La ocupación de las semanas que se ven** (2026-11-11), para dibujar
   * cada día con su punto y su palabra igual que los otros calendarios —el
   * semáforo incluido—. Si no llega, el calendario se dibuja igual con el
   * estado del día; nada de esta pantalla depende de ella.
   */
  const [ocupacion, setOcupacion] = useState<Map<string, Ocupacion>>(new Map());
  /**
   * **Se vuelve a pedir al cerrar una ventana que cambió algo** (2026-11-12,
   * lo reclamó el cliente: marcaba una ganada, cerraba, y la tarjeta del día
   * ya decía *2 ganadas* pero el cupo seguía con el número de antes hasta
   * recargar la página). La lista de cotizaciones se recargaba; la
   * ocupación, que es otra ruta, no. Solo si hubo cambios: abrir y cerrar
   * para mirar no gasta una lectura.
   */
  const [versionOcupacion, setVersionOcupacion] = useState(0);
  const huboCambios = useRef(false);
  useEffect(() => {
    if (!datos) return;
    const desde = semanaDe(datos.hoy);
    fetch(`/api/ocupacion?desde=${desde}&hasta=${sumarDias(desde, semanas * 7)}`)
      .then((r) => r.json())
      .then((d) => Array.isArray(d.ocupacion)
        && setOcupacion(new Map((d.ocupacion as Ocupacion[]).map((o) => [o.fecha, o]))))
      .catch(() => {});
  }, [datos?.hoy, semanas, versionOcupacion]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void cargar(); }, []);

  // Abrir una cotización desde otra pantalla: `/presupuestos?abrir=<id>`.
  useEffect(() => {
    if (!datos) return;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('abrir');
    const p = id ? datos.presupuestos.find((x) => x.id === id) : undefined;
    // `?cliente=<id>`: cotizarle a un cliente desde su ficha.
    const cliente = q.get('cliente');
    // `?cotizar=<fecha>`: cotizar ese día, desde la página del día (2026-11-12).
    const cotizar = q.get('cotizar') ?? '';
    if (p) setAbierta({ p });
    else if (cliente) setAbierta({ p: null, cliente });
    else if (esFecha(cotizar)) setAbierta({ p: null, fecha: cotizar });
    if (p || cliente || esFecha(cotizar)) window.history.replaceState(null, '', '/presupuestos');
  }, [datos]);

  const porDia = useMemo(() => {
    const m = new Map<string, Presupuesto[]>();
    for (const p of visiblesDe(datos, de)) {
      if (!esFecha(p.fecha)) continue;
      // Una cancelada no ocupa el calendario de cotizar (2026-11-11, lo
      // pidió el cliente): sigue en *Todas*, con su devolución.
      if (p.estado === ESTADO_PRESUPUESTO.cancelada) continue;
      if (!m.has(p.fecha)) m.set(p.fecha, []);
      m.get(p.fecha)!.push(p);
    }
    return m;
  }, [datos, de]);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!datos) return <p className="text-hueso/50">Cargando…</p>;

  const hoy = datos.hoy;
  const estadoDe = (p: Presupuesto) => estadoVisible(p, hoy);
  const soloMias = soloMiasDe(datos, de);
  const visibles = visiblesDe(datos, de);
  const mias = visiblesDe(datos, 'mias');
  const sinFecha = visibles.filter((p) => !esFecha(p.fecha));
  const estadoDelDia = new Map(datos.fechas.map((f) => [f.fecha, f.estado]));
  const total = (p: Presupuesto) => totalDe(lineasDe(datos.lineas, p.id), p.descuento);
  const gente = (p: Presupuesto) => gentePosible(p, lineasDe(datos.lineas, p.id));
  /**
   * **Una cotización con alternativas es una sola en las listas**
   * (2026-11-10): se muestra la que la representa (la ganada, o la primera
   * abierta), y adentro se ven todas.
   */
  const agrupar = (lista: Presupuesto[]) => {
    const vistos = new Set<string>();
    const salida: Presupuesto[] = [];
    for (const p of lista) {
      const g = grupoDe(p);
      if (vistos.has(g)) continue;
      vistos.add(g);
      salida.push(principalDe(alternativasDe(p, lista), (x) => cuentaComoPosible(x, hoy)));
    }
    return salida;
  };

  const pasaFiltro = (p: Presupuesto) => {
    const e = estadoDe(p);
    if (busqueda && !normalizar(`${p.cliente} ${folioDe(p)}`).includes(normalizar(busqueda))) return false;
    if (filtro === 'todas') return true;
    if (filtro === 'candidatos') return e === ESTADO_PRESUPUESTO.candidato;
    if (filtro === 'ganadas') return e === ESTADO_PRESUPUESTO.aceptado;
    if (filtro === 'cerradas') return [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida,
      ESTADO_PRESUPUESTO.cancelada, 'Vencida'].includes(e);
    return cuentaComoPosible(p, hoy);
  };

  /**
   * **Los pendientes son de cada cuenta** (2026-11-13, lo pidió el cliente:
   * *"que solo le aparecen las reservas que él mismo tiene que arreglar,
   * separado por cuenta"*). Los de una cotización —por vencer, esperando
   * respuesta, vencidas, saldos y *pagó y falta ganarla*— salen de **las
   * suyas** (`mias`: las que creó esa cuenta, con su grupo de alternativas
   * entero), y no cambian con *Mías / De todos*, que sigue filtrando el
   * calendario y las listas. Los del rol —cobros por revisar y devoluciones—
   * son de quien paga, de todas las cotizaciones: ver más abajo.
   */
  const propias = mias;
  const pronto = propias.filter((p) => porVencer(p, hoy));
  // **El seguimiento** (2026-11-11): lo mandado que espera respuesta. De
  // cada grupo de alternativas, una sola tarjeta.
  const cfgSeg = { seguimientoDias: datos.seguimiento?.dias ?? 5, avisoEvento: datos.seguimiento?.antesEvento ?? 14 };
  const seguimientoDeLista = (lista: Presupuesto[]) => {
    const salida: PorSeguir[] = [];
    const gruposVistos = new Set<string>();
    for (const p of lista) {
      const s = seguimientoDe(p, hoy, cfgSeg);
      if (!s || gruposVistos.has(grupoDe(p))) continue;
      gruposVistos.add(grupoDe(p));
      salida.push({ p, ...s, puedeTocar: puedeTocarPresupuesto(datos.rol as Rol, datos.usuario, p.creadoPor) });
    }
    return salida.sort((a, b) => (a.motivo === b.motivo ? 0 : a.motivo === 'eventoCerca' ? -1 : 1));
  };
  const porSeguir = seguimientoDeLista(propias);
  // La marca de la tarjeta del día sigue a lo que se está mirando.
  const seguirIds = new Set(seguimientoDeLista(visibles).map((x) => grupoDe(x.p)));
  const vencidas = propias.filter((p) => vencidoSinCerrar(p, hoy));
  // **Los avisos de plata** (2026-11-10): anticipo pagado sin ganar, y el
  // saldo de una ganada que vence pronto o ya venció. Ver `avisosDeCobro()`.
  const avisos = avisosDeCobro(
    propias.map((p) => ({ ...p, total: totalDe(lineasDe(datos.lineas, p.id), p.descuento) })),
    datos.cobros ?? [], datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 }, hoy,
    [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida]);
  const porId = new Map(datos.presupuestos.map((p) => [p.id, p]));
  // **Cobros por revisar** (2026-11-10): solo para quien hace los pagos,
  // que es quien los revisa. Uno por cotización, con cuántos y cuánto. Son
  // de su rol, así que van **todas** las cotizaciones, mire *Mías* o *De
  // todos* (2026-11-13).
  const sinRevisar = new Map<string, { n: number; monto: number }>();
  if (puede(datos.rol as Rol, 'pagar')) {
    for (const c of porRevisar((datos.cobros ?? []).map((c) => ({ ...c, revisadoPor: c.revisadoPor ?? '' })))) {
      const p = porId.get(c.presupuesto);
      if (!p) continue;
      // Una cancelada ya no pide revisar lo cobrado: lo que queda es la
      // devolución, que tiene su propio aviso (2026-11-11).
      if (estadoDe(p) === ESTADO_PRESUPUESTO.cancelada) continue;
      const a = sinRevisar.get(c.presupuesto) ?? { n: 0, monto: 0 };
      sinRevisar.set(c.presupuesto, { n: a.n + 1, monto: a.monto + c.monto });
    }
  }

  // **Devoluciones por hacer** (2026-11-11): las canceladas con algo
  // acordado devolver que todavía no se anotó. Solo para quien paga, que es
  // quien transfiere.
  const porDevolver = puede(datos.rol as Rol, 'pagar')
    ? datos.presupuestos
      .filter((p) => estadoDe(p) === ESTADO_PRESUPUESTO.cancelada && p.devolucion > 0)
      .map((p) => ({ p, falta: faltaDevolver(p.devolucion,
        (datos.cobros ?? []).filter((c) => c.presupuesto === p.id)
          .map((c) => ({ monto: c.monto, concepto: c.concepto ?? '' }))).falta }))
      .filter((x) => x.falta > 0)
    : [];

  /** Una cotización como línea, para las listas. */
  const fila = (p: Presupuesto, conFecha = true) => (
    <li key={p.id}>
      <button type="button" onClick={() => setAbierta({ p })}
        className="tecla flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded border
                   border-hueso/15 bg-panel px-3 py-2.5 text-left min-h-[52px] hover:border-oro/60">
        <span className="text-[16px] font-semibold">{p.cliente || 'Sin cliente'}</span>
        <PastillaEstado estado={estadoDe(p)} />
        {conFecha && (
          <span className="text-[14px] text-hueso/70">
            {p.fecha ? <span className="first-letter:uppercase inline-block">{enPalabras(p.fecha)}</span>
              : p.periodo}
          </span>
        )}
        <span className="flex-1" />
        <span className="text-[14px] text-hueso/70">
          {gente(p) > 0 && <>{gente(p)} pers. · </>}
          <strong className="text-hueso">{enPesos(total(p))}</strong>
        </span>
        {alternativasDe(p, datos.presupuestos).length > 1 && (
          <span className="rounded-full border border-hueso/30 px-2 py-0.5 text-[13px] font-semibold text-hueso/80">
            {alternativasDe(p, datos.presupuestos).length} alternativas
          </span>
        )}
        <span className="text-[13px] text-hueso/55">N° {folioDe({ id: grupoDe(p) })}</span>
      </button>
    </li>
  );

  // ---- El calendario: semanas desde la en curso, con los días que importan.
  const inicio = semanaDe(hoy);
  const cajas = Array.from({ length: semanas }, (_, s) => {
    const lunes = sumarDias(inicio, s * 7);
    // Un día cerrado sin cotizaciones vivas no se muestra (2026-11-11, lo
    // pidió el cliente): no hay nada que cotizar ahí. Con alguna viva sí,
    // porque es una conversación abierta con un cliente.
    const dias = Array.from({ length: 7 }, (_, d) => sumarDias(lunes, d))
      .filter((f) => f >= hoy && (
        (porDia.get(f) ?? []).some((p) => cuentaComoPosible(p, hoy) || p.idReserva)
        || (estadoDelDia.has(f) && !estaCerrado(estadoDelDia.get(f) ?? ''))
        || (porDia.has(f) && !estadoDelDia.has(f))));
    return { lunes, dias };
  }).filter((c) => c.dias.length > 0);

  const tarjeta = (f: string) => {
    const delDia = agrupar(porDia.get(f) ?? []);
    const vivas = delDia.filter((p) => cuentaComoPosible(p, hoy));
    const candidatos = vivas.filter((p) => estadoDe(p) === ESTADO_PRESUPUESTO.candidato).length;
    const activas = vivas.length - candidatos;
    const ganadas = delDia.filter((p) => estadoDe(p) === ESTADO_PRESUPUESTO.aceptado).length;
    const porSeguirDia = delDia.filter((p) => seguirIds.has(grupoDe(p))).length;
    const posibles = vivas.reduce((n, p) => n + gente(p), 0);
    const palabra = palabraDelDia(estadoDelDia.get(f));
    const occ = ocupacion.get(f);
    const abiertaEsta = diaAbierto === f;
    return (
      /* **El mismo marco que la tarjeta de Reservas** (2026-11-13, lo pidió
         el cliente: que los dos calendarios *"se sientan iguales"*). Borde y
         fondo según el estado del día (`COLOR_TARJETA`), la fecha *MIÉ 11*
         (`FechaDia`), lo reservado en grande con la misma barra (`BarraDia`)
         y el botón en un pie separado por una línea. Encima de eso, lo que es
         propio de Cotizaciones: las pastillas de lo cotizado. */
      <div key={f} className={`flex h-full min-w-0 flex-col rounded border p-4 ${occ ? COLOR_TARJETA(occ) : 'border-hueso/15 bg-panel'}
        ${abiertaEsta ? 'ring-2 ring-oro' : ''}`}>
        <button type="button" onClick={() => setDiaAbierto(abiertaEsta ? null : f)}
          aria-expanded={abiertaEsta}
          className="tecla flex flex-1 flex-col items-stretch gap-3 rounded text-left">
          <span className="flex w-full items-start justify-between gap-2">
            <FechaDia fecha={f} />
            {/* El punto y su palabra debajo, como en los demás calendarios. */}
            {occ ? <PuntoDia d={occ} /> : <PuntoYPalabra {...palabra} />}
          </span>
          {/* **Lo ya reservado**, como en Reservas: el número grande y la
              barra. Para saber antes de cotizar si el día está tomado. */}
          {occ && occ.capacidad > 0 && (
            <span className="block">
              <span className="block text-[26px] font-bold leading-none">
                <span className={occ.quedan <= 0 ? 'text-rojo-texto' : ''}>{occ.tomadas}</span>
                <span className="text-hueso/45">/{occ.capacidad}</span>
                <span className="ml-1.5 text-[13px] font-medium text-hueso/70">
                  reservadas{occ.quedan <= 0 ? ' · sin cupo' : ''}
                </span>
              </span>
              <BarraDia d={occ} className="mt-2.5" />
            </span>
          )}
          <span className="flex flex-wrap gap-1.5">
            {candidatos > 0 && (
              <span className="rounded-full border border-cielo/60 px-2 py-0.5 text-[13px] font-semibold text-cielo-texto">
                {candidatos} candidato{candidatos === 1 ? '' : 's'}
              </span>
            )}
            {activas > 0 && (
              <span className="rounded-full border border-rosa/60 px-2 py-0.5 text-[13px] font-semibold text-rosa-texto">
                {activas} cotizaci{activas === 1 ? 'ón' : 'ones'}
              </span>
            )}
            {ganadas > 0 && (
              <span className="rounded-full border border-verde-fuerte bg-verde/15 px-2 py-0.5 text-[13px] font-semibold text-verde-texto">
                ✓ {ganadas} ganada{ganadas === 1 ? '' : 's'}
              </span>
            )}
            {porSeguirDia > 0 && (
              <span className="rounded-full border-2 border-ambar-fuerte px-2 py-0.5 text-[13px] font-semibold text-ambar-texto">
                ! esperando respuesta
              </span>
            )}
            {delDia.length === 0 && (
              <span className="text-[13px] text-hueso/55">nada cotizado</span>
            )}
          </span>
          {posibles > 0 && (
            <span className="text-[14px] text-rosa-texto"><strong>{posibles}</strong>
              <span> personas posibles, sin confirmar</span></span>
          )}
        </button>
        {!soloMira && (
          <div className="mt-auto border-t border-hueso/10 pt-3">
            <button type="button" onClick={() => setAbierta({ p: null, fecha: f })}
              className="boton w-full min-h-[44px]">+ Cotizar este día</button>
          </div>
        )}
      </div>
    );
  };

  /**
   * **Las cotizaciones del día abierto van en una franja bajo su semana**, a
   * todo el ancho (2026-11-11, lo reclamó el cliente: el día abierto se
   * estiraba a dos columnas y arrastraba el alto de toda la fila). Así las
   * tarjetas de la semana miden siempre lo mismo y la lista tiene espacio.
   */
  const franjaDelDia = (dias: string[]) => {
    if (!diaAbierto || !dias.includes(diaAbierto)) return null;
    const delDia = agrupar(porDia.get(diaAbierto) ?? []);
    if (delDia.length === 0) return null;
    return (
      <div className="mt-2 rounded border border-oro bg-panel p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-[14px] font-semibold first-letter:uppercase">{enPalabras(diaAbierto)}</p>
          <button type="button" onClick={() => setDiaAbierto(null)} className="boton">Cerrar</button>
        </div>
        <ul className="space-y-2">{delDia.map((p) => fila(p, false))}</ul>
      </div>
    );
  };

  return (
    <section>
      {/* La banda rosada de Cotizaciones: mismo formato que Reservas y Turnos,
          su propio tono. Ver `BandaSeccion.tsx`. */}
      <BandaSeccion tono="rosa" icono="💼" seccion="Cotizaciones" titulo="Cotizaciones"
        ayuda={<Ayuda tema="presupuestos" />} />
      {/* **El aviso, en su cajita y con su ✕** (2026-11-13, lo pidió el
          cliente: le gusta que esté presente, pero ocupa mucho para estar
          siempre). Antes iba dentro de la banda, y al cerrarlo la banda
          quedaba y parecía que no se había cerrado. Ver `AvisoFijo`. */}
      <AvisoFijo clave="cotizaciones-cupo" delServidor={datos.avisosLeidos} className="-mt-2 mb-4">
        Lo cotizado no ocupa cupo: recién al marcarla ganada se vuelve reserva.
      </AvisoFijo>

      <div className="mb-4 flex flex-wrap gap-2">
        {!soloMira && (
          <button type="button" onClick={() => setAbierta({ p: null })}
            className="boton boton-relleno min-h-[48px] px-5 text-[15px]">+ Cotizar</button>
        )}
        <span className="flex-1" />
        {/* El mismo *Mías* de todo el panel (`BotonMias`, 2026-11-13). */}
        <div className="flex items-center gap-2" role="group" aria-label="De quién">
          <BotonMias cuantas={agrupar(mias).length} elegido={soloMias} onClick={() => elegirDe('mias')} />
          <BotonTodos texto="De todos" cuantas={agrupar(datos.presupuestos).length} elegido={!soloMias}
            onClick={() => elegirDe('todos')} />
        </div>
        {([
          ['calendario', 'Calendario'],
          ['sinFecha', `Sin fecha (${agrupar(sinFecha).filter((p) => cuentaComoPosible(p, hoy)).length})`],
          ['todas', 'Todas']
        ] as const).map(([k, texto]) => (
          <button key={k} type="button" onClick={() => setVista(k)} aria-pressed={vista === k}
            className={`boton min-h-[48px] ${vista === k ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
            {texto}
          </button>
        ))}
      </div>

      <AvisoSobrecupo dias={datos.sobrecupo ?? []} />
      {/* **Los pendientes, en una fila de pastillas** (2026-11-13, lo pidió
          el cliente: los avisos apilados *"se anotan como lista Excel"* y
          empujaban el calendario). Una pastilla por tipo, en orden de
          urgencia —la plata primero—; se abre una lista a la vez. */}
      <Pendientes titulo="Tus pendientes" items={[
        ...(porDevolver.length ? [{
          clave: 'devolver', icono: '↩', tono: 'rojo' as const,
          texto: porDevolver.length === 1 ? '1 devolución por hacer' : `${porDevolver.length} devoluciones por hacer`,
          ayuda: 'Eventos cancelados con plata acordada para devolver. Ábrelo y anota la devolución al transferir.',
          lista: <div className="space-y-1.5">{porDevolver.map(({ p, falta }) => (
            <FilaPendiente key={p.id} quien={p.cliente || 'Sin cliente'} dato={`devolver ${enPesos(falta)}`} rojo
              onAbrir={() => setAbierta({ p, paso: 4 })} />))}</div>
        }] : []),
        ...(avisos.saldo.length ? (() => {
          const vencidos = avisos.saldo.filter((a) => a.dias < 0).length;
          return [{
            clave: 'saldo', icono: '💰', tono: (vencidos ? 'rojo' : 'ambar') as 'rojo' | 'ambar',
            texto: avisos.saldo.length === 1 ? '1 saldo por cobrar' : `${avisos.saldo.length} saldos por cobrar`,
            urgente: vencidos ? (vencidos === 1 ? '1 vencido' : `${vencidos} vencidos`) : undefined,
            lista: <div className="space-y-1.5">{avisos.saldo.map((a) => {
              const p = porId.get(a.id)!;
              return <FilaPendiente key={a.id} quien={p.cliente} rojo={a.dias < 0}
                dato={`${enPesos(a.monto)} · ${a.dias < 0 ? `venció hace ${-a.dias} ${a.dias === -1 ? 'día' : 'días'}`
                  : a.dias === 0 ? 'vence hoy' : a.dias === 1 ? 'vence mañana' : `vence en ${a.dias} días`}`}
                onAbrir={() => setAbierta({ p })} />;
            })}</div>
          }];
        })() : []),
        ...(sinRevisar.size ? [{
          clave: 'revisar', icono: '🧾', tono: 'ambar' as const,
          texto: sinRevisar.size === 1 ? '1 con cobros por revisar' : `${sinRevisar.size} con cobros por revisar`,
          ayuda: 'Comprueba que la plata llegó y márcalos revisados.',
          lista: <div className="space-y-1.5">{[...sinRevisar].map(([id, r]) => {
            const p = porId.get(id)!;
            return <FilaPendiente key={id} quien={p.cliente}
              dato={`${r.n === 1 ? '1 cobro' : `${r.n} cobros`} · ${enPesos(r.monto)}`} onAbrir={() => setAbierta({ p })} />;
          })}</div>
        }] : []),
        ...(avisos.anticipoSinGanar.length ? [{
          clave: 'ganar', icono: '✓', tono: 'verde' as const,
          texto: avisos.anticipoSinGanar.length === 1 ? '1 pagó y falta ganarla' : `${avisos.anticipoSinGanar.length} pagaron y falta ganarlas`,
          ayuda: 'Ya pagaron el anticipo. Mientras no esté ganada, otro puede tomar ese día.',
          lista: <div className="space-y-1.5">{avisos.anticipoSinGanar.map((a) => {
            const p = porId.get(a.id)!;
            return <FilaPendiente key={a.id} quien={p.cliente} dato={`pagó ${enPesos(a.monto)}`}
              onAbrir={() => setAbierta({ p, paso: 4 })} />;
          })}</div>
        }] : []),
        ...(porSeguir.length ? [{
          clave: 'seguir', icono: '📨', tono: 'rosa' as const,
          texto: porSeguir.length === 1 ? '1 esperando respuesta' : `${porSeguir.length} esperando respuesta`,
          lista: <EsperandoRespuesta embebida lista={porSeguir} onCambio={() => void cargar()}
            onAbrir={(p, paso) => setAbierta({ p, paso: paso ?? 4 })} />
        }] : []),
        ...(pronto.length ? [{
          clave: 'pronto', icono: '⌛', tono: 'ambar' as const,
          texto: pronto.length === 1 ? '1 vence pronto' : `${pronto.length} vencen pronto`,
          lista: <div className="space-y-1.5">{pronto.map((p) => {
            const n = diasParaVencer(p, hoy);
            return <FilaPendiente key={p.id} quien={p.cliente}
              dato={n === 0 ? 'vence hoy' : n === 1 ? 'vence mañana' : `vence en ${n} días`} onAbrir={() => setAbierta({ p })} />;
          })}</div>
        }] : []),
        ...(vencidas.length ? [{
          clave: 'vencidas', icono: '·', tono: 'neutro' as const,
          texto: vencidas.length === 1 ? '1 venció sin cerrar' : `${vencidas.length} vencieron sin cerrar`,
          ayuda: 'Ya no cuentan como gente posible: márcalas perdidas o renueva la vigencia.',
          lista: <div className="space-y-1.5">{vencidas.map((p) => (
            <FilaPendiente key={p.id} quien={p.cliente} dato={`N° ${folioDe(p)}`} onAbrir={() => setAbierta({ p })} />))}</div>
        }] : [])
      ]} />

      {vista === 'calendario' && (
        <div className="space-y-4">
          {cajas.length === 0 && (
            <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">
              No hay días abiertos ni cotizaciones en estas semanas. Usa “+ Cotizar” para elegir cualquier fecha.
            </p>
          )}
          {cajas.map((c) => (
            /* La caja de la semana, igual que en Reservas. */
            <div key={c.lunes} className={`rounded-lg border p-3 ${TONO.rosa.caja}`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-hueso/10 pb-2">
                <strong className="text-sm">
                  {rangoEnPalabras(Array.from({ length: 7 }, (_, d) => sumarDias(c.lunes, d)))}
                </strong>
                {c.lunes === inicio && <MarcaAhora>esta semana</MarcaAhora>}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {c.dias.map(tarjeta)}
              </div>
              {franjaDelDia(c.dias)}
            </div>
          ))}
          <button type="button" className="boton min-h-[44px]" onClick={() => setSemanas(semanas + 8)}>
            Ver 8 semanas más
          </button>
        </div>
      )}

      {vista === 'sinFecha' && (
        <div>
          <p className="mb-3 text-[14px] text-hueso/70">
            Cotizaciones que todavía no tienen día exacto. No ocupan ninguna fecha del calendario.
          </p>
          {sinFecha.length === 0 ? (
            <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">
              Ninguna sin fecha.
            </p>
          ) : <ul className="space-y-2">{agrupar(sinFecha).map((p) => fila(p))}</ul>}
        </div>
      )}

      {vista === 'todas' && (() => {
        const lista = agrupar(visibles).filter(pasaFiltro)
          .sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999'));
        return (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              {([
                ['activas', 'Activas'], ['candidatos', 'Candidatos'], ['ganadas', 'Ganadas'],
                ['cerradas', 'Perdidas y vencidas'], ['todas', 'Todas']
              ] as const).map(([k, texto]) => (
                <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={filtro === k}
                  className={`boton min-h-[44px] ${filtro === k ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
                  {texto}
                </button>
              ))}
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por cliente o N°" aria-label="Buscar cotización"
                className="min-h-[44px] flex-1 rounded border border-hueso/20 bg-tinta px-3 text-[15px]
                           focus:border-oro focus:outline-none sm:max-w-xs" />
            </div>
            {lista.length === 0 ? (
              <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">
                Ninguna calza.
              </p>
            ) : <ul className="space-y-2">{lista.map((p) => fila(p))}</ul>}
          </div>
        );
      })()}

      {abierta && (
        <CotizacionDialogo
          key={abierta.p?.id ?? `nueva-${abierta.fecha ?? ''}`}
          presupuesto={abierta.p}
          lineasIniciales={abierta.p ? lineasDe(datos.lineas, abierta.p.id) : []}
          fechaInicial={abierta.fecha}
          clienteInicial={abierta.cliente}
          datos={datos}
          onCambio={() => { huboCambios.current = true; void cargar(); }}
          onCerrar={() => {
            setAbierta(null);
            if (huboCambios.current) { huboCambios.current = false; setVersionOcupacion((v) => v + 1); }
          }}
          pasoInicial={abierta.paso}
          alternativas={abierta.p ? alternativasDe(abierta.p, datos.presupuestos) : []}
          onAbrir={(id, paso) => void abrirOtra(id, paso)}
        />
      )}
      {abriendo && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/30" aria-live="polite">
          <p className="rounded-xl border-2 border-oro/60 bg-panel px-5 py-3 text-[16px] font-semibold shadow-lg">
            Abriendo…
          </p>
        </div>
      )}
    </section>
  );
}

/** Si se está mirando solo lo propio: lo elegido, o el valor de partida del rol. */
function soloMiasDe(datos: { rol: string } | null, de: '' | 'mias' | 'todos'): boolean {
  if (de) return de === 'mias';
  return datos?.rol === ROL.vendedor;
}

/**
 * Las cotizaciones que se ven con el filtro *Mías / De todos*. **Un grupo de
 * alternativas va entero**: si una es suya, se ven todas, para que la
 * ventana no muestre una A sin su B.
 */
function visiblesDe(
  datos: { presupuestos: Presupuesto[]; usuario: string; rol: string } | null,
  de: '' | 'mias' | 'todos'
): Presupuesto[] {
  if (!datos) return [];
  if (de === 'todos' || (!de && !soloMiasDe(datos, de))) return datos.presupuestos;
  const grupos = new Set(datos.presupuestos
    .filter((p) => esSuya(datos.usuario, p.creadoPor)).map((p) => grupoDe(p)));
  return datos.presupuestos.filter((p) => grupos.has(grupoDe(p)));
}

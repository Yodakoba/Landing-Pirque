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
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import CotizacionDialogo, { type DatosCotizar } from './CotizacionDialogo';
import {
  estadoVisible, folioDe, lineasDe, totalDe, gentePosible, cuentaComoPosible,
  porVencer, vencidoSinCerrar, diasParaVencer, ESTADO_PRESUPUESTO,
  type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import { normalizar, estaCerrado, esPrivada, esExclusiva } from '@/lib/columnas';
import { semanaDe, sumarDias, diaSemana, rangoEnPalabras, enPalabras, esFecha } from '@/lib/fechas';
import { enPesos } from '@/lib/ocupacion';
import { avisosDeCobro, porRevisar } from '@/lib/cobros';
import { puede, type Rol } from '@/lib/auth';

type Datos = DatosCotizar & {
  presupuestos: Presupuesto[]; lineas: LineaPresupuesto[];
  cobros?: { presupuesto: string; monto: number; revisadoPor?: string }[];
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

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Qué es ese día, en una palabra. */
function palabraDelDia(estado: string | undefined): { texto: string; clase: string } {
  if (estado === undefined) return { texto: 'sin abrir', clase: 'text-hueso/60' };
  if (estaCerrado(estado)) return { texto: 'cerrado', clase: 'text-rojo-texto' };
  if (esExclusiva(estado)) return { texto: 'exclusivo', clase: 'text-cielo-texto' };
  if (esPrivada(estado)) return { texto: 'privado', clase: 'text-cielo-texto' };
  return { texto: 'público', clase: 'text-verde-texto' };
}

export default function CotizacionesVista() {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [vista, setVista] = useState<'calendario' | 'sinFecha' | 'todas'>('calendario');
  const [filtro, setFiltro] = useState<'activas' | 'candidatos' | 'ganadas' | 'cerradas' | 'todas'>('activas');
  const [busqueda, setBusqueda] = useState('');
  const [semanas, setSemanas] = useState(10);
  /** Qué día está abierto en el calendario, para ver sus cotizaciones. */
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  /** La ventana: una cotización existente, o una nueva (con fecha opcional). */
  const [abierta, setAbierta] = useState<
    { p: Presupuesto | null; fecha?: string; cliente?: string } | null>(null);

  const cargar = () => fetch('/api/presupuestos').then((r) => r.json()).then((d) => {
    if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
    setDatos(d);
  }).catch((e) => setError(String(e)));

  useEffect(() => { void cargar(); }, []);

  // Abrir una cotización desde otra pantalla: `/presupuestos?abrir=<id>`.
  useEffect(() => {
    if (!datos) return;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('abrir');
    const p = id ? datos.presupuestos.find((x) => x.id === id) : undefined;
    // `?cliente=<id>`: cotizarle a un cliente desde su ficha.
    const cliente = q.get('cliente');
    if (p) setAbierta({ p });
    else if (cliente) setAbierta({ p: null, cliente });
    if (p || cliente) window.history.replaceState(null, '', '/presupuestos');
  }, [datos]);

  const porDia = useMemo(() => {
    const m = new Map<string, Presupuesto[]>();
    for (const p of datos?.presupuestos ?? []) {
      if (!esFecha(p.fecha)) continue;
      if (!m.has(p.fecha)) m.set(p.fecha, []);
      m.get(p.fecha)!.push(p);
    }
    return m;
  }, [datos]);

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!datos) return <p className="text-hueso/50">Cargando…</p>;

  const hoy = datos.hoy;
  const estadoDe = (p: Presupuesto) => estadoVisible(p, hoy);
  const sinFecha = datos.presupuestos.filter((p) => !esFecha(p.fecha));
  const estadoDelDia = new Map(datos.fechas.map((f) => [f.fecha, f.estado]));
  const total = (p: Presupuesto) => totalDe(lineasDe(datos.lineas, p.id), p.descuento);
  const gente = (p: Presupuesto) => gentePosible(p, lineasDe(datos.lineas, p.id));

  const pasaFiltro = (p: Presupuesto) => {
    const e = estadoDe(p);
    if (busqueda && !normalizar(`${p.cliente} ${folioDe(p)}`).includes(normalizar(busqueda))) return false;
    if (filtro === 'todas') return true;
    if (filtro === 'candidatos') return e === ESTADO_PRESUPUESTO.candidato;
    if (filtro === 'ganadas') return e === ESTADO_PRESUPUESTO.aceptado;
    if (filtro === 'cerradas') return [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida, 'Vencida'].includes(e);
    return cuentaComoPosible(p, hoy);
  };

  const pronto = datos.presupuestos.filter((p) => porVencer(p, hoy));
  const vencidas = datos.presupuestos.filter((p) => vencidoSinCerrar(p, hoy));
  // **Los avisos de plata** (2026-11-10): anticipo pagado sin ganar, y el
  // saldo de una ganada que vence pronto o ya venció. Ver `avisosDeCobro()`.
  const avisos = avisosDeCobro(
    datos.presupuestos.map((p) => ({ ...p, total: totalDe(lineasDe(datos.lineas, p.id), p.descuento) })),
    datos.cobros ?? [], datos.condiciones ?? { anticipoPct: 30, saldoDias: 3 }, hoy,
    [ESTADO_PRESUPUESTO.rechazado, ESTADO_PRESUPUESTO.noElegida]);
  const porId = new Map(datos.presupuestos.map((p) => [p.id, p]));
  // **Cobros por revisar** (2026-11-10): solo para quien hace los pagos,
  // que es quien los revisa. Uno por cotización, con cuántos y cuánto.
  const sinRevisar = new Map<string, { n: number; monto: number }>();
  if (puede(datos.rol as Rol, 'pagar')) {
    for (const c of porRevisar((datos.cobros ?? []).map((c) => ({ ...c, revisadoPor: c.revisadoPor ?? '' })))) {
      if (!porId.has(c.presupuesto)) continue;
      const a = sinRevisar.get(c.presupuesto) ?? { n: 0, monto: 0 };
      sinRevisar.set(c.presupuesto, { n: a.n + 1, monto: a.monto + c.monto });
    }
  }

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
        <span className="text-[13px] text-hueso/55">N° {folioDe(p)}</span>
      </button>
    </li>
  );

  // ---- El calendario: semanas desde la en curso, con los días que importan.
  const inicio = semanaDe(hoy);
  const cajas = Array.from({ length: semanas }, (_, s) => {
    const lunes = sumarDias(inicio, s * 7);
    const dias = Array.from({ length: 7 }, (_, d) => sumarDias(lunes, d))
      .filter((f) => f >= hoy && (porDia.has(f) || estadoDelDia.has(f)));
    return { lunes, dias };
  }).filter((c) => c.dias.length > 0);

  const tarjeta = (f: string) => {
    const delDia = porDia.get(f) ?? [];
    const vivas = delDia.filter((p) => cuentaComoPosible(p, hoy));
    const candidatos = vivas.filter((p) => estadoDe(p) === ESTADO_PRESUPUESTO.candidato).length;
    const activas = vivas.length - candidatos;
    const ganadas = delDia.filter((p) => estadoDe(p) === ESTADO_PRESUPUESTO.aceptado).length;
    const posibles = vivas.reduce((n, p) => n + gente(p), 0);
    const palabra = palabraDelDia(estadoDelDia.get(f));
    const abiertaEsta = diaAbierto === f;
    return (
      <div key={f} className={`flex flex-col rounded border bg-panel ${abiertaEsta
        ? 'border-oro sm:col-span-2' : 'border-hueso/15'}`}>
        <button type="button" onClick={() => setDiaAbierto(abiertaEsta ? null : f)}
          aria-expanded={abiertaEsta}
          className="flex flex-1 flex-col items-start gap-2 p-3 text-left hover:bg-hueso/5">
          <span className="flex w-full items-baseline gap-2">
            <span className="text-[13px] font-semibold uppercase text-hueso/70">{DIAS[diaSemana(f)]}</span>
            <span className="text-[26px] font-bold leading-none">{Number(f.slice(8))}</span>
            <span className={`text-[13px] font-semibold ${palabra.clase}`}>{palabra.texto}</span>
          </span>
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
            {delDia.length === 0 && (
              <span className="text-[13px] text-hueso/55">nada cotizado</span>
            )}
          </span>
          {posibles > 0 && (
            <span className="text-[14px]"><strong>{posibles}</strong>
              <span className="text-hueso/70"> personas posibles</span></span>
          )}
        </button>
        <div className="border-t border-hueso/10 p-2">
          <button type="button" onClick={() => setAbierta({ p: null, fecha: f })}
            className="boton w-full min-h-[44px]">+ Cotizar este día</button>
        </div>
        {abiertaEsta && delDia.length > 0 && (
          <ul className="space-y-2 border-t border-hueso/10 p-2">
            {delDia.map((p) => fila(p, false))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Cotizaciones<Ayuda tema="presupuestos" />
      </h1>
      <p className="mb-4 max-w-2xl text-[15px] text-hueso/70">
        Lo cotizado no ocupa cupo: recién al marcarla ganada se vuelve reserva.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setAbierta({ p: null })}
          className="boton boton-relleno min-h-[48px] px-5 text-[15px]">+ Cotizar</button>
        <span className="flex-1" />
        {([
          ['calendario', 'Calendario'],
          ['sinFecha', `Sin fecha (${sinFecha.filter((p) => cuentaComoPosible(p, hoy)).length})`],
          ['todas', 'Todas']
        ] as const).map(([k, texto]) => (
          <button key={k} type="button" onClick={() => setVista(k)} aria-pressed={vista === k}
            className={`boton min-h-[48px] ${vista === k ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
            {texto}
          </button>
        ))}
      </div>

      {(pronto.length > 0 || vencidas.length > 0 || avisos.anticipoSinGanar.length > 0
        || avisos.saldo.length > 0 || sinRevisar.size > 0) && (
        <div className="mb-4 space-y-2">
          {sinRevisar.size > 0 && (
            <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-[15px] font-semibold text-ambar-texto">
                {sinRevisar.size === 1 ? '1 cotización con cobros por revisar'
                  : `${sinRevisar.size} cotizaciones con cobros por revisar`}
              </p>
              <p className="text-[14px] text-hueso/70">Comprueba que la plata llegó y márcalos revisados.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...sinRevisar].map(([id, r]) => {
                  const p = porId.get(id)!;
                  return (
                    <button key={id} type="button" onClick={() => setAbierta({ p })} className="boton">
                      {p.cliente} · {r.n === 1 ? '1 cobro' : `${r.n} cobros`} · {enPesos(r.monto)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {avisos.anticipoSinGanar.length > 0 && (
            <div className="rounded border border-verde-fuerte/60 bg-verde/5 p-3">
              <p className="text-[15px] font-semibold text-verde-texto">
                {avisos.anticipoSinGanar.length === 1
                  ? '1 cotización ya pagó el anticipo y falta marcarla ganada'
                  : `${avisos.anticipoSinGanar.length} cotizaciones ya pagaron el anticipo y falta marcarlas ganadas`}
              </p>
              <p className="text-[14px] text-hueso/70">Mientras no esté ganada, otro puede tomar ese día.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {avisos.anticipoSinGanar.map((a) => {
                  const p = porId.get(a.id)!;
                  return (
                    <button key={a.id} type="button" onClick={() => setAbierta({ p })} className="boton">
                      {p.cliente} · pagó {enPesos(a.monto)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {avisos.saldo.length > 0 && (
            <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-[15px] font-semibold text-ambar-texto">
                {avisos.saldo.length === 1 ? '1 saldo por cobrar' : `${avisos.saldo.length} saldos por cobrar`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {avisos.saldo.map((a) => {
                  const p = porId.get(a.id)!;
                  return (
                    <button key={a.id} type="button" onClick={() => setAbierta({ p })}
                      className={`boton ${a.dias < 0 ? '!border-rojo-fuerte text-rojo-texto' : ''}`}>
                      {p.cliente} · {enPesos(a.monto)} · {a.dias < 0
                        ? `venció hace ${-a.dias} ${a.dias === -1 ? 'día' : 'días'}`
                        : a.dias === 0 ? 'vence hoy' : a.dias === 1 ? 'vence mañana' : `vence en ${a.dias} días`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {pronto.length > 0 && (
            <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-[15px] font-semibold text-ambar-texto">
                {pronto.length === 1 ? '1 cotización vence pronto' : `${pronto.length} cotizaciones vencen pronto`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {pronto.map((p) => {
                  const n = diasParaVencer(p, hoy);
                  return (
                    <button key={p.id} type="button" onClick={() => setAbierta({ p })} className="boton">
                      {p.cliente} · {n === 0 ? 'vence hoy' : n === 1 ? 'vence mañana' : `vence en ${n} días`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {vencidas.length > 0 && (
            <div className="rounded border border-hueso/25 p-3">
              <p className="text-[15px] font-semibold">
                {vencidas.length === 1 ? '1 cotización venció y nadie la cerró'
                  : `${vencidas.length} cotizaciones vencieron y nadie las cerró`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {vencidas.map((p) => (
                  <button key={p.id} type="button" onClick={() => setAbierta({ p })} className="boton">
                    {p.cliente} · N° {folioDe(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {vista === 'calendario' && (
        <div className="space-y-4">
          {cajas.length === 0 && (
            <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">
              No hay días abiertos ni cotizaciones en estas semanas. Usa “+ Cotizar” para elegir cualquier fecha.
            </p>
          )}
          {cajas.map((c) => (
            <div key={c.lunes} className={`rounded border p-3 ${c.lunes === inicio
              ? 'border-oro/60' : 'border-hueso/15'}`}>
              <p className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-hueso/75">
                {rangoEnPalabras(Array.from({ length: 7 }, (_, d) => sumarDias(c.lunes, d)))}
                {c.lunes === inicio && <span className="ml-2 text-oro">esta semana</span>}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {c.dias.map(tarjeta)}
              </div>
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
          ) : <ul className="space-y-2">{sinFecha.map((p) => fila(p))}</ul>}
        </div>
      )}

      {vista === 'todas' && (() => {
        const lista = datos.presupuestos.filter(pasaFiltro)
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
          onCambio={() => void cargar()}
          onCerrar={() => setAbierta(null)}
        />
      )}
    </section>
  );
}

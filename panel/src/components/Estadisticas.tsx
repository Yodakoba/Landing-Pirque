'use client';

/**
 * **Las estadísticas de reservas** (2026-11-19). Solo para mirar:
 * operaciones, pagos, la gerencia general y el administrador. Se llega por
 * *📊 Estadísticas* en el calendario de Reservas.
 *
 * Arriba, en una sola franja, **cuándo** (*Día · Semana · Mes ·
 * Personalizado*, con ◀ ▶ como la Lista de cotizaciones), **por qué fecha**
 * (la de la visita o la del día en que se reservó) y **qué** (*Todo ·
 * Visitas · Eventos*). Abajo, cuatro bloques: cuánto se movió, si vinieron,
 * la plata, y de dónde y cómo. Cada número se compara con el periodo
 * anterior y tiene su `?`.
 *
 * Las cuentas son de `lib/estadisticas.ts` y se hacen acá, con lo que mandó
 * `/api/estadisticas` una vez: cambiar un filtro no vuelve a leer la planilla.
 */
import { useEffect, useMemo, useState } from 'react';
import BandaSeccion from './BandaSeccion';
import Ayuda from './Ayuda';
import AyudaCorta from './AyudaCorta';
import TarjetaNumero from './TarjetaNumero';
import EstadisticasEquipo from './EstadisticasEquipo';
import type { DiaEstadistica } from '@/lib/estadisticasEquipo';
import { enPesos } from '@/lib/ocupacion';
import { enCorto, enPalabras, mesEnPalabras, rangoEnPalabras, diaSemana, type Fecha } from '@/lib/fechas';
import {
  resumen, rangoDe, moverRango, anteriorDe, rangoPersonalizado, cambio, largoDe,
  type FilaEst, type DiaEst, type Rango, type Modo, type Base, type Tipo, type Resumen
} from '@/lib/estadisticas';

const ELEGIDO = 'border-oro bg-oro/15 font-semibold text-oro';
const NEUTRO = 'border-hueso/20 bg-panel';
const miles = (n: number) => Math.round(n).toLocaleString('es-CL');
const decimal = (n: number) => n.toLocaleString('es-CL', { maximumFractionDigits: 1 });
const plural = (n: number, uno: string, varios: string) => `${miles(n)} ${n === 1 ? uno : varios}`;
/** Dos letras por día, para que quepan bajo una columna angosta: *lu ma mi ju vi sá do*. */
const DOS_LETRAS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];

/** El nombre de un periodo: *noviembre 2026*, *16 – 22 de noviembre*, *sábado 14 de noviembre*. */
function tituloDe(modo: Modo, r: Rango): string {
  if (modo === 'mes') return mesEnPalabras(r.desde.slice(0, 7));
  if (modo === 'dia') return enPalabras(r.desde);
  const a = r.desde.slice(0, 4), b = r.hasta.slice(0, 4);
  return `${rangoEnPalabras([r.desde, r.hasta])}${a === b ? ` ${a}` : ` (${a}–${b})`}`;
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-oro">{titulo}</h2>
      {children}
    </section>
  );
}

/** Una lista de nombres con su barra y su cifra: la barra va debajo del nombre. */
function ListaBarras({ titulo, ayuda, bajada, filas }: {
  titulo: string; ayuda: string; bajada?: string;
  filas: { nombre: string; valor: number; texto: string }[];
}) {
  const max = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <div className={`rounded-xl border-2 p-3 ${NEUTRO}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/70">
        {titulo}<AyudaCorta tema={ayuda} />
      </p>
      {bajada && <p className="mt-0.5 text-[13px] text-hueso/65">{bajada}</p>}
      {filas.length === 0 ? (
        <p className="mt-2 text-[14px] text-hueso/60">Nada en este periodo.</p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {filas.map((f) => (
            <li key={f.nombre}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="min-w-0 truncate">{f.nombre}</span>
                <span className="shrink-0 font-semibold tabular-nums">{f.texto}</span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-hueso/10" aria-hidden>
                <div className="h-2 rounded-full bg-oro" style={{ width: `${(f.valor / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Un tope redondo para el eje: 1, 2 o 5 por una potencia de diez. */
function topeRedondo(n: number): number {
  if (n <= 0) return 10;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

/** Personas por día (o por semana), con el cupo como fondo de cada columna. */
function Columnas({ r, base }: { r: Resumen; base: Base }) {
  const [foco, setFoco] = useState<number | null>(null);
  const conCupo = base === 'visita';
  const tope = topeRedondo(Math.max(0, ...r.serie.map((s) => Math.max(s.personas, s.cupo ?? 0))));
  const alto = 180;
  const nombre = (k: Fecha) => (r.serieSemanal ? `semana del ${enCorto(k)}` : enPalabras(k));
  const detalle = (s: Resumen['serie'][number]) =>
    `${plural(s.personas, 'persona', 'personas')}${conCupo && s.cupo ? ` de ${miles(s.cupo)} de cupo (${Math.round((s.personas / s.cupo) * 100)}%)` : ''}`;
  const pasoEtiqueta = r.serie.length > 20 ? Math.ceil(r.serie.length / 10) : 1;

  return (
    <div className={`rounded-xl border-2 p-3 ${NEUTRO}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/70">
          {r.serieSemanal ? 'Personas por semana' : 'Personas por día'}<AyudaCorta tema="estSerie" />
        </p>
        {conCupo && (
          <p className="flex items-center gap-3 text-[13px] text-hueso/75">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-oro" />Personas</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-oro/20" />Cupo</span>
          </p>
        )}
      </div>
      {r.serie.length === 0 ? (
        <p className="mt-2 text-[14px] text-hueso/60">Nada en este periodo.</p>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            {/* El eje: tres marcas redondas. */}
            <div className="relative w-9 shrink-0 text-right text-[13px] tabular-nums text-hueso/60" style={{ height: alto }}>
              {[1, 0.5, 0].map((f) => (
                <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: (1 - f) * alto }}>{miles(tope * f)}</span>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 overflow-x-auto pb-1">
              <div className="relative" style={{ minWidth: r.serie.length * 22 }}>
                {[1, 0.5, 0].map((f) => (
                  <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-hueso/10" style={{ top: (1 - f) * alto }} />
                ))}
                <div className="flex items-end" style={{ height: alto }}>
                  {r.serie.map((s, i) => (
                    <div key={s.clave} tabIndex={0} role="img" aria-label={`${nombre(s.clave)}: ${detalle(s)}`}
                      onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}
                      onFocus={() => setFoco(i)} onBlur={() => setFoco(null)} onClick={() => setFoco(foco === i ? null : i)}
                      className="relative flex h-full min-w-[22px] flex-1 cursor-default items-end justify-center outline-none focus-visible:bg-oro/10">
                      {conCupo && !!s.cupo && (
                        <div className="absolute bottom-0 w-[18px] rounded-t-[4px] bg-oro/20" style={{ height: (s.cupo / tope) * alto }} />
                      )}
                      <div className={`relative w-[12px] rounded-t-[4px] ${foco === i ? 'bg-oro/80' : 'bg-oro'}`}
                        style={{ height: Math.max(s.personas ? 2 : 0, (s.personas / tope) * alto) }} />
                      {foco === i && (
                        <div role="tooltip" className={`absolute top-0 z-10 w-max max-w-[14rem] rounded-lg border border-hueso/20 bg-tinta px-2.5 py-1.5 text-[13px] shadow-lg ${i > r.serie.length / 2 ? 'right-0' : 'left-0'}`}>
                          <span className="block font-bold">{plural(s.personas, 'persona', 'personas')}</span>
                          <span className="block text-hueso/70 first-letter:uppercase">{nombre(s.clave)}</span>
                          {conCupo && !!s.cupo && <span className="block text-hueso/70">cupo {miles(s.cupo)} · {Math.round((s.personas / s.cupo) * 100)}%</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex">
                  {r.serie.map((s, i) => (
                    <span key={s.clave} className="min-w-[22px] flex-1 text-center text-[13px] leading-tight text-hueso/60">
                      {i % pasoEtiqueta === 0 ? (
                        r.serieSemanal ? <>{Number(s.clave.slice(8))}<br />{enCorto(s.clave).slice(-3)}</>
                          : <>{Number(s.clave.slice(8))}<br />{DOS_LETRAS[diaSemana(s.clave)]}</>
                      ) : ' '}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <details className="mt-2">
            <summary className="boton inline-flex min-h-[40px] cursor-pointer items-center">Ver en tabla</summary>
            <div className="caja-tabla mt-2 overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-hueso/60">
                    <th className="py-1 pr-3 font-semibold">{r.serieSemanal ? 'Semana del' : 'Día'}</th>
                    <th className="py-1 pr-3 text-right font-semibold">Personas</th>
                    {conCupo && <><th className="py-1 pr-3 text-right font-semibold">Cupo</th><th className="py-1 text-right font-semibold">%</th></>}
                  </tr>
                </thead>
                <tbody>
                  {r.serie.map((s) => (
                    <tr key={s.clave} className="border-t border-hueso/10">
                      <td className="py-1 pr-3">{enCorto(s.clave)}</td>
                      <td className="py-1 pr-3 text-right tabular-nums">{miles(s.personas)}</td>
                      {conCupo && <>
                        <td className="py-1 pr-3 text-right tabular-nums">{s.cupo ? miles(s.cupo) : '—'}</td>
                        <td className="py-1 text-right tabular-nums">{s.cupo ? `${Math.round((s.personas / s.cupo) * 100)}%` : '—'}</td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

export default function Estadisticas() {
  const [datos, setDatos] = useState<{ hoy: Fecha; filas: FilaEst[]; dias: DiaEst[];
    equipo?: { dias: DiaEstadistica[]; puestos: string[] } | null } | null>(null);
  /**
   * **Reservas o Equipo** (2026-11-21): la segunda vista llega desde el
   * informe con `?vista=equipo`, y queda en la dirección al cambiarla.
   */
  const [vista, setVista] = useState<'reservas' | 'equipo'>('reservas');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('vista') === 'equipo') setVista('equipo');
  }, []);
  const elegirVista = (v: 'reservas' | 'equipo') => {
    setVista(v);
    try { window.history.replaceState(null, '', v === 'equipo' ? '?vista=equipo' : window.location.pathname); } catch { /* sin historia */ }
  };
  const [error, setError] = useState('');
  const [modo, setModo] = useState<Modo>('mes');
  const [rango, setRango] = useState<Rango | null>(null);
  const [base, setBase] = useState<Base>('visita');
  const [tipo, setTipo] = useState<Tipo>('todo');

  useEffect(() => {
    fetch('/api/estadisticas').then((r) => r.json()).then((d) => {
      if (d.error) { setError(d.error); return; }
      setDatos(d);
      setRango(rangoDe('mes', d.hoy));
    }).catch((e) => setError(String(e)));
  }, []);

  const opciones = { base, tipo, hoy: datos?.hoy ?? '' };
  const r = useMemo(() => (datos && rango ? resumen(datos.filas, datos.dias, rango, opciones) : null),
    [datos, rango, base, tipo]); // eslint-disable-line react-hooks/exhaustive-deps
  const anterior = rango ? anteriorDe(modo, rango) : null;
  const a = useMemo(() => (datos && anterior ? resumen(datos.filas, datos.dias, anterior, opciones) : null),
    [datos, anterior?.desde, anterior?.hasta, base, tipo]); // eslint-disable-line react-hooks/exhaustive-deps

  const elegirModo = (m: Modo) => {
    if (!datos || !rango) return;
    setModo(m);
    if (m === 'personalizado') return;
    // Al cambiar de modo, se queda en el periodo de hoy si hoy cae en el que se miraba.
    const ancla = datos.hoy >= rango.desde && datos.hoy <= rango.hasta ? datos.hoy : rango.desde;
    setRango(rangoDe(m, ancla));
  };

  /**
   * *Día · Semana · Mes · Personalizado*. **En el computador va en la fila de
   * arriba**, a la derecha de *Volver* y de las dos vistas (2026-11-21, el
   * computador más compacto: eran tres filas de controles antes del primer
   * número). En el celular sigue en su propia fila. Se dibuja en los dos
   * lugares y se ve en uno.
   */
  const modos = (clase: string) => (
    <div className={clase} role="group" aria-label="Periodo">
      {([['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['personalizado', 'Personalizado']] as const).map(([m, t]) => (
        <button key={m} type="button" aria-pressed={modo === m} onClick={() => elegirModo(m)}
          className={`boton min-h-[44px] ${modo === m ? ELEGIDO : ''}`}>{t}</button>
      ))}
    </div>
  );

  const cabecera = (
    <>
      <BandaSeccion tono="oro" icono="📊" seccion={vista === 'equipo' && datos?.equipo ? 'Equipo' : 'Reservas'} titulo="Estadísticas"
        ayuda={<Ayuda tema="estadisticas" />}>
        Solo para mirar
      </BandaSeccion>
      <div className="mb-4 flex flex-wrap items-center gap-2 lg:mb-2">
        {vista === 'equipo' && datos?.equipo
          ? <a href="/informe" className="boton inline-flex min-h-[40px] items-center">← Volver al informe</a>
          : <a href="/" className="boton inline-flex min-h-[40px] items-center">← Volver al calendario</a>}
        {/* Las dos vistas, dos botones grandes: solo para quien también ve el informe. */}
        {datos?.equipo && (
          <div role="group" aria-label="Qué estadísticas" className="flex gap-2">
            {([['reservas', '📅 Reservas'], ['equipo', '👥 Equipo']] as const).map(([v, t]) => (
              <button key={v} type="button" aria-pressed={vista === v} onClick={() => elegirVista(v)}
                className={`tecla min-h-[44px] rounded-xl border-2 px-4 text-[15px] font-bold ${
                  vista === v ? 'border-oro bg-oro/15 text-hueso' : 'border-hueso/25 text-hueso/75 hover:border-oro/60'}`}>
                {t}
              </button>
            ))}
          </div>
        )}
        {modos('hidden lg:ml-auto lg:flex lg:flex-wrap lg:items-center lg:gap-2')}
      </div>
    </>
  );
  if (error) return <>{cabecera}<p className="rounded border border-rojo-fuerte/50 bg-rojo/10 p-3 text-[15px] text-rojo-texto">{error}</p></>;
  if (!datos || !rango || !r || !a || !anterior) return <>{cabecera}<p className="text-hueso/60">Cargando…</p></>;

  const contra = tituloDe(modo, anterior);
  const titulo = tituloDe(modo, rango);
  const por = base === 'visita' ? 'por fecha de la visita' : 'por fecha en que se reservó';
  const que = tipo === 'todo' ? 'todas las reservas' : tipo === 'visitas' ? 'visitas (Shopify y a mano)' : 'eventos (cotizaciones)';
  const total = r.reservas;
  const share = (n: number, de: number) => (de ? ` · ${Math.round((n / de) * 100)}%` : '');

  return (
    <div className="mx-auto max-w-6xl">
      {cabecera}

      {/* Cuándo, por qué fecha y qué: una sola franja arriba de todo. */}
      {modos('flex flex-wrap items-center gap-2 lg:hidden')}
      <div className="mt-2 flex flex-wrap items-center gap-2 lg:mt-0">
        {modo === 'personalizado' ? (
          <div className="flex flex-wrap items-end gap-2">
            {(['desde', 'hasta'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-[13px] font-semibold uppercase tracking-wide text-hueso/60">{k === 'desde' ? 'Desde' : 'Hasta'}</span>
                <input type="date" value={rango[k]} aria-label={k === 'desde' ? 'Desde' : 'Hasta'}
                  onChange={(e) => {
                    const nuevo = rangoPersonalizado(k === 'desde' ? e.target.value : rango.desde, k === 'hasta' ? e.target.value : rango.hasta);
                    if (nuevo) setRango(nuevo);
                  }}
                  className="mt-1 min-h-[44px] rounded border border-hueso/20 bg-tinta px-3 text-[15px] focus:border-oro focus:outline-none" />
              </label>
            ))}
            <span className="pb-3 text-[14px] text-hueso/70">{plural(largoDe(rango), 'día', 'días')}</span>
          </div>
        ) : (
          <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border-2 border-oro/50 bg-oro/[0.06] p-1 sm:w-80 sm:flex-none">
            <button type="button" aria-label="Periodo anterior" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
              onClick={() => setRango(moverRango(modo, rango, -1))}>◀</button>
            <span className="min-w-0 flex-1 truncate text-center text-[17px] font-bold first-letter:uppercase">{titulo}</span>
            <button type="button" aria-label="Periodo siguiente" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
              onClick={() => setRango(moverRango(modo, rango, 1))}>▶</button>
          </div>
        )}
        {!(vista === 'equipo' && datos.equipo) && (<>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Por qué fecha">
          {([['visita', '📅 Fecha de la visita'], ['reservada', '✍ Fecha en que se reservó']] as const).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={base === k} onClick={() => setBase(k)}
              className={`boton min-h-[44px] ${base === k ? ELEGIDO : ''}`}>{t}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Qué reservas">
          {([['todo', 'Todo'], ['visitas', 'Visitas'], ['eventos', 'Eventos']] as const).map(([k, t]) => (
            <button key={k} type="button" aria-pressed={tipo === k} onClick={() => setTipo(k)}
              className={`boton min-h-[44px] ${tipo === k ? ELEGIDO : ''}`}>{t}</button>
          ))}
        </div>
        </>)}
      </div>
      {vista === 'equipo' && datos.equipo ? (
        <>
          <p className="mt-2 text-[14px] text-hueso/70">
            Mostrando: <b className="text-hueso first-letter:uppercase">{titulo}</b>, el equipo. Se compara con {contra}.
          </p>
          <EstadisticasEquipo equipo={datos.equipo} rango={rango} anterior={anterior} contra={contra} />
          <p className="mt-6 text-[13px] text-hueso/60">Datos al {enPalabras(datos.hoy)}. Los mismos montos del informe del equipo.</p>
        </>
      ) : (<>
      <p className="mt-2 text-[14px] text-hueso/70">
        Mostrando: <b className="text-hueso first-letter:uppercase">{titulo}</b>, {por}, {que}. Se compara con {contra}.
      </p>

      <Bloque titulo="Cuánto se movió">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <TarjetaNumero que="Reservas" ayuda="estReservas" valor={miles(r.reservas)} tono={NEUTRO}
            nota="que siguen en pie" cambio={cambio(r.reservas, a.reservas)} contra={contra} />
          <TarjetaNumero que="Personas" ayuda="estPersonas" valor={miles(r.personas)} tono={NEUTRO}
            nota="la gente que cuenta el día" cambio={cambio(r.personas, a.personas)} contra={contra} />
          <TarjetaNumero que="Ocupación" ayuda="estOcupacion" tono={NEUTRO}
            valor={r.ocupacion?.pct != null ? `${r.ocupacion.pct}%` : '—'}
            nota={!r.ocupacion ? 'solo por fecha de la visita'
              : r.ocupacion.cupo ? `${miles(r.ocupacion.personas)} de ${miles(r.ocupacion.cupo)} lugares` : 'sin días abiertos'}
            cambio={cambio(r.ocupacion?.pct ?? null, a.ocupacion?.pct ?? null, true)} contra={contra} />
          <TarjetaNumero que="Grupo promedio" ayuda="estGrupo" tono={NEUTRO} bueno="ninguna"
            valor={r.grupo != null ? decimal(r.grupo) : '—'} nota="personas por reserva"
            cambio={cambio(r.grupo, a.grupo)} contra={contra} />
        </div>
      </Bloque>

      <Bloque titulo="Si vinieron">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
          <TarjetaNumero que="No-show" ayuda="estNoShow" tono={NEUTRO} bueno="baja"
            valor={r.noShow.pct != null ? `${r.noShow.pct}%` : '—'}
            nota={`${miles(r.noShow.noVino)} de ${plural(r.noShow.marcadas, 'marcada', 'marcadas')} · ${plural(r.noShow.personas, 'persona', 'personas')}`
              + (r.noShow.sinMarcar ? ` · ${miles(r.noShow.sinMarcar)} sin marcar` : '')}
            cambio={cambio(r.noShow.pct, a.noShow.pct, true)} contra={contra} />
          <TarjetaNumero que="Llegaron menos" ayuda="estLlegaronMenos" tono={NEUTRO} bueno="baja"
            valor={plural(r.llegaronMenos.personas, 'persona', 'personas')}
            nota={r.llegaronMenos.reservas ? `faltaron en ${plural(r.llegaronMenos.reservas, 'reserva que vino', 'reservas que vinieron')}` : 'todas llegaron completas'}
            cambio={cambio(r.llegaronMenos.personas, a.llegaronMenos.personas)} contra={contra} />
          <TarjetaNumero que="Cancelaciones" ayuda="estCanceladas" tono={NEUTRO} bueno="baja"
            valor={r.canceladas.pct != null ? `${r.canceladas.pct}%` : '—'}
            nota={`${plural(r.canceladas.reservas, 'reserva', 'reservas')} · ${plural(r.canceladas.personas, 'persona', 'personas')}`}
            cambio={cambio(r.canceladas.pct, a.canceladas.pct, true)} contra={contra} />
        </div>
      </Bloque>

      <Bloque titulo="La plata">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <TarjetaNumero que="Valor por reserva" ayuda="estPorReserva" tono={NEUTRO}
            valor={r.plata.porReserva != null ? enPesos(r.plata.porReserva) : '—'}
            nota={r.plata.sinMonto ? `${plural(r.plata.sinMonto, 'reserva', 'reservas')} sin monto no cuentan` : 'IVA incluido'}
            cambio={cambio(r.plata.porReserva, a.plata.porReserva)} contra={contra} />
          <TarjetaNumero que="Valor por persona" ayuda="estPorPersona" tono={NEUTRO}
            valor={r.plata.porPersona != null ? enPesos(r.plata.porPersona) : '—'} nota="IVA incluido"
            cambio={cambio(r.plata.porPersona, a.plata.porPersona)} contra={contra} />
          <TarjetaNumero que="Total reservado" ayuda="estTotal" tono={NEUTRO}
            valor={enPesos(r.plata.total)}
            nota={`${enPesos(r.plata.pagado)} pagado · ${enPesos(r.plata.porCobrar)} por cobrar`}
            cambio={cambio(r.plata.total, a.plata.total)} contra={contra} />
          <TarjetaNumero que="Cuenta final" ayuda="estCuentaFinal" tono={NEUTRO}
            valor={r.cuentaFinal.porPersona != null ? `${enPesos(r.cuentaFinal.porPersona)}` : '—'}
            nota={r.cuentaFinal.mesas
              ? `por persona · ${plural(r.cuentaFinal.mesas, 'mesa', 'mesas')}`
                + (r.cuentaFinal.deMasPorPersona != null
                  ? ` · ${r.cuentaFinal.deMasPorPersona >= 0 ? '+' : '−'}${enPesos(Math.abs(r.cuentaFinal.deMasPorPersona))} sobre lo reservado` : '')
              : 'ninguna mesa anotó su valor final'}
            cambio={cambio(r.cuentaFinal.porPersona, a.cuentaFinal.porPersona)} contra={contra} />
        </div>
      </Bloque>

      <Bloque titulo="De dónde y cómo">
        <Columnas r={r} base={base} />
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <ListaBarras titulo="De dónde vienen" ayuda="estOrigen"
            filas={r.origen.map((o) => ({ nombre: o.nombre, valor: o.reservas,
              texto: `${plural(o.reservas, 'reserva', 'reservas')}${share(o.reservas, total)}` }))} />
          <ListaBarras titulo="Menús" ayuda="estMenus" bajada="Personas por menú"
            filas={r.menus.map((m) => ({ nombre: m.menu, valor: m.cantidad,
              texto: `${miles(m.cantidad)}${share(m.cantidad, r.menus.reduce((n, x) => n + x.cantidad, 0))}` }))} />
          <ListaBarras titulo="Anticipación" ayuda="estAnticipacion"
            bajada={r.anticipacion.mediana != null
              ? `Mediana: ${plural(r.anticipacion.mediana, 'día', 'días')} antes${r.anticipacion.sinDato ? ` · ${miles(r.anticipacion.sinDato)} sin fecha de reserva` : ''}` : undefined}
            filas={r.anticipacion.tramos.some((t) => t.reservas) ? r.anticipacion.tramos.map((t) => ({ nombre: t.nombre, valor: t.reservas,
              texto: `${plural(t.reservas, 'reserva', 'reservas')}${share(t.reservas, total - r.anticipacion.sinDato)}` })) : []} />
          <ListaBarras titulo="Por día de la semana" ayuda="estPorDia" bajada="Personas promedio por día"
            filas={r.porDia.map((d) => ({ nombre: d.nombre, valor: d.promedio,
              texto: `${miles(d.promedio)} · ${plural(d.dias, 'día', 'días')}` }))} />
        </div>
      </Bloque>
      <p className="mt-6 text-[13px] text-hueso/60">Datos al {enPalabras(datos.hoy)}. Se cuentan con las mismas reglas del calendario.</p>
      </>)}
    </div>
  );
}

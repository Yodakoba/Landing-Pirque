'use client';

/**
 * **👥 Equipo, la segunda vista de Estadísticas** (2026-11-21, lo pidió el
 * cliente: *"cuánto fueron los sueldos, las propinas, en gráficas… y eso se
 * puede hasta relacionar al valor de reservas… una gráfica con palos, el
 * monto total en un palo, pero la relación entre los distintos puestos en
 * distintos colores"*). Se llega por *📊 Estadísticas del equipo* en el
 * informe, o con el botón *👥 Equipo* de Estadísticas.
 *
 * Usa el mismo periodo de la página (día, semana, mes o personalizado) y las
 * mismas piezas: `TarjetaNumero` con la comparación con el periodo anterior,
 * columnas finas con la punta redondeada, tooltip, *Ver en tabla*. Lo nuevo
 * es la columna **apilada por puesto**, con un color por puesto
 * (`--serie-N`, en el orden de la pestaña Puestos: el color sigue al puesto).
 *
 * Las cuentas son de `lib/estadisticasEquipo.ts`, sobre los días que mandó
 * `/api/estadisticas` una vez: cambiar el periodo no lee la planilla.
 */
import { useMemo, useState } from 'react';
import AyudaCorta from './AyudaCorta';
import TarjetaNumero from './TarjetaNumero';
import { enPesos } from '@/lib/ocupacion';
import { enCorto, enPalabras, diaSemana, type Fecha } from '@/lib/fechas';
import { cambio, largoDe, type Rango } from '@/lib/estadisticas';
import {
  agrupar, resumenDe, porPuesto, costoDelDia, type DiaEstadistica, type Bloque
} from '@/lib/estadisticasEquipo';

const NEUTRO = 'border-hueso/20 bg-panel';
const miles = (n: number) => Math.round(n).toLocaleString('es-CL');
/** En miles de pesos, para las puntas de las columnas: *395*. */
const enMiles = (n: number) => Math.round(n / 1000).toLocaleString('es-CL');
const DOS_LETRAS = ['do', 'lu', 'ma', 'mi', 'ju', 'vi', 'sá'];
/** El color de un puesto por su lugar fijo en la lista de puestos (8 a lo más). */
const colorDe = (i: number) => `var(--serie-${Math.min(i, 7) + 1})`;

function topeRedondo(n: number): number {
  if (n <= 0) return 10000;
  const p = 10 ** Math.floor(Math.log10(n));
  for (const m of [1, 2, 5, 10]) if (m * p >= n) return m * p;
  return 10 * p;
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-[15px] font-bold uppercase tracking-wide text-oro">{titulo}</h2>
      {children}
    </section>
  );
}

/** Una serie de una columna: su nombre, su color (una clase o un `var()`) y su valor. */
interface Serie { nombre: string; color: string; valor: (b: Bloque) => number }

/**
 * **Columnas, apiladas o con fondo.** Apiladas: cada serie es un tramo, con
 * 2px de separación y la punta redondeada; arriba, el total en miles. Con
 * fondo: la primera serie va ancha y suave detrás (las ventas) y la segunda
 * angosta adelante (el costo), como el cupo y las personas de Reservas.
 */
function Columnas({ titulo, ayuda, bloques, porSemana, series, fondo = false, punta, leyenda = true, detalle }: {
  titulo: string; ayuda: string; bloques: Bloque[]; porSemana: boolean; series: Serie[];
  fondo?: boolean;
  /** Lo que va arriba de cada columna; sin esto, el total en miles. */
  punta?: (b: Bloque) => string;
  leyenda?: boolean;
  /** Líneas extra del tooltip. */
  detalle?: (b: Bloque) => string[];
}) {
  const [foco, setFoco] = useState<number | null>(null);
  const alto = 180;
  const total = (b: Bloque) => fondo ? Math.max(...series.map((s) => s.valor(b)))
    : series.reduce((n, s) => n + s.valor(b), 0);
  const tope = topeRedondo(Math.max(0, ...bloques.map(total)));
  const conPuntas = bloques.length <= 8;
  const nombre = (b: Bloque) => (porSemana ? `semana del ${enCorto(b.desde)}` : enPalabras(b.desde));
  const vacio = bloques.every((b) => total(b) === 0);
  const pasoEtiqueta = bloques.length > 20 ? Math.ceil(bloques.length / 10) : 1;
  const presentes = series.filter((s) => bloques.some((b) => s.valor(b) > 0));
  const pinta = (color: string) => (color.startsWith('var(') ? { style: { background: color } } : { className: color });

  return (
    <div className={`rounded-xl border-2 p-3 ${NEUTRO}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/70">
          {titulo}<AyudaCorta tema={ayuda} />
        </p>
        <p className="text-[13px] text-hueso/60">en miles de pesos</p>
      </div>
      {leyenda && presentes.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-hueso/80" aria-label="Qué es cada color">
          {presentes.map((s) => {
            const p = pinta(s.color);
            return (
              <li key={s.nombre} className="flex items-center gap-1.5">
                <span aria-hidden className={`inline-block h-3 w-3 rounded-sm ${p.className ?? ''}`} style={p.style} />
                {s.nombre}
              </li>
            );
          })}
        </ul>
      )}
      {vacio ? (
        <p className="mt-2 text-[14px] text-hueso/60">Nada en este periodo.</p>
      ) : (
        <>
          <div className="mt-3 flex gap-2">
            <div className="relative w-9 shrink-0 text-right text-[13px] tabular-nums text-hueso/60" style={{ height: alto }}>
              {[1, 0.5, 0].map((f) => (
                <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: (1 - f) * alto }}>{enMiles(tope * f)}</span>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 overflow-x-auto pb-1">
              <div className="relative" style={{ minWidth: bloques.length * 26 }}>
                {[1, 0.5, 0].map((f) => (
                  <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-hueso/10" style={{ top: (1 - f) * alto }} />
                ))}
                <div className="flex items-end" style={{ height: alto }}>
                  {bloques.map((b, i) => {
                    const t = total(b);
                    const lineas = [
                      ...series.filter((s) => s.valor(b) > 0).map((s) => `${s.nombre}: ${enPesos(s.valor(b))}`),
                      ...(detalle ? detalle(b) : [])
                    ];
                    return (
                      <div key={b.desde} tabIndex={0} role="img"
                        aria-label={`${nombre(b)}: ${lineas.join(', ') || 'nada'}`}
                        onMouseEnter={() => setFoco(i)} onMouseLeave={() => setFoco(null)}
                        onFocus={() => setFoco(i)} onBlur={() => setFoco(null)} onClick={() => setFoco(foco === i ? null : i)}
                        className="relative flex h-full min-w-[26px] flex-1 cursor-default flex-col items-center justify-end outline-none focus-visible:bg-oro/10">
                        {conPuntas && t > 0 && (punta ? punta(b) : enMiles(t)) && (
                          <span className="mb-0.5 text-[13px] font-semibold leading-none tabular-nums text-hueso/80">
                            {punta ? punta(b) : enMiles(t)}
                          </span>
                        )}
                        {fondo ? (
                          // El alto es el de la más alta de las dos, para que la
                          // punta quede arriba de las dos y no adentro del fondo.
                          <div className="relative w-[22px]" style={{ height: (t / tope) * alto }}>
                            {(() => { const p = pinta(series[0].color); return (
                              <div className={`absolute bottom-0 left-0 w-[22px] rounded-t-[4px] ${p.className ?? ''}`}
                                style={{ ...p.style, height: (series[0].valor(b) / tope) * alto }} />
                            ); })()}
                            {(() => { const p = pinta(series[1].color); return (
                              <div className={`absolute bottom-0 left-[5px] w-[12px] rounded-t-[4px] ${p.className ?? ''} ${foco === i ? 'opacity-80' : ''}`}
                                style={{ ...p.style, height: Math.max(series[1].valor(b) ? 2 : 0, (series[1].valor(b) / tope) * alto) }} />
                            ); })()}
                          </div>
                        ) : (
                          <div className={`flex w-[18px] flex-col-reverse gap-[2px] ${foco === i ? 'opacity-80' : ''}`}>
                            {series.map((s, k) => {
                              const v = s.valor(b);
                              if (v <= 0) return null;
                              const arriba = !series.slice(k + 1).some((x) => x.valor(b) > 0);
                              const p = pinta(s.color);
                              return (
                                <div key={s.nombre} className={`w-full ${arriba ? 'rounded-t-[4px]' : ''} ${p.className ?? ''}`}
                                  style={{ ...p.style, height: Math.max(2, (v / tope) * alto - 2) }} />
                              );
                            })}
                          </div>
                        )}
                        {foco === i && (
                          <div role="tooltip" className={`absolute top-0 z-10 w-max max-w-[16rem] rounded-lg border border-hueso/20 bg-tinta px-2.5 py-1.5 text-[13px] shadow-lg ${i > bloques.length / 2 ? 'right-0' : 'left-0'}`}>
                            <span className="block font-bold first-letter:uppercase">{nombre(b)}</span>
                            {lineas.length ? lineas.map((l) => <span key={l} className="block text-hueso/80">{l}</span>)
                              : <span className="block text-hueso/70">Nada</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-1 flex">
                  {bloques.map((b, i) => (
                    <span key={b.desde} className="min-w-[26px] flex-1 text-center text-[13px] leading-tight text-hueso/60">
                      {i % pasoEtiqueta === 0 ? (
                        porSemana ? <>{Number(b.desde.slice(8))}<br />{enCorto(b.desde).slice(-3)}</>
                          : <>{Number(b.desde.slice(8))}<br />{DOS_LETRAS[diaSemana(b.desde)]}</>
                      ) : ' '}
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
                    <th className="py-1 pr-3 font-semibold">{porSemana ? 'Semana del' : 'Día'}</th>
                    {series.map((s) => <th key={s.nombre} className="whitespace-nowrap py-1 pr-3 text-right font-semibold">{s.nombre}</th>)}
                    {!fondo && series.length > 1 && <th className="py-1 text-right font-semibold">Total</th>}
                  </tr>
                </thead>
                <tbody>
                  {bloques.map((b) => (
                    <tr key={b.desde} className="border-t border-hueso/10">
                      <td className="whitespace-nowrap py-1 pr-3">{enCorto(b.desde)}</td>
                      {series.map((s) => <td key={s.nombre} className="py-1 pr-3 text-right tabular-nums">{s.valor(b) ? enPesos(s.valor(b)) : '—'}</td>)}
                      {!fondo && series.length > 1 && <td className="py-1 text-right font-semibold tabular-nums">{enPesos(total(b))}</td>}
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

export default function EstadisticasEquipo({ equipo, rango, anterior, contra }: {
  equipo: { dias: DiaEstadistica[]; puestos: string[] };
  rango: Rango;
  anterior: Rango;
  /** Contra qué se compara: *octubre 2026*. */
  contra: string;
}) {
  // **Hasta dos semanas, por día; más largo, por semana**: el sueldo se
  // paga por semana, y treinta columnas de un mes son casi todas vacías.
  const porSemana = largoDe(rango) > 14;
  const dentro = (r: Rango) => equipo.dias.filter((d) => d.fecha >= r.desde && d.fecha <= r.hasta);
  const bloques = useMemo(() => agrupar(dentro(rango), porSemana ? 'semana' : 'dia', rango.desde, rango.hasta),
    [equipo, rango.desde, rango.hasta, porSemana]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = resumenDe(bloques);
  const a = resumenDe(dentro(anterior));
  const filas = porPuesto(bloques);
  const series: Serie[] = equipo.puestos.map((p, i) => ({
    nombre: p, color: colorDe(i), valor: (b: Bloque) => b.porPuesto[p] ?? 0
  }));
  const color = (p: string) => colorDe(Math.max(0, equipo.puestos.indexOf(p)));

  return (
    <>
      <Seccion titulo="Lo que costó el equipo">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <TarjetaNumero que="Costo del equipo" ayuda="estEqCosto" tono={NEUTRO} bueno="ninguna"
            valor={enPesos(r.costo)} nota="jornadas, horas extra, ajustes y extras"
            cambio={cambio(r.costo, a.costo)} contra={contra} />
          <TarjetaNumero que="Propinas" ayuda="estEqPropinas" tono={NEUTRO}
            valor={enPesos(r.propinas)} nota="aparte: no es costo del negocio"
            cambio={cambio(r.propinas, a.propinas)} contra={contra} />
          <TarjetaNumero que="Por persona atendida" ayuda="estEqPorPersona" tono={NEUTRO} bueno="baja"
            valor={r.porPersona != null ? enPesos(r.porPersona) : '—'}
            nota={`${miles(r.personas)} ${r.personas === 1 ? 'persona' : 'personas'} en ${miles(r.reservas)} ${r.reservas === 1 ? 'reserva' : 'reservas'}`}
            cambio={cambio(r.porPersona, a.porPersona)} contra={contra} />
          <TarjetaNumero que="Equipo sobre ventas" ayuda="estEqPorcentaje" tono={NEUTRO} bueno="baja"
            valor={r.porcentaje != null ? `${r.porcentaje}%` : '—'}
            nota={`de ${enPesos(r.ventas)} en ventas`}
            cambio={cambio(r.porcentaje, a.porcentaje, true)} contra={contra} />
        </div>
        {/* **Lo que no es exacto, dicho** (lo pidió el cliente: *"hay que
            anunciar que falta el detalle completo, los datos exactos de
            Fudo"*). */}
        <p className="mt-2 flex items-center rounded-xl border-2 border-dashed border-hueso/25 px-3 py-1 text-[13px] leading-snug text-hueso/75">
          <b className="text-hueso/90">Datos del panel, no de Fudo.</b>
          <AyudaCorta titulo="Datos del panel, no de Fudo">
          Las ventas son el valor final que anotó la mesa
          {r.reservas ? ` (en ${miles(r.reservasConValor)} de ${miles(r.reservas)} reservas)` : ''} y, si no se anotó, el
          monto de la reserva; faltan las ventas sin reserva y el detalle de Fudo. El costo es el de los turnos que
          vinieron y las actividades extras: no incluye el sueldo de los contratados, las comisiones ni las retenciones.
          </AyudaCorta>
        </p>
      </Seccion>

      <Seccion titulo="Por puesto">
        <Columnas titulo={porSemana ? 'Sueldos por semana' : 'Sueldos por día'} ayuda="estEqPuestos"
          bloques={bloques} porSemana={porSemana} series={series} />
        <div className={`mt-2 rounded-xl border-2 p-3 ${NEUTRO}`}>
          <p className="text-[13px] font-semibold uppercase tracking-wider text-hueso/70">Cada puesto en el periodo</p>
          {filas.length === 0 ? <p className="mt-2 text-[14px] text-hueso/60">Nada en este periodo.</p> : (
            <div className="caja-tabla mt-2 overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="text-left text-hueso/60">
                    <th className="py-1 pr-3 font-semibold">Puesto</th>
                    <th className="py-1 pr-3 text-right font-semibold">Jornadas</th>
                    <th className="py-1 pr-3 text-right font-semibold">Costo</th>
                    <th className="hidden py-1 pr-3 text-right font-semibold sm:table-cell">Por jornada</th>
                    <th className="py-1 text-right font-semibold">Parte</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.puesto} className="border-t border-hueso/10">
                      <td className="py-1.5 pr-3">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="inline-block h-3 w-3 shrink-0 rounded-sm" style={{ background: color(f.puesto) }} />
                          {f.puesto}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{miles(f.jornadas)}</td>
                      <td className="py-1.5 pr-3 text-right font-semibold tabular-nums">{enPesos(f.costo)}</td>
                      <td className="hidden py-1.5 pr-3 text-right tabular-nums sm:table-cell">{enPesos(f.promedio)}</td>
                      <td className="py-1.5 text-right tabular-nums">{f.parte}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Seccion>

      <Seccion titulo="Ventas, costo y propinas">
        <div className="grid gap-2 lg:grid-cols-2">
          <Columnas titulo="Ventas y costo del equipo" ayuda="estEqVentas" bloques={bloques} porSemana={porSemana} fondo
            series={[
              { nombre: 'Ventas', color: 'bg-hueso/20', valor: (b) => b.ventas },
              { nombre: 'Costo del equipo', color: 'bg-cielo-fuerte', valor: (b) => costoDelDia(b) }
            ]}
            punta={(b) => (b.ventas > 0 && costoDelDia(b) > 0 ? `${Math.round((costoDelDia(b) / b.ventas) * 100)}%` : '')}
            detalle={(b) => (b.ventas > 0 ? [`El equipo: ${Math.round((costoDelDia(b) / b.ventas) * 100)}% de las ventas`] : [])} />
          <Columnas titulo={porSemana ? 'Propinas por semana' : 'Propinas por día'} ayuda="estEqPropinas" bloques={bloques}
            porSemana={porSemana} leyenda={false}
            series={[{ nombre: 'Propinas', color: 'bg-oro', valor: (b) => b.propina }]}
            detalle={(b) => (b.personas > 0 ? [`${enPesos(Math.round(b.propina / b.personas))} por persona atendida`] : [])} />
        </div>
      </Seccion>
    </>
  );
}

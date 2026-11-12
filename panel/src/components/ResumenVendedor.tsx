'use client';
/**
 * **El resumen de un vendedor** (2026-11-12, lo pidió el cliente: *"un
 * resumen al estilo del trabajador, mismo con filtros"*). Es su estado de
 * cuenta: lo que vendió, la comisión que ganó en el periodo, lo que viene y
 * lo que se le pagó. Ver `lib/vendedores.ts` y `/api/vendedores`.
 *
 * - **El vendedor ve solo lo suyo**, como *Mi resumen*, y lee cómo se le
 *   paga sin poder cambiarlo.
 * - **Quien paga, la gerencia y el administrador** eligen al vendedor con un
 *   botón por cada uno y editan su forma de pago y su cuenta, que se guardan
 *   solas (`usarGuardadoPorFicha`).
 * - **El periodo es un mes o una semana**, con flechas sin tope, igual que el
 *   link del trabajador. Parte en el mes en curso: el sueldo fijo es mensual.
 */
import { useEffect, useState } from 'react';
import AvisoGuardado from './AvisoGuardado';
import DatosBancarios from './DatosBancarios';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, mesEnPalabras, rangoEnPalabras, semanaDe, sumarDias, esFecha } from '@/lib/fechas';
import { BASE_COMISION, type FichaVendedor, type Venta, type ResumenVendedor as Resumen } from '@/lib/vendedores';
import type { Banco } from '@/lib/banco';
import type { PagoEquipo } from '@/lib/remuneraciones';

type VentaConFolio = Venta & { folio: string };
interface Datos {
  vendedores: { usuario: string; nombre: string; activo: boolean }[];
  usuario: string; nombre: string; ficha: FichaVendedor; formaDePago: boolean;
  desde: string; hasta: string; periodo: string; hoy: string;
  resumen: Omit<Resumen, 'cuentan'> & { cuentan: VentaConFolio[] }; pagado: number; falta: number; pagos: PagoEquipo[];
  porCobrar: VentaConFolio[]; enCurso: { id: string; folio: string; cliente: string; fecha: string; estado: string; total: number; comision: number; detalle: string }[];
  puedeEditar: boolean; error?: string;
}

const ENTRADA = 'min-h-[44px] w-full rounded border border-hueso/25 bg-tinta px-3 text-[16px] tabular-nums focus:border-oro focus:outline-none';

/** El mes anterior o el siguiente, como texto `AAAA-MM`. */
function moverMes(mes: string, n: number): string {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  while (m < 1) { m += 12; a--; }
  while (m > 12) { m -= 12; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

function Azulejo({ que, monto, nota, color = 'text-hueso', grande = false }: {
  que: string; monto: number; nota?: string; color?: string; grande?: boolean;
}) {
  return (
    <div className={`rounded-xl border-2 border-hueso/15 bg-panel p-3 ${grande ? 'sm:col-span-2' : ''}`}>
      <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/65">{que}</p>
      <p className={`mt-1 font-bold tabular-nums ${grande ? 'text-[30px]' : 'text-[22px]'} ${color}`}>{enPesos(monto)}</p>
      {nota && <p className="text-[13px] text-hueso/70">{nota}</p>}
    </div>
  );
}

/** Cómo se le paga, en una frase: *"5% del total con IVA + $10.000 por evento + $400.000 al mes"*. */
function formaEnPalabras(f: FichaVendedor): string {
  const pct = (n: number) => `${String(n).replace('.', ',')}%`;
  const etapas = [
    f.comisionPct > 0 ? `${pct(f.comisionPct)}` : '',
    f.etapa2Pct > 0 ? `${pct(f.etapa2Pct)} desde ${f.etapa2Desde} personas` : '',
    f.etapa3Pct > 0 ? `${pct(f.etapa3Pct)} desde ${f.etapa3Desde}` : ''
  ].filter(Boolean);
  const partes = [
    etapas.length ? `${etapas.join(', ')} del ${f.base === 'neto' ? 'neto' : 'total con IVA'}` : '',
    f.bonoPuntos > 0 ? `${pct(f.bonoPuntos)} más en los menús con bono` : '',
    f.montoEvento > 0 ? `${enPesos(f.montoEvento)} por evento` : '',
    f.sueldoFijo > 0 ? `${enPesos(f.sueldoFijo)} fijos al mes` : ''
  ].filter(Boolean);
  return partes.join(' + ');
}

export default function ResumenVendedor({ esVendedor }: { esVendedor: boolean }) {
  const [usuario, setUsuario] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  /** Lo escrito en la ficha, mientras se guarda solo. */
  const [ficha, setFicha] = useState<FichaVendedor | null>(null);

  const cargar = (u = usuario, p = periodo) => {
    const q = new URLSearchParams();
    if (u) q.set('usuario', u);
    if (p) q.set('p', p);
    fetch(`/api/vendedores?${q}`).then((r) => r.json()).then((d: Datos) => {
      if (d.error) { setError(d.error); return; }
      setError(''); setDatos(d); setFicha(d.ficha ?? null);
      if (!u && d.usuario) setUsuario(d.usuario);
      if (!p && d.periodo) setPeriodo(d.periodo);
    }).catch((e) => setError(String(e)));
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fichas = usarGuardadoPorFicha<Partial<FichaVendedor>>(async (u, cambios) => {
    const r = await fetch('/api/vendedores', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usuario: u, cambios })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return d.error || 'No se pudo guardar.';
    cargar(u, periodo);
  });

  if (error) return <p className="rounded border border-rojo-fuerte/60 bg-rojo/10 p-3 text-[15px]">{error}</p>;
  if (!datos) return <p className="text-hueso/60">Cargando…</p>;

  const esMes = periodo.length === 7;
  const irA = (p: string) => { setPeriodo(p); cargar(usuario, p); };
  const elegir = (u: string) => { void fichas.forzar(); setUsuario(u); cargar(u, periodo); };
  const tituloPeriodo = esMes ? mesEnPalabras(periodo)
    : rangoEnPalabras([datos.desde, datos.hasta]);
  const cambiar = (k: keyof FichaVendedor, v: unknown) => {
    if (!ficha) return;
    setFicha({ ...ficha, [k]: v } as FichaVendedor);
    fichas.programar(datos.usuario, { [k]: v } as Partial<FichaVendedor>);
  };
  const { estado, error: falla } = fichas.estadoDe(datos.usuario);
  const r = datos.resumen;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wide">{esVendedor ? 'Mi resumen' : 'Vendedores'}</h1>
        <p className="mt-1 text-[15px] text-hueso/75">
          {esVendedor
            ? 'Lo que vendiste, tu comisión y lo que te pagaron. La comisión cuenta cuando el cliente terminó de pagar.'
            : 'Lo vendido, la comisión y lo pagado de cada vendedor. La comisión cuenta cuando el cliente terminó de pagar.'}
        </p>
      </div>

      {/* Un botón por vendedor: se ven todos y se elige de un toque. */}
      {!esVendedor && (
        datos.vendedores.length === 0 ? (
          <p className="rounded-xl border-2 border-dashed border-hueso/25 p-4 text-[15px]">
            Todavía no hay cuentas de vendedor. Se crean en <a href="/usuarios" className="font-semibold text-oro underline">Cuentas</a>,
            con el rol Vendedor.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vendedor">
            {datos.vendedores.map((v) => (
              <button key={v.usuario} type="button" aria-pressed={v.usuario === datos.usuario}
                onClick={() => elegir(v.usuario)}
                className={`boton min-h-[44px] rounded-full text-[15px] ${v.usuario === datos.usuario
                  ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
                {v.usuario === datos.usuario ? '✓ ' : ''}{v.nombre}{v.activo ? '' : ' (inactivo)'}
              </button>
            ))}
          </div>
        )
      )}

      {datos.usuario && (
        <>
          {/* El periodo: mes o semana, con flechas sin tope. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2" role="group" aria-label="Periodo">
              <button type="button" aria-pressed={esMes} onClick={() => irA(datos.hoy.slice(0, 7))}
                className={`boton min-h-[44px] ${esMes ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>Mes</button>
              <button type="button" aria-pressed={!esMes} onClick={() => irA(semanaDe(datos.hoy))}
                className={`boton min-h-[44px] ${!esMes ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>Semana</button>
            </div>
            <span className="flex-1" />
            <button type="button" aria-label="Periodo anterior" className="boton min-h-[44px] min-w-[44px] text-[18px]"
              onClick={() => irA(esMes ? moverMes(periodo, -1) : sumarDias(semanaDe(periodo), -7))}>◀</button>
            <span className="min-w-[10rem] text-center text-[17px] font-bold first-letter:uppercase">{tituloPeriodo}</span>
            <button type="button" aria-label="Periodo siguiente" className="boton min-h-[44px] min-w-[44px] text-[18px]"
              onClick={() => irA(esMes ? moverMes(periodo, 1) : sumarDias(semanaDe(periodo), 7))}>▶</button>
          </div>

          {!datos.formaDePago && (
            <p className="rounded-xl border-2 border-ambar-fuerte/70 bg-ambar/10 p-3 text-[15px]">
              <b className="text-ambar-texto">Todavía no está escrito cómo se le paga.</b>{' '}
              {datos.puedeEditar ? 'Escríbelo abajo, en Cómo se le paga: sin eso no hay montos.' : 'Pídeselo a quien hace los pagos: sin eso no hay montos.'}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Azulejo grande que={esVendedor ? 'Te toca' : 'Le toca'} monto={r.total} color="text-oro"
              nota={`${r.cuentan.length} ${r.cuentan.length === 1 ? 'venta pagada' : 'ventas pagadas'}${r.mesesFijo ? ` + sueldo fijo` : ''}`} />
            <Azulejo que="Pagado" monto={datos.pagado} color="text-verde-texto"
              nota={datos.pagos.length ? `${datos.pagos.length} ${datos.pagos.length === 1 ? 'pago' : 'pagos'}` : 'sin pagos todavía'} />
            <Azulejo que="Falta" monto={datos.falta} color={datos.falta > 0 ? 'text-ambar-texto' : 'text-hueso/70'} />
            <Azulejo que="Comisiones" monto={r.comisiones} nota="de las ventas pagadas" />
            <Azulejo que="Sueldo fijo" monto={r.sueldoFijo}
              nota={r.mesesFijo ? `${r.mesesFijo} ${r.mesesFijo === 1 ? 'mes' : 'meses'}` : 'cuenta el último día del mes'} />
          </div>

          <section>
            <h2 className="text-[17px] font-bold">✓ Ventas que suman en este periodo</h2>
            <p className="text-[14px] text-hueso/70">Las que el cliente terminó de pagar entre {enPalabras(datos.desde)} y {enPalabras(datos.hasta)}.</p>
            {r.cuentan.length === 0 ? (
              <p className="mt-2 text-[15px] text-hueso/65">Ninguna en este periodo.</p>
            ) : (
              <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                {r.cuentan.map((v) => (
                  <li key={v.id} className="rounded-xl border-2 border-verde-fuerte/50 bg-verde/[0.06] p-3 text-[15px]">
                    <p className="font-bold">{v.cliente} <span className="font-normal text-hueso/70">· Cotización N° {v.folio}</span></p>
                    <p className="text-hueso/80">Evento: <span className="inline-block first-letter:uppercase">{enPalabras(v.fechaEvento)}</span> · {enPesos(v.total)}</p>
                    <p className="text-hueso/80">Pagó todo el {enPalabras(v.pagadaEl)}</p>
                    <p className="mt-1 font-bold text-verde-texto">Comisión: {enPesos(v.comision)}</p>
                    {v.detalle && <p className="text-[14px] text-hueso/75">{v.detalle}{v.congelada ? ' · fija' : ''}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-bold">○ Ganadas que el cliente todavía no termina de pagar</h2>
            <p className="text-[14px] text-hueso/70">Su comisión llega cuando pague todo.</p>
            {datos.porCobrar.length === 0 ? (
              <p className="mt-2 text-[15px] text-hueso/65">Ninguna.</p>
            ) : (
              <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                {datos.porCobrar.map((v) => (
                  <li key={v.id} className="rounded-xl border-2 border-ambar-fuerte/50 bg-ambar/[0.06] p-3 text-[15px]">
                    <p className="font-bold">{v.cliente} <span className="font-normal text-hueso/70">· Cotización N° {v.folio}</span></p>
                    <p className="text-hueso/80">Evento: <span className="inline-block first-letter:uppercase">{enPalabras(v.fechaEvento)}</span></p>
                    <p className="text-hueso/80">Pagó {enPesos(Math.max(0, v.pagado))} de {enPesos(v.total)} · falta {enPesos(Math.max(0, v.total - v.pagado))}</p>
                    <p className="mt-1 font-semibold text-ambar-texto">Comisión que viene: {enPesos(v.comision)}</p>
                    {v.detalle && <p className="text-[14px] text-hueso/75">{v.detalle}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-bold">🌸 En curso</h2>
            <p className="text-[14px] text-hueso/70">Cotizaciones mandadas o en negociación, y lo que dejarían si se ganan y se pagan.</p>
            {datos.enCurso.length === 0 ? (
              <p className="mt-2 text-[15px] text-hueso/65">Ninguna.</p>
            ) : (
              <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                {datos.enCurso.map((c) => (
                  <li key={c.id} className="rounded-xl border-2 border-rosa-fuerte/40 bg-rosa/[0.06] p-3 text-[15px]">
                    <p className="font-bold">{c.cliente} <span className="font-normal text-hueso/70">· Cotización N° {c.folio} · {c.estado}</span></p>
                    <p className="text-hueso/80">{esFecha(c.fecha) ? <span className="inline-block first-letter:uppercase">{enPalabras(c.fecha)}</span> : c.fecha || 'sin fecha'} · {enPesos(c.total)}</p>
                    <p className="mt-1 text-hueso/85">Comisión posible: <b>{enPesos(c.comision)}</b></p>
                    {c.detalle && <p className="text-[14px] text-hueso/75">{c.detalle}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-[17px] font-bold">💸 {esVendedor ? 'Lo que te pagaron' : 'Lo que se le pagó'}</h2>
            {datos.pagos.length === 0 ? (
              <p className="mt-2 text-[15px] text-hueso/65">Nada registrado en este periodo.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-[15px]">
                {datos.pagos.map((p) => (
                  <li key={p.id} className="rounded-lg border border-hueso/15 bg-panel px-3 py-2">
                    <b>{enPesos(p.monto)}</b> el {enPalabras(p.fecha)}{p.nota ? ` · ${p.nota}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Cómo se le paga: el vendedor lo lee; quien paga lo escribe, y se guarda solo. */}
          <section className="rounded-2xl border-2 border-oro/40 bg-panel p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[17px] font-bold text-oro">{esVendedor ? 'Cómo se te paga' : 'Cómo se le paga'}</h2>
              <span className="flex-1" />
              {datos.puedeEditar && <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(datos.usuario)} />}
            </div>
            <p className="mt-1 text-[15px]">{datos.formaDePago ? formaEnPalabras(datos.ficha) : 'Sin escribir todavía.'}</p>
            {datos.puedeEditar && ficha && (
              <div className="mt-3 space-y-4">
                {/* **Tres etapas por personas, como los socios** (2026-11-12,
                    modelo A). La 1 rige desde la primera persona; la 2 y la 3
                    desde donde se escriba, 55 y 77 de partida. */}
                <div>
                  <p className="text-[14px] font-semibold">Comisión por etapas, según las personas del evento</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {([
                      { n: 1, desde: null, pct: 'comisionPct' },
                      { n: 2, desde: 'etapa2Desde', pct: 'etapa2Pct' },
                      { n: 3, desde: 'etapa3Desde', pct: 'etapa3Pct' }
                    ] as const).map((e) => (
                      <div key={e.n} className="rounded-xl border-2 border-hueso/15 p-3">
                        <p className="text-[13px] font-semibold uppercase tracking-widest text-oro">Etapa {e.n}</p>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <label className="block text-[13px] font-semibold">
                            Desde (personas)
                            {e.desde ? (
                              <input inputMode="numeric" className={ENTRADA} value={ficha[e.desde] || ''}
                                onChange={(ev) => cambiar(e.desde!, Number(ev.target.value.replace(/[^\d]/g, '')) || 0)} />
                            ) : <span className="flex min-h-[44px] items-center text-[16px]">1</span>}
                          </label>
                          <label className="block text-[13px] font-semibold">
                            Comisión (%)
                            <input inputMode="decimal" className={ENTRADA} value={ficha[e.pct] || ''} placeholder="0"
                              onChange={(ev) => cambiar(e.pct, ev.target.value)} />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block text-[14px] font-semibold">
                    Bono menús premium (puntos)
                    <input inputMode="decimal" className={ENTRADA} value={ficha.bonoPuntos || ''} placeholder="0"
                      onChange={(e) => cambiar('bonoPuntos', e.target.value)} />
                    <span className="mt-1 block text-[13px] font-normal text-hueso/70">
                      Sobre las líneas de los productos con ★ <a href="/menus" className="text-oro underline">Bono vendedor</a>.
                    </span>
                  </label>
                  <label className="block text-[14px] font-semibold">
                    Monto por evento ganado ($)
                    <input inputMode="numeric" className={ENTRADA} value={ficha.montoEvento || ''} placeholder="0"
                      onChange={(e) => cambiar('montoEvento', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                  </label>
                  <label className="block text-[14px] font-semibold">
                    Sueldo fijo al mes ($)
                    <input inputMode="numeric" className={ENTRADA} value={ficha.sueldoFijo || ''} placeholder="0"
                      onChange={(e) => cambiar('sueldoFijo', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                  </label>
                </div>
                <div>
                  <p className="text-[14px] font-semibold">El % se calcula sobre</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(['total', 'neto'] as const).map((b) => (
                      <button key={b} type="button" aria-pressed={ficha.base === b} onClick={() => cambiar('base', b)}
                        className={`boton min-h-[44px] ${ficha.base === b ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
                        {ficha.base === b ? '✓ ' : ''}{BASE_COMISION[b]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-hueso/60">Transferencia</p>
                  <DatosBancarios banco={ficha.banco} nombre={datos.nombre}
                    onCambio={(b: Banco) => cambiar('banco', b)} />
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

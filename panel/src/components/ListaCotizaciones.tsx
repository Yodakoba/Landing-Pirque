'use client';

/**
 * **📋 Lista: la vista de la gerencia sobre las cotizaciones** (2026-11-17,
 * lo pidió el cliente; lógica en `lib/listaCotizaciones.ts`). Reemplaza a
 * *🔎 Buscar*.
 *
 * De arriba abajo, como se lee:
 * 1. **De quién** —para quien ve el equipo, *👤 Por vendedor…* y *🤝 Por
 *    socio…*, con buscador— y **cuándo**: *Todo · Mes · Semana* con ◀ ▶, por
 *    fecha del evento o por fecha en que se cotizó.
 * 2. **Seis tarjetas**: En carrera, Cotizado, Ganado, Tasa de cierre, Por
 *    seguir y Por cobrar. Las que son una lista se aprietan y la filtran.
 * 3. **Ganado por mes**, según el día en que se ganó.
 * 4. **Estado** con cuántas hay, el buscador y la lista: las filas de
 *    siempre, con una segunda línea —quién la vende y el próximo paso—.
 *
 * El vendedor ve sus números: sin *Por vendedor*, y las tarjetas de lo suyo.
 */
import { useMemo, useState, type ReactNode } from 'react';
import AyudaCorta from './AyudaCorta';
import BuscarEnLista from './BuscarEnLista';
import { enPesos } from '@/lib/ocupacion';
import { mesEnPalabras, rangoEnPalabras, semanaDe, sumarDias } from '@/lib/fechas';
import type { Presupuesto } from '@/lib/presupuestos';
import {
  veElEquipo, unaPorGrupo, enRango, rangoDe, pasaFiltro, calzaBusqueda, resumenLista, ganadoPorMes,
  cuentasPorFiltro, proximoPaso, ordenarLista, vendedoresDe,
  type ContextoLista, type FiltroLista, type PorFecha
} from '@/lib/listaCotizaciones';

/** El mes anterior o el siguiente, como texto `AAAA-MM`. */
function moverMes(mes: string, n: number): string {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  while (m < 1) { m += 12; a--; }
  while (m > 12) { m -= 12; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

const TONO_PASO = { rojo: 'font-semibold text-rojo-texto', ambar: 'font-semibold text-ambar-texto',
  verde: 'font-semibold text-verde-texto', neutro: 'text-hueso/65' } as const;

/**
 * **Una tarjeta**: lo que es arriba con su `?`, el número grande y una línea.
 * Si filtra la lista, el número y la línea son un botón (el `?` va afuera:
 * un botón dentro de otro no es HTML válido).
 */
function Tarjeta({ que, valor, nota, tono, ayuda, activa, onClick }: {
  que: string; valor: string; nota?: string; tono: string; ayuda: string;
  activa?: boolean; onClick?: () => void;
}) {
  const cuerpo = (
    <>
      <span className="block text-[24px] font-bold leading-none tabular-nums">{valor}</span>
      {nota && <span className="mt-1 block text-[13px] leading-snug text-hueso/75">{nota}</span>}
    </>
  );
  return (
    <div className={`min-w-0 rounded-xl border-2 p-3 ${tono} ${activa ? 'ring-2 ring-oro ring-offset-2 ring-offset-tinta' : ''}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/70">
        {que}<AyudaCorta tema={ayuda} />
      </p>
      {onClick ? (
        <button type="button" aria-pressed={!!activa} onClick={onClick}
          className="tecla mt-1 block min-h-[44px] w-full rounded-lg text-left">
          {cuerpo}
        </button>
      ) : <div className="mt-1 min-h-[44px]">{cuerpo}</div>}
    </div>
  );
}

const ESTADOS: [FiltroLista, string][] = [
  ['enCarrera', 'En carrera'], ['esperando', 'Esperando respuesta'], ['negociando', 'Negociando'],
  ['ganadas', 'Ganadas'], ['cerradas', 'Perdidas y vencidas'], ['todas', 'Todas']
];
const DE_LAS_TARJETAS: Partial<Record<FiltroLista, string>> = {
  mandadas: 'lo mandado', porSeguir: 'las que esperan que alguien las siga', porCobrar: 'las ganadas con plata por cobrar'
};

export default function ListaCotizaciones({ ctx, rol, visibles, mias, socios, fila, onDeTodos }: {
  ctx: ContextoLista;
  rol: string;
  /** Las que deja ver *Mías / De todos*. */
  visibles: Presupuesto[];
  /** Las de esta cuenta, con su grupo de alternativas. */
  mias: Presupuesto[];
  socios: { id: string; nombre: string; activo: boolean }[];
  /** La fila de siempre (la de *Sin fecha* y el calendario), con una segunda línea. */
  fila: (p: Presupuesto, detalle: ReactNode) => ReactNode;
  /** Elegir un vendedor o un socio mira *De todos*. */
  onDeTodos: () => void;
}) {
  const equipo = veElEquipo(rol);
  const [filtro, setFiltro] = useState<FiltroLista>('enCarrera');
  const [busqueda, setBusqueda] = useState('');
  /** `''`: todo; `AAAA-MM`: un mes; `AAAA-MM-DD`: la semana que parte ese lunes. */
  const [periodo, setPeriodo] = useState('');
  const [porFecha, setPorFecha] = useState<PorFecha>('evento');
  const [vendedor, setVendedor] = useState('');
  const [socio, setSocio] = useState('');
  const [eligiendo, setEligiendo] = useState<'' | 'vendedor' | 'socio'>('');

  const rango = rangoDe(periodo);
  // **De quién**: el vendedor, lo suyo; quien ve el equipo, lo que deja ver
  // *Mías / De todos* y, si eligió, un vendedor o un socio.
  const deQuien = useMemo(() => {
    const desde = equipo ? visibles : mias;
    return desde.filter((p) => (!vendedor || p.creadoPor === vendedor) && (!socio || p.socio === socio));
  }, [equipo, visibles, mias, vendedor, socio]);
  const base = useMemo(() => unaPorGrupo(deQuien.filter((p) => enRango(p, rango, porFecha)), ctx),
    [deQuien, rango?.desde, rango?.hasta, porFecha, ctx]); // eslint-disable-line react-hooks/exhaustive-deps
  const r = useMemo(() => resumenLista(base, ctx), [base, ctx]);
  const meses = useMemo(() => ganadoPorMes(unaPorGrupo(deQuien, ctx), ctx), [deQuien, ctx]);
  const cuantas = useMemo(() => cuentasPorFiltro(base, ctx), [base, ctx]);
  const lista = useMemo(() => ordenarLista(
    base.filter((p) => pasaFiltro(p, filtro, ctx) && calzaBusqueda(p, busqueda)), filtro, ctx),
  [base, filtro, busqueda, ctx]);

  const nombreSocio = (id: string) => socios.find((s) => s.id === id)?.nombre ?? id;
  const esMes = periodo.length === 7;
  const titulo = !rango ? '' : esMes ? mesEnPalabras(periodo) : rangoEnPalabras([rango.desde, rango.hasta]);
  const alternar = (f: FiltroLista) => setFiltro(filtro === f ? 'enCarrera' : f);
  const mostrando = [vendedor && `👤 ${vendedor}`, socio && `🤝 ${nombreSocio(socio)}`,
    rango && `${titulo}, por ${porFecha === 'evento' ? 'fecha del evento' : 'fecha en que se cotizó'}`]
    .filter(Boolean).join(' · ');

  return (
    <div>
      {/* 1. De quién y cuándo. */}
      <div className="flex flex-wrap items-center gap-2">
        {equipo && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="De quién">
            {vendedor ? (
              <button type="button" onClick={() => setVendedor('')}
                className="boton min-h-[44px] border-oro bg-oro/15 !font-semibold text-oro">👤 {vendedor} ✕</button>
            ) : (
              <button type="button" onClick={() => setEligiendo(eligiendo === 'vendedor' ? '' : 'vendedor')}
                aria-expanded={eligiendo === 'vendedor'} className="boton min-h-[44px]">👤 Por vendedor…</button>
            )}
            {socio ? (
              <button type="button" onClick={() => setSocio('')}
                className="boton min-h-[44px] border-cielo-fuerte bg-cielo/15 !font-semibold text-cielo-texto">🤝 {nombreSocio(socio)} ✕</button>
            ) : (
              <button type="button" onClick={() => setEligiendo(eligiendo === 'socio' ? '' : 'socio')}
                aria-expanded={eligiendo === 'socio'} className="boton min-h-[44px]">🤝 Por socio…</button>
            )}
          </div>
        )}
        <span className="flex-1" />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Periodo">
          {([['Todo', ''], ['Mes', ctx.hoy.slice(0, 7)], ['Semana', semanaDe(ctx.hoy)]] as const).map(([rotulo, p]) => {
            const elegido = rotulo === 'Todo' ? !periodo : rotulo === 'Mes' ? esMes : !!periodo && !esMes;
            return (
              <button key={rotulo} type="button" aria-pressed={elegido} onClick={() => setPeriodo(p)}
                className={`boton min-h-[44px] ${elegido ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>{rotulo}</button>
            );
          })}
        </div>
      </div>

      {eligiendo && (
        <div className="mt-2 max-w-md">
          <BuscarEnLista
            etiqueta={eligiendo === 'vendedor' ? 'Buscar vendedor' : 'Buscar socio comercial'}
            vacia={eligiendo === 'vendedor' ? 'Nadie ha cotizado todavía.' : 'No hay socios comerciales.'}
            elegido={eligiendo === 'vendedor' ? vendedor : socio}
            opciones={eligiendo === 'vendedor' ? vendedoresDe(ctx.todas)
              : socios.map((s) => {
                const n = unaPorGrupo(ctx.todas.filter((p) => p.socio === s.id), ctx).length;
                return { id: s.id, nombre: s.nombre, detalle: `${n} ${n === 1 ? 'cotización' : 'cotizaciones'}${s.activo ? '' : ' · desactivado'}` };
              })}
            onElegir={(id) => {
              if (eligiendo === 'vendedor') setVendedor(id); else setSocio(id);
              setEligiendo(''); onDeTodos();
            }}
            onCerrar={() => setEligiendo('')} />
        </div>
      )}

      {/* El periodo y por qué fecha: solo si no es *Todo*. */}
      {rango && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border-2 border-oro/50 bg-oro/[0.06] p-1 sm:w-72 sm:flex-none">
            <button type="button" aria-label="Periodo anterior" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
              onClick={() => setPeriodo(esMes ? moverMes(periodo, -1) : sumarDias(periodo, -7))}>◀</button>
            <span className="min-w-0 flex-1 truncate text-center text-[17px] font-bold first-letter:uppercase">{titulo}</span>
            <button type="button" aria-label="Periodo siguiente" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
              onClick={() => setPeriodo(esMes ? moverMes(periodo, 1) : sumarDias(periodo, 7))}>▶</button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Por qué fecha">
            {([['evento', '📅 Fecha del evento'], ['cotizada', '✍ Fecha en que se cotizó']] as const).map(([k, t]) => (
              <button key={k} type="button" aria-pressed={porFecha === k} onClick={() => setPorFecha(k)}
                className={`boton min-h-[44px] ${porFecha === k ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>{t}</button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-2 text-[14px] text-hueso/70">
        {mostrando ? <>Mostrando: <b className="text-hueso">{mostrando}</b></>
          : equipo ? 'Todo el equipo, todas las fechas.' : 'Tus cotizaciones, todas las fechas.'}
      </p>

      {/* 2. Las tarjetas. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Tarjeta que="En carrera" ayuda="listaEnCarrera" valor={String(r.enCarrera.n)}
          nota={`${r.enCarrera.gente} ${r.enCarrera.gente === 1 ? 'persona posible' : 'personas posibles'}`}
          tono="border-rosa/50 bg-rosa/[0.05]" activa={filtro === 'enCarrera'} onClick={() => setFiltro('enCarrera')} />
        <Tarjeta que="Cotizado" ayuda="listaCotizado" valor={enPesos(r.cotizado.monto)}
          nota={`${r.cotizado.n} ${r.cotizado.n === 1 ? 'mandada' : 'mandadas'}${r.cotizado.borradores
            ? ` · sin mandar ${enPesos(r.cotizado.montoBorradores)}` : ''}`}
          tono="border-rosa/50 bg-rosa/[0.05]" activa={filtro === 'mandadas'} onClick={() => alternar('mandadas')} />
        <Tarjeta que="Ganado" ayuda="listaGanado" valor={enPesos(r.ganado.monto)}
          nota={`${r.ganado.n} ${r.ganado.n === 1 ? 'evento' : 'eventos'}`}
          tono="border-verde-fuerte/40 bg-verde/[0.06] text-verde-texto" activa={filtro === 'ganadas'} onClick={() => alternar('ganadas')} />
        <Tarjeta que="Tasa de cierre" ayuda="listaTasa" valor={r.tasa.pct == null ? '—' : `${r.tasa.pct}%`}
          nota={`${r.tasa.ganadas} ${r.tasa.ganadas === 1 ? 'ganada' : 'ganadas'} · ${r.tasa.perdidas} ${r.tasa.perdidas === 1 ? 'perdida' : 'perdidas'}`}
          tono="border-hueso/20 bg-panel" />
        <Tarjeta que="Por seguir" ayuda="listaPorSeguir" valor={String(r.porSeguir)}
          nota={r.porSeguir ? 'esperan que alguien las mueva' : 'nada pendiente'}
          tono={r.porSeguir ? 'border-rojo-fuerte/50 bg-rojo/[0.06] text-rojo-texto' : 'border-hueso/20 bg-panel'}
          activa={filtro === 'porSeguir'} onClick={() => alternar('porSeguir')} />
        <Tarjeta que="Por cobrar" ayuda="listaPorCobrar" valor={enPesos(r.porCobrar.monto)}
          nota={`${r.porCobrar.n} ${r.porCobrar.n === 1 ? 'ganada' : 'ganadas'} con saldo`}
          tono={r.porCobrar.monto ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/20 bg-panel'}
          activa={filtro === 'porCobrar'} onClick={() => alternar('porCobrar')} />
      </div>

      {/* 3. Ganado por mes. */}
      {meses.length > 0 && (
        <div className="mt-3">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-hueso/60">
            Ganado por mes<AyudaCorta tema="listaPorMes" />
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {meses.map((m) => (
              <div key={m.mes} className="rounded-lg border border-verde/40 bg-panel px-3 py-1.5">
                <p className="text-[13px] font-semibold text-hueso/70 first-letter:uppercase">{mesEnPalabras(m.mes)}</p>
                <p className="text-[15px] font-bold tabular-nums text-verde-texto">{enPesos(m.monto)}</p>
                <p className="text-[13px] text-hueso/60">{m.cantidad} {m.cantidad === 1 ? 'evento' : 'eventos'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Estado, el buscador y la lista. */}
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Estado">
        {ESTADOS.map(([k, t]) => (
          <button key={k} type="button" onClick={() => setFiltro(k)} aria-pressed={filtro === k}
            className={`boton min-h-[44px] ${filtro === k ? 'border-oro bg-oro/15 font-semibold' : ''}`}>
            {t} <span className="ml-1 tabular-nums text-hueso/60">{cuantas[k]}</span>
          </button>
        ))}
      </div>
      {DE_LAS_TARJETAS[filtro] && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
          Mostrando {DE_LAS_TARJETAS[filtro]} ({cuantas[filtro]}).
          <button type="button" className="boton min-h-[40px]" onClick={() => setFiltro('enCarrera')}>Ver todo lo en carrera</button>
        </p>
      )}
      <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente, N°, tipo de evento o vendedor" aria-label="Buscar cotización"
        className="mt-2 min-h-[44px] w-full rounded border border-hueso/20 bg-tinta px-3 text-[15px]
                   focus:border-oro focus:outline-none sm:max-w-md" />

      <div className="mt-3">
        {lista.length === 0 ? (
          <p className="rounded border border-dashed border-hueso/20 p-5 text-[15px] text-hueso/60">Ninguna calza.</p>
        ) : (
          <ul className="space-y-2">
            {lista.map((p) => {
              const paso = proximoPaso(p, ctx);
              const detalle = (
                <>
                  {equipo && p.creadoPor && <span>👤 {p.creadoPor}</span>}
                  {p.socio && <span>🤝 {nombreSocio(p.socio)}</span>}
                  {p.tipoEvento && <span>{p.tipoEvento}</span>}
                  {paso && <span className={TONO_PASO[paso.tono]}>{paso.texto}</span>}
                </>
              );
              return fila(p, detalle);
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

'use client';
/**
 * **El resumen de un vendedor o socio comercial** (2026-11-12). Es su estado
 * de cuenta: lo que vendió, la comisión que ganó en el periodo, lo que viene
 * y lo que se le pagó. Ver `lib/vendedores.ts` y `/api/vendedores`.
 *
 * **Con la regla PlayStation** (2026-11-12, lo pidió el cliente: la primera
 * versión funcionaba pero eran 4,4 pantallas de celular, sin un botón
 * principal y con la ficha entera siempre abierta). El orden es el de lo que
 * se viene a hacer acá:
 *
 * 1. **Quién**: nombre grande y una pastilla que dice vendedor o socio por
 *    forma (borde lleno o cortado). Para elegir a otro, dos botones que
 *    abren su lista con buscador (`BuscarEnLista`): nunca uno por persona.
 * 2. **Cuándo**: Mes / Semana y una sola barra ◀ periodo ▶.
 * 3. **Cuánto**: tres azulejos —le toca (con su desglose en una línea),
 *    pagado y falta—.
 * 4. **El hito**, el único botón relleno: *💸 Pagarle $X →*, que abre el
 *    informe con la ventana de pago ya puesta en esta persona
 *    (`/informe?pagar=…`): el pago se registra con la lógica de siempre. Al
 *    día, una pastilla *✓ Al día* sin botón. El vendedor no lo ve.
 * 5. **El detalle**, en tres pestañas grandes: *Suma*, *Viene* (ganadas por
 *    pagar y en curso) y *Pagos*. Una lista a la vista, no cuatro.
 * 6. **Cómo se le paga**: el trato en una frase y *Cambiar el trato*, que
 *    abre una ventana con las etapas en filas de − y +; la transferencia en
 *    una línea con su pastilla y su propia ventana; el link del socio.
 *    Todo se guarda solo (`usarGuardadoPorFicha`); el nombre y desactivar
 *    se confirman.
 */
import { useEffect, useState } from 'react';
import AvisoGuardado from './AvisoGuardado';
import BuscarEnLista from './BuscarEnLista';
import Dialogo from './Dialogo';
import { avisar, copiarConAviso } from './AvisoFlotante';
import DatosBancarios from './DatosBancarios';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, mesEnPalabras, rangoEnPalabras, semanaDe, sumarDias, esFecha } from '@/lib/fechas';
import { BASE_COMISION, CON_SOCIO_DEFECTO, type FichaVendedor, type Venta, type ResumenVendedor as Resumen } from '@/lib/vendedores';
import { sePuedeTransferir, faltaParaTransferir, type Banco } from '@/lib/banco';
import type { PagoEquipo } from '@/lib/remuneraciones';

type VentaConFolio = Venta & { folio: string };
type EnCurso = { id: string; folio: string; cliente: string; fecha: string; estado: string; total: number; comision: number; detalle: string };
interface Datos {
  vendedores: { usuario: string; nombre: string; activo: boolean }[];
  socios: { usuario: string; nombre: string; activo: boolean }[];
  usuario: string; nombre: string; tipo: 'vendedor' | 'socio'; ficha: FichaVendedor; formaDePago: boolean;
  desde: string; hasta: string; periodo: string; hoy: string;
  resumen: Omit<Resumen, 'cuentan'> & { cuentan: VentaConFolio[] }; pagado: number; falta: number; pagos: PagoEquipo[];
  porCobrar: VentaConFolio[]; enCurso: EnCurso[];
  puedeEditar: boolean; puedeLinks?: boolean; error?: string;
}

const ENTRADA = 'min-h-[44px] w-full rounded-lg border-2 border-hueso/25 bg-tinta px-3 text-[16px] tabular-nums focus:border-oro focus:outline-none';
const pctTexto = (n: number) => `${String(n).replace('.', ',')}%`;

/** El mes anterior o el siguiente, como texto `AAAA-MM`. */
function moverMes(mes: string, n: number): string {
  let [a, m] = mes.split('-').map(Number);
  m += n;
  while (m < 1) { m += 12; a--; }
  while (m > 12) { m -= 12; a++; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

function Azulejo({ que, monto, nota, tono, grande = false }: {
  que: string; monto: number; nota?: string; tono: string; grande?: boolean;
}) {
  return (
    <div className={`min-w-0 rounded-xl border-2 p-3 ${tono} ${grande ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="text-[13px] font-semibold uppercase tracking-widest text-hueso/70">{que}</p>
      <p className={`mt-1 font-bold leading-none tabular-nums ${grande ? 'text-[32px]' : 'text-[24px]'}`}>{enPesos(monto)}</p>
      {nota && <p className="mt-1 text-[13px] text-hueso/75">{nota}</p>}
    </div>
  );
}

/** El trato en una frase: *"2% · 3% desde 55 · 4% desde 77, sobre el neto + …"*. */
function tratoEnPalabras(f: FichaVendedor): string {
  const etapas = [
    f.comisionPct > 0 ? `${pctTexto(f.comisionPct)}${f.etapa1Desde > 1 ? ` desde ${f.etapa1Desde}` : ''}` : '',
    f.etapa2Pct > 0 ? `${pctTexto(f.etapa2Pct)} desde ${f.etapa2Desde}` : '',
    f.etapa3Pct > 0 ? `${pctTexto(f.etapa3Pct)} desde ${f.etapa3Desde}` : ''
  ].filter(Boolean);
  const partes = [
    etapas.length ? `${etapas.join(' · ')} personas, sobre el ${f.base === 'neto' ? 'neto' : 'total con IVA'}` : '',
    f.bonoPuntos > 0 ? `${pctTexto(f.bonoPuntos)} más en menús con bono` : '',
    f.montoEvento > 0 ? `${enPesos(f.montoEvento)} por evento` : '',
    f.tipo === 'vendedor' && f.sueldoFijo > 0 ? `${enPesos(f.sueldoFijo)} fijo al mes` : ''
  ].filter(Boolean);
  const conSocio = f.tipo === 'vendedor' && partes.length && f.conSocio < 100
    ? ` · con socio, el ${pctTexto(f.conSocio)} de la comisión` : '';
  return partes.join(' + ') + conSocio;
}

/**
 * **Un número con − y +** (como los invitados de la cotización): los botones
 * son la comodidad, el campo se sigue pudiendo escribir. Guarda su propio
 * texto para no comerse la coma mientras se escribe un 2,5.
 */
function Paso({ valor, paso, sufijo, etiqueta, vacio = '0', onCambio }: {
  valor: number; paso: number; sufijo: string; etiqueta: string; vacio?: string; onCambio: (n: number) => void;
}) {
  const fmt = (n: number) => (n ? String(n).replace('.', ',') : '');
  const [txt, setTxt] = useState(fmt(valor));
  useEffect(() => { setTxt((t) => (Number(t.replace(',', '.')) === valor ? t : fmt(valor))); }, [valor]);
  const poner = (n: number) => { const v = Math.max(0, Math.round(n * 100) / 100); setTxt(fmt(v)); onCambio(v); };
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" aria-label={`${etiqueta}: menos`} className="boton h-11 w-11 shrink-0 !p-0 !text-[20px] !font-bold"
        onClick={() => poner(valor - paso)}>−</button>
      <input inputMode="decimal" aria-label={etiqueta} value={txt} placeholder={vacio}
        onChange={(e) => {
          setTxt(e.target.value);
          const n = Number(e.target.value.replace(',', '.').replace(/[^\d.]/g, ''));
          if (Number.isFinite(n)) onCambio(n);
        }}
        className="h-11 w-16 rounded-lg border-2 border-hueso/25 bg-tinta text-center text-[17px] font-bold tabular-nums focus:border-oro focus:outline-none" />
      <button type="button" aria-label={`${etiqueta}: más`} className="boton h-11 w-11 shrink-0 !p-0 !text-[20px] !font-bold"
        onClick={() => poner(valor + paso)}>+</button>
      <span className="text-[14px] text-hueso/75">{sufijo}</span>
    </div>
  );
}

/** Una venta en una tarjeta corta: quién, cuándo, cuánto le deja y cómo se calculó. */
function TarjetaVenta({ cliente, folio, fecha, linea, comision, rotulo, detalle, tono }: {
  cliente: string; folio: string; fecha: string; linea?: string; comision: number; rotulo: string; detalle: string; tono: string;
}) {
  return (
    <li className={`rounded-xl border-2 bg-panel p-3 text-[15px] ${tono}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="font-bold">{cliente}</p>
        <p className="text-[13px] text-hueso/70">N° {folio}</p>
      </div>
      <p className="text-hueso/80">
        {esFecha(fecha) ? <span className="inline-block first-letter:uppercase">{enPalabras(fecha)}</span> : fecha || 'sin fecha'}
        {linea ? ` · ${linea}` : ''}
      </p>
      <p className="mt-1">{rotulo}: <b className="text-[17px] tabular-nums">{enPesos(comision)}</b></p>
      {detalle && <p className="text-[13px] text-hueso/70">{detalle}</p>}
    </li>
  );
}

export default function ResumenVendedor({ esVendedor }: { esVendedor: boolean }) {
  const [usuario, setUsuario] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState('');
  /** Lo escrito en la ficha, mientras se guarda solo. */
  const [ficha, setFicha] = useState<FichaVendedor | null>(null);
  /** El nombre del socio nuevo, mientras se escribe; `null` es el botón cerrado. */
  const [nuevoSocio, setNuevoSocio] = useState<string | null>(null);
  /** El nombre de un socio escrito y sin confirmar. */
  const [nombreEscrito, setNombreEscrito] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  /** Qué lista está abierta para elegir: la de vendedores, la de socios o ninguna. */
  const [lista, setLista] = useState<'' | 'vendedores' | 'socios'>('');
  /** La pestaña del detalle. */
  const [pestana, setPestana] = useState<'suma' | 'viene' | 'pagos'>('suma');
  /** Qué ventana está abierta: el trato o la transferencia. */
  const [ventana, setVentana] = useState<'' | 'trato' | 'banco'>('');

  const cargar = (u = usuario, p = periodo) => {
    const q = new URLSearchParams();
    if (u) q.set('usuario', u);
    if (p) q.set('p', p);
    fetch(`/api/vendedores?${q}`).then((r) => r.json()).then((d: Datos) => {
      if (d.error) { setError(d.error); return; }
      setError(''); setDatos(d); setFicha(d.ficha ?? null); setNombreEscrito(null);
      if (!u && d.usuario) setUsuario(d.usuario);
      if (!p && d.periodo) setPeriodo(d.periodo);
    }).catch((e) => setError(String(e)));
  };
  // Se puede llegar directo a alguien: el informe enlaza `/vendedores?usuario=…`.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('usuario') ?? '';
    if (u) setUsuario(u);
    cargar(u);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  const elegir = (u: string) => { void fichas.forzar(); setUsuario(u); setPestana('suma'); cargar(u, periodo); };
  const tituloPeriodo = esMes ? mesEnPalabras(periodo) : rangoEnPalabras([datos.desde, datos.hasta]);
  const cambiar = (k: keyof FichaVendedor, v: unknown) => {
    if (!ficha) return;
    setFicha({ ...ficha, [k]: v } as FichaVendedor);
    fichas.programar(datos.usuario, { [k]: v } as Partial<FichaVendedor>);
  };
  const { estado, error: falla } = fichas.estadoDe(datos.usuario);
  const r = datos.resumen;
  const esSocio = datos.tipo === 'socio';
  const tu = esVendedor;
  const banco = ficha?.banco ?? datos.ficha.banco;
  const listoBanco = sePuedeTransferir(banco);
  const viene = datos.porCobrar.length + datos.enCurso.length;

  /** Lo que se confirma a mano de un socio: el nombre, y desactivarlo o activarlo. */
  const cambiarYa = async (cambios: Partial<FichaVendedor>, pregunta: string) => {
    if (!confirm(pregunta)) return;
    setAviso('');
    const res = await fetch('/api/vendedores', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usuario: datos.usuario, cambios })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
    cargar(datos.usuario, periodo);
  };
  /** El link personal del socio: copiar lo crea; renovar y quitar preguntan (regla 7). */
  const link = async (accion: 'crear' | 'renovar' | 'quitar') => {
    if (accion === 'renovar' && !confirm(`¿Crear un link nuevo para ${datos.nombre}? El que tiene deja de servir al instante.`)) return;
    if (accion === 'quitar' && !confirm(`¿Quitarle el acceso a ${datos.nombre}? Su link deja de servir al instante.`)) return;
    const res = await fetch('/api/vendedores/link', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usuario: datos.usuario, accion })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { avisar(d.error || 'No se pudo.', 'atencion'); return; }
    if (ficha) setFicha({ ...ficha, token: d.token });
    if (accion === 'quitar') avisar(`${datos.nombre} ya no tiene acceso.`);
    else copiarConAviso(`${window.location.origin}/mi/${d.token}`, `Link de ${datos.nombre} copiado`, `Link de ${datos.nombre}:`);
    cargar(datos.usuario, periodo);
  };
  const crearSocio = async () => {
    const nombre = (nuevoSocio ?? '').trim();
    if (!nombre) return;
    setAviso('');
    const res = await fetch('/api/vendedores', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ nombre })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { setAviso(d.error || 'No se pudo crear.'); return; }
    setNuevoSocio(null); setLista('');
    elegir(d.ficha.usuario);
  };
  const pagarEn = `/informe?${new URLSearchParams({ pagar: datos.nombre, desde: datos.desde, hasta: datos.hasta })}`;
  const terminacion = banco.numero ? `···${banco.numero.replace(/\D/g, '').slice(-4)}` : '';

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wide">{esVendedor ? 'Mi resumen' : 'Vendedores y socios'}</h1>
        <p className="mt-1 text-[14px] text-hueso/70">La comisión cuenta cuando el cliente terminó de pagar.</p>
      </div>

      {/* 1. Quién. Para elegir a otro, dos botones con buscador (regla del cliente). */}
      {!esVendedor && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {datos.usuario && (
              <div className="mr-auto min-w-0">
                <p className="truncate text-[22px] font-bold leading-tight">{datos.nombre}</p>
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[13px] font-bold uppercase tracking-wider ${esSocio
                  ? 'border-dashed border-cielo-fuerte/70 text-cielo-texto' : 'border-oro/60 text-oro'}`}>
                  {esSocio ? '🤝 Socio comercial' : '👤 Vendedor'}{esSocio && !datos.ficha.activo ? ' · desactivado' : ''}
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir a quién ver">
              {([['vendedores', '👤 Vendedores', datos.vendedores.length],
                 ['socios', '🤝 Socios', datos.socios.length]] as const).map(([k, rotulo, n]) => (
                <button key={k} type="button" aria-expanded={lista === k}
                  onClick={() => { setLista(lista === k ? '' : k); setNuevoSocio(null); }}
                  className={`boton !min-h-[44px] !text-[15px] text-[15px] ${lista === k ? 'border-oro text-oro' : ''}`}>
                  {rotulo} ({n}) {lista === k ? '▴' : '▾'}
                </button>
              ))}
            </div>
          </div>
          {lista === 'vendedores' && (
            <BuscarEnLista etiqueta="Buscar vendedor" elegido={datos.usuario}
              vacia="Todavía no hay cuentas de vendedor. Se crean en Cuentas, con el rol Vendedor."
              opciones={datos.vendedores.map((v) => ({ id: v.usuario, nombre: v.nombre, detalle: v.activo ? '' : 'inactivo' }))}
              onElegir={(u) => { setLista(''); elegir(u); }} onCerrar={() => setLista('')} />
          )}
          {lista === 'socios' && (
            <BuscarEnLista etiqueta="Buscar socio comercial" elegido={datos.usuario}
              vacia="Todavía no hay socios comerciales."
              opciones={datos.socios.map((v) => ({ id: v.usuario, nombre: v.nombre, detalle: v.activo ? '' : 'desactivado' }))}
              onElegir={(u) => { setLista(''); elegir(u); }} onCerrar={() => { setLista(''); setNuevoSocio(null); }}
              pie={datos.puedeEditar && (nuevoSocio === null ? (
                <button type="button" className="boton !min-h-[44px] !text-[15px] w-full border-dashed text-[15px]"
                  onClick={() => setNuevoSocio('')}>+ Agregar socio comercial</button>
              ) : (
                <form className="flex flex-wrap items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); void crearSocio(); }}>
                  <label className="block min-w-[12rem] flex-1 text-[14px] font-semibold">
                    Nombre del socio nuevo
                    <input autoFocus className={ENTRADA} value={nuevoSocio} placeholder="Ej.: Turismo Maipo"
                      onChange={(e) => setNuevoSocio(e.target.value)} />
                  </label>
                  <button type="submit" className="boton !min-h-[44px] !text-[15px] border-oro text-oro" disabled={!nuevoSocio.trim()}>Crear el socio</button>
                  <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => setNuevoSocio(null)}>Cancelar</button>
                  <p className="w-full text-[13px] text-hueso/70">
                    Nace con el trato de los socios: 5% desde 22 personas, 10% desde 55 y 15% desde 77, sobre el neto.
                  </p>
                </form>
              ))} />
          )}
          {aviso && <p className="rounded border border-rojo-fuerte/60 bg-rojo/10 p-3 text-[15px]">{aviso}</p>}
        </div>
      )}

      {datos.usuario && (
        <>
          {/* 2. Cuándo: una sola barra, que en el celular no se parte. */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2" role="group" aria-label="Periodo">
              {([['Mes', true, datos.hoy.slice(0, 7)], ['Semana', false, semanaDe(datos.hoy)]] as const).map(([rotulo, mes, p]) => (
                <button key={rotulo} type="button" aria-pressed={esMes === mes} onClick={() => irA(p)}
                  className={`boton !min-h-[44px] !text-[15px] ${esMes === mes ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>{rotulo}</button>
              ))}
            </div>
            <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border-2 border-oro/50 bg-oro/[0.06] p-1.5">
              <button type="button" aria-label="Periodo anterior" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
                onClick={() => irA(esMes ? moverMes(periodo, -1) : sumarDias(semanaDe(periodo), -7))}>◀</button>
              <span className="min-w-0 flex-1 truncate text-center text-[17px] font-bold first-letter:uppercase">{tituloPeriodo}</span>
              <button type="button" aria-label="Periodo siguiente" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
                onClick={() => irA(esMes ? moverMes(periodo, 1) : sumarDias(semanaDe(periodo), 7))}>▶</button>
            </div>
          </div>

          {!datos.formaDePago && (
            <p className="rounded-xl border-2 border-ambar-fuerte/70 bg-ambar/10 p-3 text-[15px]">
              <b className="text-ambar-texto">Todavía no está escrito cómo se le paga.</b>{' '}
              {datos.puedeEditar ? 'Apreta Cambiar el trato, abajo: sin eso no hay montos.' : 'Pídeselo a quien hace los pagos: sin eso no hay montos.'}
            </p>
          )}

          {/* 3. Cuánto: tres azulejos; el desglose va en una línea. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Azulejo grande que={tu ? 'Te toca' : 'Le toca'} monto={r.total} tono="border-oro/40 bg-oro/[0.07] text-oro"
              nota={r.sueldoFijo
                ? `comisiones ${enPesos(r.comisiones)} + fijo ${enPesos(r.sueldoFijo)}`
                : `${r.cuentan.length} ${r.cuentan.length === 1 ? 'venta pagada' : 'ventas pagadas'}`} />
            <Azulejo que="Pagado" monto={datos.pagado} tono="border-verde-fuerte/40 bg-verde/[0.06] text-verde-texto"
              nota={datos.pagos.length ? `${datos.pagos.length} ${datos.pagos.length === 1 ? 'pago' : 'pagos'}` : 'sin pagos'} />
            <Azulejo que="Falta" monto={datos.falta}
              tono={datos.falta > 0 ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/15 bg-panel text-hueso/80'} />
          </div>

          {/* 4. El hito: el único botón relleno de la vista. */}
          {datos.puedeEditar && !esVendedor && (datos.falta > 0 ? (
            <div>
              <a href={pagarEn} className="boton boton-relleno tecla flex !min-h-[56px] w-full items-center justify-center !text-[18px] !font-bold">
                💸 Pagarle {enPesos(datos.falta)} →
              </a>
              <p className="mt-1 text-center text-[13px] text-hueso/70">Abre el informe con la ventana de pago lista para {datos.nombre}.</p>
            </div>
          ) : r.total > 0 ? (
            <p className="flex min-h-[48px] items-center justify-center rounded-xl border-2 border-verde-fuerte/60 bg-verde/10 text-[16px] font-bold text-verde-texto">
              ✓ Al día: no se le debe nada de este periodo
            </p>
          ) : null)}

          {/* 5. El detalle, en tres pestañas: una lista a la vista. */}
          <div>
            <div role="tablist" aria-label="Detalle" className="grid grid-cols-3 gap-2">
              {([['suma', '💰', 'Suma', r.cuentan.length], ['viene', '📅', 'Viene', viene], ['pagos', '💸', 'Pagos', datos.pagos.length]] as const)
                .map(([k, icono, rotulo, n]) => (
                  <button key={k} type="button" role="tab" aria-selected={pestana === k} onClick={() => setPestana(k)}
                    className={`tecla flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border-2 px-1 text-[15px] font-bold ${pestana === k
                      ? 'border-oro bg-oro/15 text-oro' : 'border-hueso/20 bg-panel text-hueso/85 hover:border-oro'}`}>
                    <span aria-hidden>{icono}</span>{rotulo}
                    <span className="rounded-full bg-hueso/10 px-1.5 text-[13px] tabular-nums">{n}</span>
                  </button>
                ))}
            </div>
            <div className="mt-3">
              {pestana === 'suma' && (r.cuentan.length === 0 ? (
                <p className="text-[15px] text-hueso/70">Ninguna venta terminó de pagarse en este periodo.</p>
              ) : (
                <ul className="grid gap-2 lg:grid-cols-2">
                  {r.cuentan.map((v) => (
                    <TarjetaVenta key={v.id} cliente={v.cliente} folio={v.folio} fecha={v.fechaEvento} tono="border-verde-fuerte/40"
                      linea={`pagó todo el ${enPalabras(v.pagadaEl)}`} rotulo="Comisión" comision={v.comision}
                      detalle={v.detalle + (v.congelada ? ' · fija' : '')} />
                  ))}
                </ul>
              ))}
              {pestana === 'viene' && (viene === 0 ? (
                <p className="text-[15px] text-hueso/70">Nada en camino por ahora.</p>
              ) : (
                <div className="space-y-3">
                  {datos.porCobrar.length > 0 && (
                    <div>
                      <p className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-ambar-texto">Ganadas · falta que el cliente pague</p>
                      <ul className="grid gap-2 lg:grid-cols-2">
                        {datos.porCobrar.map((v) => (
                          <TarjetaVenta key={v.id} cliente={v.cliente} folio={v.folio} fecha={v.fechaEvento} tono="border-ambar-fuerte/50"
                            linea={`falta ${enPesos(Math.max(0, v.total - v.pagado))}`} rotulo="Comisión que viene"
                            comision={v.comision} detalle={v.detalle} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {datos.enCurso.length > 0 && (
                    <div>
                      <p className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-rosa-texto">En curso · mandadas o en negociación</p>
                      <ul className="grid gap-2 lg:grid-cols-2">
                        {datos.enCurso.map((c) => (
                          <TarjetaVenta key={c.id} cliente={c.cliente} folio={c.folio} fecha={c.fecha} tono="border-rosa-fuerte/40"
                            linea={c.estado} rotulo="Si se gana" comision={c.comision} detalle={c.detalle} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {pestana === 'pagos' && (datos.pagos.length === 0 ? (
                <p className="text-[15px] text-hueso/70">Nada pagado en este periodo.</p>
              ) : (
                <ul className="space-y-2">
                  {datos.pagos.map((p) => (
                    <li key={p.id} className="rounded-xl border-2 border-verde-fuerte/30 bg-panel p-3 text-[15px]">
                      <b className="tabular-nums">{enPesos(p.monto)}</b> el {enPalabras(p.fecha)}{p.nota ? ` · ${p.nota}` : ''}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>

          {/* 6. Cómo se le paga: se lee en una frase; se cambia en su ventana. */}
          <section className="space-y-3 rounded-2xl border-2 border-hueso/15 bg-panel p-4">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-hueso/65">{tu ? 'Cómo se te paga' : 'Cómo se le paga'}</h2>
              <div className="mt-1 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <p className="min-w-0 flex-1 text-[16px] font-medium leading-snug">{datos.formaDePago ? tratoEnPalabras(ficha ?? datos.ficha) : 'Sin escribir todavía.'}</p>
                {datos.puedeEditar && (
                  <button type="button" className="boton !min-h-[44px] !text-[15px] border-oro text-oro" onClick={() => setVentana('trato')}>Cambiar el trato</button>
                )}
              </div>
            </div>
            {(datos.puedeEditar || esVendedor) && (
              <div className="flex flex-col items-start gap-2 border-t border-hueso/10 pt-3 sm:flex-row sm:items-center sm:gap-3">
                <p className="min-w-0 flex-1 text-[15px] leading-relaxed">
                  <span className="block text-[13px] font-semibold uppercase tracking-widest text-hueso/65 sm:inline sm:text-[15px] sm:font-normal sm:normal-case sm:tracking-normal sm:text-hueso/70">Transferencia: </span>
                  {listoBanco ? (
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-verde-fuerte/60 px-2 text-[14px] font-bold text-verde-texto">
                      ✓ {[banco.banco, banco.tipo, terminacion].filter(Boolean).join(' · ')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-ambar-fuerte/70 px-2 text-[14px] font-bold text-ambar-texto">
                      ⚠ falta {faltaParaTransferir(banco).join(', ')}
                    </span>
                  )}
                </p>
                {datos.puedeEditar && (
                  <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => setVentana('banco')}>{listoBanco ? 'Cambiar' : 'Completar'}</button>
                )}
              </div>
            )}
            {esSocio && datos.puedeLinks && (
              <div className="flex flex-wrap items-center gap-2 border-t border-hueso/10 pt-3">
                <p className="mr-auto text-[15px]">
                  <span className="text-hueso/70">Link personal: </span>
                  <b>{!datos.ficha.activo ? 'apagado (desactivado)' : ficha?.token ? 'tiene' : 'todavía no'}</b>
                </p>
                <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => void link('crear')}>🔗 Copiar link</button>
                {ficha?.token && (
                  <>
                    <button type="button" className="boton" onClick={() => void link('renovar')}
                      title="Crea uno nuevo; el anterior deja de servir">Renovar</button>
                    <button type="button" className="boton hover:border-rojo-fuerte hover:text-rojo-texto" onClick={() => void link('quitar')}>Quitar</button>
                  </>
                )}
              </div>
            )}
          </section>

          {/* La ventana del trato: filas de − y +, se guarda solo. */}
          {ventana === 'trato' && ficha && (
            <Dialogo titulo={`El trato de ${datos.nombre}`} onCerrar={() => { void fichas.forzar(); setVentana(''); }} ancho="max-w-xl">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] text-hueso/75">Se guarda solo. Vale para lo que se pague desde hoy.</p>
                  <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(datos.usuario)} />
                </div>

                <div>
                  <p className="text-[15px] font-bold">Comisión por personas del evento</p>
                  <p className="text-[13px] text-hueso/70">Rige la etapa más alta que alcance. Bajo la etapa 1 no hay comisión.</p>
                  <div className="mt-2 space-y-2">
                    {([
                      { n: 1, desde: 'etapa1Desde', pct: 'comisionPct' },
                      { n: 2, desde: 'etapa2Desde', pct: 'etapa2Pct' },
                      { n: 3, desde: 'etapa3Desde', pct: 'etapa3Pct' }
                    ] as const).map((e) => (
                      <div key={e.n} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-hueso/15 p-2.5">
                        <span className="w-16 text-[13px] font-bold uppercase tracking-widest text-oro">Etapa {e.n}</span>
                        <Paso etiqueta={`Etapa ${e.n} desde`} valor={ficha[e.desde]} paso={1} sufijo="personas o más"
                          vacio={e.n === 1 ? '1' : '0'} onCambio={(v) => cambiar(e.desde, Math.round(v))} />
                        <Paso etiqueta={`Etapa ${e.n} %`} valor={ficha[e.pct]} paso={0.5} sufijo="%" onCambio={(v) => cambiar(e.pct, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[15px] font-bold">Bono en menús premium</p>
                    <Paso etiqueta="Bono premium" valor={ficha.bonoPuntos} paso={0.5} sufijo="% más"
                      onCambio={(v) => cambiar('bonoPuntos', v)} />
                    <p className="mt-1 text-[13px] text-hueso/70">Sobre las líneas de los productos con ★ <a href="/menus" className="text-oro underline">Bono vendedor</a>.</p>
                  </div>
                  {!esSocio && (
                    <div>
                      <p className="text-[15px] font-bold">Cuando la venta viene con un socio comercial</p>
                      <Paso etiqueta="Con socio cobra" valor={ficha.conSocio ?? CON_SOCIO_DEFECTO} paso={5} sufijo="% de su comisión"
                        onCambio={(v) => cambiar('conSocio', Math.min(100, v))} />
                    </div>
                  )}
                  <div className={`grid gap-3 ${esSocio ? '' : 'sm:grid-cols-2'}`}>
                    <label className="block text-[15px] font-bold">
                      Monto por evento ganado ($)
                      <input inputMode="numeric" className={ENTRADA} value={ficha.montoEvento || ''} placeholder="0"
                        onChange={(e) => cambiar('montoEvento', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                    </label>
                    {!esSocio && (
                      <label className="block text-[15px] font-bold">
                        Sueldo fijo al mes ($)
                        <input inputMode="numeric" className={ENTRADA} value={ficha.sueldoFijo || ''} placeholder="0"
                          onChange={(e) => cambiar('sueldoFijo', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                      </label>
                    )}
                  </div>
                  <div>
                    <p className="text-[15px] font-bold">El % se calcula sobre</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(['neto', 'total'] as const).map((b) => (
                        <button key={b} type="button" aria-pressed={ficha.base === b} onClick={() => cambiar('base', b)}
                          className={`boton !min-h-[44px] !text-[15px] ${ficha.base === b ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
                          {ficha.base === b ? '✓ ' : ''}{BASE_COMISION[b]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lo del socio que se confirma: el nombre y desactivarlo (reglas 6 y 8). */}
                {esSocio && (
                  <div className="space-y-3 border-t border-hueso/15 pt-4">
                    <label className="block text-[15px] font-bold">
                      Nombre del socio
                      <input className={ENTRADA} value={nombreEscrito ?? datos.nombre} onChange={(e) => setNombreEscrito(e.target.value)} />
                    </label>
                    {nombreEscrito !== null && nombreEscrito.trim() !== datos.nombre && (
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] text-ambar-texto">Cambiaste el nombre.</span>
                        <button type="button" className="boton border-oro text-oro" disabled={!nombreEscrito.trim()}
                          onClick={() => void cambiarYa({ nombre: nombreEscrito.trim() },
                            `¿Cambiar el nombre de ${datos.nombre} a ${nombreEscrito.trim()}? Las cotizaciones que lo nombran lo mostrarán con el nombre nuevo.`)}>
                          Guardar el nombre</button>
                        <button type="button" className="boton" onClick={() => setNombreEscrito(null)}>Deshacer</button>
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="mr-auto text-[14px]">{datos.ficha.activo ? 'Activo: se ofrece al cotizar.' : 'Desactivado: no se ofrece al cotizar y su link no abre.'}</p>
                      <button type="button" className="boton !min-h-[44px] !text-[15px] hover:border-rojo-fuerte hover:text-rojo-texto"
                        onClick={() => void cambiarYa({ activo: !datos.ficha.activo }, datos.ficha.activo
                          ? `¿Desactivar a ${datos.nombre}? Deja de ofrecerse al cotizar y su link deja de abrir; sus ventas y su comisión se conservan.`
                          : `¿Activar a ${datos.nombre}? Vuelve a ofrecerse al cotizar.`)}>
                        {datos.ficha.activo ? 'Desactivar' : 'Activar'}</button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => { void fichas.forzar(); setVentana(''); }}>Listo</button>
                </div>
              </div>
            </Dialogo>
          )}

          {ventana === 'banco' && ficha && (
            <Dialogo titulo={`Transferencia · ${datos.nombre}`} onCerrar={() => { void fichas.forzar(); setVentana(''); }} ancho="max-w-xl">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14px] text-hueso/75">Se guarda solo.</p>
                  <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(datos.usuario)} />
                </div>
                <DatosBancarios banco={ficha.banco} nombre={datos.nombre} onCambio={(b: Banco) => cambiar('banco', b)} />
                <div className="flex justify-end">
                  <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => { void fichas.forzar(); setVentana(''); }}>Listo</button>
                </div>
              </div>
            </Dialogo>
          )}
        </>
      )}
    </div>
  );
}

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
 * 1. **Quién** (cambió el 2026-11-20, lo pidió el cliente: con varios
 *    vendedores no se veía cada uno con lo suyo). Arriba, *Ver* con dos
 *    botones que filtran la lista —👤 Vendedores · 🤝 Socios comerciales— y
 *    *+ Agregar socio comercial* al lado; un buscador y *Mostrar
 *    desactivados*. Debajo, **una tarjeta por persona**, como en Equipo y el
 *    informe: cerrada dice lo que le toca en el periodo y cómo va su pago;
 *    abierta, todo lo de abajo. Se abre una a la vez. El vendedor no tiene
 *    lista: ve lo suyo.
 * 2. **Cuándo**: Mes / Semana y una sola barra ◀ periodo ▶, una vez para
 *    toda la lista.
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
import AvisoFijo from './AvisoFijo';
import { CUERPO_ABIERTO, LISTA_TARJETAS, PieCerrar, SignoAbrir, marcoTarjeta } from './TarjetaLista';
import { useEffect, useState } from 'react';
import AvisoGuardado from './AvisoGuardado';
import AyudaCorta from './AyudaCorta';
import MostrarDesactivados from './MostrarDesactivados';
import AgregarVendedor from './AgregarVendedor';
import CamposDocumento, { type CambioDocumento } from './CamposDocumento';
import Dialogo from './Dialogo';
import { avisar, copiarConAviso } from './AvisoFlotante';
import DatosBancarios from './DatosBancarios';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, mesEnPalabras, rangoEnPalabras, semanaDe, sumarDias, esFecha } from '@/lib/fechas';
import { BASE_COMISION, CON_SOCIO_DEFECTO, type FichaVendedor, type Venta, type ResumenVendedor as Resumen } from '@/lib/vendedores';
import { sePuedeTransferir, faltaParaTransferir, bancoVacio, type Banco } from '@/lib/banco';
import type { PagoEquipo } from '@/lib/remuneraciones';
import { tasaEnTexto, type Desglose } from '@/lib/boletas';
import { faltaParaFacturar } from '@/lib/vendedores';

type VentaConFolio = Venta & { folio: string };
type EnCurso = { id: string; folio: string; cliente: string; fecha: string; estado: string; total: number; comision: number; detalle: string };
interface Datos {
  vendedores: { usuario: string; nombre: string; activo: boolean }[];
  socios: { usuario: string; nombre: string; activo: boolean }[];
  /** Una línea por persona, para la lista (no le llega al vendedor). */
  resumenes?: Linea[];
  usuario: string; nombre: string; tipo: 'vendedor' | 'socio'; ficha: FichaVendedor; formaDePago: boolean;
  desde: string; hasta: string; periodo: string; hoy: string;
  resumen: Omit<Resumen, 'cuentan'> & { cuentan: VentaConFolio[] }; pagado: number; falta: number; pagos: PagoEquipo[];
  porCobrar: VentaConFolio[]; enCurso: EnCurso[];
  /** El documento del periodo: lo que va en la boleta o la factura y lo que se le transfiere (2026-11-20). */
  documento?: Desglose;
  puedeEditar: boolean; puedeLinks?: boolean; error?: string;
  puedeAgregarVendedor?: boolean; puedeAgregarSocio?: boolean;
}

/** Lo que dice la tarjeta cerrada de una persona. Ver `/api/vendedores`. */
interface Linea {
  usuario: string; nombre: string; tipo: 'vendedor' | 'socio'; activo: boolean;
  total: number; aTransferir: number; pagado: number; falta: number; ventas: number; fijo: number;
  formaDePago: boolean; sinCuenta: boolean; documento: 'boleta' | 'factura'; faltaFactura: boolean; porConfirmar: boolean;
}

/** Minúsculas y sin tildes, para buscar "jose" y encontrar a José. */
const llano = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/**
 * **Cómo va el pago de una persona en el periodo**, con las mismas palabras y
 * la misma forma que la línea del informe: *✓ pagado*, *falta $X* o *sin
 * pagar*.
 */
function EstadoPago({ total, pagado, falta }: { total: number; pagado: number; falta: number }) {
  if (total <= 0) return <span className="text-[13px] text-hueso/60">nada en el periodo</span>;
  return (
    <span className={`whitespace-nowrap rounded-full border-2 px-2 py-0.5 text-[13px] font-bold ${
      falta <= 0 ? 'border-verde/60 text-verde-texto'
      : pagado > 0 ? 'border-ambar/60 text-ambar-texto'
      : 'border-hueso/25 text-hueso/65'}`}>
      {falta <= 0 ? '✓ pagado' : pagado > 0 ? `falta ${enPesos(falta)}` : 'sin pagar'}
    </span>
  );
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

function Azulejo({ que, monto, nota, tono, grande = false, ayuda }: {
  que: string; monto: number; nota?: string; tono: string; grande?: boolean; ayuda?: string;
}) {
  return (
    <div className={`min-w-0 rounded-xl border-2 p-3 ${tono} ${grande ? 'col-span-2 sm:col-span-1' : ''}`}>
      <p className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-widest text-hueso/70">
        {que}{ayuda && <AyudaCorta tema={ayuda} />}
      </p>
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
  /** La ventana de agregar abierta: un vendedor o un socio (2026-11-20). */
  const [agregando, setAgregando] = useState<'' | 'vendedor' | 'socio'>('');
  /** El nombre de un socio escrito y sin confirmar. */
  const [nombreEscrito, setNombreEscrito] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');
  /** Qué grupo se ve en la lista: vendedores o socios comerciales. */
  const [grupo, setGrupo] = useState<'vendedores' | 'socios'>('vendedores');
  const [busca, setBusca] = useState('');
  const [verInactivos, setVerInactivos] = useState(false);
  /** La pestaña del detalle. */
  const [pestana, setPestana] = useState<'suma' | 'viene' | 'pagos'>('suma');
  /** Qué ventana está abierta: el trato o la transferencia. */
  const [ventana, setVentana] = useState<'' | 'trato' | 'banco' | 'documento'>('');

  const cargar = (u = usuario, p = periodo, inicial = false) => {
    const q = new URLSearchParams();
    if (u) q.set('usuario', u);
    if (p) q.set('p', p);
    fetch(`/api/vendedores?${q}`).then((r) => r.json()).then((d: Datos) => {
      if (d.error) { setError(d.error); return; }
      setError(''); setDatos(d); setFicha(d.ficha ?? null); setNombreEscrito(null);
      if (!u && d.usuario) setUsuario(d.usuario);
      if (!p && d.periodo) setPeriodo(d.periodo);
      // La lista parte en el grupo de quien se abrió; sin nadie, en
      // vendedores, salvo que solo haya socios.
      if (d.usuario && d.tipo) setGrupo(d.tipo === 'socio' ? 'socios' : 'vendedores');
      else if (inicial && !d.vendedores?.length && d.socios?.length) setGrupo('socios');
    }).catch((e) => setError(String(e)));
  };
  // Se puede llegar directo a alguien: el informe enlaza `/vendedores?usuario=…`,
  // y abre su tarjeta.
  useEffect(() => {
    const u = new URLSearchParams(window.location.search).get('usuario') ?? '';
    if (u) setUsuario(u);
    cargar(u, '', true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Al abrir una tarjeta más abajo, la de arriba se cierra y la página salta:
  // si la abierta quedó arriba de la pantalla, se trae a la vista.
  useEffect(() => {
    if (!usuario || esVendedor) return;
    const el = document.getElementById(`v-${usuario}`);
    if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block: 'start' });
  }, [usuario, datos?.usuario, esVendedor]);

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
  /** Abre la tarjeta de alguien —y cierra la que estaba— o la cierra. */
  const abrir = (u: string) => {
    void fichas.forzar(); setVentana(''); setNombreEscrito(null);
    if (u === usuario) { setUsuario(''); return; }
    setUsuario(u); setPestana('suma'); cargar(u, periodo);
  };
  /** Si el detalle que llegó es el de la tarjeta abierta. */
  const hay = !!datos.usuario && datos.usuario === usuario && !!datos.ficha && !!datos.resumen;
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
  const banco = ficha?.banco ?? datos.ficha?.banco ?? bancoVacio();
  const listoBanco = sePuedeTransferir(banco);
  const viene = (datos.porCobrar?.length ?? 0) + (datos.enCurso?.length ?? 0);

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
  /** Lo recién creado en la ventana de agregar: se abre su tarjeta. */
  const creado = (id: string, tipo: 'vendedor' | 'socio') => {
    setAgregando(''); setGrupo(tipo === 'socio' ? 'socios' : 'vendedores'); setBusca('');
    setUsuario(id); setPestana('suma'); cargar(id, periodo);
  };
  /** **Confirmar el trato de un socio que agregó un vendedor** (regla: la plata la cierra pagos). */
  const confirmarTrato = async () => {
    const res = await fetch('/api/equipo/confirmar', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ de: 'socio', id: datos.usuario, nombre: datos.nombre })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { avisar(d.error || 'No se pudo confirmar.', 'atencion'); return; }
    avisar(`Confirmado: el trato de ${datos.nombre}`);
    cargar(datos.usuario, periodo);
  };
  /** El documento de la ficha: se guarda solo, como el trato. */
  const cambiarDocumento = (c: CambioDocumento) => {
    if (c.documento) cambiar('documento', c.documento);
    if (c.incluido !== undefined) cambiar('incluido', c.incluido);
    if (c.factura) cambiar('factura', c.factura);
  };
  const pagarEn = `/informe?${new URLSearchParams({ pagar: datos.nombre, desde: datos.desde, hasta: datos.hasta })}`;
  const terminacion = banco.numero ? `···${banco.numero.replace(/\D/g, '').slice(-4)}` : '';

  /** El detalle de la persona abierta: lo que antes era toda la página. */
  const detalle = hay ? (
    // **En el computador ancho, dos columnas** (2026-11-21, regla *una tarjeta
    // abierta cabe en una pantalla*): a la izquierda cuánto le toca, el botón
    // de pagarle y el detalle; a la derecha, cómo se le paga. Apilada, la
    // ficha medía 740px y la página dejaba un tercio de la pantalla vacío.
    <div className="space-y-5 xl:grid xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] xl:items-start xl:gap-x-5 xl:gap-y-3 xl:space-y-0">
          {/* **El trato de un socio que agregó un vendedor** (2026-11-20):
              ya rige con el de partida; pagos lo mira y lo confirma. */}
          {datos.ficha?.porConfirmar && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-ambar-fuerte/70 bg-ambar/10 p-3 xl:col-span-2">
              <p className="min-w-[12rem] flex-1 text-[15px]">
                <b className="text-ambar-texto">⚠ Trato por confirmar.</b>{' '}
                Lo agregó {datos.ficha.porConfirmar.split(' · ')[1] || 'un vendedor'} con el trato de partida.
                {datos.puedeEditar ? ' Revísalo abajo, en Cambiar el trato, y confírmalo.' : ' Lo confirma el encargado de pagos.'}
              </p>
              {datos.puedeEditar && (
                <button type="button" className="boton !min-h-[44px] !border-verde-fuerte !text-[15px] !font-bold text-verde-texto"
                  onClick={() => void confirmarTrato()}>✓ Confirmar el trato</button>
              )}
            </div>
          )}
          {!datos.formaDePago && (
            <p className="rounded-xl border-2 border-ambar-fuerte/70 bg-ambar/10 p-3 text-[15px] xl:col-span-2">
              <b className="text-ambar-texto">Todavía no está escrito cómo se le paga.</b>{' '}
              {datos.puedeEditar ? 'Apreta Cambiar el trato, abajo: sin eso no hay montos.' : 'Pídeselo a quien hace los pagos: sin eso no hay montos.'}
            </p>
          )}

          <div className="space-y-5 xl:min-w-0 xl:space-y-3">
          {/* 3. Cuánto: tres azulejos; el desglose va en una línea. */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Azulejo grande ayuda="vendLeToca" que={tu ? 'Te toca' : 'Le toca'} monto={r.total} tono="border-oro/40 bg-oro/[0.07] text-oro"
              nota={(r.sueldoFijo
                ? `comisiones ${enPesos(r.comisiones)} + fijo ${enPesos(r.sueldoFijo)}`
                : `${r.cuentan.length} ${r.cuentan.length === 1 ? 'venta pagada' : 'ventas pagadas'}`)
                + (datos.documento && datos.documento.aTransferir !== r.total
                  ? ` · ${tu ? 'te transferimos' : 'se le transfieren'} ${enPesos(datos.documento.aTransferir)}` : '')} />
            <Azulejo ayuda="vendPagado" que="Pagado" monto={datos.pagado} tono="border-verde-fuerte/40 bg-verde/[0.06] text-verde-texto"
              nota={datos.pagos.length ? `${datos.pagos.length} ${datos.pagos.length === 1 ? 'pago' : 'pagos'}` : 'sin pagos'} />
            <Azulejo ayuda="vendFalta" que="Falta" monto={datos.falta}
              tono={datos.falta > 0 ? 'border-ambar-fuerte/50 bg-ambar/[0.07] text-ambar-texto' : 'border-hueso/15 bg-panel text-hueso/80'} />
          </div>

          {/* 4. El hito: el único botón relleno de la vista. */}
          {datos.puedeEditar && !esVendedor && (datos.falta > 0 ? (
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
              <a href={pagarEn} className="boton boton-relleno tecla flex !min-h-[56px] w-full items-center justify-center !px-8 !text-[18px] !font-bold sm:w-auto">
                💸 Pagarle {enPesos(datos.falta)} →
              </a>
              <p className="text-center text-[13px] text-hueso/70 sm:text-left">Abre el informe con la ventana de pago lista para {datos.nombre}.</p>
            </div>
          ) : r.total > 0 ? (
            <p className="flex min-h-[48px] items-center justify-center rounded-xl border-2 border-verde-fuerte/60 bg-verde/10 px-5 text-[16px] font-bold text-verde-texto sm:inline-flex">
              ✓ Al día en este periodo
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
                      <p className="mb-1 text-[13px] font-semibold uppercase tracking-widest text-ambar-texto">Ganadas · falta que el cliente pague o que pagos lo revise</p>
                      <ul className="grid gap-2 lg:grid-cols-2">
                        {datos.porCobrar.map((v) => (
                          <TarjetaVenta key={v.id} cliente={v.cliente} folio={v.folio} fecha={v.fechaEvento} tono="border-ambar-fuerte/50"
                            linea={v.porRevisar ? 'pagó todo · esperando revisión de pagos' : `falta ${enPesos(Math.max(0, v.total - v.pagado))}`} rotulo="Comisión que viene"
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

          </div>
          {/* 6. Cómo se le paga: se lee en una frase; se cambia en su ventana. */}
          <section className="space-y-3 rounded-2xl border-2 border-hueso/15 bg-panel p-4 xl:min-w-0 xl:p-3">
            <div>
              <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-widest text-hueso/65">
                {tu ? 'Cómo se te paga' : 'Cómo se le paga'}<AyudaCorta tema="vendEtapas" />
                {!esSocio && (ficha ?? datos.ficha).conSocio < 100 && <AyudaCorta tema="vendConSocio" />}
              </h2>
              <div className="mt-1 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <p className="min-w-0 flex-1 text-[16px] font-medium leading-snug">{datos.formaDePago ? tratoEnPalabras(ficha ?? datos.ficha) : 'Sin escribir todavía.'}</p>
                {datos.puedeEditar && (
                  <button type="button" className="boton !min-h-[44px] !text-[15px] border-oro text-oro" onClick={() => setVentana('trato')}>Cambiar el trato</button>
                )}
              </div>
            </div>
            {/* **El documento** (2026-11-20): boleta o factura, con el
                impuesto incluido o aparte, y lo que se le transfiere. */}
            {(() => {
              const f = ficha ?? datos.ficha;
              const doc = datos.documento;
              const faltaF = faltaParaFacturar(f);
              return (
                <div className="flex flex-col items-start gap-2 border-t border-hueso/10 pt-3 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1 text-[15px] leading-relaxed">
                    <span className="block text-[13px] font-semibold uppercase tracking-widest text-hueso/65 sm:inline-block sm:w-[7.5rem] sm:text-[15px] sm:font-normal sm:normal-case sm:tracking-normal sm:text-hueso/70">Documento: </span>
                    <span className="inline-flex items-center gap-1 rounded-full border-2 border-oro/50 px-2 text-[14px] font-bold">
                      🧾 {f.documento === 'factura' ? 'Factura' : 'Boleta de honorarios'} · {f.documento === 'factura'
                        ? (f.incluido ? 'IVA incluido' : 'más IVA') : (f.incluido ? 'retención incluida' : 'retención aparte')}
                    </span>
                    {f.documento === 'factura' && f.factura.razonSocial && <span className="text-hueso/75"> · {f.factura.razonSocial}</span>}
                    {faltaF.length > 0 && (
                      <span className="ml-1 inline-flex rounded-full border-2 border-dashed border-ambar-fuerte/70 px-2 text-[14px] font-bold text-ambar-texto">
                        ⚠ falta {faltaF.join(', ')}
                      </span>
                    )}
                    {doc && doc.enDocumento > 0 && (
                      <p className="mt-1 text-[14px] text-hueso/80">
                        Este periodo: {f.documento === 'factura' ? 'factura' : 'boleta'} por <b>{enPesos(doc.enDocumento)}</b>
                        {' '}({f.documento === 'factura' ? `IVA ${tasaEnTexto(doc.tasa)}` : `retención ${tasaEnTexto(doc.tasa)}`} {enPesos(doc.impuesto)})
                        {' '}· {tu ? 'te transferimos' : 'se le transfieren'} <b>{enPesos(doc.aTransferir)}</b>
                      </p>
                    )}
                  </div>
                  {datos.puedeEditar && (
                    <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => setVentana('documento')}>Cambiar</button>
                  )}
                </div>
              );
            })()}
            {(datos.puedeEditar || esVendedor) && (
              <div className="flex flex-col items-start gap-2 border-t border-hueso/10 pt-3 sm:flex-row sm:items-center sm:gap-3">
                <p className="min-w-0 flex-1 text-[15px] leading-relaxed">
                  <span className="block text-[13px] font-semibold uppercase tracking-widest text-hueso/65 sm:inline-block sm:w-[7.5rem] sm:text-[15px] sm:font-normal sm:normal-case sm:tracking-normal sm:text-hueso/70">Transferencia: </span>
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
            <Dialogo titulo={`El trato de ${datos.nombre}`} onCerrar={() => { void fichas.forzar(); setVentana(''); }}
              ancho="max-w-xl lg:max-w-6xl">
              {/* **En el computador, dos columnas** (2026-11-21, regla *una
                  tarjeta abierta cabe en una pantalla*): las etapas a la
                  izquierda, cada una en una fila, y el bono y el socio a la
                  derecha; debajo, los montos y la base. Apilado medía 979px. */}
              <div className="space-y-5 lg:grid lg:grid-cols-[7fr_5fr] lg:items-start lg:gap-x-10 lg:gap-y-3 lg:space-y-0">
                <div className="flex flex-wrap items-center justify-between gap-2 lg:col-span-2">
                  <p className="text-[14px] text-hueso/75">Se guarda solo. Vale para lo que se pague desde hoy.</p>
                  <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(datos.usuario)} />
                </div>

                <div className="lg:row-span-2">
                  <p className="flex items-center gap-1.5 text-[15px] font-bold">Comisión por personas del evento <AyudaCorta tema="vendEtapas" /></p>
                  <div className="mt-2 space-y-2">
                    {([
                      { n: 1, desde: 'etapa1Desde', pct: 'comisionPct' },
                      { n: 2, desde: 'etapa2Desde', pct: 'etapa2Pct' },
                      { n: 3, desde: 'etapa3Desde', pct: 'etapa3Pct' }
                    ] as const).map((e) => (
                      <div key={e.n} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-hueso/15 p-2.5">
                        <span className="w-16 text-[13px] font-bold uppercase tracking-widest text-oro">Etapa {e.n}</span>
                        <Paso etiqueta={`Etapa ${e.n} desde`} valor={ficha[e.desde]} paso={1} sufijo="personas o más"
                          onCambio={(v) => cambiar(e.desde, Math.max(e.n === 1 ? 1 : 0, Math.round(v)))} />
                        <Paso etiqueta={`Etapa ${e.n} %`} valor={ficha[e.pct]} paso={0.5} sufijo="%" onCambio={(v) => cambiar(e.pct, v)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 lg:contents lg:space-y-0">
                  <div>
                    <p className="flex items-center gap-1.5 text-[15px] font-bold">Bono en menús premium <AyudaCorta tema="vendBono" /></p>
                    {/* En la misma caja y la misma columna que las etapas
                        (2026-11-21, regla *los formularios van alineados*): el
                        − y el + del bono y del socio iban sueltos, 58px a la
                        izquierda de los de las etapas. */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-hueso/15 p-2.5">
                      <span className="w-16 text-[13px] font-bold uppercase tracking-widest text-oro">Bono</span>
                      <Paso etiqueta="Bono premium" valor={ficha.bonoPuntos} paso={0.5} sufijo="% más"
                        onCambio={(v) => cambiar('bonoPuntos', v)} />
                    </div>
                    <p className="mt-1 text-[13px] text-hueso/70">Sobre las líneas de los productos con ★ <a href="/menus" className="text-oro underline">Bono vendedor</a>.</p>
                  </div>
                  {!esSocio && (
                    <div>
                      <p className="flex items-center gap-1.5 text-[15px] font-bold">¿Y si la venta viene con un socio comercial? <AyudaCorta tema="vendConSocio" /></p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-hueso/15 p-2.5">
                        <span className="w-16 text-[13px] font-bold uppercase tracking-widest text-oro">Socio</span>
                        <Paso etiqueta="Con socio cobra" valor={ficha.conSocio ?? CON_SOCIO_DEFECTO} paso={5} sufijo="% de su comisión"
                          onCambio={(v) => cambiar('conSocio', Math.min(100, v))} />
                      </div>
                    </div>
                  )}
                  <div className={`grid gap-3 ${esSocio ? '' : 'sm:grid-cols-2'}`}>
                    <label className="block text-[15px] font-bold">
                      <span className="flex items-center gap-1.5">Monto por evento ganado ($) <AyudaCorta tema="vendMontoEvento" /></span>
                      <input inputMode="numeric" className={ENTRADA} value={ficha.montoEvento || ''} placeholder="0"
                        onChange={(e) => cambiar('montoEvento', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                    </label>
                    {!esSocio && (
                      <label className="block text-[15px] font-bold">
                        <span className="flex items-center gap-1.5">Sueldo fijo al mes ($) <AyudaCorta tema="vendSueldoFijo" /></span>
                        <input inputMode="numeric" className={ENTRADA} value={ficha.sueldoFijo || ''} placeholder="0"
                          onChange={(e) => cambiar('sueldoFijo', Number(e.target.value.replace(/[^\d]/g, '')) || 0)} />
                      </label>
                    )}
                  </div>
                  <div>
                    <p className="flex items-center gap-1.5 text-[15px] font-bold">El % se calcula sobre <AyudaCorta tema="vendBase" /></p>
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
                  <div className="space-y-3 border-t border-hueso/15 pt-4 lg:col-span-2 lg:pt-3">
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

                <div className="flex justify-end lg:col-span-2">
                  <button type="button" className="boton !min-h-[44px] !text-[15px]" onClick={() => { void fichas.forzar(); setVentana(''); }}>Listo</button>
                </div>
              </div>
            </Dialogo>
          )}

          {ventana === 'documento' && ficha && (
            <Dialogo titulo={`Documento · ${datos.nombre}`} onCerrar={() => { void fichas.forzar(); setVentana(''); }} ancho="max-w-xl">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center text-[14px] text-hueso/75">
                    Con qué cobra
                    <AyudaCorta titulo="Con qué cobra">
                      Cambia lo que se le transfiere desde este periodo, también en el informe.
                    </AyudaCorta>
                  </p>
                  <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(datos.usuario)} />
                </div>
                <CamposDocumento documento={ficha.documento} incluido={ficha.incluido} factura={ficha.factura} onCambio={cambiarDocumento} />
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
    </div>
  ) : null;

  // **La lista** (2026-11-20): una tarjeta por persona del grupo elegido.
  const lineas = datos.resumenes ?? [];
  const delGrupo = lineas.filter((x) => x.tipo === (grupo === 'socios' ? 'socio' : 'vendedor'));
  const q = llano(busca);
  const inactivos = delGrupo.filter((x) => !x.activo).length;
  // La abierta no se esconde aunque deje de calzar con el buscador.
  const visibles = delGrupo
    .filter((x) => x.usuario === usuario || ((verInactivos || x.activo) && (!q || llano(x.nombre).includes(q))))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
  const cuantos = { vendedores: datos.vendedores?.length ?? 0, socios: datos.socios?.length ?? 0 };

  return (
    <div className="max-w-4xl space-y-5 lg:space-y-3 xl:max-w-none">
      <div>
        <h1 className="text-xl font-bold uppercase tracking-wide">{esVendedor ? 'Mi resumen' : 'Vendedores y socios'}</h1>
        <AvisoFijo clave="vendedores-comision" className="mt-1">La comisión cuenta cuando el cliente terminó de pagar y el encargado de pagos lo revisó.</AvisoFijo>
      </div>

      {/* 1. Quién: los dos grupos como filtro, arriba (como antes, lo pidió el
          cliente), y agregar un socio al lado. */}
      {!esVendedor && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-full text-[13px] font-semibold uppercase tracking-widest text-hueso/65 sm:w-auto">Ver</span>
            <div className="grid w-full grid-cols-2 gap-2 sm:w-auto" role="group" aria-label="Qué grupo ver">
              {([['vendedores', '👤 Vendedores', ''], ['socios', '🤝 Socios', ' comerciales']] as const).map(([k, rotulo, resto]) => {
                const marcado = grupo === k;
                return (
                  <button key={k} type="button" aria-pressed={marcado}
                    onClick={() => { if (!marcado) { void fichas.forzar(); setVentana(''); setUsuario(''); setBusca(''); setGrupo(k); } }}
                    className={`boton !min-h-[48px] !px-2 !text-[15px] border-2 ${marcado ? '!border-oro bg-oro/15 font-bold !text-oro' : ''}`}>
                    {marcado ? '✓ ' : ''}{rotulo}<span className="hidden sm:inline">{resto}</span>
                    <span className="rounded-full bg-hueso/10 px-1.5 text-[13px] tabular-nums">{cuantos[k]}</span>
                  </button>
                );
              })}
            </div>
            {/* **Agregar sigue al grupo** (2026-11-20): vendedores o socios,
                arriba como antes. Abre una ventana con sus datos de pago. */}
            {(grupo === 'socios' ? datos.puedeAgregarSocio : datos.puedeAgregarVendedor) && (
              <button type="button" className="boton !min-h-[48px] w-full border-dashed !text-[15px] sm:w-auto"
                onClick={() => { setAviso(''); setAgregando(grupo === 'socios' ? 'socio' : 'vendedor'); }}>
                {grupo === 'socios' ? '+ Agregar socio comercial' : '+ Agregar vendedor'}
              </button>
            )}
          </div>
          {agregando && (
            <AgregarVendedor tipo={agregando} onCerrar={() => setAgregando('')}
              onCreado={(id) => creado(id, agregando)} />
          )}
          {aviso && <p className="rounded border border-rojo-fuerte/60 bg-rojo/10 p-3 text-[15px]">{aviso}</p>}
        </div>
      )}

      {/* 2. Cuándo, una vez para toda la lista. */}
      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Periodo">
          {([['Mes', true, datos.hoy.slice(0, 7)], ['Semana', false, semanaDe(datos.hoy)]] as const).map(([rotulo, mes, p]) => (
            <button key={rotulo} type="button" aria-pressed={esMes === mes} onClick={() => irA(p)}
              className={`boton !min-h-[44px] !text-[15px] ${esMes === mes ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>{rotulo}</button>
          ))}
        </div>
        <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border-2 border-oro/50 bg-oro/[0.06] p-1 sm:w-72 sm:flex-none">
          <button type="button" aria-label="Periodo anterior" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
            onClick={() => irA(esMes ? moverMes(periodo, -1) : sumarDias(semanaDe(periodo), -7))}>◀</button>
          <span className="min-w-0 flex-1 truncate text-center text-[17px] font-bold first-letter:uppercase">{tituloPeriodo}</span>
          <button type="button" aria-label="Periodo siguiente" className="boton h-11 w-11 shrink-0 !p-0 text-[18px]"
            onClick={() => irA(esMes ? moverMes(periodo, 1) : sumarDias(semanaDe(periodo), 7))}>▶</button>
        </div>
        {/* **En el computador el buscador va en esta fila**, al lado del
            periodo (2026-11-21, el computador más compacto: eran tres filas de
            controles). En el celular sigue en la suya, sobre la lista. Es el
            mismo dato escrito, dibujado en los dos lugares. */}
        {!esVendedor && delGrupo.length > 0 && (
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder={grupo === 'socios' ? 'Buscar socio comercial' : 'Buscar vendedor'}
            aria-label={grupo === 'socios' ? 'Buscar socio comercial' : 'Buscar vendedor'}
            className="hidden min-h-[44px] min-w-0 flex-1 rounded-xl border-2 border-hueso/20 bg-tinta px-3
                       text-[15px] focus:border-oro focus:outline-none lg:block" />
        )}
      </div>

      {/* 3. La lista: una tarjeta por persona, como en Equipo y el informe.
          Cerrada, lo que le toca y cómo va su pago; abierta, el detalle. */}
      {!esVendedor && (
        <div>
          {delGrupo.length > 0 && (
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder={grupo === 'socios' ? 'Buscar socio comercial' : 'Buscar vendedor'}
              aria-label={grupo === 'socios' ? 'Buscar socio comercial' : 'Buscar vendedor'}
              className="mb-3 min-h-[44px] w-full rounded-xl border-2 border-hueso/20 bg-tinta px-3
                         text-[15px] focus:border-oro focus:outline-none sm:max-w-md lg:hidden" />
          )}
          <MostrarDesactivados cuantos={inactivos} visible={verInactivos} onCambio={setVerInactivos} />
          {delGrupo.length === 0 ? (
            <p className="rounded-xl border-2 border-hueso/15 px-4 py-3 text-[15px] text-hueso/70">
              {grupo === 'socios' ? 'Todavía no hay socios comerciales.'
                : 'Todavía no hay cuentas de vendedor. Se crean en Cuentas, con el rol Vendedor.'}
            </p>
          ) : visibles.length === 0 ? (
            <p className="rounded-xl border-2 border-hueso/15 px-4 py-3 text-[15px] text-hueso/70">
              {q ? <>Nadie calza con “{busca.trim()}”.</> : 'Todos están desactivados.'}
            </p>
          ) : (
            <ul className={LISTA_TARJETAS}>
              {visibles.map((x) => {
                const abierta = x.usuario === usuario;
                return (
                  <li key={x.usuario} id={`v-${x.usuario}`}
                    className={`scroll-mt-4 ${marcoTarjeta(abierta, !x.activo ? 'apagada'
                      : x.total > 0 && x.falta <= 0 ? 'verde' : 'normal')} ${x.activo || abierta ? '' : 'opacity-70'}`}>
                    <button type="button" aria-expanded={abierta} onClick={() => abrir(x.usuario)}
                      className="tecla flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left focus:outline-none
                                 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oro">
                      <SignoAbrir abierta={abierta} tamano="mt-0.5 h-7 w-7 text-[15px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[17px] font-bold leading-tight">{x.nombre}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-hueso/70">
                          <span>
                            {x.ventas} {x.ventas === 1 ? 'venta pagada' : 'ventas pagadas'}
                            {x.fijo > 0 && <> · fijo {enPesos(x.fijo)}</>}
                          </span>
                          {!x.activo && (
                            <span className="rounded-full border border-hueso/25 px-2 font-semibold text-hueso/65">
                              {x.tipo === 'socio' ? 'desactivado' : 'cuenta inactiva'}
                            </span>
                          )}
                          {!x.formaDePago && (
                            <span className="rounded-full border-2 border-dashed border-ambar/60 px-2 font-semibold text-ambar-texto">⚠ sin trato</span>
                          )}
                          {x.sinCuenta && (
                            <span className="rounded-full border border-ambar/50 px-2 font-semibold text-ambar-texto">falta su cuenta</span>
                          )}
                          {x.faltaFactura && (
                            <span className="rounded-full border border-ambar/50 px-2 font-semibold text-ambar-texto">falta su factura</span>
                          )}
                          {x.porConfirmar && (
                            <span className="rounded-full border-2 border-dashed border-ambar/60 px-2 font-semibold text-ambar-texto">⚠ trato por confirmar</span>
                          )}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-[19px] font-bold tabular-nums">{x.total > 0 ? enPesos(x.total) : '—'}</span>
                        <EstadoPago total={x.aTransferir} pagado={x.pagado} falta={x.falta} />
                      </span>
                    </button>
                    {abierta && (
                      <div className={`${CUERPO_ABIERTO} px-3 pb-4 pt-4 sm:px-4`}>
                        {detalle ?? <p className="text-[15px] text-hueso/60">Cargando…</p>}
                      </div>
                    )}
                    {abierta && <PieCerrar nombre={x.nombre} onCerrar={() => abrir(x.usuario)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {esVendedor && detalle}
    </div>
  );
}

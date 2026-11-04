'use client';

/**
 * Armar, editar y mandar presupuestos.
 *
 * **Un presupuesto es una ficha que se abre, no una fila de tabla**, por lo
 * mismo que las de `/equipo` y `/extras`: adentro hay líneas con cantidad y
 * precio, y eso no cabe en una fila sin que las de uno se peguen a las del
 * siguiente. Cerrada es una línea —cliente, fecha, total, estado—; lo demás
 * aparece al abrirla.
 *
 * **Se guarda con un botón, no solo.** Es la regla del panel: acá se edita
 * la lista misma —el cliente, las líneas, los precios— y guardar a mitad de
 * palabra mandaría una cotización a medio escribir. La ventana de un día,
 * que edita valores sobre algo que ya existe, se guarda sola; esto no.
 */
import { useEffect, useRef, useState } from 'react';
import { Aviso } from './CalendarView';
import Campo from './Campo';
import CampoTelefono from './CampoTelefono';
import Ayuda from './Ayuda';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';
import {
  ESTADO_PRESUPUESTO, totalDe, personasDe, estadoVisible, folioDe, aEntero,
  desglosarIVA, IVA,
  porVencer, vencidoSinCerrar, diasParaVencer,
  type Presupuesto, type LineaPresupuesto
} from '@/lib/presupuestos';
import type { Menu } from '@/lib/menus';
import { copiarConAviso } from './AvisoFlotante';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1.5 text-sm ' +
  'focus:border-oro focus:outline-none';

type Linea = Omit<LineaPresupuesto, 'fila'>;

/** El color de cada estado. Mismo criterio que el resto: ¿está cerrado o no? */
const COLOR: Record<string, string> = {
  Borrador: 'border-hueso/30 text-hueso/70',
  Enviado: 'border-rosa-fuerte text-rosa-texto',
  Aceptado: 'border-verde-fuerte text-verde-texto',
  Confirmado: 'border-verde-fuerte text-verde-texto',
  Rechazado: 'border-hueso/25 text-hueso/50',
  Vencido: 'border-ambar/50 text-ambar-texto'
};

/**
 * El plazo en palabras.
 *
 * **"Vence hoy" y "vence mañana" no son "vence en 0 días" ni "en 1 día"**,
 * y esa es toda la gracia de esta función: un cero no se lee como urgencia,
 * se lee como un error. Va al nivel del módulo, nunca dentro del
 * componente.
 */
function plazoEnPalabras(dias: number | null): string {
  if (dias === null) return '';
  if (dias === 0) return 'vence hoy';
  if (dias === 1) return 'vence mañana';
  return `vence en ${dias} días`;
}

function Pastilla({ children }: { children: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[13px]
                      font-semibold ${COLOR[children] ?? 'border-hueso/25 text-hueso/70'}`}>
      {children}
    </span>
  );
}

export default function PresupuestosEditor() {
  const [lista, setLista] = useState<Presupuesto[] | null>(null);
  const [lineas, setLineas] = useState<LineaPresupuesto[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [hoy, setHoy] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [verCerrados, setVerCerrados] = useState(false);
  /** Lo que se está editando: la cabecera y sus líneas, sin tocar la lista. */
  const [borrador, setBorrador] = useState<
    { p: Presupuesto; lineas: Linea[] } | null>(null);
  const campoNuevo = useRef<HTMLInputElement>(null);

  const cargar = () =>
    fetch('/api/presupuestos').then((r) => r.json()).then((d) => {
      if (d.error) return setError(d.error);
      setLista(d.presupuestos);
      setLineas(d.lineas);
      setMenus(d.menus ?? []);
      setHoy(d.hoy);
    }).catch((e) => setError(String(e)));

  useEffect(() => { void cargar(); }, []);

  if (error) return <Aviso error={error} />;
  if (!lista) return <p className="text-hueso/50">Cargando…</p>;

  const abrir = (p: Presupuesto) => {
    // **Abrir un cerrado destapa la lista.** Un vencido está escondido por
    // defecto, así que el botón del aviso de arriba habría abierto una ficha
    // que no se dibuja: el clic no hacía nada visible. Quien llega por ese
    // aviso viene justamente a atender ese presupuesto.
    if (cerrado(p)) setVerCerrados(true);
    setAbierto(p.id);
    setBorrador({
      p: { ...p },
      lineas: lineas.filter((l) => l.presupuesto === p.id)
                    .map(({ fila: _f, ...l }) => l)
    });
    setAviso('');
  };

  async function crear() {
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha: hoy, cliente: 'Sin nombre', lineas: [] })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      await cargar();
      abrir(d.presupuesto);
      // El cursor al nombre: lo primero que hay que escribir es de quién es.
      setTimeout(() => campoNuevo.current?.focus(), 50);
    } catch (e) { setError(String(e)); } finally { setGuardando(false); }
  }

  async function guardar(extra: Record<string, unknown> = {}) {
    if (!borrador) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...borrador.p, lineas: borrador.lineas, ...extra })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      setError('');
      await cargar();
      setBorrador((b) => (b ? { ...b, p: d.presupuesto } : b));
    } catch (e) { setError(String(e)); } finally { setGuardando(false); }
  }

  async function borrar(p: Presupuesto) {
    if (!confirm(`¿Borrar el presupuesto de ${p.cliente}? No se puede deshacer.`)) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos', {
        method: 'DELETE', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      setAbierto(null); setBorrador(null); setError('');
      await cargar();
    } catch (e) { setError(String(e)); } finally { setGuardando(false); }
  }

  /**
   * Convertirlo en reserva.
   *
   * **Es un botón propio y no un efecto de marcarlo "Aceptado"**: que el
   * cliente diga que sí y que le tomemos el lugar son dos decisiones, y la
   * segunda es la que le quita la silla a otro. Por eso pregunta antes y
   * dice qué va a pasar.
   */
  async function convertir(p: Presupuesto) {
    const gente = genteDeUno(p.id);
    if (!confirm(
      `¿Convertir el presupuesto de ${p.cliente} en una reserva?\n\n`
      + `Desde ahora ocupa ${gente} ${gente === 1 ? 'lugar' : 'lugares'} del día, `
      + `y deja de contarse como posible. Queda por pagar, con el monto `
      + `cotizado.`)) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/presupuestos/convertir', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: p.id })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      setError('');
      setAviso(`Listo: ${p.cliente} ya es una reserva del día. `
             + 'Ahora ocupa cupo y aparece en la página de ese día.');
      setAbierto(null); setBorrador(null);
      await cargar();
    } catch (e) { setError(String(e)); } finally { setGuardando(false); }
  }

  function copiarLink(p: Presupuesto) {
    const url = `${window.location.origin}/presupuesto/${p.token}`;
    copiarConAviso(url, `Link del presupuesto de ${p.cliente} copiado`,
                   `Link del presupuesto de ${p.cliente}:`);
  }

  /* ---------- las líneas ---------- */

  const cambiarLinea = (i: number, campo: keyof Linea, valor: string) => {
    if (!borrador) return;
    const copia = borrador.lineas.map((l) => ({ ...l }));
    if (campo === 'concepto') copia[i].concepto = valor;
    else copia[i][campo] = aEntero(valor) as never;
    setBorrador({ ...borrador, lineas: copia });
  };

  /**
   * Agrega un menú de la pestaña `Menús`.
   *
   * **El precio se propone, no se impone**: viene del catálogo y queda
   * editable, porque es parte de la negociación. Las personas nacen iguales
   * a la cantidad porque un menú ES gente; en una línea libre nacen en cero.
   */
  const agregarMenu = (nombre: string) => {
    if (!borrador || !nombre) return;
    const m = menus.find((x) => x.nombre === nombre);
    setBorrador({
      ...borrador,
      lineas: [...borrador.lineas, {
        presupuesto: borrador.p.id, concepto: nombre, cantidad: 1,
        precio: m?.precioEnLinea ?? 0, personas: 1
      }]
    });
  };

  const agregarLibre = () => {
    if (!borrador) return;
    setBorrador({
      ...borrador,
      lineas: [...borrador.lineas, {
        presupuesto: borrador.p.id, concepto: '', cantidad: 1,
        precio: 0, personas: 0
      }]
    });
  };

  const sacarLinea = (i: number) => {
    if (!borrador) return;
    setBorrador({ ...borrador, lineas: borrador.lineas.filter((_, k) => k !== i) });
  };

  /* ---------- la lista ---------- */

  const estadoDe = (p: Presupuesto) => estadoVisible(p, hoy);
  const cerrado = (p: Presupuesto) =>
    ['Rechazado', 'Vencido', 'Confirmado'].includes(estadoDe(p));
  const cerrados = lista.filter(cerrado).length;

  const porVencerHoy = lista.filter((p) => porVencer(p, hoy));
  const vencidos = lista.filter((p) => vencidoSinCerrar(p, hoy));

  const totalDeUno = (id: string) => totalDe(lineas.filter((l) => l.presupuesto === id));
  const genteDeUno = (id: string) => personasDe(lineas.filter((l) => l.presupuesto === id));

  const totalBorrador = borrador
    ? totalDe(borrador.lineas as LineaPresupuesto[]) : 0;
  const genteBorrador = borrador
    ? personasDe(borrador.lineas as LineaPresupuesto[]) : 0;

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Presupuestos<Ayuda tema="presupuestos" />
      </h1>
      <p className="mb-3 max-w-2xl text-sm text-hueso/70">
        Acá armas una cotización y se la mandas al cliente.
      </p>
      <p className="mb-4 max-w-2xl text-sm text-hueso/70">
        Mientras no se confirme, <strong>no ocupa cupo</strong>: el día lo
        muestra como posible y nada más.
      </p>

      {aviso && (
        <p className="mb-4 rounded border border-hueso/20 bg-panel px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      {/* **Lo que hay que atender, arriba** (2026-11-01). Es el mismo patrón
          que el aviso de `/turnos` con los días por cerrar, y por el mismo
          motivo: entrar acá tiene que ser que te digan qué hacer, no tener
          que acordarte de revisar la lista buscando fechas.

          **Son dos avisos y no uno.** *Por vencer* es "apúrate, todavía se
          puede"; *vencido* es "se te pasó, decide qué hacer con esto".
          Juntarlos borraría justamente el que se puede atender. Cada uno es
          un botón que abre su ficha, igual que los días pendientes. */}
      {(porVencerHoy.length > 0 || vencidos.length > 0) && (
        <div className="mb-4 space-y-2">
          {porVencerHoy.length > 0 && (
            <div className="rounded border border-ambar/50 bg-ambar/5 p-3">
              <p className="text-sm font-semibold text-ambar-texto">
                {porVencerHoy.length === 1
                  ? 'Un presupuesto está por vencer'
                  : `${porVencerHoy.length} presupuestos están por vencer`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {porVencerHoy.map((p) => (
                  <button key={p.id} onClick={() => abrir(p)} className="boton">
                    {p.cliente} · {plazoEnPalabras(diasParaVencer(p, hoy))}
                  </button>
                ))}
              </div>
            </div>
          )}
          {vencidos.length > 0 && (
            <div className="rounded border border-hueso/20 bg-panel p-3">
              <p className="text-sm font-semibold text-hueso/80">
                {vencidos.length === 1
                  ? 'Un presupuesto venció sin respuesta'
                  : `${vencidos.length} presupuestos vencieron sin respuesta`}
              </p>
              <p className="mt-1 text-[13px] text-hueso/65">
                Renueva su vigencia si la conversación sigue viva, o márcalo
                rechazado para sacarlo de la lista.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {vencidos.map((p) => (
                  <button key={p.id} onClick={() => abrir(p)} className="boton">
                    {p.cliente}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => void crear()} disabled={guardando}
          className="boton boton-relleno">Nuevo presupuesto</button>
        {cerrados > 0 && (
          <label className="flex items-center gap-2 text-[13px] text-hueso/60">
            <input type="checkbox" checked={verCerrados} className="h-4 w-4 accent-oro"
              onChange={(e) => { setVerCerrados(e.target.checked); setAbierto(null); }} />
            Ver cerrados ({cerrados})
          </label>
        )}
      </div>

      <ul className="space-y-3">
        {lista.map((p) => {
          // Los cerrados —rechazados, vencidos, ya confirmados— se esconden
          // por defecto: esta lista solo crece, y quien entra viene a mirar
          // lo que está vivo.
          if (cerrado(p) && !verCerrados) return null;
          const est = estadoDe(p);
          const esteAbierto = abierto === p.id;
          return (
            <li key={p.id}
              className={`overflow-hidden rounded border ${cerrado(p)
                ? 'border-hueso/10 bg-transparent opacity-70'
                : 'border-hueso/15 bg-panel'}`}>

              <div className="flex items-center gap-2 pr-2">
                <button type="button" aria-expanded={esteAbierto}
                  onClick={() => (esteAbierto ? setAbierto(null) : abrir(p))}
                  className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1
                             px-3 py-2.5 text-left hover:bg-hueso/5">
                  <span aria-hidden className="w-3 text-base leading-none text-hueso/50">
                    {esteAbierto ? '−' : '+'}
                  </span>
                  <span className="font-semibold">{p.cliente || 'Sin nombre'}</span>
                  <span className="text-[13px] text-hueso/60 first-letter:uppercase">
                    {enPalabras(p.fecha)}
                  </span>
                  <Pastilla>{est}</Pastilla>
                  {/* El plazo, solo cuando queda poco. Decir "vence en 11
                      días" en cada línea sería ruido todos los días, y lo
                      que está por vencer dejaría de distinguirse. */}
                  {porVencer(p, hoy) && (
                    <span className="whitespace-nowrap rounded-full border
                                     border-ambar/50 px-2 py-0.5 text-[13px]
                                     font-semibold text-ambar-texto">
                      {plazoEnPalabras(diasParaVencer(p, hoy))}
                    </span>
                  )}
                  <span className="flex-1" />
                  <span className="text-[13px] text-hueso/60">
                    {genteDeUno(p.id)} personas
                  </span>
                  <strong className="tabular-nums">{enPesos(totalDeUno(p.id))}</strong>
                </button>
                <button onClick={() => copiarLink(p)} className="boton shrink-0"
                  title="Copia el link para mandárselo al cliente">Copiar link</button>
              </div>

              {esteAbierto && borrador && (
                <div className="border-t border-hueso/10 p-3">
                  {/* Quién, cuándo. */}
                  <div className="flex flex-wrap items-start gap-3">
                    <Campo etiqueta="Cliente" ancho="w-56">
                      <input ref={campoNuevo} type="text" value={borrador.p.cliente}
                        className={ENTRADA} aria-label="Nombre del cliente"
                        onChange={(e) => setBorrador({
                          ...borrador, p: { ...borrador.p, cliente: e.target.value } })} />
                    </Campo>
                    <Campo etiqueta="Fecha del evento" ancho="w-44">
                      <input type="date" value={borrador.p.fecha} className={ENTRADA}
                        aria-label="Fecha del evento"
                        onChange={(e) => setBorrador({
                          ...borrador, p: { ...borrador.p, fecha: e.target.value } })} />
                    </Campo>
                    <Campo etiqueta="Teléfono" ancho="w-44">
                      <CampoTelefono valor={borrador.p.telefono} className={ENTRADA}
                        etiqueta="Teléfono del cliente"
                        onCambio={(v) => setBorrador({
                          ...borrador, p: { ...borrador.p, telefono: v } })} />
                    </Campo>
                    <Campo etiqueta="Email" ancho="w-56">
                      <input type="email" value={borrador.p.email} className={ENTRADA}
                        aria-label="Email del cliente"
                        onChange={(e) => setBorrador({
                          ...borrador, p: { ...borrador.p, email: e.target.value } })} />
                    </Campo>
                  </div>

                  {/* Qué se cotiza. */}
                  <div className="mt-4 border-t border-hueso/10 pt-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold uppercase
                                       tracking-widest text-hueso/60">Qué se cotiza</span>
                      <span className="flex-1" />
                      <select value="" className={`${ENTRADA} w-auto`}
                        aria-label="Agregar un menú al presupuesto"
                        onChange={(e) => { agregarMenu(e.target.value); e.target.value = ''; }}>
                        <option value="">+ Agregar menú…</option>
                        {menus.map((m) => (
                          <option key={m.nombre} value={m.nombre}>
                            {m.nombre}
                            {m.precioEnLinea ? ` · ${enPesos(m.precioEnLinea)}` : ''}
                          </option>
                        ))}
                      </select>
                      <button onClick={agregarLibre} className="boton">+ Otra línea</button>
                    </div>

                    {borrador.lineas.length === 0 ? (
                      <p className="rounded border border-dashed border-hueso/15 p-4
                                    text-[13px] text-hueso/60">
                        Todavía no hay nada cotizado. Agrega un menú, o una línea
                        libre para el arriendo del recinto, el show ecuestre o lo
                        que corresponda.
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {borrador.lineas.map((l, i) => (
                          <li key={i}
                            className="flex flex-wrap items-end gap-2 rounded border
                                       border-hueso/10 p-2">
                            <Campo etiqueta="Concepto" ancho="w-52">
                              <input type="text" value={l.concepto} className={ENTRADA}
                                placeholder="Arriendo del recinto"
                                aria-label={`Concepto de la línea ${i + 1}`}
                                onChange={(e) => cambiarLinea(i, 'concepto', e.target.value)} />
                            </Campo>
                            <Campo etiqueta="Cantidad" ancho="w-24">
                              <input type="number" min={0} value={l.cantidad || ''}
                                className={ENTRADA}
                                aria-label={`Cantidad de la línea ${i + 1}`}
                                onChange={(e) => cambiarLinea(i, 'cantidad', e.target.value)} />
                            </Campo>
                            <Campo etiqueta="Precio c/u" ancho="w-32">
                              <input type="number" min={0} step={1000} value={l.precio || ''}
                                className={ENTRADA} placeholder="0"
                                aria-label={`Precio unitario de la línea ${i + 1}`}
                                onChange={(e) => cambiarLinea(i, 'precio', e.target.value)} />
                            </Campo>
                            {/* **Personas, aparte de la cantidad.** Un arriendo es
                                cantidad 1 y cero personas: si se dedujera, ese "1"
                                sumaría una silla al día. */}
                            <Campo etiqueta="Personas" ancho="w-24">
                              <input type="number" min={0} value={l.personas || ''}
                                className={ENTRADA} placeholder="0"
                                aria-label={`Cuántas personas son la línea ${i + 1}`}
                                onChange={(e) => cambiarLinea(i, 'personas', e.target.value)} />
                            </Campo>
                            <span className="flex-1" />
                            <div className="pb-1 text-right">
                              <div className="text-[13px] uppercase tracking-wide
                                              text-hueso/60">Subtotal</div>
                              <strong className="tabular-nums">
                                {enPesos(Math.max(0, l.cantidad) * l.precio)}
                              </strong>
                            </div>
                            <button onClick={() => sacarLinea(i)}
                              className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
                              Sacar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-baseline justify-end
                                    gap-x-4 border-t border-hueso/10 pt-3">
                      <span className="text-[13px] text-hueso/65">
                        {genteBorrador} {genteBorrador === 1 ? 'persona' : 'personas'}
                      </span>
                      {/* **El mismo desglose que ve el cliente**, para que
                          quien negocia esté mirando los mismos tres números
                          que la hoja que va a mandar. Una agencia pide el
                          neto por teléfono y no puede haber que calcularlo
                          aparte. */}
                      <span className="text-[13px] text-hueso/65 tabular-nums">
                        Neto {enPesos(desglosarIVA(totalBorrador).neto)}
                        {' · '}IVA {Math.round(IVA * 100)}%{' '}
                        {enPesos(desglosarIVA(totalBorrador).iva)}
                      </span>
                      <span>
                        <span className="text-[13px] text-hueso/65">Total con IVA: </span>
                        <strong className="text-lg tabular-nums text-oro">
                          {enPesos(totalBorrador)}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Notas y estado. */}
                  <div className="mt-4 flex flex-wrap items-start gap-3
                                  border-t border-hueso/10 pt-3">
                    <Campo etiqueta="Notas para el cliente" ancho="w-full sm:w-96">
                      <input type="text" value={borrador.p.notas} className={ENTRADA}
                        placeholder="Incluye show ecuestre a las 15:00"
                        aria-label="Notas para el cliente"
                        onChange={(e) => setBorrador({
                          ...borrador, p: { ...borrador.p, notas: e.target.value } })} />
                    </Campo>
                    <Campo etiqueta="En qué va" ancho="w-44">
                      {/* Ya convertido, el estado deja de ser una opinión:
                          existe una reserva. Se muestra y no se edita, igual
                          que la modalidad de una reserva de Shopify. */}
                      <select value={borrador.p.estado || ESTADO_PRESUPUESTO.borrador}
                        className={ENTRADA} aria-label="Estado del presupuesto"
                        disabled={!!borrador.p.idReserva}
                        onChange={(e) => setBorrador({
                          ...borrador, p: { ...borrador.p, estado: e.target.value } })}>
                        <option value={ESTADO_PRESUPUESTO.borrador}>Borrador</option>
                        <option value={ESTADO_PRESUPUESTO.enviado}>Enviado</option>
                        <option value={ESTADO_PRESUPUESTO.aceptado}>Aceptado</option>
                        <option value={ESTADO_PRESUPUESTO.rechazado}>Rechazado</option>
                      </select>
                    </Campo>
                    <div className="pt-4 text-[13px] text-hueso/60">
                      {borrador.p.validoHasta
                        ? <>Válido hasta el <strong>
                            {enPalabras(borrador.p.validoHasta)}</strong></>
                        : 'Sin fecha de vencimiento'}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2
                                  border-t border-hueso/10 pt-3">
                    <a href={`/presupuesto/${borrador.p.token}`} target="_blank"
                       rel="noreferrer" className="tecla boton">Ver el documento</a>
                    <button onClick={() => void guardar({ renovarVigencia: true })}
                      disabled={guardando} className="boton"
                      title="Vuelve a contar el plazo desde hoy">
                      Renovar vigencia
                    </button>
                    {/* Aparece solo con el presupuesto aceptado y todavía sin
                        reserva: antes de eso no hay nada que convertir, y
                        después ya está hecho. */}
                    {!borrador.p.idReserva
                      && borrador.p.estado === ESTADO_PRESUPUESTO.aceptado && (
                      <button onClick={() => void convertir(borrador.p)}
                        disabled={guardando}
                        className="boton border-verde-fuerte text-verde-texto">
                        Convertir en reserva
                      </button>
                    )}
                    {borrador.p.idReserva && (
                      <a href={`/dia/${borrador.p.fecha}`} className="tecla boton">
                        Ver la reserva del día
                      </a>
                    )}
                    <span className="flex-1" />
                    {!borrador.p.idReserva && (
                      <button onClick={() => void borrar(borrador.p)} disabled={guardando}
                        className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
                        Borrar
                      </button>
                    )}
                    <button onClick={() => void guardar()} disabled={guardando}
                      className="boton boton-relleno">
                      {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
        {lista.length === 0 && (
          <li className="rounded border border-dashed border-hueso/15 p-6
                         text-sm text-hueso/60">
            Todavía no hay presupuestos. Apreta <strong>Nuevo presupuesto</strong>.
          </li>
        )}
      </ul>
    </section>
  );
}

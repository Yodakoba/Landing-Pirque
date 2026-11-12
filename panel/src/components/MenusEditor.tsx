'use client';

/**
 * El catálogo de productos (la pestaña `Menús`).
 *
 * Desde el 2026-11-10 no son solo los menús del sitio: es todo lo que se
 * vende y se cotiza —la once, el desayuno, el show ecuestre, el arriendo—,
 * en un solo catálogo para que lo cotizado y lo reservado se llamen igual.
 * Vive en la planilla, así que agregar uno no necesita un despliegue.
 *
 * **Una tarjeta por producto, como las fichas de `/equipo`**: cerrada es una
 * línea; abierta, botones grandes para lo que es una elección (tipo, cobro,
 * IVA, moneda) e interruptores para dónde se vende.
 *
 * **El aviso amarillo es la pieza importante de esta pantalla**, no la
 * tabla. Sin alias, lo único que mantiene alineados a Shopify, al sitio y al
 * panel es enterarse cuando dejan de estarlo. Ver src/lib/menus.ts.
 */
import BotonGuardar from './BotonGuardar';
import AyudaCorta from './AyudaCorta';
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import {
  desconocidos, aMonto, aPrecio, nuevoProducto, TIPO_PRODUCTO, COBRO, IVA_PRECIO, MONEDA,
  type Menu
} from '@/lib/menus';
import Campo from './Campo';
import MostrarDesactivados from './MostrarDesactivados';
import { usarSoloMira } from './SesionCliente';
import { normalizar } from '@/lib/columnas';
import { enPesos } from '@/lib/ocupacion';
import { menusConocidos } from '@/lib/shopify';
import type { Reserva } from '@/lib/tipos';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-[15px] ' +
  'focus:border-oro focus:outline-none';

/** Una fila de botones para elegir uno de varios valores. */
function Elegir<T extends string>({ valores, valor, onElegir, etiqueta }: {
  valores: readonly T[]; valor: T; onElegir: (v: T) => void; etiqueta: string;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
      {valores.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={v === valor}
          onClick={() => onElegir(v)}
          className={`boton min-h-[40px] ${v === valor
            ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
          {v}
        </button>
      ))}
    </div>
  );
}

/** Un interruptor grande, con la frase completa: se lee antes de tocarlo. */
function Interruptor({ encendido, onCambio, texto, ayuda }: {
  encendido: boolean; onCambio: (b: boolean) => void; texto: string; ayuda: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={encendido}
      onClick={() => onCambio(!encendido)}
      className={`tecla flex min-h-[56px] w-full items-center gap-3 rounded border px-3 py-2
                  text-left ${encendido ? 'border-verde-fuerte bg-verde/10' : 'border-hueso/20'}`}>
      <span aria-hidden className={`relative h-6 w-11 shrink-0 rounded-full transition
                                    ${encendido ? 'bg-verde-fuerte' : 'bg-hueso/25'}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all
                          ${encendido ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
      <span>
        <span className="block text-[15px] font-semibold">{texto}</span>
        <span className="block text-[13px] text-hueso/70">{ayuda}</span>
      </span>
    </button>
  );
}

/** El precio de cotización en su moneda, para la línea cerrada. */
function enMoneda(n: number, moneda: string): string {
  if (!n) return 'sin precio';
  return moneda === MONEDA.uf ? `${String(n).replace('.', ',')} UF` : enPesos(n);
}

export default function MenusEditor() {
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [error, setError] = useState('');
  const [sinPermiso, setSinPermiso] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  /** Qué tarjeta está abierta: la posición en la lista. Una a la vez. */
  const [abierta, setAbierta] = useState<number | null>(null);
  /**
   * Los productos que ya se vendieron o se cotizaron, normalizados. A esos
   * no se les ofrece *Quitar* sino *Desactivar* (2026-11-10). Lo decide el
   * servidor, que además rechaza quitarlos.
   */
  const [usados, setUsados] = useState<Set<string>>(new Set());
  const [verInactivos, setVerInactivos] = useState(false);
  /** Vista gerencia sin `configurar`: el catálogo se mira y no se toca. */
  const soloMira = usarSoloMira('configurar');

  useEffect(() => {
    fetch('/api/menus').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setMenus(d.menus);
        setUsados(new Set((d.usados ?? []).map((n: string) => normalizar(n))));
      })
      .catch((e) => setError(String(e)));
    fetch('/api/reservas').then((r) => r.json())
      .then((d) => d.reservas && setReservas(d.reservas))
      .catch(() => {});
  }, []);

  // Lo que se está vendiendo y no está en la lista. Es lo que permite que la
  // lista crezca sola en vez de que alguien lo descubra cuando los totales
  // del día no cuadren.
  const sinRegistrar = useMemo(() => {
    if (!menus) return [];
    // Sin la lista: así los nombres salen crudos y se puede ver cuál falta.
    return desconocidos(menusConocidos(reservas, []), menus);
  }, [menus, reservas]);

  async function guardar(lista: Menu[]) {
    setGuardando(true);
    try {
      const r = await fetch('/api/menus', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ menus: lista })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); setSinPermiso(!!d.permiso); }
      else {
        setMenus(d.menus); setError(''); setSucio(false);
        setUsados(new Set((d.usados ?? []).map((n: string) => normalizar(n))));
      }
    } finally { setGuardando(false); }
  }

  if (error) return <Aviso error={error} permiso={sinPermiso} />;
  if (!menus) return <p className="text-hueso/50">Cargando…</p>;

  const cambiar = (i: number, cambio: Partial<Menu>) => {
    setMenus(menus.map((m, k) => (k === i ? { ...m, ...cambio } : m)));
    setSucio(true);
  };

  const botonGuardar = (
    <BotonGuardar sucio={sucio} guardando={guardando} onClick={() => guardar(menus)}
      texto="Guardar cambios" />
  );

  return (
    <section>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
        Productos<Ayuda tema="menus" />
      </h1>
      <p className="mb-6 max-w-2xl text-[15px] text-hueso/70">
        Todo lo que se vende y se cotiza. <strong>El nombre de un menú tiene que
        ser exactamente el mismo acá y en Shopify</strong>: solo se perdonan
        mayúsculas, tildes y espacios de sobra.
      </p>

      {sinRegistrar.length > 0 && (
        <div className="mb-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-[15px] font-semibold text-ambar-texto">
            Hay {sinRegistrar.length === 1 ? 'un menú vendido' : 'menús vendidos'} que
            no está{sinRegistrar.length === 1 ? '' : 'n'} en esta lista.
          </p>
          <p className="mt-1 text-[14px] text-hueso/70">
            O Shopify está vendiendo algo que no está registrado acá, o alguien
            renombró un producto en la tienda. Agrégalo abajo con ese nombre
            exacto, o arregla el nombre en Shopify para que vuelvan a calzar.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinRegistrar.map((m) => (
              <code key={m} className="rounded bg-hueso/10 px-2 py-1 text-sm">{m}</code>
            ))}
          </div>
        </div>
      )}

      <MostrarDesactivados cuantos={menus.filter((m) => !m.activo).length}
        visible={verInactivos} onCambio={(v) => { setVerInactivos(v); setAbierta(null); }} />
      <ul className="space-y-2">
        {menus.map((m, i) => (!m.activo && !verInactivos) ? null : (
          <li key={i} className={`overflow-hidden rounded border ${m.activo
            ? 'border-hueso/15 bg-panel' : 'border-hueso/10 bg-transparent'}`}>
            <div className="flex items-center gap-2 pr-2">
              <button type="button" aria-expanded={abierta === i}
                onClick={() => setAbierta(abierta === i ? null : i)}
                className={`flex min-h-[52px] min-w-0 flex-1 flex-wrap items-center gap-x-3
                           gap-y-1 px-3 py-2.5 text-left hover:bg-hueso/5 ${m.activo ? '' : 'opacity-60'}`}>
                <span aria-hidden className="w-3 text-base leading-none text-hueso/50">
                  {abierta === i ? '−' : '+'}
                </span>
                <span className="text-[16px] font-semibold">
                  {m.nombre.trim() || <span className="text-hueso/50">Sin nombre</span>}
                </span>
                <span className="rounded-full border border-hueso/25 px-2 py-0.5 text-[13px]
                                 font-semibold text-hueso/70">{m.tipo}</span>
                {!m.activo && (
                  <span className="rounded-full border border-hueso/40 px-2 py-0.5 text-[13px]
                                   font-semibold text-hueso/80">desactivado</span>
                )}
                {m.sitioPublico && (
                  <span className="rounded-full border border-verde/50 px-2 py-0.5 text-[13px]
                                   font-semibold text-verde-texto">sitio y reservas</span>
                )}
                {m.bonoVendedor && (
                  <span className="rounded-full border border-oro/60 px-2 py-0.5 text-[13px]
                                   font-semibold text-oro">★ bono vendedor</span>
                )}
                {m.cotizacion && (
                  <span className="rounded-full border border-rosa/50 px-2 py-0.5 text-[13px]
                                   font-semibold text-rosa-texto">
                    se cotiza · {enMoneda(m.precioCotizacion, m.moneda)}
                  </span>
                )}
              </button>
              {/* **Un producto que ya se vendió o se cotizó no se quita: se
                  desactiva** (2026-11-10, lo pidió el cliente). Quitarlo
                  dejaría sus cotizaciones sin tipo —sus personas pasarían a
                  cero al editarlas— y sus reservas en el aviso amarillo.
                  Desactivar y activar **se guardan en el acto**, como en
                  `/equipo`: al desactivar, la línea desaparece de la lista
                  y con ella el botón de guardarla. */}
              {soloMira ? null : !usados.has(normalizar(m.nombre)) ? (
                <button onClick={() => {
                  if (m.nombre.trim() && !confirm(`¿Quitar ${m.nombre} del catálogo? `
                    + 'Nunca se vendió ni se cotizó, así que se borra.')) return;
                  setMenus(menus.filter((_, k) => k !== i)); setSucio(true); setAbierta(null);
                }} className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto">
                  Quitar
                </button>
              ) : m.activo ? (
                <button disabled={guardando} onClick={() => {
                  if (!confirm(`¿Desactivar ${m.nombre}? Deja de ofrecerse en las reservas y `
                    + 'en las cotizaciones. Lo que ya se vendió o se cotizó no cambia.'
                    + (sucio ? ' Se guardan también los otros cambios de esta pantalla.' : '')))
                    return;
                  setAbierta(null);
                  guardar(menus.map((x, k) => (k === i ? { ...x, activo: false } : x)));
                }} className="boton shrink-0">
                  Desactivar
                </button>
              ) : (
                <button disabled={guardando} onClick={() => {
                  if (sucio && !confirm('Se guardan también los otros cambios de esta pantalla.'))
                    return;
                  guardar(menus.map((x, k) => (k === i ? { ...x, activo: true } : x)));
                }} className="boton shrink-0">
                  Activar
                </button>
              )}
            </div>

            {abierta === i && (
              <fieldset disabled={soloMira}
                className="m-0 min-w-0 space-y-5 border-0 border-t border-hueso/10 p-4">
                <Campo etiqueta="Nombre" ancho="w-full sm:max-w-md">
                  <input type="text" value={m.nombre} className={ENTRADA}
                    placeholder="Si es un menú: como se llama en Shopify"
                    readOnly={usados.has(normalizar(m.nombre))}
                    onChange={(e) => cambiar(i, { nombre: e.target.value })} />
                </Campo>
                {/* Renombrar uno usado sería quitarlo: lo vendido y lo
                    cotizado guardan el nombre que tenía. */}
                {usados.has(normalizar(m.nombre)) && (
                  <p className="-mt-3 text-[13px] text-hueso/70">
                    Ya se vendió o se cotizó, así que el nombre no se cambia. Si
                    cambió de nombre, agrega uno nuevo y desactiva éste.
                  </p>
                )}

                <div>
                  <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                    Qué es
                  </p>
                  <Elegir etiqueta="Tipo de producto" valores={Object.values(TIPO_PRODUCTO)}
                    valor={m.tipo} onElegir={(v) => cambiar(i, { tipo: v })} />
                  <p className="mt-1 text-[13px] text-hueso/60">
                    Solo los de tipo Menú suman invitados. La once o el show no son gente nueva.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Interruptor encendido={m.sitioPublico}
                    onCambio={(b) => cambiar(i, { sitioPublico: b })}
                    texto="Se vende en el sitio y en las reservas"
                    ayuda="Aparece al anotar una reserva a mano. No cambia Shopify." />
                  <Interruptor encendido={m.cotizacion}
                    onCambio={(b) => cambiar(i, { cotizacion: b })}
                    texto="Se puede cotizar"
                    ayuda="Aparece al armar una cotización." />
                  {/* **El bono del vendedor** (2026-11-12): lo marcan los
                      menús más valiosos, que empujan la venta. Ver
                      `lib/vendedores.ts`. */}
                  <Interruptor encendido={m.bonoVendedor}
                    onCambio={(b) => cambiar(i, { bonoVendedor: b })}
                    texto="Suma el bono del vendedor"
                    ayuda="Sus líneas ganan los puntos de bono de la ficha de cada vendedor." />
                </div>

                {m.sitioPublico && (
                  <div className="flex flex-wrap items-end gap-3">
                    <Campo etiqueta="Reserva: pagando en línea" ancho="w-48">
                      <input type="number" min={0} step={1000} className={ENTRADA}
                        value={m.precioEnLinea || ''} placeholder="sin poner"
                        onChange={(e) => cambiar(i, { precioEnLinea: aMonto(e.target.value) })} />
                    </Campo>
                    <Campo etiqueta="Reserva: pagando en el local" ancho="w-48">
                      <input type="number" min={0} step={1000} className={ENTRADA}
                        value={m.precioEnLocal || ''} placeholder="sin poner"
                        onChange={(e) => cambiar(i, { precioEnLocal: aMonto(e.target.value) })} />
                    </Campo>
                    <span className="pb-2"><AyudaCorta tema="preciosReserva" /></span>
                  </div>
                )}

                {m.cotizacion && (
                  <div className="space-y-4 rounded border border-rosa/30 p-3">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-rosa-texto">
                      En una cotización
                    </p>
                    <div>
                      <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                        Cómo se cobra <AyudaCorta tema="cobro" />
                      </p>
                      <Elegir etiqueta="Cómo se cobra" valores={Object.values(COBRO)}
                        valor={m.cobro} onElegir={(v) => cambiar(i, { cobro: v })} />
                    </div>
                    <div className="flex flex-wrap items-end gap-4">
                      <Campo etiqueta={`Precio que propone${m.cobro === COBRO.porPersona
                        ? ' (por persona)' : ''}`} ancho="w-48">
                        <input type="text" inputMode="decimal" className={ENTRADA}
                          defaultValue={m.precioCotizacion ? String(m.precioCotizacion).replace('.', ',') : ''}
                          placeholder={m.moneda === MONEDA.uf ? 'ej. 2,61' : 'ej. 45000'}
                          onBlur={(e) => cambiar(i, { precioCotizacion: aPrecio(e.target.value) })} />
                      </Campo>
                      <div>
                        <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                          Moneda <AyudaCorta tema="moneda" />
                        </p>
                        <Elegir etiqueta="Moneda" valores={Object.values(MONEDA)}
                          valor={m.moneda} onElegir={(v) => cambiar(i, { moneda: v })} />
                      </div>
                      <div>
                        <p className="mb-2 text-[13px] font-medium uppercase tracking-wide text-hueso/60">
                          El precio <AyudaCorta tema="ivaProducto" />
                        </p>
                        <Elegir etiqueta="IVA del precio" valores={Object.values(IVA_PRECIO)}
                          valor={m.iva} onElegir={(v) => cambiar(i, { iva: v })} />
                      </div>
                    </div>
                    <p className="text-[13px] text-hueso/60">
                      Es el precio que propone: en cada cotización se puede cambiar o
                      aplicarle un descuento.
                    </p>
                  </div>
                )}

                {sucio && <div className="flex justify-end">{botonGuardar}</div>}
              </fieldset>
            )}
          </li>
        ))}
      </ul>

      {!soloMira && (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => {
            setMenus([...menus, nuevoProducto({ nombre: '' })]);
            setAbierta(menus.length);
            setSucio(true);
          }}
          className="boton min-h-[44px]">
          + Agregar producto
        </button>
        <span className="flex-1" />
        {sucio && <span className="text-[14px] text-hueso/70">Hay cambios sin guardar.</span>}
        {botonGuardar}
      </div>
      )}

      <p className="mt-6 max-w-2xl text-[14px] text-hueso/60">
        <strong>Un producto que ya se vendió o se cotizó no se quita, se
        desactiva</strong>: deja de ofrecerse y todo lo anterior lo sigue
        encontrando. Solo se quita lo que nunca se usó.{' '}
        <strong>Ojo al renombrar en Shopify:</strong> los pedidos ya hechos
        guardan el nombre que tenían, así que sus reservas van a contarse
        aparte hasta que se corrijan esas filas en la planilla.
      </p>
    </section>
  );
}

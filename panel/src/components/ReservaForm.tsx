'use client';
/**
 * Crear o editar una reserva a mano: las que llegan por teléfono, por
 * WhatsApp o en el mesón y no pasan por Shopify.
 *
 * **Pide los mismos datos que escribe Shopify, y de la misma forma.** Eso
 * no es prolijidad: un pedido de Shopify queda como
 * `2 × Menú Tradiciones + 1 × Menú Niños`, y si acá se escribiera
 * "Tradiciones" suelto, el total del día contaría dos platos distintos y la
 * cocina prepararía mal. Por eso:
 *
 * - **Un contador por menú**, como el formulario del sitio, en vez de elegir
 *   uno solo. Una familia con dos menús distintos es lo normal.
 * - **Las personas se calculan**, no se escriben. Antes eran un campo aparte
 *   que podía no calzar con el menú elegido: 5 personas y "Tradiciones".
 * - **Los nombres de menú salen de las reservas que ya hay**, o sea de lo
 *   que Shopify escribió. No hay una lista escrita a mano que se
 *   desincronice el día que la tienda renombre un producto.
 *
 * El MONTO no se pide a propósito. Los precios viven en Shopify y en el
 * sitio; que el panel los fije sería una segunda verdad que mañana no
 * coincide. Una reserva manual queda con el monto en blanco.
 */
import { useMemo, useState } from 'react';
import type { Reserva } from '@/lib/tipos';
import { TIPO_PAGO, ESTADO_PAGO } from '@/lib/columnas';
import { desglosarMenu, componerMenu, personasDeCuenta } from '@/lib/shopify';

export default function ReservaForm({
  fecha, reserva, menusConocidos, onListo, onCancelar
}: {
  fecha: string;
  reserva: Reserva | null;
  menusConocidos: string[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [f, setF] = useState({
    fecha: reserva?.fecha ?? fecha,
    nombre: reserva?.nombre ?? '',
    email: reserva?.email ?? '',
    telefono: reserva?.telefono ?? '',
    tipoPago: reserva?.tipoPago ?? TIPO_PAGO.local,
    estadoPago: reserva?.estadoPago ?? ESTADO_PAGO.pendiente
  });

  // El conteo por menú. Al editar se reconstruye desde el texto guardado,
  // así que una reserva que vino de Shopify se puede corregir acá sin
  // perder su desglose.
  const [cuenta, setCuenta] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const { menu, cantidad } of desglosarMenu(reserva?.menu)) inicial[menu] = cantidad;
    return inicial;
  });
  const [nuevoMenu, setNuevoMenu] = useState('');

  // Los que ya se vendieron, más los de esta reserva por si alguno dejó de
  // venderse y no aparecería en la lista.
  const menus = useMemo(
    () => [...new Set([...menusConocidos, ...Object.keys(cuenta)])].sort(
      (a, b) => a.localeCompare(b)),
    [menusConocidos, cuenta]
  );
  const personas = personasDeCuenta(cuenta);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value })
  });

  function sumar(menu: string, n: number) {
    setCuenta((c) => ({ ...c, [menu]: Math.max(0, (c[menu] ?? 0) + n) }));
  }

  function agregarMenu() {
    const m = nuevoMenu.trim();
    if (!m) return;
    setCuenta((c) => ({ ...c, [m]: c[m] ?? 1 }));
    setNuevoMenu('');
  }

  async function guardar() {
    setError('');
    if (!f.nombre.trim()) return setError('Falta el nombre.');
    if (personas < 1) return setError('Tiene que haber al menos una persona en algún menú.');

    setGuardando(true);
    const cuerpo = { ...f, personas, menu: componerMenu(cuenta) };
    const res = reserva
      ? await fetch(`/api/reservas/${reserva.fila}`,
          { method: 'PATCH', headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cuerpo) })
      : await fetch('/api/reservas',
          { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify(cuerpo) });
    const d = await res.json();
    setGuardando(false);
    if (d.error) setError(d.error); else onListo();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4"
         role="dialog" aria-modal="true" aria-label="Reserva">
      <div className="mx-auto mt-10 max-w-lg rounded border border-hueso/15 bg-panel p-5">
        <h2 className="text-sm font-bold uppercase tracking-widest text-oro">
          {reserva ? 'Editar reserva' : 'Agregar reserva'}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Fecha" ancho><input type="date" {...campo('fecha')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Nombre" ancho>
            <input type="text" {...campo('nombre')} className={ENTRADA} autoFocus />
          </Campo>
          <Campo etiqueta="Teléfono"><input type="text" {...campo('telefono')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Email"><input type="email" {...campo('email')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Tipo de pago">
            <select {...campo('tipoPago')} className={ENTRADA}>
              <option value={TIPO_PAGO.directo}>{TIPO_PAGO.directo}</option>
              <option value={TIPO_PAGO.local}>{TIPO_PAGO.local}</option>
            </select>
          </Campo>
          <Campo etiqueta="Estado del pago" ancho>
            <select {...campo('estadoPago')} className={ENTRADA}>
              <option value={ESTADO_PAGO.pagado}>paid — ya pagó</option>
              <option value={ESTADO_PAGO.pendiente}>pending — paga al llegar</option>
              <option value={ESTADO_PAGO.reembolsado}>refunded — se le devolvió</option>
              <option value={ESTADO_PAGO.anulado}>voided — anulada</option>
              <option value={ESTADO_PAGO.cancelado}>cancelled — cancelada</option>
            </select>
            <p className="mt-1 text-xs text-hueso/50">
              Reembolsada, anulada y cancelada liberan el cupo. Pendiente no: el cliente viene igual.
            </p>
          </Campo>
        </div>

        {/* Los menús, con un contador cada uno. Las personas salen de acá:
            no hay un campo aparte que pueda no calzar. */}
        <div className="mt-5 border-t border-hueso/10 pt-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-hueso/60">Menús</span>
            <span className="text-sm">
              <strong className="tabular-nums">{personas}</strong>
              <span className="text-hueso/50"> {personas === 1 ? 'persona' : 'personas'}</span>
            </span>
          </div>

          {menus.length === 0 && (
            <p className="mt-2 text-xs text-hueso/50">
              Todavía no hay menús vendidos de dónde sacar los nombres. Escribe
              el que corresponda abajo <strong>tal como se llama el producto en
              Shopify</strong>, para que los totales del día los cuenten juntos.
            </p>
          )}

          <div className="mt-2 space-y-2">
            {menus.map((m) => (
              <div key={m} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{m}</span>
                <button type="button" onClick={() => sumar(m, -1)}
                  aria-label={`Quitar uno de ${m}`}
                  className="h-9 w-9 rounded border border-hueso/20 text-lg leading-none
                             hover:border-oro disabled:opacity-30"
                  disabled={!(cuenta[m] > 0)}>−</button>
                <span className="w-8 text-center tabular-nums">{cuenta[m] ?? 0}</span>
                <button type="button" onClick={() => sumar(m, 1)}
                  aria-label={`Agregar uno de ${m}`}
                  className="h-9 w-9 rounded border border-hueso/20 text-lg leading-none
                             hover:border-oro">+</button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input type="text" value={nuevoMenu} placeholder="Otro menú…"
              onChange={(e) => setNuevoMenu(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); agregarMenu(); } }}
              className={ENTRADA} />
            <button type="button" onClick={agregarMenu}
              className="whitespace-nowrap rounded border border-hueso/20 px-3 text-sm
                         hover:border-oro">Agregar</button>
          </div>
          <p className="mt-2 text-xs text-hueso/50">
            Los nombres salen de lo que Shopify ya vendió, para que el total del
            día cuente junto lo que es el mismo plato.
          </p>
        </div>

        <p className="mt-3 text-xs text-hueso/50">
          El monto no se pide: los precios viven en Shopify y en el sitio.
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-red-400">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={guardar} disabled={guardando}
            className="rounded bg-oro px-4 py-2 text-sm font-semibold text-tinta disabled:opacity-50">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          <button onClick={onCancelar}
            className="rounded border border-hueso/20 px-4 py-2 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-3 py-2 text-sm ' +
  'focus:border-oro focus:outline-none';

function Campo({ etiqueta, ancho, children }: {
  etiqueta: string; ancho?: boolean; children: React.ReactNode;
}) {
  return (
    <label className={`block ${ancho ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1 block text-xs uppercase tracking-wide text-hueso/60">{etiqueta}</span>
      {children}
    </label>
  );
}

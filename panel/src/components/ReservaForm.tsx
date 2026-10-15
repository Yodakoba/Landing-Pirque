'use client';
/**
 * Crear o editar una reserva a mano: las que llegan por teléfono, por
 * WhatsApp o en el mesón y no pasan por Shopify.
 *
 * El MONTO no se pide a propósito. Los precios viven en Shopify y en el
 * sitio; que el panel los fije sería una segunda verdad que mañana no
 * coincide. Una reserva manual queda con el monto en blanco.
 */
import { useState } from 'react';
import type { Reserva } from '@/lib/tipos';
import { TIPO_PAGO, ESTADO_PAGO } from '@/lib/columnas';

const MENUS = ['Tradiciones', 'A Brasas Abiertas', 'Niños'];

export default function ReservaForm({
  fecha, reserva, onListo, onCancelar
}: {
  fecha: string;
  reserva: Reserva | null;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [f, setF] = useState({
    fecha: reserva?.fecha ?? fecha,
    nombre: reserva?.nombre ?? '',
    email: reserva?.email ?? '',
    telefono: reserva?.telefono ?? '',
    menu: reserva?.menu ?? MENUS[0],
    personas: String(reserva?.personas ?? 1),
    tipoPago: reserva?.tipoPago ?? TIPO_PAGO.local,
    estadoPago: reserva?.estadoPago ?? ESTADO_PAGO.pendiente
  });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const campo = (k: keyof typeof f) => ({
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setF({ ...f, [k]: e.target.value })
  });

  async function guardar() {
    setError('');
    if (!f.nombre.trim()) return setError('Falta el nombre.');
    if (!(Number(f.personas) > 0)) return setError('Tiene que haber al menos una persona.');

    setGuardando(true);
    const cuerpo = { ...f, personas: Number(f.personas) };
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
          <Campo etiqueta="Fecha"><input type="date" {...campo('fecha')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Personas">
            <input type="number" min={1} step={1} {...campo('personas')} className={ENTRADA} />
          </Campo>
          <Campo etiqueta="Nombre" ancho>
            <input type="text" {...campo('nombre')} className={ENTRADA} autoFocus />
          </Campo>
          <Campo etiqueta="Teléfono"><input type="text" {...campo('telefono')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Email"><input type="email" {...campo('email')} className={ENTRADA} /></Campo>
          <Campo etiqueta="Menú">
            <select {...campo('menu')} className={ENTRADA}>
              {MENUS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Campo>
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
            </select>
            <p className="mt-1 text-xs text-hueso/50">
              Reembolsada y anulada liberan el cupo. Pendiente no: el cliente viene igual.
            </p>
          </Campo>
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

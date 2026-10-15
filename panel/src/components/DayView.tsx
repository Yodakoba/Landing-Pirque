'use client';
/**
 * Las reservas de un día, con filtro por tipo de pago y exportación a CSV.
 *
 * El CSV se arma en el navegador con la misma función que prueba prueba.ts:
 * no hace falta un viaje al servidor para algo que ya está en pantalla.
 */
import { useEffect, useMemo, useState } from 'react';
import type { Reserva } from '@/lib/tipos';
import { TIPO_PAGO, ESTADO_PAGO, ASISTENCIA } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';
import { aCSV } from '@/lib/csv';
import { ocupaLugar } from '@/lib/ocupacion';
import { Aviso } from './CalendarView';
import ReservaForm from './ReservaForm';

type Filtro = 'todas' | 'online' | 'local';

export default function DayView({ fecha }: { fecha: string }) {
  const [todas, setTodas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = () =>
    fetch('/api/reservas')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setTodas(d.reservas)))
      .catch((e) => setError(String(e)));

  useEffect(() => { cargar(); }, []);

  const delDia = useMemo(
    () => (todas ?? []).filter((r) => r.fecha === fecha),
    [todas, fecha]
  );

  const visibles = useMemo(() => delDia.filter((r) => {
    if (filtro === 'local') return r.tipoPago === TIPO_PAGO.local;
    if (filtro === 'online') return r.tipoPago !== TIPO_PAGO.local;
    return true;
  }), [delDia, filtro]);

  const personas = visibles.filter(ocupaLugar)
    .reduce((s, r) => s + (Number(r.personas) || 0), 0);
  const noShows = visibles.filter((r) => r.asistencia === ASISTENCIA.noVino).length;

  function exportar() {
    const csv = aCSV(
      ['ID Orden','Nombre','Email','Teléfono','Menú','Personas','Tipo Pago',
       'Estado Pago','Monto','Asistencia'],
      visibles.map((r) => [r.id, r.nombre, r.email, r.telefono, r.menu,
                           r.personas, r.tipoPago, r.estadoPago, r.monto ?? '',
                           r.asistencia])
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `reservas-${fecha}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // Marcar quién vino. Es lo que se hace el mismo día, en el mesón, así que
  // guarda al instante: sin botón de confirmar y sin abrir un formulario.
  async function marcar(r: Reserva, asistencia: string) {
    const res = await fetch(`/api/reservas/${r.fila}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ asistencia })
    });
    const d = await res.json();
    if (d.error) alert(d.error); else cargar();
  }

  async function borrar(r: Reserva) {
    if (!confirm(`¿Borrar la reserva de ${r.nombre || r.id}? No se puede deshacer.`)) return;
    const res = await fetch(`/api/reservas/${r.fila}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.error) alert(d.error); else cargar();
  }

  if (error) return <Aviso error={error} />;
  if (!todas) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <>
      <a href="/" className="text-sm text-hueso/60 hover:text-hueso">← Calendario</a>
      <h1 className="mt-2 text-xl font-bold uppercase tracking-wide capitalize">
        {enPalabras(fecha)}
      </h1>
      <p className="text-hueso/60 text-sm">
        {visibles.length} reserva{visibles.length === 1 ? '' : 's'} · {personas} personas
        {noShows > 0 && (
          <span className="text-red-400"> · {noShows} no {noShows === 1 ? 'llegó' : 'llegaron'}</span>
        )}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(['todas','online','local'] as Filtro[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`rounded border px-3 py-1.5 text-sm ${
              filtro === f ? 'border-oro text-oro' : 'border-hueso/20 text-hueso/70'}`}>
            {f === 'todas' ? 'Todas' : f === 'online' ? 'Pagadas online' : 'Pagan en el local'}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={exportar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Exportar CSV
        </button>
        <button onClick={() => { setEditando(null); setCreando(true); }}
          className="rounded bg-oro px-3 py-1.5 text-sm font-semibold text-tinta">
          Agregar reserva
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="mt-8 text-hueso/50">No hay reservas para este filtro.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
              <tr className="border-b border-hueso/10">
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Contacto</th>
                <th className="py-2 pr-3">Menú</th>
                <th className="py-2 pr-3 text-right">Personas</th>
                <th className="py-2 pr-3">Pago</th>
                <th className="py-2 pr-3">Asistencia</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((r) => {
                // "Pago directo / pending" es la combinación imposible: significa
                // que la regla de medios de pago de Shopify no aplicó.
                const raro = r.tipoPago === TIPO_PAGO.directo &&
                             r.estadoPago === ESTADO_PAGO.pendiente;
                return (
                  <tr key={r.fila} className={`border-b border-hueso/5 ${
                        ocupaLugar(r) ? '' : 'opacity-40 line-through'}`}>
                    <td className="py-2 pr-3">
                      {r.nombre || <span className="text-hueso/40">sin nombre</span>}
                      <div className="text-xs text-hueso/40">{r.id}</div>
                    </td>
                    <td className="py-2 pr-3 text-hueso/70">
                      {r.telefono && <div>{r.telefono}</div>}
                      {r.email && <div className="text-xs">{r.email}</div>}
                      {!r.telefono && !r.email && <span className="text-hueso/40">—</span>}
                    </td>
                    <td className="py-2 pr-3">{r.menu}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.personas}</td>
                    <td className="py-2 pr-3">
                      <div>{r.tipoPago || '—'}</div>
                      <div className="text-xs text-hueso/50">{r.estadoPago || '—'}</div>
                      {raro && (
                        <div className="mt-1 text-xs font-semibold text-amber-400">
                          ⚠ pago directo sin pagar
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <select value={r.asistencia || ''}
                        onChange={(e) => marcar(r, e.target.value)}
                        className={`rounded border bg-tinta px-2 py-1 text-xs ${
                          r.asistencia === ASISTENCIA.noVino
                            ? 'border-red-500/60 text-red-400'
                            : r.asistencia === ASISTENCIA.vino
                              ? 'border-emerald-500/50 text-emerald-400'
                              : 'border-hueso/20 text-hueso/50'}`}>
                        <option value={ASISTENCIA.sinMarcar}>— sin marcar</option>
                        <option value={ASISTENCIA.vino}>Vino</option>
                        <option value={ASISTENCIA.noVino}>No llegó</option>
                      </select>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <button onClick={() => { setCreando(false); setEditando(r); }}
                        className="text-hueso/60 hover:text-oro">Editar</button>
                      <button onClick={() => borrar(r)}
                        className="ml-3 text-hueso/60 hover:text-red-400">Borrar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creando || editando) && (
        <ReservaForm
          fecha={fecha}
          reserva={editando}
          onListo={() => { setCreando(false); setEditando(null); cargar(); }}
          onCancelar={() => { setCreando(false); setEditando(null); }}
        />
      )}
    </>
  );
}

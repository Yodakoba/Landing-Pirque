'use client';
/**
 * Abrir, bloquear y cambiar el cupo de las fechas hábiles.
 *
 * Muestra los próximos fines de semana ESTÉN O NO en la hoja: así se ve de
 * inmediato cuáles faltan por abrir, en vez de que simplemente no aparezcan.
 * El horario base es sábado y domingo desde las 13:00.
 */
import { useEffect, useMemo, useState } from 'react';
import type { FechaHabil } from '@/lib/tipos';
import { proximosFinesDeSemana, hoy, enPalabras } from '@/lib/fechas';
import { Aviso } from './CalendarView';
import { ESTADO_DIA, estaCerrado } from '@/lib/columnas';

const APERTURA = '13:00';
const CAPACIDAD = 60;

export default function FechasHabilesManager() {
  const [fechas, setFechas] = useState<FechaHabil[] | null>(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState('');

  const cargar = () =>
    fetch('/api/fechas')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setFechas(d.fechas)))
      .catch((e) => setError(String(e)));

  useEffect(() => { cargar(); }, []);

  // Los próximos fines de semana, más cualquier fecha de la hoja que se salga
  // de esa ventana (un feriado abierto a mano, por ejemplo).
  const filas = useMemo(() => {
    const porFecha = new Map((fechas ?? []).map((f) => [f.fecha, f]));
    const base = proximosFinesDeSemana(hoy(), 10);
    const extra = (fechas ?? []).map((f) => f.fecha).filter((f) => !base.includes(f) && f >= hoy());
    return [...new Set([...base, ...extra])].sort().map(
      (f) => porFecha.get(f) ?? {
        fecha: f, capacidad: 0, apertura: APERTURA,
        estado: '', notas: '', fila: -1
      }
    );
  }, [fechas]);

  async function guardar(d: FechaHabil, cambios: Partial<FechaHabil>) {
    setGuardando(d.fecha);
    const res = await fetch('/api/fechas', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...d, ...cambios })
    });
    const r = await res.json();
    setGuardando('');
    if (r.error) alert(r.error); else cargar();
  }

  async function quitar(d: FechaHabil) {
    if (d.fila < 0) return;
    if (!confirm(`¿Quitar ${enPalabras(d.fecha)} de la hoja? Vuelve a quedar sin definir.`)) return;
    const res = await fetch(`/api/fechas/${d.fila}`, { method: 'DELETE' });
    const r = await res.json();
    if (r.error) alert(r.error); else cargar();
  }

  if (error) return <Aviso error={error} />;
  if (!fechas) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">Fechas hábiles</h1>
      <p className="text-hueso/60 text-sm mb-6">
        Por defecto se abre sábado y domingo desde las {APERTURA}. Las que dicen
        «sin definir» todavía no están en la hoja.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Día</th>
              <th className="py-2 pr-3 w-28">Capacidad</th>
              <th className="py-2 pr-3 w-24">Apertura</th>
              <th className="py-2 pr-3 w-32">Estado</th>
              <th className="py-2 pr-3">Notas</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {filas.map((d) => {
              const sinDefinir = d.fila < 0;
              const cerrada = estaCerrado(d.estado);
              return (
                <tr key={d.fecha} className="border-b border-hueso/5">
                  <td className="py-2 pr-3 capitalize">
                    {enPalabras(d.fecha)}
                    <div className="text-xs text-hueso/40">{d.fecha}</div>
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min={0} step={1}
                      defaultValue={sinDefinir ? CAPACIDAD : d.capacidad}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (!sinDefinir && v === d.capacidad) return;
                        guardar(d, {
                          capacidad: v,
                          estado: cerrada ? d.estado : ESTADO_DIA.abierta
                        });
                      }}
                      className={ENTRADA} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" defaultValue={d.apertura || APERTURA}
                      onBlur={(e) => e.target.value !== d.apertura &&
                        guardar(d, { apertura: e.target.value })}
                      className={ENTRADA} />
                  </td>
                  <td className="py-2 pr-3">
                    {sinDefinir ? (
                      <span className="text-hueso/40">sin definir</span>
                    ) : (
                      <span className={cerrada ? 'text-red-400' : 'text-emerald-400'}>
                        {/* Se muestra lo que dice la celda, no una etiqueta nuestra:
                            si alguien escribió algo que no reconocemos, el día sale
                            cerrado y conviene ver con qué palabra. */}
                        {d.estado || ESTADO_DIA.abierta}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" defaultValue={d.notas}
                      onBlur={(e) => e.target.value !== d.notas &&
                        guardar(d, { notas: e.target.value })}
                      placeholder="—" className={ENTRADA} />
                  </td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {guardando === d.fecha ? (
                      <span className="text-xs text-hueso/50">guardando…</span>
                    ) : (
                      <>
                        <button
                          onClick={() => guardar(d, {
                            capacidad: sinDefinir ? CAPACIDAD : d.capacidad,
                            apertura: d.apertura || APERTURA,
                            estado: cerrada ? ESTADO_DIA.abierta : ESTADO_DIA.cerrada
                          })}
                          className="text-hueso/60 hover:text-oro">
                          {sinDefinir ? 'Abrir' : cerrada ? 'Abrir' : 'Cerrar'}
                        </button>
                        {!sinDefinir && (
                          <button onClick={() => quitar(d)}
                            className="ml-3 text-hueso/60 hover:text-red-400">Quitar</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

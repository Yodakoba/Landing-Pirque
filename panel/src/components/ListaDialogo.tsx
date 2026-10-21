'use client';

/**
 * Pasar lista: quién vino, cuántas horas extra y qué ajustes.
 *
 * Es la pantalla con la que se cierra un día, y es la única del panel que
 * escribe plata que se le paga a alguien. Dos decisiones que la gobiernan:
 *
 * - **Lo que se guarda queda congelado.** El monto de la jornada viaja en el
 *   turno, no se recalcula desde la ficha del trabajador. Si en marzo se le
 *   sube el sueldo a alguien, los turnos de noviembre no pueden cambiar
 *   solos: las cuentas de meses cerrados dejarían de cuadrar.
 * - **Sin pasar lista, el turno no suma nada.** Planificar no es pagar. El
 *   panel no da por venida a una persona hasta que alguien lo diga.
 *
 * Sobre el ajuste por atraso: el panel lo registra sin problema, pero si ese
 * monto se descuenta de una liquidación formal, los descuentos al sueldo
 * tienen reglas en Chile. Conviene confirmarlo con quien lleve la
 * contabilidad antes de usarlo así.
 */
import { useMemo, useState } from 'react';
import Dialogo from './Dialogo';
import { pagoDe, VINO, esContratado, type Turno } from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function ListaDialogo({
  fecha, turnos, onListo, onCancelar
}: {
  fecha: string;
  /** Los turnos de ESTE día, ya filtrados. */
  turnos: Turno[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [lista, setLista] = useState<Omit<Turno, 'fila'>[]>(
    () => turnos.map(({ fila, ...resto }) => resto)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => lista.reduce((s, t) => s + pagoDe(t), 0), [lista]);
  const vinieron = lista.filter((t) => t.asistencia === VINO.si).length;
  const contratados = lista.filter(
    (t) => t.asistencia === VINO.si && esContratado(t.modalidad)).length;

  const cambiar = (i: number, campo: keyof Omit<Turno, 'fila'>, valor: string) => {
    const copia = lista.map((t) => ({ ...t }));
    if (campo === 'asistencia' || campo === 'motivo') {
      (copia[i] as Record<string, unknown>)[campo] = valor;
    } else {
      // El ajuste admite negativos; los demás montos no.
      const n = Number(String(valor).replace(/[^\d.-]/g, ''));
      const limpio = Number.isFinite(n) ? Math.round(n) : 0;
      (copia[i] as Record<string, unknown>)[campo] =
        campo === 'ajuste' ? limpio : Math.max(0, limpio);
    }
    setLista(copia);
  };

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, turnos: lista })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Pasar lista · ${enPalabras(fecha)}`} onCerrar={onCancelar}
             ancho="max-w-3xl">
      {lista.length === 0 ? (
        <p className="mt-4 text-sm text-hueso/60">
          No hay nadie asignado a este día. Primero planifica el equipo.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm text-hueso/60">
            Marca quién llegó. <strong>Quien no está marcado no suma</strong>:
            planificar no es pagar.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
                <tr className="border-b border-hueso/10">
                  <th className="py-2 pr-3">Quién</th>
                  <th className="w-28 py-2 pr-3">Vino</th>
                  <th className="w-24 py-2 pr-3">Jornada</th>
                  <th className="w-20 py-2 pr-3">Hs extra</th>
                  <th className="w-24 py-2 pr-3">Ajuste</th>
                  <th className="py-2 pr-3">Motivo</th>
                  <th className="w-24 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((t, i) => (
                  <tr key={t.trabajador} className="border-b border-hueso/5">
                    <td className="py-2 pr-3">
                      {t.trabajador}
                      <span className="ml-1 text-xs text-hueso/40">
                        {t.puesto || 'sin puesto'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <select value={t.asistencia} className={ENTRADA}
                        aria-label={`¿Vino ${t.trabajador}?`}
                        onChange={(e) => cambiar(i, 'asistencia', e.target.value)}>
                        <option value={VINO.sinMarcar}>—</option>
                        <option value={VINO.si}>Sí</option>
                        <option value={VINO.no}>No</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      {/* A un contratado no se le paga la jornada acá: su
                          sueldo va por otro lado. Se dice, en vez de mostrar
                          un campo vacío que parece un dato que falta. */}
                      {esContratado(t.modalidad) ? (
                        <span className="text-xs text-hueso/45">contratado</span>
                      ) : (
                        <input type="number" min={0} step={1000} className={ENTRADA}
                          value={t.pagoJornada || ''} placeholder="—"
                          onChange={(e) => cambiar(i, 'pagoJornada', e.target.value)} />
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" min={0} step={1} className={ENTRADA}
                        value={t.horasExtra || ''} placeholder="0"
                        onChange={(e) => cambiar(i, 'horasExtra', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="number" step={1000} className={ENTRADA}
                        value={t.ajuste || ''} placeholder="0"
                        onChange={(e) => cambiar(i, 'ajuste', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3">
                      <input type="text" className={ENTRADA} value={t.motivo}
                        placeholder={t.ajuste ? 'por qué' : ''}
                        onChange={(e) => cambiar(i, 'motivo', e.target.value)} />
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {t.asistencia === VINO.si
                        ? <strong>{enPesos(pagoDe(t))}</strong>
                        : <span className="text-hueso/35">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-hueso/45">
            La hora extra sale de multiplicar las horas por el valor hora de
            cada persona, que se configura en{' '}
            <a href="/equipo" className="text-oro hover:underline">Equipo</a>.
            El ajuste suma o resta suelto: ponlo en negativo para descontar, y
            escribe el motivo — dentro de un mes nadie se acuerda.
          </p>
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {lista.length > 0 && (
          <span className="text-sm">
            <span className="text-hueso/55">
              {vinieron} de {lista.length} vinieron ·{' '}
            </span>
            <strong className="tabular-nums text-oro">{enPesos(total)}</strong>
            <span className="text-hueso/55"> por turnos de este día</span>
            {contratados > 0 && (
              <span className="text-hueso/40">
                {' '}(más {contratados} contratado{contratados === 1 ? '' : 's'},
                que no se pagan por turno)
              </span>
            )}
          </span>
        )}
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando || lista.length === 0}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar lista'}
        </button>
      </div>
    </Dialogo>
  );
}

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
import { pagoDe, repartirPropina, VINO, esContratado,
         type Trabajador, type Turno, totalAjustes } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function ListaDialogo({
  fecha, turnos, trabajadores, enfocarPropina = false, onListo, onCancelar
}: {
  fecha: string;
  /** Los turnos de ESTE día, ya filtrados. */
  turnos: Turno[];
  /** Para saber quién entra en el reparto de la propina. */
  trabajadores: Trabajador[];
  /**
   * Abre con el cursor en la propina. Es para quien llegó acá desde el
   * "Agregar" del día: la propina está al final de una tabla que puede ser
   * larga, y hacerlo buscar el campo sería mandarlo a dos lugares.
   */
  enfocarPropina?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [lista, setLista] = useState<Omit<Turno, 'fila'>[]>(
    () => turnos.map(({ fila, ...resto }) => resto)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const total = useMemo(() => lista.reduce((s, t) => s + pagoDe(t), 0), [lista]);
  // El total de propina del día se recupera sumando las partes: lo que se
  // guarda es lo repartido, no el pozo. Ver repartirPropina().
  const [propina, setPropina] = useState(
    () => turnos.reduce((s, t) => s + (t.propina || 0), 0)
  );
  const participa = (nombre: string) => {
    const ficha = trabajadores.find((t) => normalizar(t.nombre) === normalizar(nombre));
    // Quien no tiene ficha participa: lo más probable es que sea alguien
    // recién agregado, y dejarlo fuera del reparto en silencio sería peor
    // que incluirlo de más y que alguien lo corrija.
    return ficha ? ficha.propina : true;
  };
  const conPropina = useMemo(
    () => repartirPropina(lista, propina, participa),
    [lista, propina, trabajadores]
  );
  const reciben = conPropina.filter((t) => t.propina > 0).length;
  const excluidos = lista.filter(
    (t) => t.asistencia === VINO.si && !participa(t.trabajador)).length;
  const vinieron = lista.filter((t) => t.asistencia === VINO.si).length;
  const contratados = lista.filter(
    (t) => t.asistencia === VINO.si && esContratado(t.modalidad)).length;

  const cambiar = (i: number, campo: keyof Omit<Turno, 'fila'>, valor: string) => {
    const copia = lista.map((t) => ({ ...t }));
    if (campo === 'asistencia') {
      (copia[i] as Record<string, unknown>)[campo] = valor;
    } else {
      // Ninguno de los montos de la fila admite negativos: el que sí los
      // admite es el ajuste, y ese tiene su propio cambiador.
      const n = Number(String(valor).replace(/[^\d.-]/g, ''));
      const limpio = Number.isFinite(n) ? Math.round(n) : 0;
      (copia[i] as Record<string, unknown>)[campo] = Math.max(0, limpio);
    }
    setLista(copia);
  };

  /** Los ajustes se editan de a uno, y el monto SÍ puede ser negativo. */
  const cambiarAjuste = (i: number, k: number, campo: 'monto' | 'motivo', valor: string) => {
    const copia = lista.map((t) => ({ ...t, ajustes: t.ajustes.map((a) => ({ ...a })) }));
    if (campo === 'motivo') copia[i].ajustes[k].motivo = valor;
    else {
      const n = Number(String(valor).replace(/[^\d.-]/g, ''));
      copia[i].ajustes[k].monto = Number.isFinite(n) ? Math.round(n) : 0;
    }
    setLista(copia);
  };

  const agregarAjuste = (i: number) => {
    const copia = lista.map((t) => ({ ...t, ajustes: t.ajustes.map((a) => ({ ...a })) }));
    copia[i].ajustes.push({ monto: 0, motivo: '' });
    setLista(copia);
  };

  const quitarAjuste = (i: number, k: number) => {
    const copia = lista.map((t) => ({ ...t, ajustes: t.ajustes.filter((_, j) => j !== k) }));
    setLista(copia);
  };

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        // Se manda lo repartido, no el pozo: el reparto se calcula acá y se
        // guarda hecho, para que cambiar después quién participa no reescriba
        // lo que ya se entregó.
        body: JSON.stringify({ fecha, turnos: conPropina })
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
                  <th className="min-w-[18rem] py-2 pr-3">Ajustes</th>
                  <th className="w-24 py-2 pr-3 text-right">Propina</th>
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
                    {/* **Varios ajustes, cada uno con su motivo.** Antes era
                        uno solo, y con uno solo había que sumar a mano el
                        extra de la hora y el adelanto, y escribir un motivo
                        que explicara los dos — o sea perder justo lo que el
                        ajuste sirve para dejar: el porqué de cada peso. */}
                    <td className="py-2 pr-3 align-top">
                      {t.ajustes.map((a, k) => (
                        <div key={k} className="mb-1 flex items-center gap-1">
                          <input type="number" step={1000}
                            className={`${ENTRADA} w-24`}
                            value={a.monto || ''} placeholder="0"
                            aria-label={`Monto del ajuste ${k + 1} de ${t.trabajador}`}
                            onChange={(e) => cambiarAjuste(i, k, 'monto', e.target.value)} />
                          <input type="text" className={ENTRADA} value={a.motivo}
                            placeholder="por qué"
                            aria-label={`Motivo del ajuste ${k + 1} de ${t.trabajador}`}
                            onChange={(e) => cambiarAjuste(i, k, 'motivo', e.target.value)} />
                          <button onClick={() => quitarAjuste(i, k)}
                            className="px-1 text-hueso/40 hover:text-red-400"
                            aria-label={`Quitar el ajuste ${k + 1} de ${t.trabajador}`}
                            title="Quitar este ajuste">✕</button>
                        </div>
                      ))}
                      <button onClick={() => agregarAjuste(i)}
                        className="text-xs text-oro hover:underline">
                        + {t.ajustes.length ? 'Otro ajuste' : 'Agregar ajuste'}
                      </button>
                      {t.ajustes.length > 1 && (
                        <span className="ml-2 text-xs tabular-nums text-hueso/45">
                          suman {enPesos(totalAjustes(t.ajustes))}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums text-hueso/70">
                      {conPropina[i]?.propina
                        ? enPesos(conPropina[i].propina)
                        : t.asistencia === VINO.si && !participa(t.trabajador)
                          ? <span className="text-xs text-hueso/35">no participa</span>
                          : <span className="text-hueso/25">—</span>}
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

          <div className="mt-4 rounded border border-hueso/15 bg-hueso/[0.03] p-3">
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-hueso/70">Propina del día</span>
              <input type="number" min={0} step={1000} value={propina || ''}
                placeholder="0" autoFocus={enfocarPropina}
                onChange={(e) => {
                  const n = Number(String(e.target.value).replace(/[^\d]/g, ''));
                  setPropina(Number.isFinite(n) ? n : 0);
                }}
                className="w-36 rounded border border-hueso/20 bg-tinta px-2 py-1
                           text-sm focus:border-oro focus:outline-none" />
              {propina > 0 && (
                <span className="text-xs text-hueso/55">
                  {reciben > 0
                    ? <>se reparte entre {reciben}{' '}
                        {reciben === 1 ? 'persona' : 'personas'}</>
                    : <span className="text-amber-300">
                        no hay nadie a quien repartirla: marca quién vino
                      </span>}
                  {excluidos > 0 && (
                    <span className="text-hueso/40">
                      {' '}· {excluidos} no {excluidos === 1 ? 'participa' : 'participan'}
                    </span>
                  )}
                </span>
              )}
            </label>
            <p className="mt-2 text-xs text-hueso/45">
              Pon el <strong>total</strong> del día y el panel lo reparte en
              partes iguales entre quienes vinieron y participan. Quién
              participa se marca en{' '}
              <a href="/equipo" className="text-oro hover:underline">Equipo</a>.
              <strong> La propina no es parte del sueldo</strong>: va en su
              propia columna y no entra en lo que cuesta el equipo, porque esa
              plata no sale del negocio.
            </p>
          </div>

          <p className="mt-3 text-xs text-hueso/45">
            La hora extra sale de multiplicar las horas por el valor hora de
            cada persona, que se configura en{' '}
            <a href="/equipo" className="text-oro hover:underline">Equipo</a>.
            El ajuste suma o resta suelto: ponlo en negativo para descontar, y
            escribe el motivo — dentro de un mes nadie se acuerda.
          </p>
          {/* La convención, dicha donde se aplica. Los dos caminos llegan al
              mismo total, pero solo uno deja escrito por qué: una jornada
              editada no se distingue de un error de tipeo, y un ajuste con
              motivo se explica solo cuando alguien revise el pago. */}
          <p className="mt-2 text-xs text-hueso/45">
            Si un día se paga distinto de lo habitual —un montaje, media
            jornada, un acuerdo aparte—, <strong>deja la jornada como está y
            pon la diferencia en el ajuste</strong>, con su motivo. El total
            es el mismo y queda dicho por qué.
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

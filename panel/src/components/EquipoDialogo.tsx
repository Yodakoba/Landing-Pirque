'use client';

/**
 * Planificar el equipo de un día.
 *
 * Está ordenado **por puesto y no por persona**, que es como se piensa al
 * armar un turno: primero cuántos garzones hacen falta, después quién los
 * hace. Cada puesto muestra lo que tiene, lo que sugiere su regla, y un
 * selector con quién queda libre.
 *
 * **Una persona ocupa un puesto, no dos.** Por eso quien ya está asignado
 * desaparece de los selectores de los demás puestos: contarla dos veces
 * haría que el panel dijera que hay dos personas donde hay una, y este es
 * justo el lugar donde se mira para saber si alcanza el equipo. Quien lo
 * garantiza de verdad es `normalizarPlan()` en el servidor, porque una
 * llamada directa a la API tiene que obedecer la misma regla.
 */
import { useMemo, useState } from 'react';
import Dialogo from './Dialogo';
import { planDelDia, type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';

export default function EquipoDialogo({
  fecha, personas, puestos, trabajadores, turnos, onListo, onCancelar
}: {
  fecha: string;
  /** Cuántos comensales tiene el día: es contra esto que se sugiere equipo. */
  personas: number;
  puestos: Puesto[];
  trabajadores: Trabajador[];
  /** Todos los turnos, de todos los días. Acá se filtra el de esta fecha. */
  turnos: Turno[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  // El plan se edita en memoria y se guarda completo. Así quitar a alguien
  // es tan posible como agregarlo, y nada se escribe hasta apretar Guardar.
  const [plan, setPlan] = useState<{ trabajador: string; puesto: string }[]>(
    () => turnos.filter((t) => t.fecha === fecha)
      .map((t) => ({ trabajador: t.trabajador, puesto: t.puesto }))
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const asignados = useMemo(
    () => new Set(plan.map((t) => normalizar(t.trabajador))), [plan]
  );
  // Solo los activos quedan disponibles: alguien dado de baja conserva sus
  // turnos pasados pero no puede recibir uno nuevo.
  const libres = useMemo(
    () => trabajadores.filter((t) => t.activo && !asignados.has(normalizar(t.nombre))),
    [trabajadores, asignados]
  );

  const lineas = useMemo(
    () => planDelDia(
      plan.map((t) => ({ ...t, fecha, fila: -1 })), puestos, fecha, personas
    ),
    [plan, puestos, fecha, personas]
  );
  const faltan = lineas.reduce((n, l) => n + l.faltan, 0);

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, turnos: plan })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Equipo · ${enPalabras(fecha)}`} onCerrar={onCancelar} ancho="max-w-3xl">
      <p className="mt-3 text-sm text-hueso/60">
        {personas > 0
          ? <>Hay <strong className="text-hueso">{personas}</strong>{' '}
              {personas === 1 ? 'persona' : 'personas'} reservada{personas === 1 ? '' : 's'}{' '}
              este día.</>
          : <>Todavía no hay nadie reservado este día.</>}
        {' '}
        {faltan > 0
          ? <span className="text-amber-300">Faltan {faltan} según las reglas de cada puesto.</span>
          : <span className="text-hueso/50">
              Las sugerencias salen de la columna <em>uno cada N personas</em> de{' '}
              <a href="/equipo" className="text-oro hover:underline">Equipo</a>.
            </span>}
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {lineas.map((l) => (
          <div key={l.puesto} className="rounded border border-hueso/15 p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">{l.puesto}</h3>
              <span className={`text-xs tabular-nums ${
                l.faltan > 0 ? 'text-amber-300' : 'text-hueso/45'}`}>
                {l.asignados.length}
                {l.sugeridos > 0 && <> / {l.sugeridos}</>}
              </span>
            </div>

            {l.asignados.length > 0 ? (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {l.asignados.map((nombre) => (
                  <li key={nombre}>
                    <button
                      onClick={() => setPlan(plan.filter(
                        (t) => normalizar(t.trabajador) !== normalizar(nombre)))}
                      className="group rounded bg-hueso/10 px-2 py-1 text-xs hover:bg-red-500/20"
                      title={`Quitar a ${nombre} de este día`}>
                      {nombre}
                      <span aria-hidden className="ml-1.5 text-hueso/50 group-hover:text-red-300">✕</span>
                      <span className="sr-only">. Quitar de este día</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-hueso/40">Nadie asignado.</p>
            )}

            {/* El selector vuelve a "" después de elegir, así se puede
                agregar a varios seguidos sin tener que cerrarlo y abrirlo. */}
            <select value="" disabled={libres.length === 0}
              aria-label={`Agregar alguien a ${l.puesto}`}
              onChange={(e) => {
                const nombre = e.target.value;
                if (!nombre) return;
                setPlan([...plan, { trabajador: nombre, puesto: l.puesto }]);
              }}
              className="mt-3 w-full rounded border border-hueso/20 bg-tinta px-2 py-1
                         text-xs focus:border-oro focus:outline-none disabled:opacity-40">
              <option value="">
                {libres.length === 0 ? 'No queda nadie libre' : '+ Agregar…'}
              </option>
              {libres.map((t) => (
                <option key={t.nombre} value={t.nombre}>
                  {t.nombre}{t.puesto ? ` · ${t.puesto}` : ''}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs text-hueso/50">
          {plan.length} {plan.length === 1 ? 'persona' : 'personas'} en el equipo de este día.
          {' '}¿Falta alguien en la lista?{' '}
          <a href="/equipo" className="text-oro hover:underline">Agrégalo en Equipo</a>.
        </span>
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar equipo'}
        </button>
      </div>
    </Dialogo>
  );
}

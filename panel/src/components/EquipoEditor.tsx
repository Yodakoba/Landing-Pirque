'use client';

/**
 * Quiénes son el equipo y qué puestos existen.
 *
 * Las dos listas viven en la planilla, así que agregar a alguien no necesita
 * un despliegue. Van en la misma pantalla porque se miran juntas: un puesto
 * sin nadie que lo haga, o alguien sin puesto habitual, se ve de una sola
 * pasada.
 *
 * **La columna "uno cada N personas" es la que hace útil al planificador.**
 * Es lo que le permite al panel contestar "¿alcanza este equipo?" en vez de
 * solo mostrar una lista. Arranca vacía a propósito: cuántos garzones por
 * comensal se atiende bien es dato del negocio, y un número inventado haría
 * que el panel diera consejos que nadie dio.
 */
import { useEffect, useState } from 'react';
import { Aviso } from './CalendarView';
import { aEntero, type Puesto, type Trabajador } from '@/lib/equipo';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function EquipoEditor() {
  const [puestos, setPuestos] = useState<Puesto[] | null>(null);
  const [gente, setGente] = useState<Trabajador[]>([]);
  const [sinFicha, setSinFicha] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);

  useEffect(() => {
    fetch('/api/equipo').then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setPuestos(d.puestos);
        setGente(d.trabajadores);
        setSinFicha(d.sinFicha ?? []);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ puestos, trabajadores: gente })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else {
        setPuestos(d.puestos);
        setGente(d.trabajadores);
        setError('');
        setSucio(false);
      }
    } finally { setGuardando(false); }
  }

  if (error) return <Aviso error={error} />;
  if (!puestos) return <p className="text-hueso/50">Cargando…</p>;

  const cambiarPuesto = (i: number, campo: keyof Puesto, valor: string) => {
    const copia = puestos.map((p) => ({ ...p }));
    if (campo === 'nombre') copia[i].nombre = valor;
    else copia[i].cadaCuantas = aEntero(valor);
    setPuestos(copia); setSucio(true);
  };
  const cambiarPersona = (i: number, campo: keyof Trabajador, valor: string | boolean) => {
    const copia = gente.map((t) => ({ ...t }));
    if (campo === 'activo') copia[i].activo = Boolean(valor);
    else copia[i][campo] = String(valor);
    setGente(copia); setSucio(true);
  };

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">Equipo</h1>
      <p className="mb-6 max-w-2xl text-sm text-hueso/60">
        Quiénes trabajan y en qué puestos. Para asignar a alguien a un día,
        anda al calendario y apreta <strong>Equipo</strong> en la tarjeta de
        ese día.
      </p>

      {sinFicha.length > 0 && (
        <div className="mb-6 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            Hay {sinFicha.length === 1 ? 'alguien asignado' : 'gente asignada'} a
            turnos que no está en esta lista.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Pasa al renombrar a una persona que ya tenía turnos: los turnos
            viejos siguen con el nombre anterior. Agrégala abajo con ese
            nombre exacto, o corrige el nombre en la pestaña{' '}
            <code>Turnos</code> de la planilla.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {sinFicha.map((n) => (
              <code key={n} className="rounded bg-hueso/10 px-2 py-1 text-sm">{n}</code>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 text-xs uppercase tracking-widest text-hueso/45">
        Trabajadores
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Nombre</th>
              <th className="w-44 py-2 pr-3">Teléfono</th>
              <th className="w-44 py-2 pr-3">Puesto habitual</th>
              <th className="w-20 py-2 pr-3">Activo</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {gente.map((t, i) => (
              <tr key={i} className="border-b border-hueso/5">
                <td className="py-2 pr-3">
                  <input type="text" value={t.nombre} className={ENTRADA}
                    placeholder="Nombre y apellido"
                    onChange={(e) => cambiarPersona(i, 'nombre', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <input type="tel" value={t.telefono} className={ENTRADA}
                    placeholder="+56 9 …"
                    onChange={(e) => cambiarPersona(i, 'telefono', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  {/* Un select y no texto libre: el puesto habitual solo
                      preselecciona en el planificador, y si está escrito de
                      otra forma no preselecciona nada. */}
                  <select value={t.puesto} className={ENTRADA}
                    onChange={(e) => cambiarPersona(i, 'puesto', e.target.value)}>
                    <option value="">—</option>
                    {puestos.map((p) => (
                      <option key={p.nombre} value={p.nombre}>{p.nombre}</option>
                    ))}
                    {/* Si tiene uno que ya no está en la lista, igual se
                        muestra: si no, guardar lo borraría sin avisar. */}
                    {t.puesto && !puestos.some((p) => p.nombre === t.puesto) && (
                      <option value={t.puesto}>{t.puesto} (ya no existe)</option>
                    )}
                  </select>
                </td>
                <td className="py-2 pr-3">
                  <input type="checkbox" checked={t.activo}
                    aria-label={`${t.nombre || 'Sin nombre'} sigue en el equipo`}
                    className="h-4 w-4 accent-oro"
                    onChange={(e) => cambiarPersona(i, 'activo', e.target.checked)} />
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <button
                    onClick={() => { setGente(gente.filter((_, k) => k !== i)); setSucio(true); }}
                    className="text-hueso/60 hover:text-red-400">Quitar</button>
                </td>
              </tr>
            ))}
            {gente.length === 0 && (
              <tr><td colSpan={5} className="py-6 text-sm text-hueso/50">
                Todavía no hay nadie. Apreta <strong>Agregar trabajador</strong>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button
        onClick={() => {
          setGente([...gente, { nombre: '', telefono: '', puesto: '', activo: true }]);
          setSucio(true);
        }}
        className="mt-4 rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
        Agregar trabajador
      </button>

      <h2 className="mb-3 mt-10 text-xs uppercase tracking-widest text-hueso/45">
        Puestos
      </h2>
      <p className="mb-4 max-w-2xl text-sm text-hueso/60">
        <strong>Uno cada N personas</strong> es cuánta gente hace falta en ese
        puesto según cuántos comensales haya. Con 10 en garzón, un día de 44
        personas sugiere 5. <strong>En blanco el panel no opina</strong>, que
        es lo correcto mientras el número no lo hayas puesto tú.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
            <tr className="border-b border-hueso/10">
              <th className="py-2 pr-3">Puesto</th>
              <th className="w-56 py-2 pr-3">Uno cada N personas</th>
              <th className="w-20 py-2" />
            </tr>
          </thead>
          <tbody>
            {puestos.map((p, i) => (
              <tr key={i} className="border-b border-hueso/5">
                <td className="py-2 pr-3">
                  <input type="text" value={p.nombre} className={ENTRADA}
                    placeholder="Garzón, cocina, barra…"
                    onChange={(e) => cambiarPuesto(i, 'nombre', e.target.value)} />
                </td>
                <td className="py-2 pr-3">
                  <input type="number" min={0} step={1} className={ENTRADA}
                    value={p.cadaCuantas || ''} placeholder="— sin regla"
                    onChange={(e) => cambiarPuesto(i, 'cadaCuantas', e.target.value)} />
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  <button
                    onClick={() => { setPuestos(puestos.filter((_, k) => k !== i)); setSucio(true); }}
                    className="text-hueso/60 hover:text-red-400">Quitar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setPuestos([...puestos, { nombre: '', cadaCuantas: 0 }]); setSucio(true); }}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          Agregar puesto
        </button>
        <span className="flex-1" />
        {sucio && <span className="text-xs text-hueso/50">Hay cambios sin guardar.</span>}
        <button onClick={guardar} disabled={guardando || !sucio}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <p className="mt-6 max-w-2xl text-xs text-hueso/50">
        <strong>Desmarcar "activo" es mejor que quitar.</strong> Quitar a
        alguien de la lista no borra sus turnos pasados —esos son el registro
        de quién trabajó qué día— pero deja esos turnos con un nombre que ya
        no está acá, y el aviso de arriba va a reclamarlo. Desmarcar "activo"
        lo saca del planificador y conserva su historia.
      </p>
    </section>
  );
}

'use client';

/**
 * Las actividades extras de un día: quién viene, qué hace y cuánto cobra.
 *
 * Es el equivalente del planificador del equipo, pero en una sola ventana:
 * acá no hay "planificar" y después "pasar lista" por separado, porque una
 * actividad extra son dos datos —vino y cuánto— y partirlos en dos pantallas
 * sería hacer caminar a alguien por gusto.
 *
 * **Lo que no tiene es propina**, y eso no es un olvido: la propina se
 * reparte entre el equipo que atiende, no entre quien vino a hacer un show.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { VINO } from '@/lib/equipo';
import { costoDeExtra, actividadesConocidas,
         type Colaborador, type Extra } from '@/lib/extras';
import { normalizar } from '@/lib/columnas';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function ExtrasDialogo({
  fecha, extras, colaboradores, esAdmin = false, onListo, onCancelar
}: {
  fecha: string;
  /** Todas las actividades, de todos los días. Acá se filtra esta fecha. */
  extras: Extra[];
  colaboradores: Colaborador[];
  /** Si puede fijar el monto habitual al crear a alguien. */
  esAdmin?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // Se edita en memoria y se guarda el día completo, igual que el equipo:
  // así quitar una actividad es tan posible como agregarla, y nada se
  // escribe hasta apretar Guardar.
  const [lista, setLista] = useState<Omit<Extra, 'fila'>[]>(
    () => extras.filter((e) => e.fecha === fecha).map(({ fila, ...resto }) => resto)
  );
  // La lista de fichas se guarda en estado y no se lee del prop: crear a
  // alguien desde acá tiene que dejarlo disponible sin cerrar la ventana.
  const [gente, setGente] = useState<Colaborador[]>(colaboradores);
  const [creando, setCreando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const puestas = new Set(lista.map((e) => normalizar(e.colaborador)));
  const libres = gente.filter((c) => c.activo && !puestas.has(normalizar(c.nombre)));
  const total = lista.reduce((s, e) => s + costoDeExtra(e), 0);
  const sinConfirmar = lista.filter((e) => !e.estado).length;

  const cambiar = (i: number, campo: keyof Omit<Extra, 'fila'>, valor: string) => {
    const copia = lista.map((e) => ({ ...e }));
    if (campo === 'monto' || campo === 'ajuste') {
      // El ajuste admite negativos; el monto no.
      const n = Number(String(valor).replace(/[^\d.-]/g, ''));
      const limpio = Number.isFinite(n) ? Math.round(n) : 0;
      (copia[i] as Record<string, unknown>)[campo] =
        campo === 'ajuste' ? limpio : Math.max(0, limpio);
    } else {
      (copia[i] as Record<string, unknown>)[campo] = valor;
    }
    setLista(copia);
  };

  const agregar = (c: Colaborador) => {
    if (puestas.has(normalizar(c.nombre))) return;
    setLista([...lista, {
      fecha, colaborador: c.nombre, actividad: c.actividad,
      estado: VINO.sinMarcar,
      // El monto se propone de la ficha y se congela al confirmar. Un
      // encargado recibe cero acá: lo completa el servidor al guardar.
      monto: c.monto ?? 0, ajuste: 0, motivo: ''
    }]);
  };

  async function guardar() {
    setGuardando(true);
    try {
      const r = await fetch('/api/extras/dia', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, extras: lista })
      });
      const d = await r.json();
      if (d.error) setError(d.error);
      else onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Actividades · ${enPalabras(fecha)}`} onCerrar={onCancelar}
             ancho="max-w-4xl">
      <p className="mt-3 text-sm text-hueso/60">
        Lo que se contrata aparte del equipo: jinetes, pintacaritas, el
        castillo inflable. <strong>Una actividad sin confirmar no suma</strong>:
        agendar no es pagar.
      </p>

      {lista.length === 0 ? (
        <p className="mt-4 text-sm text-hueso/50">
          Todavía no hay actividades este día.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          {/* Cada columna declara su ancho y la tabla no baja de su mínimo:
              si no cabe, se desplaza de lado dentro de la ventana. Con
              `table-fixed` y anchos que suman más de lo que hay, el navegador
              los achica a todos y la última columna queda cortada — que es
              justo lo que pasaba acá, con el motivo en una caja de dos letras
              y el total partido al medio. */}
          <table className="w-full min-w-[52rem] table-fixed text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
              <tr className="border-b border-hueso/10">
                <th className="w-40 py-2 pr-3">Quién</th>
                <th className="w-36 py-2 pr-3">Actividad</th>
                <th className="w-28 py-2 pr-3">Vino</th>
                <th className="w-24 py-2 pr-3">Monto</th>
                <th className="w-24 py-2 pr-3">Ajuste</th>
                <th className="py-2 pr-3">Motivo</th>
                <th className="w-24 py-2 pr-3 text-right">Total</th>
                <th className="w-10 py-2" />
              </tr>
            </thead>
            <tbody>
              {lista.map((e, i) => (
                <tr key={e.colaborador} className="border-b border-hueso/5">
                  <td className="py-2 pr-3">{e.colaborador}</td>
                  <td className="py-2 pr-3">
                    <input type="text" list="actividades-conocidas"
                      value={e.actividad} className={ENTRADA}
                      aria-label={`Qué hace ${e.colaborador}`}
                      placeholder="show ecuestre…"
                      onChange={(ev) => cambiar(i, 'actividad', ev.target.value)} />
                  </td>
                  <td className="py-2 pr-3">
                    <select value={e.estado} className={ENTRADA}
                      aria-label={`¿Vino ${e.colaborador}?`}
                      onChange={(ev) => cambiar(i, 'estado', ev.target.value)}>
                      <option value={VINO.sinMarcar}>—</option>
                      <option value={VINO.si}>Vino</option>
                      <option value={VINO.no}>No vino</option>
                    </select>
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" min={0} step={1000} className={ENTRADA}
                      value={e.monto || ''} placeholder="—"
                      aria-label={`Cuánto cobra ${e.colaborador}`}
                      onChange={(ev) => cambiar(i, 'monto', ev.target.value)} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="number" step={1000} className={ENTRADA}
                      value={e.ajuste || ''} placeholder="0"
                      aria-label={`Ajuste para ${e.colaborador}`}
                      onChange={(ev) => cambiar(i, 'ajuste', ev.target.value)} />
                  </td>
                  <td className="py-2 pr-3">
                    <input type="text" className={ENTRADA} value={e.motivo}
                      aria-label={`Motivo del ajuste de ${e.colaborador}`}
                      placeholder={e.ajuste ? 'por qué' : ''}
                      onChange={(ev) => cambiar(i, 'motivo', ev.target.value)} />
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {e.estado === VINO.si
                      ? <strong>{enPesos(costoDeExtra(e))}</strong>
                      : <span className="text-hueso/35">—</span>}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => setLista(lista.filter((_, k) => k !== i))}
                      className="px-1 text-hueso/40 hover:text-red-300"
                      title={`Quitar a ${e.colaborador} de este día`}>
                      <span aria-hidden>✕</span>
                      <span className="sr-only">Quitar a {e.colaborador}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Las actividades que alguien ya hace, para no escribirlas distinto
          cada vez. Es una ayuda, no una lista cerrada: el campo sigue
          aceptando una que no esté. */}
      <datalist id="actividades-conocidas">
        {actividadesConocidas(gente).map((a) => <option key={a} value={a} />)}
      </datalist>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select value="" disabled={libres.length === 0}
          aria-label="Agregar una actividad a este día"
          onChange={(ev) => {
            const c = gente.find((x) => x.nombre === ev.target.value);
            if (c) agregar(c);
          }}
          className="w-56 rounded border border-hueso/20 bg-tinta px-2 py-1.5
                     text-sm focus:border-oro focus:outline-none disabled:opacity-40">
          <option value="">
            {libres.length === 0 ? 'No queda nadie libre' : '+ Agregar…'}
          </option>
          {libres.map((c) => (
            <option key={c.nombre} value={c.nombre}>
              {c.nombre}{c.actividad ? ` · ${c.actividad}` : ''}
            </option>
          ))}
        </select>
        <button onClick={() => setCreando(true)}
          className="rounded border border-dashed border-hueso/20 px-3 py-1.5
                     text-sm text-hueso/60 hover:border-oro hover:text-oro">
          + Nuevo colaborador
        </button>
      </div>

      {creando && (
        <NuevoColaborador
          esAdmin={esAdmin}
          onCancelar={() => setCreando(false)}
          onCreado={(c, aviso) => {
            setGente((antes) => antes.some(
              (x) => normalizar(x.nombre) === normalizar(c.nombre)) ? antes : [...antes, c]);
            agregar(c);
            setCreando(false);
            if (aviso) setError(aviso);
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <p className="mt-4 max-w-2xl text-xs text-hueso/45">
        El monto se propone del que tiene puesto cada quien y se puede
        corregir; lo que se guarda acá es lo que se le pagó <em>ese día</em>.
        Si hay una diferencia por un acuerdo aparte,{' '}
        <strong>déjala en el ajuste con su motivo</strong>, igual que en los
        turnos: el total es el mismo y queda dicho por qué.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {lista.length > 0 && (
          <span className="text-sm">
            <strong className="tabular-nums text-oro">{enPesos(total)}</strong>
            <span className="text-hueso/55"> en actividades de este día</span>
            {sinConfirmar > 0 && (
              <span className="text-amber-300">
                {' '}· {sinConfirmar} sin confirmar
              </span>
            )}
          </span>
        )}
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <button onClick={guardar} disabled={guardando}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar actividades'}
        </button>
      </div>
    </Dialogo>
  );
}

/**
 * Crear un colaborador sin salir del día.
 *
 * Mismo criterio que `+ Nuevo trabajador` en el planificador: sin esto, la
 * lista vacía era un callejón. Lo que crea no es un caso especial — queda en
 * la lista como cualquier otro.
 */
function NuevoColaborador({
  esAdmin, onCreado, onCancelar
}: {
  esAdmin: boolean;
  onCreado: (c: Colaborador, aviso?: string) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [actividad, setActividad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const campo = 'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
                'focus:border-oro focus:outline-none';

  async function crear() {
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/extras/colaborador', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, actividad, telefono, monto })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      onCreado(d.colaborador, d.aviso);
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo="Nuevo colaborador" onCerrar={onCancelar}>
      <p className="mt-3 text-sm text-hueso/60">
        Queda en la lista de actividades extras, y asignado a este día.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Nombre</span>
          <input type="text" value={nombre} autoFocus className={`${campo} mt-1`}
            placeholder="Nombre y apellido, o la empresa"
            onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Actividad</span>
          <input type="text" value={actividad} className={`${campo} mt-1`}
            placeholder="show ecuestre, pintacaritas, castillo inflable…"
            onChange={(e) => setActividad(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">
            Teléfono <span className="normal-case text-hueso/35">(opcional)</span>
          </span>
          <input type="tel" value={telefono} className={`${campo} mt-1`}
            placeholder="+56 9 …"
            onChange={(e) => setTelefono(e.target.value)} />
        </label>
        {esAdmin && (
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-hueso/50">
              Monto habitual
            </span>
            <input type="number" min={0} step={1000} value={monto}
              className={`${campo} mt-1`} placeholder="—"
              onChange={(e) => setMonto(e.target.value)} />
          </label>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <span className="flex-1" />
        <button onClick={onCancelar}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <button onClick={crear} disabled={guardando || !nombre.trim()}
          className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta
                     disabled:opacity-40">
          {guardando ? 'Guardando…' : 'Guardar y agregar'}
        </button>
      </div>
    </Dialogo>
  );
}

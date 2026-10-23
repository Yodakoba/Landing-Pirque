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
import { planDelDia, VINO, MODALIDAD,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';
import CampoTelefono from './CampoTelefono';

export default function EquipoDialogo({
  fecha, personas, puestos, trabajadores, turnos, esAdmin = false,
  enlaceAlDia = false, onListo, onCancelar
}: {
  fecha: string;
  /** Cuántos comensales tiene el día: es contra esto que se sugiere equipo. */
  personas: number;
  puestos: Puesto[];
  trabajadores: Trabajador[];
  /** Todos los turnos, de todos los días. Acá se filtra el de esta fecha. */
  turnos: Turno[];
  /** Si puede fijar sueldos al crear a alguien. */
  esAdmin?: boolean;
  /**
   * Ofrece el enlace a la página de ese día.
   *
   * Va solo cuando esta ventana se abrió desde el calendario del equipo:
   * desde la página del día el enlace llevaría a donde ya se está. Lo que
   * resuelve es un callejón real — **un día de preparación no aparece en el
   * calendario de la portada**, así que sin esto no había cómo llegar a
   * pasarle lista, y un turno sin pasar lista no suma nada ni entra en el
   * informe.
   */
  enlaceAlDia?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // El plan se edita en memoria y se guarda completo. Así quitar a alguien
  // es tan posible como agregarlo, y nada se escribe hasta apretar Guardar.
  // Se conserva el turno entero, no solo nombre y puesto: si alguien ya pasó
  // lista, replanificar el día no puede borrarle la asistencia ni el monto.
  const [plan, setPlan] = useState<Omit<Turno, 'fila'>[]>(
    () => turnos.filter((t) => t.fecha === fecha).map(({ fila, ...resto }) => resto)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  // La lista se guarda en estado y no se lee del prop: crear a alguien desde
  // acá tiene que dejarlo disponible en TODOS los puestos de esta misma
  // ventana, sin cerrarla ni recargar.
  const [gente, setGente] = useState<Trabajador[]>(trabajadores);
  const [creandoEn, setCreandoEn] = useState<string | null>(null);

  const asignados = useMemo(
    () => new Set(plan.map((t) => normalizar(t.trabajador))), [plan]
  );
  // Solo los activos quedan disponibles: alguien dado de baja conserva sus
  // turnos pasados pero no puede recibir uno nuevo.
  const libres = useMemo(
    () => gente.filter((t) => t.activo && !asignados.has(normalizar(t.nombre))),
    [gente, asignados]
  );

  const lineas = useMemo(
    () => planDelDia(plan.map((t) => ({ ...t, fila: -1 })), puestos, fecha, personas),
    [plan, puestos, fecha, personas]
  );
  const faltan = lineas.reduce((n, l) => n + l.faltan, 0);

  const marcar = (nombre: string, asistencia: string) => setPlan(plan.map(
    (t) => (normalizar(t.trabajador) === normalizar(nombre)
      ? { ...t, asistencia } : t)
  ));

  const vinieron = plan.filter((t) => t.asistencia === VINO.si).length;
  const faltaron = plan.filter((t) => t.asistencia === VINO.no).length;

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
              <ul className="mt-2 space-y-1">
                {l.asignados.map((nombre) => {
                  const t = plan.find(
                    (x) => normalizar(x.trabajador) === normalizar(nombre));
                  return (
                    <li key={nombre} className="flex items-center gap-1.5 text-xs">
                      {/* Marcar quién llegó **acá mismo**: quien abre el día a
                          las once de la mañana es la jefa de turno, y lo que
                          tiene delante es esta ventana. Los montos siguen
                          siendo de Pasar lista — esto solo dice quién vino. */}
                      <select value={t?.asistencia ?? VINO.sinMarcar}
                        aria-label={`¿Vino ${nombre}?`}
                        onChange={(e) => marcar(nombre, e.target.value)}
                        className="rounded border border-hueso/20 bg-tinta px-1 py-0.5
                                   text-xs focus:border-oro focus:outline-none">
                        <option value={VINO.sinMarcar}>—</option>
                        <option value={VINO.si}>Vino</option>
                        <option value={VINO.no}>No vino</option>
                      </select>
                      <span className={
                        t?.asistencia === VINO.no ? 'text-hueso/35 line-through'
                        : t?.asistencia === VINO.si ? 'text-hueso' : 'text-hueso/75'}>
                        {nombre}
                      </span>
                      <span className="flex-1" />
                      <button
                        onClick={() => setPlan(plan.filter(
                          (x) => normalizar(x.trabajador) !== normalizar(nombre)))}
                        className="px-1 text-hueso/40 hover:text-red-300"
                        title={`Quitar a ${nombre} de este día`}>
                        <span aria-hidden>✕</span>
                        <span className="sr-only">Quitar a {nombre} de este día</span>
                      </button>
                    </li>
                  );
                })}
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
                const ficha = gente.find((t) => t.nombre === nombre);
                setPlan([...plan, {
                  fecha, trabajador: nombre, puesto: l.puesto,
                  asistencia: VINO.sinMarcar,
                  modalidad: ficha?.modalidad ?? MODALIDAD.porTurno,
                  // El sueldo se propone desde la ficha y se congela al pasar
                  // lista; acá todavía no se le ha pagado nada a nadie.
                  pagoJornada: ficha?.pagoJornada ?? 0,
                  horasExtra: 0, valorHora: ficha?.valorHora ?? 0,
                  ajustes: [], propina: 0
                }]);
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

            {/* Crear a alguien sin salir de acá. Es lo que destraba el caso
                en que la lista está vacía: sin esto hay que irse a /equipo,
                agregarlo, volver y empezar la planificación de nuevo. */}
            <button onClick={() => setCreandoEn(l.puesto)}
              className="mt-2 w-full rounded border border-dashed border-hueso/20
                         px-2 py-1 text-xs text-hueso/55 hover:border-oro hover:text-oro">
              + Nuevo trabajador
            </button>
          </div>
        ))}
      </div>

      {creandoEn !== null && (
        <NuevoTrabajador
          puesto={creandoEn}
          esAdmin={esAdmin}
          onCancelar={() => setCreandoEn(null)}
          onCreado={(t, aviso) => {
            // Queda en la lista como cualquier otro, y además asignado al
            // puesto desde el que se creó: es lo que la persona estaba
            // haciendo cuando se dio cuenta de que faltaba.
            setGente((antes) => antes.some(
              (x) => normalizar(x.nombre) === normalizar(t.nombre)) ? antes : [...antes, t]);
            setPlan((antes) => antes.some(
              (x) => normalizar(x.trabajador) === normalizar(t.nombre)) ? antes : [...antes, {
                fecha, trabajador: t.nombre, puesto: creandoEn,
                asistencia: VINO.sinMarcar, modalidad: t.modalidad,
                pagoJornada: t.pagoJornada, horasExtra: 0, valorHora: t.valorHora,
                ajustes: [], propina: 0
              }]);
            setCreandoEn(null);
            if (aviso) setError(aviso);
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-xs text-hueso/50">
          {plan.length} {plan.length === 1 ? 'persona' : 'personas'} en el equipo de este día.
          {(vinieron > 0 || faltaron > 0) && (
            <>
              {' '}<strong className="text-hueso/70">
                {vinieron} {vinieron === 1 ? 'vino' : 'vinieron'}
              </strong>
              {faltaron > 0 && (
                <span className="text-red-300">
                  {' '}· {faltaron} no {faltaron === 1 ? 'llegó' : 'llegaron'}
                </span>
              )}.
            </>
          )}
          {' '}¿Falta alguien en la lista?{' '}
          <a href="/equipo" className="text-oro hover:underline">Agrégalo en Equipo</a>.
          {enlaceAlDia && plan.length > 0 && (
            <>
              {' '}Para pasar lista y anotar montos,{' '}
              <a href={`/dia/${fecha}`} className="text-oro hover:underline">
                abre el día
              </a>.
            </>
          )}
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

/**
 * Crear un trabajador sin salir de la planificación.
 *
 * Pide lo mismo que la pantalla de Equipo, y lo que crea **no es un caso
 * especial**: queda en la lista como cualquier otro y desde ahí se le pone
 * link o se le edita el sueldo.
 *
 * El puesto habitual viene prellenado con el panel desde el que se abrió
 * —si estás llenando garzones, lo más probable es que el que falte sea un
 * garzón— pero se puede cambiar: el puesto de ESTE turno es el del panel, y
 * el habitual es solo lo que va a proponer la próxima vez.
 */
function NuevoTrabajador({
  puesto, esAdmin, onCreado, onCancelar
}: {
  puesto: string;
  esAdmin: boolean;
  onCreado: (t: Trabajador, aviso?: string) => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [habitual, setHabitual] = useState(puesto);
  const [modalidad, setModalidad] = useState<string>(MODALIDAD.porTurno);
  const [pagoJornada, setPagoJornada] = useState('');
  const [valorHora, setValorHora] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const campo = 'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
                'focus:border-oro focus:outline-none';

  async function crear() {
    setGuardando(true);
    setError('');
    try {
      const r = await fetch('/api/equipo/trabajador', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre, telefono, puesto: habitual, modalidad,
                               pagoJornada, valorHora })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      onCreado(d.trabajador, d.aviso);
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo="Nuevo trabajador" onCerrar={onCancelar}>
      <p className="mt-3 text-sm text-hueso/60">
        Queda en la lista del equipo, y asignado a{' '}
        <strong>{puesto}</strong> en este día.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Nombre</span>
          <input type="text" value={nombre} autoFocus className={`${campo} mt-1`}
            placeholder="Nombre y apellido"
            onChange={(e) => setNombre(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">
            Teléfono <span className="normal-case text-hueso/35">(opcional)</span>
          </span>
          <CampoTelefono valor={telefono} className={`${campo} mt-1`}
            etiqueta="Teléfono del trabajador nuevo" onCambio={setTelefono} />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wide text-hueso/50">Puesto habitual</span>
          <input type="text" value={habitual} className={`${campo} mt-1`}
            onChange={(e) => setHabitual(e.target.value)} />
        </label>
        {esAdmin && (
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-hueso/50">Cómo se le paga</span>
            <select value={modalidad} className={`${campo} mt-1`}
              onChange={(e) => setModalidad(e.target.value)}>
              <option value={MODALIDAD.porTurno}>Por turno</option>
              <option value={MODALIDAD.contratado}>Contratado (tiene sueldo)</option>
            </select>
          </label>
        )}
        {esAdmin && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-hueso/50">Jornada</span>
              <input type="number" min={0} step={1000} value={pagoJornada}
                className={`${campo} mt-1`}
                disabled={modalidad === MODALIDAD.contratado}
                placeholder={modalidad === MODALIDAD.contratado ? 'no aplica' : '—'}
                onChange={(e) => setPagoJornada(e.target.value)} />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-hueso/50">Hora extra</span>
              <input type="number" min={0} step={500} value={valorHora}
                className={`${campo} mt-1`} placeholder="—"
                onChange={(e) => setValorHora(e.target.value)} />
            </label>
          </div>
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
          {guardando ? 'Creando…' : 'Crear y asignar'}
        </button>
      </div>
    </Dialogo>
  );
}

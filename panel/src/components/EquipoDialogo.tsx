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
import { planDelDia, VINO, MODALIDAD, pagoDe, esContratado, totalAjustes,
         repartirPropina, propinaDelDia,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { faltaParaCerrar } from '@/lib/cierres';
import { enPesos } from '@/lib/ocupacion';
import type { Extra } from '@/lib/extras';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';
import { normalizar } from '@/lib/columnas';
import { enPalabras } from '@/lib/fechas';
import FichaTrabajador from './FichaTrabajador';

export default function EquipoDialogo({
  fecha, personas, puestos, trabajadores, turnos, extras = [], cerrado = false,
  esAdmin = false, enfocarPropina = false,
  onListo, onCancelar
}: {
  fecha: string;
  /** Cuántos comensales tiene el día: es contra esto que se sugiere equipo. */
  personas: number;
  puestos: Puesto[];
  trabajadores: Trabajador[];
  /** Todos los turnos, de todos los días. Acá se filtra el de esta fecha. */
  turnos: Turno[];
  /** Las actividades extras, para avisar si quedan sin confirmar. */
  extras?: Extra[];
  /** Si el día ya fue cerrado por alguien. */
  cerrado?: boolean;
  /** Si puede fijar sueldos al crear a alguien. */
  esAdmin?: boolean;
  /** Abre con el cursor en la propina, para quien viene justo a eso. */
  enfocarPropina?: boolean;
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
  // La propina del día, que se escribe UNA vez y el panel reparte. Lo que
  // se guarda es la parte de cada uno, no el pozo: ver `repartirPropina`.
  const [propina, setPropina] = useState(
    () => propinaDelDia(turnos.filter((t) => t.fecha === fecha), fecha)
  );

  // La lista se guarda en estado y no se lee del prop: crear a alguien desde
  // acá tiene que dejarlo disponible en TODOS los puestos de esta misma
  // ventana, sin cerrarla ni recargar.
  const [gente, setGente] = useState<Trabajador[]>(trabajadores);
  /**
   * La ficha abierta: `{ puesto }` para crear a alguien ahí, `{ t }` para
   * editar la de quien ya está. Una sola ventana, porque es el mismo
   * formulario — ver `FichaTrabajador`.
   */
  const [ficha, setFicha] = useState<
    null | { puesto?: string; t?: Trabajador; nombre?: string }>(null);

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

  /** Los montos de una persona. Ninguno de estos admite negativos. */
  const cambiarMonto = (i: number, campo: 'pagoJornada' | 'horasExtra', valor: string) => {
    const copia = plan.map((t) => ({ ...t }));
    const n = Number(String(valor).replace(/[^\d]/g, ''));
    copia[i][campo] = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    setPlan(copia);
  };

  /** Los ajustes sí: un descuento es justamente un número negativo. */
  const cambiarAjuste = (i: number, k: number, campo: 'monto' | 'motivo', valor: string) => {
    const copia = plan.map((t) => ({ ...t, ajustes: t.ajustes.map((a) => ({ ...a })) }));
    if (campo === 'motivo') copia[i].ajustes[k].motivo = valor;
    else {
      const n = Number(String(valor).replace(/[^\d.-]/g, ''));
      copia[i].ajustes[k].monto = Number.isFinite(n) ? Math.round(n) : 0;
    }
    setPlan(copia);
  };

  const agregarAjuste = (i: number) => {
    const copia = plan.map((t) => ({ ...t, ajustes: t.ajustes.map((a) => ({ ...a })) }));
    copia[i].ajustes.push({ monto: 0, motivo: '' });
    setPlan(copia);
  };

  const quitarAjuste = (i: number, k: number) => {
    setPlan(plan.map((t, j) => (j === i
      ? { ...t, ajustes: t.ajustes.filter((_, x) => x !== k) } : t)));
  };

  const marcar = (nombre: string, asistencia: string) => setPlan(plan.map(
    (t) => (normalizar(t.trabajador) === normalizar(nombre)
      ? { ...t, asistencia } : t)
  ));

  const vinieron = plan.filter((t) => t.asistencia === VINO.si).length;
  const faltaron = plan.filter((t) => t.asistencia === VINO.no).length;

  // Quién entra en el reparto. Quien todavía no tiene ficha participa: lo
  // más probable es que sea alguien recién agregado, y dejarlo fuera en
  // silencio sería peor que incluirlo de más y que alguien lo corrija.
  const participa = (nombre: string) => {
    const f = gente.find((x) => normalizar(x.nombre) === normalizar(nombre));
    return f ? f.propina : true;
  };
  const repartida = useMemo(
    () => repartirPropina(plan, propina, participa),
    [plan, propina, gente]
  );
  const reciben = repartida.filter((t) => t.propina > 0).length;
  const falta = faltaParaCerrar(
    plan.map((t) => ({ ...t, fila: -1 })), extras, fecha
  );
  const listo = falta.conEquipo > 0 && falta.sinMarcar === 0;

  /**
   * Guarda el día, y si se pidió lo deja cerrado.
   *
   * **Son dos peticiones y en este orden**: primero los turnos, después el
   * cierre. Si se hiciera al revés, el servidor comprobaría si falta
   * alguien por marcar mirando lo que había antes de este guardado, y
   * rechazaría cerrar un día que justo se acaba de completar.
   */
  async function guardar(cerrando = false) {
    setGuardando(true);
    try {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, turnos: repartirPropina(plan, propina, participa) })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }

      if (cerrando || cerrado) {
        const c = await fetch('/api/equipo/cierre', {
          method: 'PUT', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ fecha, cerrar: cerrando })
        });
        const dc = await c.json();
        if (dc.error) { setError(dc.error); return; }
      }
      onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardando(false); }
  }

  return (
    <Dialogo titulo={`Equipo · ${enPalabras(fecha)}`} onCerrar={onCancelar} ancho="max-w-4xl">
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
                      {/* **La ficha, desde acá.** Lo que no cambia de un día
                          a otro —teléfono, sueldo habitual, cuenta
                          bancaria— vivía solo en `/equipo`, y quien arma un
                          sábado no pasa por ahí. */}
                      <button
                        // Si no tiene ficha —pasa al renombrar a alguien que
                        // ya tenía turnos— se abre para crearla con su
                        // nombre, en vez de con el formulario en blanco.
                        onClick={() => setFicha({
                          t: gente.find(
                            (x) => normalizar(x.nombre) === normalizar(nombre)),
                          nombre
                        })}
                        className="px-1 text-[11px] text-hueso/40 hover:text-oro"
                        title={`Teléfono, pago y datos bancarios de ${nombre}`}>
                        ficha
                      </button>
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
            <button onClick={() => setFicha({ puesto: l.puesto })}
              className="mt-2 w-full rounded border border-dashed border-hueso/20
                         px-2 py-1 text-xs text-hueso/55 hover:border-oro hover:text-oro">
              + Nuevo trabajador
            </button>
          </div>
        ))}
      </div>

      {ficha && (
        <FichaTrabajador
          ficha={ficha.t} puesto={ficha.puesto ?? ''}
          nombreSugerido={ficha.nombre ?? ''} esAdmin={esAdmin}
          onCancelar={() => setFicha(null)}
          onListo={(t, aviso) => {
            setGente((antes) => antes.some(
              (x) => normalizar(x.nombre) === normalizar(t.nombre))
                ? antes.map((x) =>
                    (normalizar(x.nombre) === normalizar(t.nombre) ? t : x))
                : [...antes, t]);
            // Quien se crea desde un puesto queda además asignado ahí: es lo
            // que la persona estaba haciendo cuando se dio cuenta de que
            // faltaba. Editar una ficha no asigna a nadie.
            if (ficha.puesto !== undefined) {
              const puesto = ficha.puesto;
              setPlan((antes) => antes.some(
                (x) => normalizar(x.trabajador) === normalizar(t.nombre)) ? antes : [...antes, {
                  fecha, trabajador: t.nombre, puesto,
                  asistencia: VINO.sinMarcar, modalidad: t.modalidad,
                  pagoJornada: t.pagoJornada, horasExtra: 0, valorHora: t.valorHora,
                  ajustes: [], propina: 0
                }]);
            }
            setFicha(null);
            if (aviso) setError(aviso);
          }}
        />
      )}

      {/* **Las cuentas del día, en la misma ventana.**
          Hasta el 2026-10-23 esto vivía en "Pasar lista", una ventana aparte
          que solo se abría desde la página del día — y a un día de
          preparación no se llega por ahí. El cliente lo pidió al revés y
          tenía razón: se planifica en el calendario, con las reservas a la
          vista, y **acá se confirma todo**, sea el día que sea. Un paso
          menos y ningún callejón.

          Aparece recién cuando hay alguien asignado: antes de eso no hay
          nada que cerrar y sería una tabla vacía pidiendo atención. */}
      {plan.length > 0 && (
        <div className="mt-6 border-t border-hueso/10 pt-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-hueso/70">
            Lo que se paga este día
          </h3>
          <p className="mt-1 text-xs text-hueso/50">
            Se llena a quien <strong>vino</strong>; a quien no, el panel no le
            paga nada. Si hay una diferencia por un acuerdo aparte
            —un montaje, un atraso, un adelanto— va en un{' '}
            <strong>ajuste con su motivo</strong> y no editando la jornada:
            los dos dan el mismo total, pero solo uno deja escrito el porqué.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-hueso/50">
                <tr className="border-b border-hueso/10">
                  <th className="w-44 py-2 pr-3">Quién</th>
                  <th className="w-24 py-2 pr-3">Jornada</th>
                  <th className="w-20 py-2 pr-3">Hs extra</th>
                  <th className="min-w-[16rem] py-2 pr-3">Ajustes</th>
                  <th className="w-24 py-2 pr-3 text-right">Propina</th>
                  <th className="w-24 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((t, i) => (
                  <tr key={t.trabajador} className="border-b border-hueso/5">
                    <td className="py-2 pr-3 align-top">
                      <span className={t.asistencia === VINO.no
                        ? 'text-hueso/35 line-through' : ''}>{t.trabajador}</span>
                      <span className="block text-xs text-hueso/40">
                        {t.puesto}
                        {t.asistencia === VINO.sinMarcar && (
                          <span className="text-amber-300"> · sin marcar</span>
                        )}
                        {esContratado(t.modalidad) && <> · contratado</>}
                      </span>
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {/* A un contratado no se le paga jornada: su sueldo no
                          sale de esta caja. Se dice, en vez de mostrar un
                          campo vacío que parece un dato que falta. */}
                      {esContratado(t.modalidad) ? (
                        <span className="text-xs text-hueso/45">no aplica</span>
                      ) : (
                        <input type="number" min={0} step={1000} className={ENTRADA}
                          value={t.pagoJornada || ''} placeholder="—"
                          aria-label={`Jornada de ${t.trabajador}`}
                          onChange={(e) => cambiarMonto(i, 'pagoJornada', e.target.value)} />
                      )}
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <input type="number" min={0} step={1} className={ENTRADA}
                        value={t.horasExtra || ''} placeholder="0"
                        aria-label={`Horas extra de ${t.trabajador}`}
                        onChange={(e) => cambiarMonto(i, 'horasExtra', e.target.value)} />
                    </td>
                    <td className="py-2 pr-3 align-top">
                      {t.ajustes.map((a, k) => (
                        <div key={k} className="mb-1 flex items-center gap-1">
                          <input type="number" step={1000} className={`${ENTRADA} w-24`}
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
                    <td className="py-2 pr-3 text-right align-top tabular-nums text-hueso/70">
                      {repartida[i]?.propina
                        ? enPesos(repartida[i].propina)
                        : t.asistencia === VINO.si && !participa(t.trabajador)
                          ? <span className="text-xs text-hueso/35">no participa</span>
                          : <span className="text-hueso/25">—</span>}
                    </td>
                    <td className="py-2 text-right align-top tabular-nums">
                      {t.asistencia === VINO.si
                        ? <strong>{enPesos(pagoDe(t))}</strong>
                        : <span className="text-hueso/35">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* La propina se escribe UNA vez, como total del día, y el panel
              la reparte en partes iguales entre quienes vinieron y
              participan. Lo que se guarda es la parte de cada uno. */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded border
                          border-hueso/15 bg-hueso/[0.03] px-3 py-2">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-hueso/70">Propina del día</span>
              <input type="number" min={0} step={1000}
                className={`${ENTRADA} w-32`} value={propina || ''} placeholder="0"
                autoFocus={enfocarPropina}
                aria-label="Propina del día, en total"
                onChange={(e) => {
                  const n = Number(String(e.target.value).replace(/[^\d]/g, ''));
                  setPropina(Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0);
                }} />
            </label>
            <span className="text-xs text-hueso/50">
              {propina > 0
                ? <>se reparte entre {reciben} {reciben === 1 ? 'persona' : 'personas'},
                    en partes iguales</>
                : <>si hubo, se escribe el total y el panel la reparte</>}
            </span>
          </div>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

      {/* **El resumen arriba y las acciones en una sola línea abajo.**
          Antes compartían una fila que envolvía, así que con el resumen
          largo "Guardar" quedaba en un renglón y "Guardar y cerrar el día"
          en el siguiente. La diferencia entre anotar un cambio y declarar
          el día cerrado tiene que leerse de un vistazo, y dos renglones la
          esconden: lo que se ve es un botón, y el otro parece otra cosa. */}
      <p className="mt-6 text-xs text-hueso/50">
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
        {falta.extrasSinConfirmar > 0 && (
          <>
            {' '}
            <span className="text-amber-300">
              {falta.extrasSinConfirmar === 1
                ? 'Queda 1 actividad extra sin confirmar'
                : `Quedan ${falta.extrasSinConfirmar} actividades extras sin confirmar`}
            </span>
            {' '}—{' '}
            <a href="/extras" className="text-oro hover:underline">míralas acá</a>.
          </>
        )}
      </p>

      {/* `flex-nowrap`: los tres botones se quedan en la línea pase lo que
          pase. En un teléfono el día se recorta a "Guardar y cerrar", que
          dice lo mismo en menos espacio. */}
      <div className="mt-3 flex flex-nowrap items-center gap-2">
        <button onClick={onCancelar}
          className="whitespace-nowrap rounded border border-hueso/20 px-3 py-1.5
                     text-sm hover:border-hueso/40">
          Cancelar
        </button>
        <span className="flex-1" />
        {/* Delineado el que solo guarda, relleno el que cierra: son dos
            cosas distintas y la forma lo dice antes que el texto. */}
        <button onClick={() => guardar(false)} disabled={guardando}
          className="whitespace-nowrap rounded border border-oro/60 px-4 py-1.5
                     text-sm font-semibold text-oro disabled:opacity-40"
          title="Anota los cambios y deja el día abierto">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {/* **Cerrar es una declaración, no un cálculo.** El botón guarda y
            además deja dicho que alguien revisó este día: con su nombre y su
            hora, porque es lo que después permite preguntar. Mientras quede
            alguien sin marcar no se puede, y el botón explica por qué. */}
        {cerrado ? (
          <button onClick={() => guardar(false)} disabled={guardando}
            className="whitespace-nowrap rounded bg-oro px-4 py-1.5 text-sm
                       font-semibold text-tinta disabled:opacity-40"
            title="Vuelve a dejar el día abierto para corregirlo">
            Guardar y reabrir
          </button>
        ) : (
          <button onClick={() => guardar(true)} disabled={guardando || !listo}
            className="whitespace-nowrap rounded bg-oro px-4 py-1.5 text-sm
                       font-semibold text-tinta disabled:opacity-40"
            title={listo
              ? 'Guarda y deja el día cerrado, con tu nombre y la hora'
              : falta.conEquipo === 0
                ? 'Primero asigna a alguien'
                : `Falta marcar si ${falta.sinMarcar === 1 ? 'una persona vino' :
                    `${falta.sinMarcar} personas vinieron`} o no`}>
            Guardar y cerrar<span className="hidden sm:inline"> el día</span>
          </button>
        )}
      </div>
    </Dialogo>
  );
}


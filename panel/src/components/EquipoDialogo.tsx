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
import Asistencia from './Asistencia';
import AvisoGuardado from './AvisoGuardado';
import { usarAutoguardado } from './usarAutoguardado';

/**
 * El rótulo de un campo, **solo mientras la pantalla sea angosta**: en el
 * escritorio ese nombre ya está en el encabezado de la columna, y repetirlo
 * en cada fila sería ruido.
 *
 * Va al nivel del módulo y no dentro del componente: una función nueva en
 * cada dibujado es, para React, otro tipo de elemento, y con un `input` al
 * lado eso significa perder el foco. Ver `Campo.tsx`.
 */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-0.5 block text-[11px] uppercase tracking-wide
                     text-hueso/45 md:hidden">
      {children}
    </span>
  );
}

export default function EquipoDialogo({
  fecha, personas, puestos, trabajadores, turnos, extras = [], cerrado = false,
  conCierre = false, esAdmin = false, enfocarPropina = false,
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
  /**
   * Si desde acá se puede **cerrar el día**. Solo lo pide `/turnos`.
   *
   * **El día se cierra en un solo lugar** (2026-10-30, decidido con el
   * cliente). El botón estaba en las tres pantallas que abren esta ventana
   * —el calendario de la portada, `/turnos` y la página del día— y eso no
   * es una comodidad, es una duda: *¿lo cierro acá o allá? ¿es lo mismo?*
   * Para quien no maneja sistemas así, tres caminos al mismo paso final se
   * leen como tres pasos distintos.
   *
   * Se eligió `/turnos` porque es la pantalla que ya **pide** el cierre: al
   * entrar lista arriba los días pasados a los que les falta algo. Entrar y
   * que la pantalla te diga qué hacer es lo contrario de tener que acordarse.
   *
   * El calendario de la portada queda para lo suyo —cómo viene la ocupación
   * y quién trabaja—, y **se descartó mostrarlo ahí según el rol**: el rol
   * contesta *quién puede*, no *dónde se hace*, y acá cierran los dos roles
   * que entran. Esconderlo por rol habría dejado la misma pregunta en pie
   * para quien sí lo ve.
   *
   * El costo a asumir: desde la página del día hay que dar un salto a
   * `/turnos` para cerrar. Las dos pantallas lo dicen con un enlace.
   */
  conCierre?: boolean;
  /** Si puede fijar sueldos al crear a alguien. */
  esAdmin?: boolean;
  /** Abre con el cursor en la propina, para quien viene justo a eso. */
  enfocarPropina?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // El plan se edita en memoria y se guarda completo. Así quitar a alguien
  // es tan posible como agregarlo. Se conserva el turno entero, no solo
  // nombre y puesto: si alguien ya pasó lista, replanificar el día no puede
  // borrarle la asistencia ni el monto.
  const [plan, setPlan] = useState<Omit<Turno, 'fila'>[]>(
    () => turnos.filter((t) => t.fecha === fecha).map(({ fila, ...resto }) => resto)
  );
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);
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
   * **Lo que se escribe se guarda solo** (2026-10-30). Antes había que
   * apretar *Guardar*, al lado de *Guardar y cerrar el día*: dos botones
   * hermanos para dos cosas que no se parecen en nada —corregir un monto y
   * declarar cerrado un día—. Ver `usarAutoguardado`.
   *
   * Se manda el día entero, con la propina ya repartida, que es como esta
   * ventana trabajó siempre: el servidor borra las filas de esta fecha y
   * escribe las nuevas, sin tocar los otros días.
   */
  const guardado = usarAutoguardado(
    useMemo(() => ({ plan, propina, gente }), [plan, propina, gente]),
    async (v) => {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fecha, turnos: repartirPropina(v.plan, v.propina, participa)
        })
      });
      const d = await r.json();
      return d.error || undefined;
    }
  );

  /** Cierra la ventana, mandando antes lo que quede en el reloj. */
  async function salir() {
    await guardado.forzar();
    if (guardado.hubo.current) onListo(); else onCancelar();
  }

  /**
   * Cerrar o reabrir el día.
   *
   * **Se guarda primero y se cierra después, en ese orden**: si fuera al
   * revés, el servidor comprobaría si falta alguien por marcar mirando lo
   * que había antes del último cambio, y rechazaría cerrar un día que
   * justo se acaba de completar.
   *
   * **Y pregunta antes**, que es lo que el cliente pidió para las acciones
   * que no se corrigen solas: sin el botón de guardar al lado, esta es la
   * única de la ventana que declara algo.
   */
  async function cambiarCierre(cerrar: boolean) {
    const pregunta = cerrar
      ? `¿Cerrar el ${enPalabras(fecha)}? Queda anotado que lo cerraste tú, `
        + 'con la hora. Se puede reabrir después.'
      : `¿Reabrir el ${enPalabras(fecha)} para corregirlo?`;
    if (!confirm(pregunta)) return;

    setCerrando(true);
    setError('');
    try {
      await guardado.forzar();
      const c = await fetch('/api/equipo/cierre', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, cerrar })
      });
      const dc = await c.json();
      if (dc.error) { setError(dc.error); return; }
      onListo();
    } catch (e) {
      setError(String(e));
    } finally { setCerrando(false); }
  }

  return (
    <Dialogo titulo={`Equipo · ${enPalabras(fecha)}`} onCerrar={() => void salir()} ancho="max-w-4xl">
      <p className="mt-3 text-sm text-hueso/60">
        {personas > 0
          ? <>Hay <strong className="text-hueso">{personas}</strong>{' '}
              {personas === 1 ? 'persona' : 'personas'} reservada{personas === 1 ? '' : 's'}{' '}
              este día.</>
          : <>Todavía no hay nadie reservado este día.</>}
        {' '}
        {faltan > 0
          ? <span className="text-ambar-texto">Faltan {faltan} según las reglas de cada puesto.</span>
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
                l.faltan > 0 ? 'text-ambar-texto' : 'text-hueso/45'}`}>
                {l.asignados.length}
                {l.sugeridos > 0 && <> / {l.sugeridos}</>}
              </span>
            </div>

            {l.asignados.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {l.asignados.map((nombre) => {
                  const t = plan.find(
                    (x) => normalizar(x.trabajador) === normalizar(nombre));
                  return (
                    <li key={nombre}
                      className={`flex flex-wrap items-center gap-2 rounded border
                                  px-2 py-1.5 text-xs ${
                        t?.asistencia === VINO.si ? 'border-verde/25 bg-verde/5'
                        : t?.asistencia === VINO.no ? 'border-rojo/25 bg-rojo/5'
                        : 'border-hueso/10 bg-panel'}`}>
                      <span className={`text-sm ${
                        t?.asistencia === VINO.no ? 'text-hueso/35 line-through'
                        : t?.asistencia === VINO.si ? 'text-hueso' : 'text-hueso/75'}`}>
                        {nombre}
                      </span>
                      {/* Mientras nadie diga si llegó, el turno no suma nada:
                          por eso se dice con todas sus letras y no con un
                          guion, que no pide nada. */}
                      {!t?.asistencia && (
                        <span className="text-[10px] uppercase tracking-wide text-ambar-texto/70">
                          sin marcar
                        </span>
                      )}
                      <span className="flex-1" />
                      {/* Marcar quién llegó **acá mismo**: quien abre el día a
                          las once de la mañana es la jefa de turno, y lo que
                          tiene delante es esta ventana. */}
                      <Asistencia quien={nombre} valor={t?.asistencia ?? VINO.sinMarcar}
                        onCambio={(v) => marcar(nombre, v)} />
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
                        className="rounded px-3 py-2.5 text-xs text-hueso/45
                                   hover:bg-hueso/5 hover:text-oro"
                        title={`Teléfono, pago y datos bancarios de ${nombre}`}>
                        Ficha
                      </button>
                      {/* **Dice lo que hace y pregunta antes.** Era una ✕ de
                          diez píxeles que borraba sin avisar: el único botón
                          de esta ventana que deshace algo, y el más fácil de
                          apretar sin querer con el dedo. */}
                      <button
                        onClick={() => {
                          if (!confirm(`¿Sacar a ${nombre} de este día?\n\n`
                                     + 'Se va de la planificación de esta fecha. '
                                     + 'Su ficha y sus otros días no se tocan.')) return;
                          setPlan(plan.filter(
                            (x) => normalizar(x.trabajador) !== normalizar(nombre)));
                        }}
                        className="rounded px-3 py-2.5 text-xs text-hueso/45
                                   hover:bg-rojo/10 hover:text-rojo-texto"
                        title={`Sacar a ${nombre} de este día`}>
                        Sacar
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

          {/* **Una tarjeta por persona en el teléfono, una fila en el
              escritorio.** Eran seis columnas dentro de una tabla que se
              desplazaba de lado: en un teléfono se veían dos, y las dos sin
              su encabezado, porque el encabezado se había ido para la
              izquierda. O sea que para saber si esa caja era la jornada o
              las horas extra había que acordarse — justo acá, donde lo que
              se escribe es lo que se le paga a alguien.

              El encabezado se muestra solo donde cabe entero (`md:`), y
              abajo cada campo lleva su rótulo encima mientras la pantalla
              sea angosta. Es el mismo criterio que las fichas de `/equipo`:
              con tarjetas, una fila de encabezados allá arriba obligaría a
              contar columnas. */}
          <div className="mt-3">
            <div className="hidden border-b border-hueso/10 pb-2 text-xs uppercase
                            tracking-wide text-hueso/50
                            md:grid md:grid-cols-[11rem_6rem_5rem_1fr_6rem_6rem] md:gap-x-3">
              <span>Quién</span>
              <span>Jornada</span>
              <span>Hs extra</span>
              <span>Ajustes</span>
              <span className="text-right">Propina</span>
              <span className="text-right">Total</span>
            </div>

            <div className="space-y-3 md:space-y-0">
              {plan.map((t, i) => (
                <div key={t.trabajador}
                  className="rounded border border-hueso/15 p-3 text-sm
                             md:grid md:grid-cols-[11rem_6rem_5rem_1fr_6rem_6rem]
                             md:items-start md:gap-x-3 md:rounded-none md:border-0
                             md:border-b md:border-hueso/5 md:p-0 md:py-2">
                  <div>
                    <span className={t.asistencia === VINO.no
                      ? 'text-hueso/35 line-through' : ''}>{t.trabajador}</span>
                    <span className="block text-xs text-hueso/40">
                      {t.puesto}
                      {t.asistencia === VINO.sinMarcar && (
                        <span className="text-ambar-texto"> · sin marcar</span>
                      )}
                      {esContratado(t.modalidad) && <> · contratado</>}
                    </span>
                  </div>

                  <div className="mt-2 md:mt-0">
                    <Rotulo>Jornada</Rotulo>
                    {/* A un contratado no se le paga jornada: su sueldo no
                        sale de esta caja. Se dice, en vez de mostrar un campo
                        vacío que parece un dato que falta. */}
                    {esContratado(t.modalidad) ? (
                      <span className="text-xs text-hueso/45">no aplica</span>
                    ) : (
                      <input type="number" min={0} step={1000} className={ENTRADA}
                        value={t.pagoJornada || ''} placeholder="—"
                        aria-label={`Jornada de ${t.trabajador}`}
                        onChange={(e) => cambiarMonto(i, 'pagoJornada', e.target.value)} />
                    )}
                  </div>

                  <div className="mt-2 md:mt-0">
                    <Rotulo>Horas extra</Rotulo>
                    <input type="number" min={0} step={1} className={ENTRADA}
                      value={t.horasExtra || ''} placeholder="0"
                      aria-label={`Horas extra de ${t.trabajador}`}
                      onChange={(e) => cambiarMonto(i, 'horasExtra', e.target.value)} />
                  </div>

                  <div className="mt-2 md:mt-0">
                    <Rotulo>Ajustes</Rotulo>
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
                          className="px-2 py-1.5 text-hueso/40 hover:text-rojo-texto"
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
                  </div>

                  <div className="mt-2 flex items-baseline justify-between
                                  tabular-nums text-hueso/70 md:mt-0 md:block md:text-right">
                    <Rotulo>Propina</Rotulo>
                    <span>
                      {repartida[i]?.propina
                        ? enPesos(repartida[i].propina)
                        : t.asistencia === VINO.si && !participa(t.trabajador)
                          ? <span className="text-xs text-hueso/35">no participa</span>
                          : <span className="text-hueso/25">—</span>}
                    </span>
                  </div>

                  <div className="mt-1 flex items-baseline justify-between
                                  tabular-nums md:mt-0 md:block md:text-right">
                    <Rotulo>Total</Rotulo>
                    <span>
                      {t.asistencia === VINO.si
                        ? <strong>{enPesos(pagoDe(t))}</strong>
                        : <span className="text-hueso/35">—</span>}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* La propina se escribe UNA vez, como total del día, y el panel
              la reparte en partes iguales entre quienes vinieron y
              participan. Lo que se guarda es la parte de cada uno. */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded border
                          border-hueso/15 bg-panel px-3 py-2">
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

      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

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
              <span className="text-rojo-texto">
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
            <span className="text-ambar-texto">
              {falta.extrasSinConfirmar === 1
                ? 'Queda 1 actividad extra sin confirmar'
                : `Quedan ${falta.extrasSinConfirmar} actividades extras sin confirmar`}
            </span>
            {' '}—{' '}
            <a href="/extras" className="text-oro hover:underline">míralas acá</a>.
          </>
        )}
      </p>

      {/* **Por qué no se puede cerrar, en pantalla.** El motivo vivía en el
          `title` del botón apagado, o sea en un globito que aparece al pasar
          el mouse: en un teléfono eso no existe, y lo que queda es un botón
          muerto sin explicación. */}
      {conCierre && !cerrado && !listo && (
        <p className="mt-3 rounded border border-ambar/40 bg-ambar/5
                      px-3 py-2 text-sm text-ambar-texto/90">
          {falta.conEquipo === 0
            ? <>Para cerrar el día, primero <strong>asigna a alguien</strong>.</>
            : <>Para cerrar el día falta marcar si{' '}
                <strong>{falta.sinMarcar === 1 ? 'una persona vino'
                       : `${falta.sinMarcar} personas vinieron`}</strong> o no.
                {' '}Son los botones <em>Vino</em> y <em>No vino</em> de arriba.</>}
        </p>
      )}

      {/* Sin botón de guardar hay que decirlo una vez, o quien lo busca
          creería que lo escrito se pierde al cerrar. Y sin el botón de
          cerrar hay que decir dónde está, o parecería que el día no se
          puede cerrar en ninguna parte. */}
      {plan.length > 0 && (
        <p className="mt-2 text-xs text-hueso/45">
          Lo que escribas acá <strong>se guarda solo</strong>.
          {!conCierre && <> <strong>El día se cierra en{' '}
            <a href="/turnos" className="text-oro hover:underline">Turnos</a></strong>,
            que es donde el panel va mostrando los días que quedaron pendientes.</>}
        </p>
      )}

      {/* **Abajo queda una sola acción, y es la que declara algo.** Lo
          escrito ya está guardado —la línea de la izquierda lo dice—, así
          que *Listo* solo cierra la ventana y *Cerrar el día* pregunta
          antes. Dos botones hermanos, uno de ellos irreversible, eran justo
          lo que confundía.

          `flex-nowrap`: se quedan en la línea pase lo que pase. En un
          teléfono el día se recorta a "Cerrar", que dice lo mismo en menos
          espacio. */}
      <div className="mt-3 flex flex-nowrap items-center gap-2">
        <AvisoGuardado estado={guardado.estado} error={guardado.error}
          onReintentar={() => void guardado.reintentar()} />
        <span className="flex-1" />
        <button onClick={() => void salir()}
          className="whitespace-nowrap rounded border border-hueso/20 px-4 py-1.5
                     text-sm hover:border-hueso/40">
          Listo
        </button>
        {/* **Cerrar es una declaración, no un cálculo.** Deja dicho que
            alguien revisó este día: con su nombre y su hora, porque es lo
            que después permite preguntar. Mientras quede alguien sin marcar
            no se puede, y arriba dice por qué.

            **No aparece en el calendario de la portada**: ver `conCierre`. */}
        {!conCierre ? null : cerrado ? (
          <button onClick={() => void cambiarCierre(false)} disabled={cerrando}
            className="whitespace-nowrap rounded bg-oro px-4 py-1.5 text-sm
                       font-semibold text-tinta disabled:opacity-40"
            title="Vuelve a dejar el día abierto para corregirlo">
            Reabrir<span className="hidden sm:inline"> el día</span>
          </button>
        ) : (
          <button onClick={() => void cambiarCierre(true)}
            disabled={cerrando || !listo}
            className="whitespace-nowrap rounded bg-oro px-4 py-1.5 text-sm
                       font-semibold text-tinta disabled:opacity-40"
            title={listo
              ? 'Deja el día cerrado, con tu nombre y la hora'
              : falta.conEquipo === 0
                ? 'Primero asigna a alguien'
                : `Falta marcar si ${falta.sinMarcar === 1 ? 'una persona vino' :
                    `${falta.sinMarcar} personas vinieron`} o no`}>
            {cerrando ? 'Cerrando…' : <>Cerrar<span className="hidden sm:inline"> el día</span></>}
          </button>
        )}
      </div>
    </Dialogo>
  );
}


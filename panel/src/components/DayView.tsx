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
import { menusDe, menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, type Menu } from '@/lib/menus';
import { enPalabras } from '@/lib/fechas';
import { aCSV } from '@/lib/csv';
import { ocupaLugar, enPesos } from '@/lib/ocupacion';
import { Aviso } from './CalendarView';
import ReservaForm from './ReservaForm';
import EquipoDialogo from './EquipoDialogo';
import ExtrasDialogo from './ExtrasDialogo';
import { estaCerrado, type Cierre } from '@/lib/cierres';
import { planDelDia, costoDelDia, propinaDelDia, pagoDe, VINO,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { extrasDelDia, costoExtrasDelDia, costoDeExtra,
         type Colaborador, type Extra } from '@/lib/extras';

type Filtro = 'todas' | 'online' | 'local';

export default function DayView({ fecha }: { fecha: string }) {
  const [todas, setTodas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [creando, setCreando] = useState(false);
  // El catalogo de menus. Distinto de `menus`, que mas abajo son los
  // totales por plato de este dia.
  const [catalogo, setCatalogo] = useState<Menu[]>(POR_DEFECTO_MENUS);
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[];
    cierres: Cierre[]; esAdmin: boolean;
  } | null>(null);
  // **Ya no hay "Pasar lista".** Los dos caminos —planificar y anotar la
  // propina— abren la MISMA ventana, que es la del día completo; lo único
  // que cambia es dónde queda el cursor al abrirla.
  const [planificando, setPlanificando] = useState<'no' | 'equipo' | 'propina'>('no');
  // Las actividades extras de este día. Viven en su propia página, con su
  // propio calendario, pero también acá: a cerrar un día se llega por esta
  // pantalla, y la pregunta "¿cuánto costó este sábado?" no se contesta sin
  // el jinete.
  const [extras, setExtras] = useState<{
    colaboradores: Colaborador[]; extras: Extra[]; esAdmin: boolean;
  } | null>(null);
  const [agendando, setAgendando] = useState(false);

  const cargar = () =>
    fetch('/api/reservas')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setTodas(d.reservas);
        if (d.menus) setCatalogo(d.menus);
      })
      .catch((e) => setError(String(e)));

  // Aparte de las reservas: si la planilla todavía no tiene las pestañas del
  // equipo, esta página sigue mostrando quiénes vienen, que es para lo que
  // se abre.
  const cargarEquipo = () =>
    fetch('/api/equipo')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setEquipo({
          puestos: d.puestos ?? [], trabajadores: d.trabajadores ?? [],
          turnos: d.turnos ?? [], cierres: d.cierres ?? [], esAdmin: !!d.esAdmin
        });
      })
      .catch(() => {});

  // Igual que el equipo: si falla o la planilla todavía no tiene la pestaña,
  // la página se dibuja sin este bloque en vez de no dibujarse.
  const cargarExtras = () =>
    fetch('/api/extras')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setExtras({
          colaboradores: d.colaboradores ?? [], extras: d.extras ?? [],
          esAdmin: !!d.esAdmin
        });
      })
      .catch(() => {});

  useEffect(() => { cargar(); cargarEquipo(); cargarExtras(); }, []);

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

  // Lo que mira la cocina: cuántos de cada menú hay que preparar ese día.
  // Solo de las reservas que ocupan lugar: una cancelada no se cocina.
  const menus = useMemo(
    () => menusDe(visibles.filter(ocupaLugar), catalogo),
    [visibles, catalogo]
  );

  // Los nombres de menú que ofrece el formulario manual. Salen de TODAS las
  // reservas, no solo las de este día: un menú vendido otro fin de semana
  // sigue siendo un nombre válido.
  const conocidos = useMemo(
    // La lista canonica primero, y despues lo que aparezca en las reservas
    // y no este en ella: un menu que Shopify empezo a vender ayer tiene que
    // poder anotarse a mano sin esperar a que alguien lo agregue.
    () => [...new Set([
      ...catalogo.map((m) => m.nombre),
      ...menusConocidos(todas ?? [], catalogo)
    ])].sort((a, b) => a.localeCompare(b)),
    [todas, catalogo]
  );

  // **Contra el día completo, no contra el filtro.** `personas` cuenta solo
  // las reservas visibles, así que mirar "pagan en el local" habría cambiado
  // cuánto equipo sugiere el panel. Para cocinar y atender viene toda la
  // gente del día, no la que calza con el filtro de la pantalla.
  const personasDelDia = useMemo(
    () => delDia.filter(ocupaLugar).reduce((s, r) => s + (Number(r.personas) || 0), 0),
    [delDia]
  );
  // OJO: los hooks van todos acá arriba, antes de los `return` de error y de
  // "Cargando…". Un useMemo debajo de esos returns se salta en la primera
  // pasada y corre en la segunda, y React tumba la página entera con el
  // error #310 — que es exactamente lo que pasó con estos dos.
  const plan = useMemo(
    () => (equipo ? planDelDia(equipo.turnos, equipo.puestos, fecha, personasDelDia) : []),
    [equipo, fecha, personasDelDia]
  );

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

  // Solo los puestos con alguien: acá lo que importa es quién viene a
  // trabajar, y los puestos vacíos se ven en el planificador.
  const conGente = plan.filter((l) => l.asignados.length > 0);
  const faltan = plan.reduce((n, l) => n + l.faltan, 0);
  const turnosDelDia = (equipo?.turnos ?? []).filter((t) => t.fecha === fecha);
  const vinieron = turnosDelDia.filter((t) => t.asistencia === VINO.si).length;
  const faltaron = turnosDelDia.filter((t) => t.asistencia === VINO.no).length;
  const costo = costoDelDia(turnosDelDia, fecha);
  const propina = propinaDelDia(turnosDelDia, fecha);
  const reciben = turnosDelDia.filter((t) => t.propina > 0).length;
  const sinMarcar = turnosDelDia.filter((t) => !t.asistencia).length;
  const extrasHoy = extrasDelDia(extras?.extras ?? [], fecha);
  const costoExtras = costoExtrasDelDia(extras?.extras ?? [], fecha);
  const extrasSinConfirmar = extrasHoy.filter((e) => !e.estado).length;

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

      {/* Lo que hay que preparar. Va arriba y grande porque es el dato por el
          que se abre esta página el sábado en la mañana. */}
      {menus.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {menus.map(({ menu, cantidad }) => (
            <span key={menu}
              className="rounded border border-hueso/15 bg-hueso/5 px-3 py-1.5 text-sm">
              <strong className="text-oro tabular-nums">{cantidad}</strong>
              <span className="text-hueso/70"> × </span>
              {menu}
            </span>
          ))}
        </div>
      )}

      {/* **Acá iba "$X por cobrar en el local", y se sacó el 2026-10-23**,
          igual que de la tarjeta del calendario y por el mismo motivo: en
          el local se paga otra cosa —una bebida más, un postre—, así que
          esa suma nunca iba a ser lo que hay que cobrar. Un total que no es
          el total no sirve para cuadrar la caja; lo que sí sirve es el monto
          de cada reserva, que sigue estando en su fila de la tabla.

          `faltaCobrar()` y los campos `porCobrar`/`sinMonto` de la ocupación
          siguen existiendo, con sus pruebas: lo que se sacó es mostrarlos
          sumados. */}

      {/* El equipo de este día. Va junto a lo que hay que preparar porque es
          la otra mitad de la misma pregunta: para esta gente, con quién. */}
      <div className="mt-3 rounded border border-hueso/15 bg-hueso/[0.03] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs uppercase tracking-widest text-hueso/45">Equipo</span>
          {conGente.length === 0 ? (
            <span className="text-sm text-hueso/55">Nadie asignado todavía.</span>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {conGente.map((l) => (
                <li key={l.puesto}>
                  <span className="text-hueso/50">{l.puesto}:</span>{' '}
                  {l.asignados.map((nombre, k) => {
                    const t = turnosDelDia.find((x) => x.trabajador === nombre);
                    return (
                      <span key={nombre}
                        className={t?.asistencia === VINO.no
                          ? 'text-hueso/35 line-through'
                          : t?.asistencia === VINO.si ? 'text-hueso' : 'text-hueso/85'}
                        title={t?.asistencia === VINO.si
                          ? `Vino · ${enPesos(pagoDe(t))}`
                          : t?.asistencia === VINO.no ? 'No llegó' : 'Sin marcar'}>
                        {nombre}{k < l.asignados.length - 1 ? ', ' : ''}
                      </span>
                    );
                  })}
                </li>
              ))}
            </ul>
          )}
          <span className="flex-1" />
          {faltan > 0 && (
            <span className="text-xs text-amber-300">Faltan {faltan}</span>
          )}
          <button onClick={() => setPlanificando('equipo')} disabled={!equipo}
            className="text-sm text-oro hover:underline disabled:opacity-40">
            {turnosDelDia.length > 0 ? 'Equipo y cuentas del día' : 'Planificar equipo'}
          </button>
        </div>

        {/* Lo que costó el día. Aparece solo cuando se pasó lista por alguien:
            antes de eso el total sería cero y se leería como "no se pagó
            nada", que es otra cosa que "todavía no se sabe". */}
        {turnosDelDia.length > 0 && sinMarcar < turnosDelDia.length && (
          <p className="mt-2 border-t border-hueso/10 pt-2 text-xs">
            <strong className="tabular-nums text-oro">{enPesos(costo)}</strong>
            <span className="text-hueso/55"> en el equipo de este día · </span>
            <span className="text-hueso/55">{vinieron} vinieron</span>
            {faltaron > 0 && (
              <span className="text-red-300">
                {' '}· {faltaron} {faltaron === 1 ? 'no llegó' : 'no llegaron'}
              </span>
            )}
            {sinMarcar > 0 && (
              <span className="text-amber-300"> · {sinMarcar} sin marcar</span>
            )}
          </p>
        )}

        {/* La propina, a la vista desde que hay alguien asignado y no solo
            cuando ya se pasó lista: es el dato que se olvida, y a este día se
            llega tanto para cerrar el turno como para anotarla sola. Va
            aparte del costo, no sumada: esa plata no sale del negocio, pasa
            por él. */}
        {turnosDelDia.length > 0 && (
          <p className="mt-2 border-t border-hueso/10 pt-2 text-xs">
            <span className="text-hueso/55">Propina del día: </span>
            {propina > 0 ? (
              <>
                <strong className="tabular-nums text-hueso/85">{enPesos(propina)}</strong>
                <span className="text-hueso/55">
                  , repartidos entre {reciben}{' '}
                  {reciben === 1 ? 'persona' : 'personas'}
                </span>
              </>
            ) : (
              <span className="text-hueso/45">sin anotar</span>
            )}
            <span className="text-hueso/30"> · </span>
            <button onClick={() => setPlanificando('propina')}
              className="text-oro hover:underline">
              {propina > 0 ? 'Editar' : 'Agregar'}
            </button>
          </p>
        )}
      </div>

      {/* Las actividades extras de este día: el jinete, la pintacaritas, el
          castillo. Bloque aparte del equipo y no una fila más adentro, por lo
          mismo que son una página aparte: no cobran jornada, no se les pasa
          lista con horas extra y no entran en el reparto de la propina.
          Juntarlas con el equipo acá obligaría a explicar en cada línea cuál
          de las dos cosas es.

          Está igual en la página del día porque es donde se cierra un día, y
          "¿cuánto costó este sábado?" no se contesta sin ellas. */}
      <div className="mt-3 rounded border border-hueso/15 bg-hueso/[0.03] px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs uppercase tracking-widest text-hueso/45">
            Actividades extras
          </span>
          {extrasHoy.length === 0 ? (
            <span className="text-sm text-hueso/55">Ninguna este día.</span>
          ) : (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {extrasHoy.map((e) => (
                <li key={e.colaborador}>
                  <span className={e.estado === VINO.no
                    ? 'text-hueso/35 line-through'
                    : e.estado === VINO.si ? 'text-hueso' : 'text-hueso/85'}
                    title={e.estado === VINO.si
                      ? `Vino · ${enPesos(costoDeExtra(e))}`
                      : e.estado === VINO.no ? 'No llegó' : 'Sin confirmar'}>
                    {e.colaborador}
                  </span>
                  {e.actividad && (
                    <span className="text-hueso/50"> · {e.actividad}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <span className="flex-1" />
          {extrasSinConfirmar > 0 && (
            <span className="text-xs text-amber-300">
              {extrasSinConfirmar} sin confirmar
            </span>
          )}
          <button onClick={() => setAgendando(true)} disabled={!extras}
            className="text-sm text-oro hover:underline disabled:opacity-40">
            {extrasHoy.length === 0 ? 'Agendar actividad' : 'Editar actividades'}
          </button>
        </div>

        {/* Igual que el equipo: el total aparece cuando alguien confirmó,
            porque antes de eso un cero se leería como "no costó nada" y lo
            que pasa es que todavía no se sabe. Va en su propia línea y no
            sumado al del equipo: son dos bolsillos y conviene que se vean
            separados. */}
        {costoExtras > 0 && (
          <p className="mt-2 border-t border-hueso/10 pt-2 text-xs">
            <strong className="tabular-nums text-oro">{enPesos(costoExtras)}</strong>
            <span className="text-hueso/55"> en actividades de este día</span>
            {costo > 0 && (
              <span className="text-hueso/45">
                {' '}· con el equipo, {enPesos(costo + costoExtras)} en total
              </span>
            )}
          </p>
        )}
      </div>

      {agendando && extras && (
        <ExtrasDialogo
          fecha={fecha}
          extras={extras.extras}
          colaboradores={extras.colaboradores}
          esAdmin={extras.esAdmin}
          onListo={() => { setAgendando(false); cargarExtras(); }}
          onCancelar={() => setAgendando(false)}
        />
      )}

      {planificando !== 'no' && equipo && (
        <EquipoDialogo
          fecha={fecha}
          personas={personasDelDia}
          puestos={equipo.puestos}
          trabajadores={equipo.trabajadores}
          turnos={equipo.turnos}
          extras={extras?.extras ?? []}
          cerrado={estaCerrado(equipo.cierres, fecha)}
          esAdmin={equipo.esAdmin}
          enfocarPropina={planificando === 'propina'}
          onListo={() => { setPlanificando('no'); cargarEquipo(); }}
          onCancelar={() => setPlanificando('no')}
        />
      )}

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
          menusConocidos={conocidos}
          catalogo={catalogo}
          reserva={editando}
          onListo={() => { setCreando(false); setEditando(null); cargar(); }}
          onCancelar={() => { setCreando(false); setEditando(null); }}
        />
      )}
    </>
  );
}

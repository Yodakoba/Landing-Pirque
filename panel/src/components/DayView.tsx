'use client';
/**
 * Las reservas de un día, con filtro por tipo de pago y exportación a CSV.
 *
 * El CSV se arma en el navegador con la misma función que prueba prueba.ts:
 * no hace falta un viaje al servidor para algo que ya está en pantalla.
 */
import { useEffect, useMemo, useState } from 'react';
import { CRM_APAGADO } from '@/lib/crm';
import Ayuda from './Ayuda';
import type { Reserva } from '@/lib/tipos';
import { TIPO_PAGO, ESTADO_PAGO, ASISTENCIA, esManual } from '@/lib/columnas';
import { pagoEnEspanol, liberaCupo } from '@/lib/pagos';
import { menusDe, menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, paraReservar, type Menu } from '@/lib/menus';
import { enPalabras } from '@/lib/fechas';
import { cuentaEnElCalendario, estadoVisible, lineasDe, totalDe, personasDe,
         folioDe, gentePosible, type Presupuesto, type LineaPresupuesto } from '@/lib/presupuestos';
import { aCSV } from '@/lib/csv';
import { ocupaLugar, faltaCobrar, enPesos } from '@/lib/ocupacion';
import { Aviso } from './CalendarView';
import ReservaForm from './ReservaForm';
import PastillaPago from './PastillaPago';
import IngresoFudo from './IngresoFudo';
import { BloqueCRM, SIN_EVENTOS } from './EventosCRM';
import type { EventoCRM, EventosDelDia } from '@/lib/crm';
import Clima, { usePronostico } from './Clima';
import { puede, puedeTocarReserva, type Rol } from '@/lib/auth';
import EquipoDialogo from './EquipoDialogo';
import ExtrasDialogo from './ExtrasDialogo';
import { estaCerrado, cierreDe, type Cierre } from '@/lib/cierres';
import { planDelDia, costoDelDia, propinaDelDia, pagoDe, VINO,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { extrasDelDia, costoExtrasDelDia, costoDeExtra,
         type Colaborador, type Extra } from '@/lib/extras';

/**
 * Un azulejo del resumen: el número grande arriba y qué es debajo.
 *
 * **Es la misma forma para las dos filas** —los menús que hay que preparar y
 * cómo viene el pago— y eso es a propósito: son los dos datos por los que se
 * abre esta página un sábado en la mañana, y repetir la forma es lo que los
 * deja leerse de un vistazo sin aprender dos diseños distintos.
 *
 * Va al nivel del módulo, nunca dentro de DayView: un componente declarado
 * adentro es una función nueva en cada dibujado, o sea otro tipo de elemento
 * para React, que desmonta y vuelve a montar. Ver CLAUDE.md.
 */
function Azulejo({ n, titulo, nota, color, borde }: {
  n: number;
  titulo: string;
  nota?: string;
  color?: string;
  borde?: string;
}) {
  return (
    <div className={`rounded border ${borde ?? 'border-hueso/15'} bg-panel px-4 py-2.5`}>
      <div className={`text-3xl font-bold leading-none tabular-nums ${color ?? 'text-oro'}`}>
        {n}
      </div>
      <div className="mt-1.5 text-sm font-medium leading-tight">{titulo}</div>
      {nota && <div className="mt-0.5 text-[13px] text-hueso/60">{nota}</div>}
    </div>
  );
}

/**
 * El rótulo de cada fila del resumen.
 *
 * **13px semibold al 60%, no 12 al 45** (2026-11-01). La regla del panel
 * pone el piso en 13 y reserva las opacidades bajas para lo de verdad
 * secundario: un rótulo que nombra la fila que se vino a mirar no lo es.
 */
function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-5 text-[13px] font-semibold uppercase tracking-widest
                  text-hueso/60">{children}</p>
  );
}

/** El rótulo de un bloque —Equipo, Actividades extras—, con el mismo peso. */
function RotuloBloque({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
      {children}
    </span>
  );
}

/** Un aviso corto en ámbar: pastilla con borde, para reconocerlo sin leerlo. */
function Pendiente({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-ambar/50 px-2 py-0.5
                     text-[13px] font-semibold text-ambar-texto">
      {children}
    </span>
  );
}

/**
 * El filtro de la tabla. **Por estado del pago, no por modalidad comprada**
 * (cambió el 2026-10-30): decía "Pagadas online" y "Pagan en el local" pero
 * preguntaba qué variante se había comprado, así que una reserva comprada
 * en línea y todavía sin pagar salía en "Pagadas". Lo que se quiere saber
 * en el mesón es a quién hay que cobrarle.
 */
type Filtro = 'todas' | 'pagadas' | 'porCobrar';

export default function DayView(
  { fecha, rol, usuario }: { fecha: string; rol: string; usuario: string }
) {
  /**
   * Lo que esta cuenta puede hacer, de la misma tabla que usan el menú y
   * las rutas. No es la protección —cada ruta vuelve a preguntar— es para
   * no dibujar bloques que van a quedar vacíos: un vendedor recibe 403 del
   * equipo, de las extras y de los presupuestos, y un bloque vacío con un
   * botón apagado se lee como un panel roto y no como una puerta cerrada.
   */
  const conEquipo = puede(rol as Rol, 'equipo');
  const conExtras = puede(rol as Rol, 'extras');
  const conPresupuestos = puede(rol as Rol, 'presupuestos');
  const [todas, setTodas] = useState<Reserva[] | null>(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [editando, setEditando] = useState<Reserva | null>(null);
  const [creando, setCreando] = useState(false);
  /** El ganado del socio que se está pasando al panel, si hay alguno. */
  const [anotandoCRM, setAnotandoCRM] = useState<EventoCRM | null>(null);
  const [delSocio, setDelSocio] = useState<EventosDelDia>(SIN_EVENTOS);
  // El catalogo de menus. Distinto de `menus`, que mas abajo son los
  // totales por plato de este dia.
  const [catalogo, setCatalogo] = useState<Menu[]>(POR_DEFECTO_MENUS);
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[];
    cierres: Cierre[]; verSueldos: boolean; puedeCorregir: boolean;
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
    colaboradores: Colaborador[]; extras: Extra[]; verSueldos: boolean;
  } | null>(null);
  const [agendando, setAgendando] = useState(false);
  /**
   * Lo cotizado para este día y todavía sin confirmar.
   *
   * Se lee y **no se edita acá**: el presupuesto se arma en `/presupuestos`,
   * que es donde están las líneas y los precios. Esta pantalla lo muestra
   * porque es donde se mira un día completo, y una conversación abierta con
   * un cliente es parte de ese día.
   */
  const [cotizado, setCotizado] = useState<
    { presupuestos: Presupuesto[]; lineas: LineaPresupuesto[]; hoy: string } | null>(null);
  const pronostico = usePronostico();

  /** Quita el aviso de la recepción: el jefe de turno ya lo vio y lo atendió. */
  async function resolverAviso(r: Reserva) {
    const res = await fetch(`/api/reservas/${r.fila}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ avisoRecepcion: '' })
    });
    const d = await res.json().catch(() => ({}));
    if (d.error) setError(d.error); else cargar();
  }

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
          turnos: d.turnos ?? [], cierres: d.cierres ?? [], verSueldos: !!d.verSueldos,
          puedeCorregir: !!d.puedeCorregir
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
          verSueldos: !!d.verSueldos
        });
      })
      .catch(() => {});

  // Si no se pueden leer, el día se dibuja igual sin el bloque: una falla
  // de la capa comercial no puede dejar sin pantalla a quien vino a mirar
  // las reservas. Mismo criterio que `posiblesDeLosDias()`.
  const cargarCotizado = () =>
    fetch('/api/presupuestos')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return;
        setCotizado({ presupuestos: d.presupuestos ?? [], lineas: d.lineas ?? [],
                      hoy: d.hoy ?? '' });
      })
      .catch(() => {});

  /**
   * Lo que el socio tiene para este día.
   *
   * **Si el CRM no responde, la página se dibuja igual**: es un servicio de
   * un tercero y no puede meterse en el camino de la pantalla que contesta
   * cuánta gente viene. Misma asimetría que lo cotizado.
   */
  const cargarCRM = () => CRM_APAGADO ? Promise.resolve() :
    fetch(`/api/crm/eventos?desde=${fecha}&hasta=${fecha}`)
      .then((r) => r.json())
      .then((d) => setDelSocio(d?.dias?.[fecha] ?? SIN_EVENTOS))
      .catch(() => {});

  useEffect(() => {
    cargar();
    // Pedir lo que la cuenta no puede leer devuelve 403 y deja la pantalla
    // a medio cargar. Lo que no se pide, tampoco se dibuja.
    if (conEquipo) cargarEquipo();
    if (conExtras) cargarExtras();
    if (conPresupuestos) { cargarCotizado(); cargarCRM(); }
  }, []);

  const delDia = useMemo(
    () => (todas ?? []).filter((r) => r.fecha === fecha),
    [todas, fecha]
  );

  const visibles = useMemo(() => delDia.filter((r) => {
    if (filtro === 'porCobrar') return faltaCobrar(r);
    if (filtro === 'pagadas') return ocupaLugar(r) && !faltaCobrar(r);
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
      ...paraReservar(catalogo).map((m) => m.nombre),
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
       'Estado Pago','Nota de pago','Monto','Asistencia'],
      visibles.map((r) => [r.id, r.nombre, r.email, r.telefono, r.menu,
                           r.personas, r.tipoPago, r.estadoPago, r.notaPago,
                           r.monto ?? '', r.asistencia])
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = `reservas-${fecha}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  async function borrar(r: Reserva) {
    if (!confirm(`¿Borrar la reserva de ${r.nombre || r.id}? No se puede deshacer.`)) return;
    // En un día cerrado, borrar es corregirlo: va con su motivo.
    let correccion: { motivo: string } | undefined;
    if (diaCerrado) {
      const m = prompt('El día está cerrado. ¿Por qué se borra esta reserva?');
      if (!m || !m.trim()) return;
      correccion = { motivo: m.trim() };
    }
    const res = await fetch(`/api/reservas/${r.fila}`, {
      method: 'DELETE',
      ...(correccion ? { headers: { 'content-type': 'application/json' },
                         body: JSON.stringify({ correccion }) } : {})
    });
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
  // Si el día está cerrado, y si quien mira lo puede corregir. Ver
  // `corregirDiaCerrado()`; el servidor lo comprueba por su cuenta.
  const diaCerrado = !!equipo && estaCerrado(equipo.cierres, fecha);
  const puedeCorregir = !!equipo?.puedeCorregir;
  const vinieron = turnosDelDia.filter((t) => t.asistencia === VINO.si).length;
  const faltaron = turnosDelDia.filter((t) => t.asistencia === VINO.no).length;
  const costo = costoDelDia(turnosDelDia, fecha);
  const propina = propinaDelDia(turnosDelDia, fecha);
  const reciben = turnosDelDia.filter((t) => t.propina > 0).length;
  const sinMarcar = turnosDelDia.filter((t) => !t.asistencia).length;
  const extrasHoy = extrasDelDia(extras?.extras ?? [], fecha);
  const costoExtras = costoExtrasDelDia(extras?.extras ?? [], fecha);
  const extrasSinConfirmar = extrasHoy.filter((e) => !e.estado).length;

  // El resumen del pago, que es la segunda fila del encabezado.
  //
  // **Se decide por el ESTADO del pago, no por la modalidad comprada**, igual
  // que faltaCobrar(): una reserva que dice "Pago directo" y sigue en "Por
  // pagar" significa que la regla de medios de pago de Shopify no aplicó, y
  // mirando la modalidad esa plata no aparecería en ninguna parte.
  //
  // Los números grandes son PERSONAS, para que las dos filas sumen lo mismo;
  // cuántas reservas son va en la línea chica.
  const cuentan = visibles.filter(ocupaLugar);
  const porCobrar = cuentan.filter(faltaCobrar);
  const pagadas = cuentan.filter((r) => !faltaCobrar(r));
  const liberadas = visibles.filter((r) => !ocupaLugar(r));
  const gente = (rs: Reserva[]) => rs.reduce((n, r) => n + (Number(r.personas) || 0), 0);
  const cuantas = (rs: Reserva[]) => `${rs.length} reserva${rs.length === 1 ? '' : 's'}`;

  return (
    <>
      <a href="/" className="tecla boton">← Calendario</a>
      <h1 className="mt-3 text-xl font-bold uppercase tracking-wide">
        {enPalabras(fecha)}<Ayuda tema="dia" />
      </h1>
      <Clima c={pronostico.get(fecha)} grande />
      <p className="text-[15px] text-hueso/70">
        {visibles.length} reserva{visibles.length === 1 ? '' : 's'} · {personas} personas
        {noShows > 0 && (
          <span className="text-rojo-texto"> · {noShows} no {noShows === 1 ? 'llegó' : 'llegaron'}</span>
        )}
      </p>

      {/* Lo que hay que preparar. Va arriba y GRANDE porque es el dato por el
          que se abre esta página el sábado en la mañana: no compite con el
          equipo ni con las actividades, que son cajas de una línea. */}
      {menus.length > 0 && (
        <>
          <Rotulo>Qué preparar</Rotulo>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {menus.map(({ menu, cantidad }) => (
              <Azulejo key={menu} n={cantidad} titulo={menu} />
            ))}
          </div>
        </>
      )}

      {/* La segunda fila, en la misma forma: cuánta gente ya pagó y a cuánta
          hay que cobrarle. Es la otra pregunta del mesón, y hasta ahora había
          que leerla fila por fila en la tabla. */}
      {cuentan.length > 0 && (
        <>
          <Rotulo>Cómo viene el pago</Rotulo>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <Azulejo n={gente(pagadas)} titulo="Pagadas" nota={cuantas(pagadas)}
              color="text-verde-texto" borde="border-verde/40" />
            <Azulejo n={gente(porCobrar)} titulo="Por cobrar" nota={cuantas(porCobrar)}
              color="text-ambar-texto" borde="border-ambar/40" />
            {liberadas.length > 0 && (
              <Azulejo n={gente(liberadas)} titulo="Ya no vienen"
                nota={`${cuantas(liberadas)} · liberaron su lugar`}
                color="text-rojo-texto" borde="border-rojo/30" />
            )}
          </div>
        </>
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
          la otra mitad de la misma pregunta: para esta gente, con quién.

          **Para quien no tiene el permiso del equipo, este bloque no
          existe** (2026-11-05, con el rol de vendedor). Dibujarlo igual
          dejaba un "Nadie asignado todavía" sobre un día que sí tiene
          equipo, que no es que falte: es que ese dato no es suyo. */}
      {conEquipo && (
      <div className="mt-3 rounded border border-hueso/15 bg-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <RotuloBloque>Equipo</RotuloBloque>
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
          {faltan > 0 && <Pendiente>Faltan {faltan}</Pendiente>}
          {/* **Es un botón, no un enlace de texto en oro** (2026-11-01). Es
              la acción del bloque y estaba escrita igual que un rótulo:
              20px de alto, sin borde ni relleno, flotando en el borde
              derecho. Relleno no va, porque el único de esta pantalla es
              *Agregar reserva*, que es a lo que se entra. */}
          <button onClick={() => setPlanificando('equipo')} disabled={!equipo}
            className="boton">
            {turnosDelDia.length > 0 ? 'Equipo y cuentas del día' : 'Planificar equipo'}
          </button>
        </div>

        {/* Lo que costó el día. Aparece solo cuando se pasó lista por alguien:
            antes de eso el total sería cero y se leería como "no se pagó
            nada", que es otra cosa que "todavía no se sabe". */}
        {turnosDelDia.length > 0 && sinMarcar < turnosDelDia.length && (
          <p className="mt-2 border-t border-hueso/10 pt-2 text-[13px]">
            <strong className="text-base tabular-nums text-oro">{enPesos(costo)}</strong>
            <span className="text-hueso/65"> en el equipo de este día · </span>
            <span className="text-hueso/65">{vinieron} vinieron</span>
            {faltaron > 0 && (
              <span className="text-rojo-texto">
                {' '}· {faltaron} {faltaron === 1 ? 'no llegó' : 'no llegaron'}
              </span>
            )}
            {sinMarcar > 0 && (
              <span className="text-ambar-texto"> · {sinMarcar} sin marcar</span>
            )}
          </p>
        )}

        {/* La propina, a la vista desde que hay alguien asignado y no solo
            cuando ya se pasó lista: es el dato que se olvida, y a este día se
            llega tanto para cerrar el turno como para anotarla sola. Va
            aparte del costo, no sumada: esa plata no sale del negocio, pasa
            por él. */}
        {turnosDelDia.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1
                          border-t border-hueso/10 pt-2 text-[13px]">
            <span className="text-hueso/65">Propina del día:</span>
            {propina > 0 ? (
              <span>
                <strong className="text-base tabular-nums text-hueso">{enPesos(propina)}</strong>
                <span className="text-hueso/65">
                  , repartidos entre {reciben}{' '}
                  {reciben === 1 ? 'persona' : 'personas'}
                </span>
              </span>
            ) : (
              /* "Sin anotar" en ámbar y con borde: es lo que falta hacer,
                 no un dato gris más. */
              <Pendiente>sin anotar</Pendiente>
            )}
            <span className="flex-1" />
            <button onClick={() => setPlanificando('propina')} className="boton">
              {propina > 0 ? 'Editar propina' : 'Agregar propina'}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Las actividades extras de este día: el jinete, la pintacaritas, el
          castillo. Bloque aparte del equipo y no una fila más adentro, por lo
          mismo que son una página aparte: no cobran jornada, no se les pasa
          lista con horas extra y no entran en el reparto de la propina.
          Juntarlas con el equipo acá obligaría a explicar en cada línea cuál
          de las dos cosas es.

          Está igual en la página del día porque es donde se cierra un día, y
          "¿cuánto costó este sábado?" no se contesta sin ellas.

          Y, como el equipo, **no existe para quien no tiene su permiso**. */}
      {conExtras && (
      <div className="mt-3 rounded border border-hueso/15 bg-panel px-3 py-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <RotuloBloque>Actividades extras</RotuloBloque>
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
            <Pendiente>{extrasSinConfirmar} sin confirmar</Pendiente>
          )}
          <button onClick={() => setAgendando(true)} disabled={!extras}
            className="boton">
            {extrasHoy.length === 0 ? 'Agendar actividad' : 'Editar actividades'}
          </button>
        </div>

        {/* Igual que el equipo: el total aparece cuando alguien confirmó,
            porque antes de eso un cero se leería como "no costó nada" y lo
            que pasa es que todavía no se sabe. Va en su propia línea y no
            sumado al del equipo: son dos bolsillos y conviene que se vean
            separados. */}
        {costoExtras > 0 && (
          <p className="mt-2 border-t border-hueso/10 pt-2 text-[13px]">
            <strong className="text-base tabular-nums text-oro">{enPesos(costoExtras)}</strong>
            <span className="text-hueso/65"> en actividades de este día</span>
            {costo > 0 && (
              <span className="text-hueso/60">
                {' '}· con el equipo, {enPesos(costo + costoExtras)} en total
              </span>
            )}
          </p>
        )}
      </div>
      )}

      {/* **Lo que el socio tiene vendido para este día** (2026-11-03). Va
          antes de lo cotizado porque acá sí hay algo que hacer: un ganado
          suyo es gente que viene y que el panel todavía no cuenta, y el
          botón lo pasa a reserva. Ver `EventosCRM.tsx`. */}
      <BloqueCRM e={delSocio}
                 onAnotar={(ev) => { setEditando(null); setCreando(false);
                                     setAnotandoCRM(ev); }} />

      {/* **Lo cotizado para este día, en su propio bloque y en rosado**
          (2026-11-01). Va debajo del equipo y de las extras porque es lo
          único de esta pantalla que **todavía no es un hecho**: arriba está
          lo que hay que preparar y lo que cuesta; acá, lo que podría pasar.

          No se edita desde acá a propósito: el presupuesto se arma en
          `/presupuestos`, que es donde viven las líneas y los precios.
          Tenerlo en dos lugares sería tener dos formularios para lo mismo. */}
      {cotizado && (() => {
        const vivos = cotizado.presupuestos.filter(
          (p) => p.fecha === fecha && cuentaEnElCalendario(p, cotizado.hoy));
        if (vivos.length === 0) return null;
        const gente = vivos.reduce(
          (n, p) => n + gentePosible(p, lineasDe(cotizado.lineas, p.id)), 0);
        return (
          <div className="mt-3 rounded border border-rosa/40 bg-rosa/[0.06] px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <RotuloBloque>Presupuestos</RotuloBloque>
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {vivos.map((p) => (
                  <li key={p.id}>
                    <a href={`/presupuestos?abrir=${encodeURIComponent(p.id)}`}
                       className="font-semibold text-hueso/85 underline-offset-2 hover:underline">
                      {p.cliente}
                    </a>
                    <span className="text-hueso/60">
                      {' · '}{gentePosible(p, lineasDe(cotizado.lineas, p.id))} pers.
                      {' · '}{enPesos(totalDe(lineasDe(cotizado.lineas, p.id), p.descuento))}
                      {' · '}{estadoVisible(p, cotizado.hoy).toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
              <span className="flex-1" />
              <a href="/presupuestos" className="tecla boton">Ver cotizaciones</a>
            </div>
            {/* La frase que explica por qué este bloque no suma a los números
                de arriba. Va siempre, porque es justo lo que alguien podría
                dar por hecho mirando una tarjeta con gente. */}
            <p className="mt-2 border-t border-rosa/20 pt-2 text-[13px]">
              <strong className="tabular-nums text-rosa-texto">{gente}</strong>
              <span className="text-hueso/65">
                {' '}personas posibles si se{' '}
                {vivos.length === 1
                  ? 'confirma este presupuesto'
                  : 'confirman estos presupuestos'}.
                No ocupan cupo todavía: los números de arriba no los cuentan.
              </span>
            </p>
          </div>
        );
      })()}

      {agendando && extras && (
        <ExtrasDialogo
          fecha={fecha}
          extras={extras.extras}
          colaboradores={extras.colaboradores}
          verSueldos={extras.verSueldos}
          cerrado={!!equipo && estaCerrado(equipo.cierres, fecha)}
          cierre={equipo ? cierreDe(equipo.cierres, fecha) : undefined}
          puedeCorregir={!!equipo?.puedeCorregir}
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
          cierre={cierreDe(equipo.cierres, fecha)}
          puedeCorregir={equipo.puedeCorregir}
          verSueldos={equipo.verSueldos}
          enfocarPropina={planificando === 'propina'}
          onListo={() => { setPlanificando('no'); cargarEquipo(); }}
          onCancelar={() => setPlanificando('no')}
        />
      )}

      {/* **Un día cerrado está en solo lectura** (2026-11-03), y lo dice
          arriba de la tabla. *Vino / No vino* de las reservas se corrige en
          `/turnos`, junto con el equipo y con un solo motivo; editar, borrar
          o anotar una reserva se puede acá, pidiendo el motivo, a quien
          puede corregir. */}
      {diaCerrado && (
        <p className="mt-6 rounded border border-verde/40 bg-verde/5 px-3 py-2 text-sm
                      text-hueso/80">
          <strong className="text-verde-texto">✓ Día cerrado</strong>
          {cierreDe(equipo!.cierres, fecha)?.quien &&
            <> por {cierreDe(equipo!.cierres, fecha)!.quien}</>}. Las reservas están en
          solo lectura.{' '}
          {puedeCorregir
            ? <>Puedes editar, borrar o anotar una reserva escribiendo el motivo;
                <em> Vino / No vino</em> se corrige en{' '}
                <a href="/turnos" className="text-oro hover:underline">Turnos</a>.</>
            : <>Si hay que cambiar algo, pídeselo al administrador o a quien hace
                los pagos.</>}
        </p>
      )}

      {/* El filtro: **el elegido va pintado**, no solo con el borde de otro
          color, así se reconoce sin distinguir el dorado del gris. No va
          relleno entero a propósito: el único relleno de esta pantalla es
          *Agregar reserva*, y dos rellenos es no tener ninguno. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['todas','pagadas','porCobrar'] as Filtro[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={`boton rounded-full ${filtro === f
              ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
            {f === 'todas' ? 'Todas' : f === 'pagadas' ? 'Pagadas' : 'Por cobrar'}
          </button>
        ))}
        <span className="flex-1" />
        <button onClick={exportar} className="boton">Exportar CSV</button>
        <button onClick={() => { setEditando(null); setCreando(true); }}
          disabled={diaCerrado && !puedeCorregir}
          className="boton boton-relleno">
          Agregar reserva
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="mt-8 text-hueso/50">No hay reservas para este filtro.</p>
      ) : (
        /* **La columna del nombre queda fija al correr de lado**
           (2026-11-01), igual que la de la planilla semanal y por lo mismo:
           con siete columnas la tabla no cabe en un teléfono, y al correrla
           uno queda mirando pastillas de pago sin saber de quién son. Los
           dos detalles de implementación son los ya anotados: la celda fija
           lleva su propio fondo, o los demás datos se verían por debajo, y
           su línea de corte es un `shadow` y no un `border`, porque con
           `border-collapse: collapse` el borde de una celda fija se va con
           el desplazamiento. La caja lleva `relative`. */
        <div className="relative mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-[13px] font-semibold uppercase
                              tracking-wide text-hueso/60">
              <tr className="border-b border-hueso/10">
                <th className="sticky left-0 z-20 bg-tinta py-2 pr-3
                               shadow-[1px_0_0_0_rgb(var(--hueso)_/_0.15)]">Nombre</th>
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
                // "Pago directo / pending" —la regla de medios de pago de
                // Shopify no aplicó— lo avisa ahora la caja roja de Fudo
                // (`comoIngresar()`), que es donde se mira al abrir la mesa.
                // **El mismo pedido anotado dos veces en la planilla.**
                // El panel ya lo cuenta una sola vez —ver `leerReservasDe()`—
                // así que esto no cambia ningún total: avisa, para que
                // alguien borre la fila de más. Quien mira el día es quien
                // lo va a notar.
                const repetida = (r.duplicadas ?? 1) > 1;
                /**
                 * Si esta cuenta puede tocar **esta** reserva.
                 *
                 * Para los tres roles de siempre es todas; un vendedor solo
                 * las que anotó él. La regla vive en `auth.ts` y la
                 * comprueba la ruta: esto es lo mismo preguntado antes, para
                 * no ofrecer un botón que va a devolver 403.
                 */
                const mia = puedeTocarReserva(rol as Rol, usuario, r.anotadaPor);
                // **Una reserva que nació de una cotización se edita en la
                // cotización** (2026-11-10): la escribe el sistema. Acá se
                // dice de cuál viene y se lleva a ella.
                const deCotizacion = cotizado?.presupuestos.find((p) => p.idReserva === r.id);
                return (
                  <tr key={r.fila} className={`border-b border-hueso/5 ${
                        ocupaLugar(r) ? '' : 'opacity-40 line-through'}`}>
                    <td className="sticky left-0 z-10 bg-tinta py-2 pr-3
                                   shadow-[1px_0_0_0_rgb(var(--hueso)_/_0.15)]">
                      {r.nombre || <span className="text-hueso/50">sin nombre</span>}
                      <div className="text-[13px] text-hueso/55">{r.id}</div>
                    </td>
                    <td className="py-2 pr-3 text-hueso/70">
                      {r.telefono && <div>{r.telefono}</div>}
                      {r.email && <div className="text-[13px]">{r.email}</div>}
                      {!r.telefono && !r.email && <span className="text-hueso/50">—</span>}
                    </td>
                    <td className="py-2 pr-3">{r.menu}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {r.personas}
                      {/* Lo que anotó la anfitriona, si es distinto (2026-11-11). */}
                      {r.llegaron != null && r.llegaron !== r.personas && (
                        <span className="block text-[13px] font-semibold text-ambar-texto">llegaron {r.llegaron}</span>
                      )}
                    </td>
                    <td className="min-w-[240px] py-2 pr-3">
                      {/* **El pago, dicho igual en todas partes** (2026-11-11):
                          de dónde viene y cómo va, y debajo cómo se ingresa
                          en Fudo. Ver `PastillaPago` y `comoIngresar()`. */}
                      <PastillaPago r={r} deCotizacion={!!deCotizacion} />
                      {ocupaLugar(r) && (
                        <div className="mt-1.5"><IngresoFudo ingreso={r.ingreso} compacto /></div>
                      )}
                      {repetida && (
                        <div className="mt-1 text-[13px] font-semibold text-ambar-texto"
                          title={`El mismo ID Orden está en ${r.duplicadas} filas de la `
                               + 'planilla. El panel lo cuenta una sola vez; conviene '
                               + 'borrar la de más.'}>
                          ⚠ {r.duplicadas} filas con este pedido
                        </div>
                      )}
                      {/* **El aviso de la recepción** (2026-11-11): lo que la
                          anfitriona le dejó al jefe de turno. Se ve acá, donde
                          se edita la reserva, hasta que alguien lo resuelve. */}
                      {r.avisoRecepcion && (
                        <div className="mt-2 rounded-lg border-2 border-ambar/60 bg-ambar/10 p-2 text-[13px]">
                          <p className="font-semibold text-ambar-texto">📣 Recepción: {r.avisoRecepcion}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {mia && !deCotizacion && (
                              <button type="button" className="boton" onClick={() => setEditando(r)}>
                                Editar la reserva
                              </button>
                            )}
                            {puede(rol as Rol, 'asistencia') && (
                              <button type="button" className="boton !border-verde-fuerte text-verde-texto"
                                onClick={() => void resolverAviso(r)}>✓ Resuelto</button>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {/* **Acá se lee, no se marca** (2026-11-05, lo pidió el
                          cliente): quien mira el calendario y las reservas
                          puede ser otro rol que quien pasa lista, así que
                          *Vino / No vino* vive solo en `/turnos`. */}
                      <span className={`inline-block whitespace-nowrap rounded-full border-2 px-2.5
                                        py-0.5 text-[13px] font-semibold ${
                        r.asistencia === VINO.si ? 'border-verde/50 text-verde-texto'
                        : r.asistencia === VINO.no ? 'border-rojo/50 text-rojo-texto'
                        : 'border-hueso/20 text-hueso/60'}`}>
                        {r.asistencia === VINO.si ? '✓ vino'
                          : r.asistencia === VINO.no ? '✕ no vino' : 'sin marcar'}
                      </span>
                    </td>
                    {/* **Dos botones, no dos textos en gris de 20px.** Son
                        las dos acciones de la fila y una de ellas borra: lo
                        que se aprieta tiene que verse que se aprieta, y
                        medir para el dedo. */}
                    <td className="py-2 text-right whitespace-nowrap">
                      {/* **La reserva de otro se ve y no se toca** — lo pidió
                          el cliente al crear el vendedor. En vez de dos
                          botones apagados va quién la anotó, que es lo que
                          alguien necesita saber para ir a pedírselo: un botón
                          que no responde se lee como un panel roto. */}
                      {deCotizacion ? (
                        <a href={`/presupuestos?abrir=${encodeURIComponent(deCotizacion.id)}`}
                          className="tecla boton whitespace-nowrap">
                          Cotización N° {folioDe(deCotizacion)}
                        </a>
                      ) : mia ? (
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setCreando(false); setEditando(r); }}
                            disabled={diaCerrado && !puedeCorregir}
                            className="boton">Editar</button>
                          <button onClick={() => borrar(r)}
                            disabled={diaCerrado && !puedeCorregir}
                            className="boton hover:border-rojo-fuerte hover:text-rojo-texto">
                            Borrar
                          </button>
                        </div>
                      ) : (
                        <span className="text-[13px] text-hueso/55">
                          {r.anotadaPor ? `La anotó ${r.anotadaPor}` : 'No la anotaste tú'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(creando || editando || anotandoCRM) && (
        <ReservaForm
          fecha={fecha}
          menusConocidos={conocidos}
          catalogo={catalogo}
          reserva={editando}
          pideMotivo={diaCerrado}
          desdeCRM={anotandoCRM
            ? { id: anotandoCRM.id, nombre: anotandoCRM.nombre,
                personas: anotandoCRM.invitados }
            : undefined}
          onListo={() => {
            setCreando(false); setEditando(null); setAnotandoCRM(null);
            // Las dos: la reserva nueva, y el ganado que acaba de dejar de
            // estar pendiente.
            cargar(); cargarCRM();
          }}
          onCancelar={() => {
            setCreando(false); setEditando(null); setAnotandoCRM(null);
          }}
        />
      )}
    </>
  );
}

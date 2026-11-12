'use client';
/**
 * Las reservas de un día, con filtro por tipo de pago y exportación a CSV.
 *
 * El CSV se arma en el navegador con la misma función que prueba prueba.ts:
 * no hace falta un viaje al servidor para algo que ya está en pantalla.
 */
import { usarAlDia, BarraAlDia } from './AlDia';
import { useEffect, useMemo, useState } from 'react';
import { CRM_APAGADO } from '@/lib/crm';
import { grupoDe, principalDe } from '@/lib/cotizar';
import Ayuda from './Ayuda';
import type { Reserva } from '@/lib/tipos';
import { TIPO_PAGO, ESTADO_PAGO, ASISTENCIA, esManual } from '@/lib/columnas';
import { enlaceWhatsApp } from '@/lib/contacto';
import { pagoEnEspanol, liberaCupo } from '@/lib/pagos';
import { menusDe, menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, paraReservar, type Menu } from '@/lib/menus';
import { enPalabras } from '@/lib/fechas';
import { cuentaEnElCalendario, estadoVisible, lineasDe, totalDe, personasDe,
         folioDe, gentePosible, type Presupuesto, type LineaPresupuesto } from '@/lib/presupuestos';
import { aCSV } from '@/lib/csv';
import { ocupaLugar, faltaCobrar, estaAbonada, enPesos } from '@/lib/ocupacion';
import { Aviso } from './CalendarView';
import ReservaForm from './ReservaForm';
import PastillaPago from './PastillaPago';
import RectificarReserva from './RectificarReserva';
import BandejaAprobaciones from './BandejaAprobaciones';
import { pendientesDeAprobar } from '@/lib/aprobaciones';
import { avisar } from './AvisoFlotante';
import { estaRectificada, personasEfectivas, menuEfectivo, porAprobar, rechazado,
         resumenRectificacion } from '@/lib/rectificacion';
import BloqueSobrecupo, { AvisarCaida, type CupoDelDia } from './BloqueSobrecupo';
import IngresoFudo from './IngresoFudo';
import { BloqueCRM, SIN_EVENTOS } from './EventosCRM';
import type { EventoCRM, EventosDelDia } from '@/lib/crm';
import Clima, { usePronostico } from './Clima';
import { puede, puedeVer, puedeTocarReserva, esSuya, type Rol } from '@/lib/auth';
import EquipoDialogo from './EquipoDialogo';
import BloqueLiberar from './BloqueLiberar';
import { esExclusivo, exclusividadDe } from '@/lib/exclusivo';
import ExtrasDialogo from './ExtrasDialogo';
import { estaCerrado, cierreDe, type Cierre } from '@/lib/cierres';
import { planDelDia, costoDelDia, propinaDelDia, pagoDe, VINO,
         faltantesDe, textoFaltantes, type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
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

/** Un azulejo de la reserva abierta: el dato grande arriba y qué es debajo. */
const AZULEJO = 'flex min-w-0 flex-col justify-between gap-1 rounded-xl border-2 border-hueso/15 bg-tinta/40 p-3';
const ROTULO_AZULEJO = 'text-[13px] font-semibold uppercase tracking-wide text-hueso/60';

/** "3 × Tradiciones + 2 × Niños" → una línea por menú. */
function lineasDeMenu(menu: string): string[] {
  const partes = String(menu ?? '').split(/\s*[+,·]\s*/).map((x) => x.trim()).filter(Boolean);
  return partes.length ? partes : ['—'];
}

/** En la línea cerrada, el pago va como un ícono: ✓ pagada · ½ abonada · ○ por pagar · ✕ ya no viene. */
function iconoPago(r: Reserva): { icono: string; palabra: string; clase: string } {
  const e = String(r.estadoPago || '').trim().toLowerCase();
  if (!ocupaLugar(r)) return { icono: '✕', palabra: 'Ya no viene', clase: 'border-rojo-fuerte/60 bg-rojo/10 text-rojo-texto' };
  if (e === ESTADO_PAGO.pagado) return { icono: '✓', palabra: 'Pagada', clase: 'border-verde-fuerte/60 bg-verde/10 text-verde-texto' };
  if (e === ESTADO_PAGO.abonado) return { icono: '½', palabra: 'Abonada', clase: 'border-cielo-fuerte/60 bg-cielo/10 text-cielo-texto' };
  return { icono: '○', palabra: 'Por pagar', clase: 'border-ambar-fuerte/60 bg-ambar/10 text-ambar-texto' };
}

/** Una reserva de cotización no repite "De la cotización N° …": ya lo dice su línea. */
function sinNotaDeCotizacion(r: Reserva, deCot: boolean): Reserva {
  return deCot && /^del? (la )?(cotizaci|presupuesto)/i.test(String(r.notaPago ?? '')) ? { ...r, notaPago: '' } : r;
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
type Filtro = 'todas' | 'pagadas' | 'abonadas' | 'sinPagar';

export default function DayView(
  { fecha, rol, usuario, gerencia = false }: { fecha: string; rol: string; usuario: string; gerencia?: boolean }
) {
  /**
   * Lo que esta cuenta puede hacer, de la misma tabla que usan el menú y
   * las rutas. No es la protección —cada ruta vuelve a preguntar— es para
   * no dibujar bloques que van a quedar vacíos: un vendedor recibe 403 del
   * equipo, de las extras y de los presupuestos, y un bloque vacío con un
   * botón apagado se lee como un panel roto y no como una puerta cerrada.
   */
  // Con vista gerencia los bloques se ven igual; cambiarlos sigue pidiendo
  // el rol, y la ruta lo comprueba (2026-11-11).
  const conEquipo = puedeVer(rol as Rol, 'equipo', gerencia);
  const conExtras = puedeVer(rol as Rol, 'extras', gerencia);
  const conPresupuestos = puedeVer(rol as Rol, 'presupuestos', gerencia);
  // Anotar, editar y borrar reservas. Con vista gerencia, un rol sin
  // `reservas` mira el día sin esos botones.
  const conReservas = puede(rol as Rol, 'reservas');
  const conDias = puede(rol as Rol, 'dias');
  const [todas, setTodas] = useState<Reserva[] | null>(null);
  /** El cupo de este día, para el bloque de sobrecupo (2026-11-12). */
  const [cupoDia, setCupoDia] = useState<CupoDelDia | null>(null);
  const [capacidadMaxima, setCapacidadMaxima] = useState(900);
  const [deCotizacionIds, setDeCotizacionIds] = useState<Record<string, string>>({});
  /** La reserva abierta en la lista del día (una a la vez); vacío, ninguna. */
  const [reservaAbierta, setReservaAbierta] = useState('');
  /** Quién vendió y qué número tiene la cotización de cada reserva (por id de reserva). */
  /** La reserva que se está rectificando (2026-11-12), o `null`. */
  const [rectificando, setRectificando] = useState<Reserva | null>(null);
  /** Desde qué hora se rectifica, si ya llegó, y los descuentos estándar. */
  const [infoDia, setInfoDia] = useState<{ apertura: string; abierto: boolean; descuentos: number[] }>(
    { apertura: '', abierto: false, descuentos: [5, 10, 15] });
  /** **Mías** (2026-11-12, lo pidió el cliente): solo las que anotó o vendió esta cuenta. */
  const [soloMias, setSoloMias] = useState(false);
  const [origen, setOrigen] = useState<{ vendedor: Record<string, string>; folio: Record<string, string> }>(
    { vendedor: {}, folio: {} });
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
  /** Si la línea de lo cotizado está abierta (2026-11-12: cerrada por defecto). */
  const [verCotizado, setVerCotizado] = useState(false);

  /** Quita el aviso de la recepción: el jefe de turno ya lo vio y lo atendió. */
  async function resolverAviso(r: Reserva) {
    const res = await fetch(`/api/reservas/${r.fila}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ avisoRecepcion: '' })
    });
    const d = await res.json().catch(() => ({}));
    if (d.error) setError(d.error); else cargar();
  }

  /** La firma de la última carga, para saber si hay cambios (ver `AlDia`). */
  const [firma, setFirma] = useState('');
  const cargar = () =>
    fetch(`/api/reservas?dia=${fecha}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setTodas(d.reservas);
        if (d.firma) setFirma(d.firma);
        if (d.menus) setCatalogo(d.menus);
        setCupoDia(d.dia ?? null);
        if (d.capacidadMaxima) setCapacidadMaxima(d.capacidadMaxima);
        if (d.deCotizacion) setDeCotizacionIds(d.deCotizacion);
        setOrigen({ vendedor: d.vendedorDe ?? {}, folio: d.folioDeReserva ?? {} });
        setInfoDia({ apertura: d.apertura ?? '', abierto: !!d.abierto,
                     descuentos: Array.isArray(d.descuentos) && d.descuentos.length ? d.descuentos : [5, 10, 15] });
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
  // **Al día solo** (2026-11-12): si cambian las reservas o los días, se
  // recarga la página entera —reservas, equipo, extras y lo cotizado—, que
  // es lo mismo que hace el botón. Ver `AlDia`.
  const actualizarTodo = () => Promise.all([
    cargar(),
    conEquipo ? cargarEquipo() : null,
    conExtras ? cargarExtras() : null,
    conPresupuestos ? cargarCotizado() : null
  ]);
  const alDia = usarAlDia(firma, actualizarTodo);

  const delDia = useMemo(
    () => (todas ?? []).filter((r) => r.fecha === fecha),
    [todas, fecha]
  );

  /** Si la anotó o la vendió esta cuenta. */
  const esMia = (r: Reserva) => esSuya(usuario, r.anotadaPor) || esSuya(usuario, origen.vendedor[r.id] ?? '');
  const visibles = useMemo(() => delDia.filter((r) => {
    if (soloMias && !esMia(r)) return false;
    if (filtro === 'abonadas') return estaAbonada(r);
    if (filtro === 'sinPagar') return faltaCobrar(r) && !estaAbonada(r);
    if (filtro === 'pagadas') return ocupaLugar(r) && !faltaCobrar(r);
    return true;
  }), [delDia, filtro, soloMias, origen, usuario]); // eslint-disable-line react-hooks/exhaustive-deps

  const personas = visibles.filter(ocupaLugar)
    .reduce((s, r) => s + personasEfectivas(r), 0);
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

  /** Aprobar o rechazar un descuento sobre el estándar (gerente, quien paga, administrador). */
  async function aprobarDescuento(r: Reserva, aprobar: boolean) {
    const res = await fetch('/api/reservas/aprobar', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fila: r.fila, aprobar })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
    avisar(aprobar ? `Descuento de ${r.descuento}% aprobado` : 'Descuento rechazado', aprobar ? 'ok' : 'atencion');
    void cargar();
  }

  /** Deshacer una rectificación, con su motivo. */
  async function deshacerRectificacion(r: Reserva) {
    const motivo = prompt(`¿Por qué deshaces la rectificación de ${r.nombre || 'esta reserva'}?\n\nQueda anotado con tu nombre.`);
    if (motivo === null) return;
    const res = await fetch('/api/reservas/rectificar', {
      method: 'DELETE', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fila: r.fila, motivo })
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || d.error) { avisar(d.error || 'No se pudo deshacer.', 'atencion'); return; }
    avisar('Rectificación deshecha');
    void cargar();
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
  // Tres grupos, los mismos tres tramos de la barra de la tarjeta: pagadas,
  // abonadas (pagaron una parte: casi seguro vienen) y sin pagar nada.
  const abonadas = cuentan.filter(estaAbonada);
  const sinPagar = cuentan.filter((r) => faltaCobrar(r) && !estaAbonada(r));
  const pagadas = cuentan.filter((r) => !faltaCobrar(r));
  const liberadas = visibles.filter((r) => !ocupaLugar(r));
  const gente = (rs: Reserva[]) => rs.reduce((n, r) => n + personasEfectivas(r), 0);
  const cuantasMias = delDia.filter(esMia).length;
  const puedeAprobarDescuentos = puede(rol as Rol, 'aprobar');
  const puedeRectificar = puede(rol as Rol, 'rectificar');
  const porAprobarHoy = delDia.filter((r) => ocupaLugar(r) && estaRectificada(r) && porAprobar(r));
  const cuantas = (rs: Reserva[]) => `${rs.length} reserva${rs.length === 1 ? '' : 's'}`;

  return (
    <>
      <a href="/" className="tecla boton">← Calendario</a>
      <h1 className="mt-3 text-xl font-bold uppercase tracking-wide">
        {enPalabras(fecha)}<Ayuda tema="dia" />
      </h1>
      <Clima c={pronostico.get(fecha)} grande />
      <BarraAlDia {...alDia} />
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
            {abonadas.length > 0 && (
              <Azulejo n={gente(abonadas)} titulo="Abonadas" nota={`${cuantas(abonadas)} · falta el resto`}
                color="text-verde-texto" borde="border-verde/40 border-dashed" />
            )}
            <Azulejo n={gente(sinPagar)} titulo="Sin pagar" nota={cuantas(sinPagar)}
              color="text-ambar-texto" borde="border-ambar/40" />
            {liberadas.length > 0 && (
              <Azulejo n={gente(liberadas)} titulo="Ya no vienen"
                nota={`${cuantas(liberadas)} · liberaron su lugar`}
                color="text-rojo-texto" borde="border-rojo/30" />
            )}
          </div>
        </>
      )}

      {/* **El evento exclusivo** (2026-11-12): con el pedido de liberar el día
          aprobado, el plan para avisar y mover a cada reserva. Con el pedido
          esperando, solo una línea: lo decide la bandeja. */}
      {(() => {
        const excl = (cotizado?.presupuestos ?? []).filter((p) => p.fecha === fecha && esExclusivo(p.exclusivo) && !p.idReserva);
        const aprobada = excl.find((p) => exclusividadDe(p.exclusividad).estado === 'aprobada');
        const pedida = excl.find((p) => exclusividadDe(p.exclusividad).estado === 'pedida');
        return (
          <>
            {!aprobada && pedida && (
              <p className="mb-4 rounded-xl border-2 border-dashed border-morado-fuerte/60 bg-morado/[0.06] px-3 py-2 text-[15px]">
                🟣 <b>{exclusividadDe(pedida.exclusividad).quien}</b> pidió liberar este día para un evento exclusivo
                ({pedida.cliente || 'sin nombre'}). Espera la decisión del encargado de pagos o la gerencia.
              </p>
            )}
            <BloqueLiberar fecha={fecha} reservas={delDia} cotizacion={aprobada} deCotizacion={deCotizacionIds}
              puedeAvisar={conDias} puedeDecidir={puede(rol as Rol, 'exclusividad')}
              onCambio={() => void actualizarTodo()} />
          </>
        );
      })()}

      {cupoDia && cupoDia.sobrecupo > 0 && todas && (
        <BloqueSobrecupo dia={cupoDia} reservas={todas} capacidadMaxima={capacidadMaxima}
          rol={rol} usuario={usuario} conDias={conDias} conCupo={puede(rol as Rol, 'cupo')}
          deCotizacion={deCotizacionIds}
          onCambio={() => void cargar()} />
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
          {faltan > 0 && (
            <Pendiente>{faltan === 1 ? 'Falta' : 'Faltan'} {faltan}: {textoFaltantes(faltantesDe(plan))}</Pendiente>
          )}
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
                 onAnotar={conReservas ? (ev) => { setEditando(null); setCreando(false);
                                     setAnotandoCRM(ev); } : undefined} />

      {/* **Lo cotizado para este día, en su propio bloque y en rosado**
          (2026-11-01). Va debajo del equipo y de las extras porque es lo
          único de esta pantalla que **todavía no es un hecho**: arriba está
          lo que hay que preparar y lo que cuesta; acá, lo que podría pasar.

          No se edita desde acá a propósito: el presupuesto se arma en
          `/presupuestos`, que es donde viven las líneas y los precios.
          Tenerlo en dos lugares sería tener dos formularios para lo mismo. */}
      {/* **Una línea chica que se abre** (2026-11-12, lo pidió el cliente:
          tomaba mucho protagonismo para algo que todavía no se decide). Y
          **las alternativas de un mismo cliente cuentan una sola vez**, con
          la de más gente —la misma regla de `posiblesPorDia()`—: tres
          alternativas de 12 personas son 12 posibles, no 36. */}
      {cotizado && (() => {
        const vivos = cotizado.presupuestos.filter(
          (p) => p.fecha === fecha && cuentaEnElCalendario(p, cotizado.hoy));
        if (vivos.length === 0) return null;
        const grupos = new Map<string, Presupuesto[]>();
        for (const p of vivos) {
          const g = grupoDe(p);
          if (!grupos.has(g)) grupos.set(g, []);
          grupos.get(g)!.push(p);
        }
        const gente = (p: Presupuesto) => gentePosible(p, lineasDe(cotizado.lineas, p.id));
        const total = (p: Presupuesto) => totalDe(lineasDe(cotizado.lineas, p.id), p.descuento);
        const filas = [...grupos.values()].map((alts) => {
          const principal = principalDe(alts, () => true);
          const totales = alts.map(total);
          return {
            p: principal, n: alts.length,
            personas: Math.max(...alts.map(gente)),
            min: Math.min(...totales), max: Math.max(...totales)
          };
        });
        const posibles = filas.reduce((n, f) => n + f.personas, 0);
        const clientes = new Set(filas.map((f) => f.p.cliente || f.p.id)).size;
        return (
          <div className="mt-3">
            <button type="button" onClick={() => setVerCotizado((v) => !v)} aria-expanded={verCotizado}
              className="tecla flex min-h-[44px] w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-lg
                         border border-rosa/40 bg-rosa/[0.05] px-3 py-2 text-left text-[14px] hover:bg-rosa/10">
              <span className="font-semibold text-rosa-texto">
                {filas.length === 1 ? '1 cotización en curso' : `${filas.length} cotizaciones en curso`}
              </span>
              {clientes > 1 && <span className="text-hueso/70">· {clientes} clientes</span>}
              <span className="text-hueso/70">· hasta {posibles} personas, sin confirmar</span>
              <span className="flex-1" />
              <span className="text-hueso/70">{verCotizado ? 'Cerrar ▴' : 'Ver ▾'}</span>
            </button>
            {verCotizado && (
              <div className="mt-1 rounded-lg border border-rosa/30 px-3 py-2">
                <ul className="divide-y divide-hueso/10">
                  {filas.map((f) => (
                    <li key={f.p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[14px]">
                      <span className="font-semibold">{f.p.cliente || 'Sin cliente'}</span>
                      <span className="text-hueso/70">
                        N° {folioDe({ id: grupoDe(f.p) })}
                        {' · '}{f.personas} personas
                        {' · '}{f.n > 1
                          ? `${f.n} alternativas, de ${enPesos(f.min)} a ${enPesos(f.max)}`
                          : enPesos(f.max)}
                        {' · '}{estadoVisible(f.p, cotizado.hoy).toLowerCase()}
                      </span>
                      <span className="flex-1" />
                      <a href={`/presupuestos?abrir=${encodeURIComponent(f.p.id)}`} className="tecla boton">Abrir</a>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 border-t border-hueso/10 pt-2 text-[13px] text-hueso/70">
                  No ocupan cupo todavía: los números de arriba no los cuentan. De cada cotización
                  cuenta una sola alternativa, la de más gente.
                </p>
              </div>
            )}
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

      {/* **La bandeja de aprobaciones** (2026-11-12), la misma de la portada,
          con lo de este día: se aprueba ahí mismo. */}
      {puedeAprobarDescuentos && (
        <div className="mt-6">
          <BandejaAprobaciones pendientes={pendientesDeAprobar(porAprobarHoy)} onCambio={() => void cargar()}
            verReserva={(p) => { setFiltro('todas'); setSoloMias(false);
              const r = p.tipo === 'descuento' && porAprobarHoy.find((x) => x.fila === p.fila); if (r) setReservaAbierta(r.id); }} />
        </div>
      )}

      {/* El filtro: **el elegido va pintado**, no solo con el borde de otro
          color, así se reconoce sin distinguir el dorado del gris. No va
          relleno entero a propósito: el único relleno de esta pantalla es
          *Agregar reserva*, y dos rellenos es no tener ninguno. */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        {(['todas','pagadas','abonadas','sinPagar'] as Filtro[]).map((f) => (
          <button key={f} onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={`boton rounded-full ${filtro === f
              ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
            {{ todas: 'Todas', pagadas: 'Pagadas', abonadas: 'Abonadas', sinPagar: 'Sin pagar' }[f]}
          </button>
        ))}
        {/* **Mías** (2026-11-12, lo pidió el cliente): de un toque, solo las
            que anotó o vendió esta cuenta. Se suma al filtro del pago. */}
        <button onClick={() => setSoloMias((v) => !v)} aria-pressed={soloMias}
          className={`boton rounded-full ${soloMias ? 'border-oro bg-oro/15 font-semibold text-oro' : ''}`}>
          👤 Mías ({cuantasMias})
        </button>
        <span className="flex-1" />
        <button onClick={exportar} className="boton">Exportar CSV</button>
        {conReservas && (
          <button onClick={() => { setEditando(null); setCreando(true); }}
            disabled={diaCerrado && !puedeCorregir}
            className="boton boton-relleno">
            Agregar reserva
          </button>
        )}
      </div>

      {visibles.length === 0 ? (
        <p className="mt-8 text-hueso/50">No hay reservas para este filtro.</p>
      ) : (
        /* **Cada reserva es una línea que se abre** (2026-11-12, lo pidió el
           cliente): cerrada dice solo quién es, su número y cuánta gente;
           apretándola aparece todo lo demás —contacto, menú, pago, Fudo,
           asistencia y lo que se hace con ella—. Una abierta a la vez, igual
           que las fichas de `/equipo` y las líneas del informe. Reemplaza a
           la tabla de siete columnas, que en un teléfono había que correr de
           lado. Lo que no puede quedar escondido —un aviso de la recepción,
           un pedido repetido— lleva su marca también en la línea cerrada. */
        <ul className="mt-5 space-y-2">
          {visibles.map((r) => {
            // **El mismo pedido anotado dos veces en la planilla.** El panel
            // ya lo cuenta una sola vez —ver `leerReservasDe()`— así que esto
            // no cambia ningún total: avisa, para que alguien borre la fila
            // de más.
            const repetida = (r.duplicadas ?? 1) > 1;
            /**
             * Si esta cuenta puede tocar **esta** reserva: para los roles de
             * siempre es todas; un vendedor solo las que anotó él. La regla
             * vive en `auth.ts` y la comprueba la ruta.
             */
            const mia = puedeTocarReserva(rol as Rol, usuario, r.anotadaPor);
            // **Una reserva que nació de una cotización se edita en la
            // cotización** (2026-11-10). El servidor dice de cuál viene aunque
            // la lista de cotizaciones no haya llegado.
            const deCotizacion = cotizado?.presupuestos.find((p) => p.idReserva === r.id);
            const idCotizacion = deCotizacion?.id ?? deCotizacionIds[r.id] ?? '';
            const folio = origen.folio[r.id] || (deCotizacion ? folioDe(deCotizacion) : '');
            const abierta = reservaAbierta === r.id;
            const libera = !ocupaLugar(r);
            const pago = iconoPago(r);
            return (
              <li key={r.fila} className={`overflow-hidden rounded-2xl border-2 bg-panel transition-colors ${
                abierta ? 'border-oro shadow-md' : 'border-hueso/15'} ${libera ? 'opacity-50' : ''}`}>
                {/* La línea cerrada: quién, su número, cómo va el pago (solo
                    el ícono) y cuánta gente. Lo que no puede quedar escondido
                    —un aviso de la recepción, un pedido repetido— lleva su
                    marca también acá. */}
                <button type="button" aria-expanded={abierta}
                  onClick={() => setReservaAbierta(abierta ? '' : r.id)}
                  className={`tecla flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left
                              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-oro
                              ${abierta ? 'bg-oro/10' : 'hover:bg-hueso/5'}`}>
                  <span aria-hidden className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full
                                               border-2 text-[15px] font-bold ${abierta
                    ? 'border-oro bg-oro text-tinta' : 'border-hueso/30 text-hueso/70'}`}>
                    {abierta ? '−' : '+'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[16px] font-bold ${libera ? 'line-through' : ''}`}>
                      {r.nombre || <span className="text-hueso/50">sin nombre</span>}
                    </span>
                    <span className="block truncate text-[13px] text-hueso/65">
                      {idCotizacion ? `Cotización N° ${folio}` : r.id}
                    </span>
                  </span>
                  {r.avisoRecepcion && (
                    <span title="La recepción dejó un aviso" className="shrink-0 rounded-full border-2
                      border-ambar/60 bg-ambar/10 px-2 py-0.5 text-[13px] font-semibold text-ambar-texto">📣</span>
                  )}
                  {repetida && (
                    <span title="Pedido repetido en la planilla" className="shrink-0 text-[15px] font-bold
                      text-ambar-texto">⚠</span>
                  )}
                  {estaRectificada(r) && (
                    <span title={porAprobar(r) ? 'Rectificada · descuento por aprobar' : 'Rectificada'}
                      className={`shrink-0 rounded-full border-2 px-2 py-0.5 text-[13px] font-bold ${porAprobar(r)
                        ? 'border-ambar-fuerte/60 bg-ambar/10 text-ambar-texto' : 'border-cielo-fuerte/50 bg-cielo/10 text-cielo-texto'}`}>
                      {porAprobar(r) ? '⏳' : '✎'}
                    </span>
                  )}
                  <span title={pago.palabra} aria-label={pago.palabra}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2
                                text-[14px] font-bold ${pago.clase}`}>{pago.icono}</span>
                  <span className="w-[4.5rem] shrink-0 text-right text-[18px] font-bold tabular-nums">
                    {personasEfectivas(r)}
                    <span className="ml-1 text-[13px] font-normal text-hueso/65">pers.</span>
                  </span>
                </button>

                {abierta && (
                  <div className="space-y-3 border-t-2 border-oro/30 p-3">
                    {/* En el teléfono: personas y pago arriba, menú y asistencia
                        a todo el ancho. **Cuatro azulejos, la misma forma que los de arriba de la
                        página** (2026-11-12, lo pidió el cliente: la versión
                        en columnas no seguía la regla PlayStation). El dato
                        grande arriba y qué es debajo. */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className={`${AZULEJO} order-1`}>
                        <span className="text-[30px] font-bold leading-none tabular-nums">{personasEfectivas(r)}</span>
                        <span className={ROTULO_AZULEJO}>personas</span>
                        {personasEfectivas(r) !== r.personas && (
                          <span className="text-[13px] text-hueso/65">reservó <s>{r.personas}</s></span>
                        )}
                        {r.llegaron != null && r.llegaron !== r.personas && (
                          <span className="mt-1 text-[13px] font-semibold text-ambar-texto">llegaron {r.llegaron}</span>
                        )}
                      </div>
                      <div className={`${AZULEJO} order-3 col-span-2 sm:order-2 sm:col-span-1`}>
                        <span className="space-y-0.5 text-[16px] font-bold leading-snug">
                          {lineasDeMenu(menuEfectivo(r)).map((m) => <span key={m} className="block">{m}</span>)}
                        </span>
                        <span className={ROTULO_AZULEJO}>menú</span>
                      </div>
                      <div className={`${AZULEJO} order-2 sm:order-3`}>
                        <PastillaPago r={sinNotaDeCotizacion(r, !!idCotizacion)} deCotizacion={!!idCotizacion}
                          sinOrigen={!!idCotizacion} />
                        <span className={ROTULO_AZULEJO}>pago</span>
                      </div>
                      <div className={`${AZULEJO} order-4 col-span-2 sm:col-span-1`}>
                        <span className={`inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full
                                          border-2 px-2.5 py-0.5 text-[14px] font-bold ${
                          r.asistencia === VINO.si ? 'border-verde-fuerte/60 bg-verde/10 text-verde-texto'
                          : r.asistencia === VINO.no ? 'border-rojo-fuerte/60 bg-rojo/10 text-rojo-texto'
                          : 'border-hueso/25 text-hueso/70'}`}>
                          {r.asistencia === VINO.si ? '✓ Vino'
                            : r.asistencia === VINO.no ? '✕ No vino' : '○ Sin marcar'}
                        </span>
                        {/* Se lee, no se marca: *Vino / No vino* vive en /turnos. */}
                        <span className={ROTULO_AZULEJO}>asistencia</span>
                      </div>
                    </div>

                    {/* **Cómo ingresarla en Fudo, a todo el ancho**: es lo que
                        se viene a mirar al abrir la mesa. */}
                    {ocupaLugar(r) && <IngresoFudo ingreso={r.ingreso} />}

                    {/* **La rectificación del día** (2026-11-12): qué cambió,
                        quién, cuándo y por qué; el descuento por aprobar con
                        sus dos botones para quien puede aprobar. */}
                    {estaRectificada(r) && (
                      <div className={`rounded-xl border-2 p-3 ${porAprobar(r)
                        ? 'border-ambar-fuerte/60 bg-ambar/10' : 'border-cielo-fuerte/50 bg-cielo/5'}`}>
                        <p className="text-[15px] font-bold">✎ Rectificada · {resumenRectificacion(r)}</p>
                        <p className="mt-0.5 text-[14px] text-hueso/80">{r.rectificacion}</p>
                        {menuEfectivo(r) !== r.menu && (
                          <p className="text-[13px] text-hueso/65">Reservó: {r.menu}</p>
                        )}
                        {porAprobar(r) && (
                          <p className="mt-1 text-[14px] font-semibold text-ambar-texto">
                            ⏳ El descuento de {r.descuento}% está por aprobar: en Fudo no se ingresa todavía.
                          </p>
                        )}
                        {!porAprobar(r) && r.aprobacion && (
                          <p className={`mt-1 text-[13px] font-semibold ${rechazado(r) ? 'text-rojo-texto' : 'text-verde-texto'}`}>
                            {rechazado(r) ? '✕' : '✓'} Descuento {r.aprobacion}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {porAprobar(r) && puedeAprobarDescuentos && (
                            <>
                              <button type="button" className="boton min-h-[44px] !border-verde-fuerte bg-verde/10 font-bold text-verde-texto"
                                onClick={() => void aprobarDescuento(r, true)}>✓ Aprobar {r.descuento}%</button>
                              <button type="button" className="boton min-h-[44px] !border-rojo-fuerte/60 text-rojo-texto"
                                onClick={() => void aprobarDescuento(r, false)}>✕ Rechazar</button>
                            </>
                          )}
                          {(puedeAprobarDescuentos || esSuya(usuario, String(r.rectificacion).split(' · ')[1] ?? '')) && (
                            <button type="button" className="boton min-h-[44px]" onClick={() => void deshacerRectificacion(r)}>
                              Deshacer la rectificación
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {repetida && (
                      <p className="rounded-lg border-2 border-ambar/60 bg-ambar/10 px-3 py-2 text-[14px]
                                    font-semibold text-ambar-texto">
                        ⚠ Este pedido está {r.duplicadas} veces en la planilla. El panel lo cuenta una
                        sola vez; conviene borrar la fila de más.
                      </p>
                    )}

                    {/* **El aviso de la recepción** (2026-11-11), hasta que
                        alguien lo resuelve. */}
                    {r.avisoRecepcion && (
                      <div className="rounded-xl border-2 border-ambar/60 bg-ambar/10 p-3">
                        <p className="text-[15px] font-semibold text-ambar-texto">📣 Recepción: {r.avisoRecepcion}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {mia && !idCotizacion && (
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

                    {/* **El contacto son botones**: llamar, WhatsApp y correo,
                        con el dato a la vista. Es lo que se hace con él. */}
                    {(r.telefono || r.email) && (
                      <div className="flex flex-wrap gap-2">
                        {r.telefono && (
                          <a href={`tel:${String(r.telefono).replace(/\s+/g, '')}`} className="tecla boton min-h-[44px]">
                            📞 {r.telefono}
                          </a>
                        )}
                        {enlaceWhatsApp(r.telefono) && (
                          <a href={enlaceWhatsApp(r.telefono)} target="_blank" rel="noopener noreferrer"
                            className="tecla boton min-h-[44px] !border-verde-fuerte/60 text-verde-texto">
                            💬 WhatsApp
                          </a>
                        )}
                        {r.email && (
                          <a href={`mailto:${r.email}`} className="tecla boton min-h-[44px] max-w-full truncate">
                            ✉ {r.email}
                          </a>
                        )}
                      </div>
                    )}

                    {/* **El pie: de quién es y qué se hace con ella.** A la
                        izquierda quién la vendió o la anotó (2026-11-12, lo
                        pidió el cliente: el encargado tiene que saber con
                        quién hablar); a la derecha, la acción. La reserva de
                        otro se ve y no se toca: en vez de botones apagados va
                        a quién pedírselo. */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hueso/10 pt-3">
                      <span className="text-[14px] text-hueso/75">
                        {idCotizacion ? (
                          <>🤝 Vendió <strong className="text-hueso">
                            {origen.vendedor[r.id] || deCotizacion?.creadoPor || 'sin vendedor'}</strong></>
                        ) : r.anotadaPor ? (
                          <>✍ Anotó <strong className="text-hueso">{r.anotadaPor}</strong></>
                        ) : /^\d+$/.test(r.id) ? <>🛒 Compró en Shopify</> : <>✍ Anotada a mano</>}
                      </span>
                      <div className="flex flex-wrap justify-end gap-2">
                        {idCotizacion ? (
                          <a href={`/presupuestos?abrir=${encodeURIComponent(idCotizacion)}`}
                            className="tecla boton boton-relleno min-h-[44px] whitespace-nowrap">
                            Abrir la cotización N° {folio} →
                          </a>
                        ) : mia && r.liberada ? (
                          // Se cayó por cupo: lo que queda es avisarle.
                          <AvisarCaida r={r} />
                        ) : mia ? (
                          <>
                            <button onClick={() => { setCreando(false); setEditando(r); }}
                              disabled={diaCerrado && !puedeCorregir}
                              className="boton boton-relleno min-h-[44px]">✎ Editar</button>
                            <button onClick={() => borrar(r)}
                              disabled={diaCerrado && !puedeCorregir}
                              className="boton min-h-[44px] hover:border-rojo-fuerte hover:text-rojo-texto">
                              Borrar
                            </button>
                          </>
                        ) : !puedeRectificar ? (
                          <span className="text-[14px] text-hueso/65">
                            {!conReservas ? '' : 'No la anotaste tú: pídeselo a quien la anotó.'}
                          </span>
                        ) : null}
                        {/* **Rectificar** (2026-11-12): desde la apertura del
                            día, cualquier reserva. Antes, la de otro la cambia
                            quien la anotó, y se dice desde qué hora. */}
                        {puedeRectificar && ocupaLugar(r) && (
                          infoDia.abierto && (!diaCerrado || puedeCorregir) ? (
                            <button type="button" onClick={() => setRectificando(r)}
                              className={`boton min-h-[44px] ${!mia && !idCotizacion ? 'boton-relleno' : '!border-oro text-oro'}`}>
                              ✎ {estaRectificada(r) ? 'Rectificar de nuevo' : 'Rectificar'}
                            </button>
                          ) : !mia && !idCotizacion ? (
                            <span className="text-[14px] text-hueso/70">
                              Se rectifica desde las <strong>{infoDia.apertura || 'la apertura'}</strong> del día.
                              Antes la cambia quien la anotó.
                            </span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {rectificando && (
        <RectificarReserva r={rectificando} catalogo={catalogo} descuentos={infoDia.descuentos}
          puedeAprobar={puedeAprobarDescuentos}
          deCotizacion={!!(deCotizacionIds[rectificando.id] || cotizado?.presupuestos.some((p) => p.idReserva === rectificando.id))}
          quedan={cupoDia ? cupoDia.capacidad - cupoDia.tomadas : null}
          onCerrar={() => setRectificando(null)}
          onListo={() => { setRectificando(null); void cargar(); }} />
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

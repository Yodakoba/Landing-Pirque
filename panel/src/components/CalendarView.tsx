'use client';
/**
 * Los próximos fines de semana con su ocupación y el semáforo.
 *
 * El desglose online / en el local no es decoración: dice cuánta plata está
 * cobrada y cuánta hay que cobrar el mismo día.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { CRM_APAGADO } from '@/lib/crm';
import type { EventosDelDia } from '@/lib/crm';
import Ayuda from './Ayuda';
import { verRecorrido } from './Recorrido';
import type { FechaHabil, Ocupacion, Reserva } from '@/lib/tipos';
import ReservaForm from './ReservaForm';
import DiaEditor from './DiaEditor';
import TarjetaDia from './TarjetaDia';
import DiaCompacto from './DiaCompacto';
import { usePronostico } from './Clima';
import EquipoDialogo from './EquipoDialogo';
import { estaCerrado, cierreDe, type Cierre } from '@/lib/cierres';
import { POR_DEFECTO, type Config } from '@/lib/config';
import { menusConocidos } from '@/lib/shopify';
import { POR_DEFECTO_MENUS, paraReservar, type Menu } from '@/lib/menus';
import { resumenEquipo, type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { lineaDeSemana, type Tono } from '@/lib/semana';
import { puede, puedeVer, type Rol } from '@/lib/auth';
import { enPalabras, mesDe, mesEnPalabras, semanaDe, rangoEnPalabras, hoy } from '@/lib/fechas';
import { copiarConAviso } from './AvisoFlotante';
import AvisoSobrecupo from './AvisoSobrecupo';
import { diasConSobrecupo } from '@/lib/sobrecupo';
import { pendientesDeAprobar, pendientesDeCupo, pendientesDeSobrecupo, juntarPendientes, type PendienteExclusivo } from '@/lib/aprobaciones';
import BandejaAprobaciones from './BandejaAprobaciones';
import { usarAlDia, BarraAlDia, horaDe } from './AlDia';
import { diferencias, MARCA_DURA } from '@/lib/cambios';

/** El color de cada aviso de la línea de la semana: el mismo significado que en el resto del panel. */
const TONO: Record<Tono, string> = {
  rojo: 'border-rojo/50 bg-rojo/10 text-rojo-texto',
  ambar: 'border-ambar/60 bg-ambar/10 text-ambar-texto',
  oro: 'border-oro/50 bg-oro/10 text-oro',
  cielo: 'border-cielo/50 bg-cielo/10 text-cielo-texto',
  rosa: 'border-rosa/50 bg-rosa/10 text-rosa-texto'
};

export default function CalendarView({ rol, usuario = '', gerencia = false }: {
  rol: string; usuario?: string; gerencia?: boolean;
}) {
  /**
   * Lo que esta cuenta puede hacer, sacado de la **misma** tabla de permisos
   * que usan el menú y las rutas.
   *
   * No es la protección: cada ruta vuelve a preguntar. Es para no ofrecerle
   * a un vendedor botones que le van a devolver 403 — un botón que no
   * funciona se lee como un panel roto, no como una puerta cerrada.
   */
  const conDias = puede(rol as Rol, 'dias');
  // Con vista gerencia el equipo se ve; cambiarlo sigue pidiendo el rol.
  const conEquipo = puedeVer(rol as Rol, 'equipo', gerencia);
  const conPlanilla = puede(rol as Rol, 'planilla');
  // Apagada la conexión (`CRM_APAGADO`), ni se pide.
  const conCRM = !CRM_APAGADO && puedeVer(rol as Rol, 'presupuestos', gerencia);
  const [dias, setDias] = useState<Ocupacion[] | null>(null);
  const pronostico = usePronostico();
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Ocupacion | null>(null);
  // Agregar una fecha usa la MISMA ventana que editar una: `editando` en
  // null no alcanza para distinguir "ninguna" de "una nueva", así que la
  // intención va aparte.
  const [agregandoFecha, setAgregandoFecha] = useState(false);
  const [fechasHoja, setFechasHoja] = useState<FechaHabil[]>([]);
  const fechasEnLaHoja = useMemo(() => fechasHoja.map((x) => x.fecha), [fechasHoja]);
  const [cfg, setCfg] = useState<Config>(POR_DEFECTO);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [menus, setMenus] = useState<Menu[]>(POR_DEFECTO_MENUS);
  // El equipo se carga aparte del calendario a propósito: si la planilla
  // todavía no tiene las pestañas del equipo, el calendario se dibuja igual.
  // Lo que no hay es el resumen, y el dorso de la tarjeta lo dice.
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[]; verSueldos: boolean;
    cierres: Cierre[]; puedeCorregir: boolean;
  } | null>(null);
  // **Una fecha, no una Ocupacion**: a un día de preparación se le asigna
  // equipo sin que exista en el calendario, así que no hay ocupación que
  // pasarle. Ver "Agregar fecha" y la opción de preparación.
  const [planificando, setPlanificando] =
    useState<{ fecha: string; personas: number } | null>(null);
  const [avisoPlanilla, setAvisoPlanilla] = useState('');
  /**
   * Las semanas de más adelante que alguien abrió. Las dos primeras van
   * siempre abiertas; desde la tercera, en chico hasta que se aprietan.
   * Ver `DiaCompacto`.
   */
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set());
  /**
   * Lo que el CRM del socio tiene, por fecha, **sin lo que ya está anotado**.
   *
   * Vacío mientras no llegue, y vacío si el CRM no responde: el calendario
   * se dibuja igual. Es un servicio de un tercero y no puede meterse en el
   * camino de la pantalla que contesta cuánta gente viene.
   */
  const [delSocio, setDelSocio] = useState<Record<string, EventosDelDia>>({});

  /** Crear o renovar la llave. Devuelve la nueva, o `''` si algo falló. */
  async function pedirToken(accion: 'crear' | 'renovar') {
    const r = await fetch('/api/planilla', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accion })
    });
    const d = await r.json();
    if (d.error) { setAvisoPlanilla(d.error); return ''; }
    setCfg((antes) => ({ ...antes, tokenPlanilla: d.tokenPlanilla }));
    return d.tokenPlanilla as string;
  }

  /**
   * Copia el link de la planilla de una semana, para mandarlo al grupo.
   *
   * Lo que abre ese link es **quién trabaja cada día y los números del día**,
   * sin un peso y sin menús: está hecho para circular. Lo que un trabajador
   * necesita de su propio día vive en su link personal.
   */
  async function mandarPlanilla(lunes: string) {
    // No existe hasta que alguien lo crea: un link público, aunque sea con
    // llave, no puede aparecer solo.
    const token = cfg.tokenPlanilla || await pedirToken('crear');
    if (!token) return;
    const url = `${window.location.origin}/semana/${token}?semana=${lunes}`;
    copiarConAviso(url, 'Link de la planilla copiado', 'Link de la planilla:');
  }

  /**
   * Renovar la llave: lo que hay que hacer cuando alguien deja el equipo.
   *
   * **Pide confirmación porque no afecta a una persona, afecta a todas**:
   * la copia que tiene guardada quien sí trabaja también deja de servir, así
   * que después hay que volver a mandar el link. Es el único botón del
   * calendario que rompe algo que ya estaba andando.
   */
  async function renovarPlanilla() {
    if (!confirm('¿Renovar el link de la planilla?\n\nLas copias que ya '
               + 'mandaste dejan de servir al instante, también las de quienes '
               + 'siguen en el equipo: vas a tener que mandarlo de nuevo.')) {
      return;
    }
    if (await pedirToken('renovar')) {
      setAvisoPlanilla('Link renovado: las copias anteriores dejaron de servir. '
                     + 'Vuelve a mandarlo con "Enviar planilla semanal".');
    }
  }

  /** La firma de la última carga: con ella `usarAlDia` sabe si hay cambios. */
  const [firma, setFirma] = useState('');
  /** Los pedidos de liberar un día para un evento exclusivo (`exclusividad`). */
  const [exclusivos, setExclusivos] = useState<PendienteExclusivo[]>([]);
  /**
   * **Los días que cambiaron de gente en la última actualización**, con
   * cuánto y desde qué hora (2026-11-12). Se marcan en dorado un minuto:
   * un número que cambia callado se puede pasar de largo.
   */
  const [marcas, setMarcas] = useState<{ delta: Record<string, number>; desde: string }>(
    { delta: {}, desde: '' });
  const anteriores = useRef<{ dias: Ocupacion[]; cuando: number } | null>(null);

  /**
   * `marcar`: si los días que cambiaron se marcan en dorado. **Solo cuando
   * la recarga viene de afuera** —la revisión automática o ↻ Actualizar—
   * (2026-11-12, lo pidió el cliente). Después de guardar algo en esta
   * misma pantalla no se marca: quien anotó 6 personas ya sabe que las
   * anotó. La base para comparar se actualiza igual.
   */
  const cargar = (marcar = false) => {
    // Sin parámetro: la ventana la decide dias_a_futuro de la planilla.
    const ocupacion = fetch('/api/ocupacion')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        // Si había una carga antes, se compara: qué días ganaron o perdieron gente.
        const antes = anteriores.current;
        if (antes && marcar) {
          const tomadas = (ds: Ocupacion[]) => Object.fromEntries(ds.map((x) => [x.fecha, x.tomadas]));
          const delta = diferencias(tomadas(antes.dias), tomadas(d.ocupacion ?? []));
          if (Object.keys(delta).length) setMarcas({ delta, desde: horaDe(antes.cuando) });
        }
        anteriores.current = { dias: d.ocupacion ?? [], cuando: Date.now() };
        setDias(d.ocupacion);
        if (d.config) setCfg(d.config);
        if (d.firma) setFirma(d.firma);
        // Los pedidos de liberar un día: vienen solo para quien decide.
        setExclusivos(d.exclusivos ?? []);
      })
      .catch((e) => setError(String(e)));
    // Solo para los nombres de menú del formulario manual; si falla, el
    // calendario se dibuja igual y el formulario deja escribirlos a mano.
    // Solo para avisar si una fecha nueva ya estaba en la hoja.
    fetch('/api/fechas')
      .then((r) => r.json())
      .then((d) => d.fechas && setFechasHoja(d.fechas))
      .catch(() => {});
    fetch('/api/reservas')
      .then((r) => r.json())
      .then((d) => {
        if (d.reservas) setReservas(d.reservas);
        if (d.menus) setMenus(d.menus);
      })
      .catch(() => {});
    // **Las dos de abajo se piden solo si la cuenta puede leerlas.** No es
    // por ahorrar una llamada: pedirlas igual devuelve 403, el bloque queda
    // vacío y la pantalla se ve a medio cargar en vez de verse completa.
    if (conCRM) {
      fetch('/api/crm/eventos')
        .then((r) => r.json())
        .then((d) => setDelSocio(d?.dias ?? {}))
        .catch(() => {});
    }
    if (conEquipo) {
      fetch('/api/equipo')
        .then((r) => r.json())
        .then((d) => {
          if (d.error) return;
          setEquipo({
            puestos: d.puestos ?? [], trabajadores: d.trabajadores ?? [],
            turnos: d.turnos ?? [], verSueldos: !!d.verSueldos,
            cierres: d.cierres ?? [], puedeCorregir: !!d.puedeCorregir
          });
        })
        .catch(() => {});
    }
    return ocupacion;
  };
  useEffect(() => { void cargar(); }, []);
  const alDia = usarAlDia(firma, () => cargar(true));
  // La marca dorada dura un minuto.
  useEffect(() => {
    if (!Object.keys(marcas.delta).length) return;
    const t = setTimeout(() => setMarcas({ delta: {}, desde: '' }), MARCA_DURA);
    return () => clearTimeout(t);
  }, [marcas]);

  /**
   * **Los avisos de la recepción de hoy** (2026-11-11): lo que la anfitriona
   * le dejó al jefe de turno, solo para quien puede resolverlos.
   *
   * **Salen de las reservas que esta pantalla ya cargó** (2026-11-12). Antes
   * se pedía `/api/recepcion` entera solo para contarlos, y eran seis
   * pestañas leídas del límite de Google en cada visita a la portada.
   */
  // **Los días que se pasaron del cupo** (2026-11-12): un pago entró sobre
  // reservas sin pagar. El vendedor ve solo los suyos (`diasConSobrecupo()`).
  const sobrecupo = useMemo(
    () => diasConSobrecupo(dias ?? [], reservas, rol as Rol, usuario),
    [dias, reservas, rol, usuario]);

  /**
   * **La bandeja de aprobaciones** (2026-11-12): lo que el gerente, quien
   * paga o el administrador tienen que aprobar, arriba de todo. Sale de las
   * reservas ya cargadas: no cuesta una lectura más.
   */
  const conCupo = puede(rol as Rol, 'cupo');
  const pendientes = useMemo(() => {
    // **Los pedidos de evento exclusivo** (2026-11-12) los arma el servidor:
    // solo vienen para quien tiene `exclusividad`.
    const descuentos = juntarPendientes(puede(rol as Rol, 'aprobar') ? pendientesDeAprobar(reservas) : [], exclusivos);
    if (!conCupo) return descuentos;
    // **Subir el cupo es del gerente o más arriba** (2026-11-12): los
    // pedidos del encargado y los días sobre su cupo llegan acá.
    const tomadas = Object.fromEntries((dias ?? []).map((d) => [d.fecha, d.tomadas]));
    const pedidos = pendientesDeCupo(fechasHoja, tomadas);
    const conPedido = new Set(pedidos.map((p) => p.fecha));
    return juntarPendientes(descuentos, pedidos, pendientesDeSobrecupo(dias ?? [], cfg.capacidadMaxima, conPedido));
  }, [reservas, rol, conCupo, fechasHoja, dias, cfg.capacidadMaxima, exclusivos]);

  const avisosHoy = useMemo(() => {
    if (!puede(rol as Rol, 'asistencia')) return null;
    const fecha = hoy();
    const n = reservas.filter((x) => x.fecha === fecha && x.avisoRecepcion).length;
    return n > 0 ? { fecha, n } : null;
  }, [reservas, rol]);

  /**
   * Agrupado **por semana**, conservando el orden.
   *
   * Hasta el 2026-10-30 el corte de mes mandaba y una semana que cruzaba de
   * mes quedaba partida en dos. Dejó de tener sentido cuando la semana pasó
   * a ser una caja: un sábado 31 y su domingo 1 son el mismo fin de semana
   * —el mismo turno, la misma planilla— y verlos en dos cajas distintas es
   * justo lo contrario de lo que el cliente pidió. El mes sigue marcado,
   * como una línea antes de la primera semana que lo estrena.
   */
  const semanas = useMemo(() => {
    const grupos: { semana: string; dias: Ocupacion[] }[] = [];
    for (const d of dias ?? []) {
      const semana = semanaDe(d.fecha);
      const ultima = grupos[grupos.length - 1];
      if (ultima && ultima.semana === semana) ultima.dias.push(d);
      else grupos.push({ semana, dias: [d] });
    }
    return grupos;
  }, [dias]);

  if (error) return <Aviso error={error} />;
  if (!dias) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <>
      <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
        Fechas abiertas
        {/* El único `?` que además ofrece el recorrido: es la portada,
            o sea donde vuelve quien se perdió. */}
        <Ayuda tema="calendario" onRecorrido={verRecorrido} />
      </h1>
      <BarraAlDia {...alDia} />
      {/* Quien sube el cupo lo ve en la bandeja, con *Ampliar* de un toque;
          los demás roles, el aviso de siempre. */}
      {!conCupo && <AvisoSobrecupo dias={sobrecupo} />}
      <BandejaAprobaciones pendientes={pendientes} onCambio={() => void cargar()} />
      {avisosHoy && (
        <a href={`/dia/${avisosHoy.fecha}`}
          className="tecla mb-4 flex flex-wrap items-center gap-3 rounded-xl border-2 border-ambar/60
                     bg-ambar/10 p-3 text-[16px] font-semibold text-ambar-texto hover:bg-ambar/15">
          📣 La recepción dejó {avisosHoy.n === 1 ? '1 aviso' : `${avisosHoy.n} avisos`} hoy
          <span className="boton ml-auto">Ver el día →</span>
        </a>
      )}
      <p className="text-hueso/60 text-sm mb-6">
        Toca un día para ver quiénes vienen.{' '}
        {dias.length > 0 && (
          <span className="text-hueso/40">
            {dias.length} días, hasta {enPalabras(dias[dias.length - 1].fecha)}.{' '}
          </span>
        )}
        <a href="/config" className="text-oro hover:underline">Cambiar el rango</a>.
      </p>

      {/* También está en la vista de cada día, pero ahí hay que entrar
          primero. Una reserva que llega por teléfono se anota sin saber
          todavía de qué día es: la fecha se elige en el formulario. */}
      <div className="mb-6 flex flex-wrap gap-3">
        {puede(rol as Rol, 'reservas') && (
          <button onClick={() => setCreando(true)}
            className="boton boton-relleno min-h-[48px] text-[15px]">
            Agregar reserva
          </button>
        )}
        {conDias && (
          <button onClick={() => setAgregandoFecha(true)}
            className="boton">
            Agregar fecha
          </button>
        )}
      </div>

      {avisoPlanilla && (
        <p className="mb-2 rounded border border-hueso/20 bg-panel px-3 py-2 text-sm">
          {avisoPlanilla}
        </p>
      )}

      {/* **Renovar vive acá y no en cada semana**: el link es uno solo para
          todas, y repetir el botón semana por semana haría pensar que se
          renueva "la de este sábado". Aparece recién cuando hay una llave
          creada —antes no hay nada que renovar— y en letra chica, porque es
          lo que casi nunca hay que apretar. */}
      {conPlanilla && cfg.tokenPlanilla && (
        <p className="mb-5 text-xs text-hueso/35">
          El link de la planilla semanal ya está creado.{' '}
          <button onClick={renovarPlanilla} className="text-hueso/50 hover:text-oro"
            title="Las copias que andan dando vueltas dejan de servir al instante">
            Renovarlo
          </button>{' '}
          deja sin servir las copias que andan dando vueltas — es lo que hay
          que hacer cuando alguien deja el equipo.
        </p>
      )}

      {(editando || agregandoFecha) && (
        <DiaEditor
          dia={editando}
          cupoNormal={cfg.cupoNormal}
          puedeSubirCupo={conCupo}
          apertura={cfg.horaApertura}
          fechasExistentes={fechasEnLaHoja}
          onListo={() => { setEditando(null); setAgregandoFecha(false); cargar(); }}
          onCancelar={() => { setEditando(null); setAgregandoFecha(false); }}
          /* Un día de preparación no se agrega, se planifica: se cierra esta
             ventana y se abre la del equipo de esa fecha. No se escribe nada
             en `Fechas Hábiles`, así que el sitio sigue sin ofrecer ese día. */
          onPreparacion={(fecha) => {
            setAgregandoFecha(false);
            setPlanificando({ fecha, personas: 0 });
          }}
        />
      )}

      {planificando && equipo && (
        <EquipoDialogo
          fecha={planificando.fecha}
          personas={planificando.personas}
          puestos={equipo.puestos}
          trabajadores={equipo.trabajadores}
          turnos={equipo.turnos}
          // Un día cerrado se abre en solo lectura también desde acá: si no,
          // la pantalla dejaría escribir y el servidor rechazaría cada cambio.
          cerrado={estaCerrado(equipo.cierres, planificando.fecha)}
          cierre={cierreDe(equipo.cierres, planificando.fecha)}
          puedeCorregir={equipo.puedeCorregir}
          verSueldos={equipo.verSueldos}
          onListo={() => { setPlanificando(null); cargar(); }}
          onCancelar={() => setPlanificando(null)}
        />
      )}

      {creando && (
        <ReservaForm
          fecha={dias[0]?.fecha ?? hoy()}
          menusConocidos={[...new Set([
            // Solo los menús que se venden en reservas: el catálogo también
            // trae la once, el show o el arriendo, que se cotizan y no se
            // anotan como menú de una reserva.
            ...paraReservar(menus).map((m) => m.nombre),
            ...menusConocidos(reservas, menus)
          ])].sort((a, b) => a.localeCompare(b))}
          catalogo={menus}
          reserva={null}
          onListo={() => { setCreando(false); cargar(); }}
          onCancelar={() => setCreando(false)}
        />
      )}

      {semanas.map(({ semana, dias: deLaSemana }, i) => {
        const resumen = lineaDeSemana({
          dias: deLaSemana, reservas, grupoGrande: cfg.grupoGrande, crm: delSocio,
          faltanEquipo: equipo ? Object.fromEntries(deLaSemana.map((d) => [d.fecha,
            resumenEquipo(equipo.turnos, equipo.puestos, d.fecha, d.tomadas).faltan])) : {}
        });
        const esta = semana === semanaDe(hoy());
        // El mes se anuncia antes de la PRIMERA semana que lo estrena, y no
        // envolviendo las semanas: así una que cruza de mes sigue entera y
        // el mes igual queda marcado. Se mira el primer día de la semana
        // porque es el que decide bajo qué mes aparece.
        const mes = mesDe(deLaSemana[0].fecha);
        const anterior = i > 0 ? mesDe(semanas[i - 1].dias[0].fecha) : null;
        const estrena = mes !== anterior;
        // **Las dos primeras semanas, completas; las demás, en chico**
        // (2026-11-05, lo pidió el cliente). La lista parte en la semana en
        // curso, así que son la de ahora y la que viene. Más adelante se
        // mira poco y a 90 días las tarjetas completas hacían perder la
        // orientación a fuerza de scroll.
        const lejana = i >= 2;
        const chica = lejana && !abiertas.has(semana);
        const alternar = () => setAbiertas((antes) => {
          const otra = new Set(antes);
          if (otra.has(semana)) otra.delete(semana); else otra.add(semana);
          return otra;
        });
        return (
        <div key={semana}>
          {estrena && (
            /* Separador sutil: una línea y el mes en chico. No un título
               grande, que competiría con el dato de cada día. */
            <div className={`mb-3 flex items-center gap-3 ${i > 0 ? 'mt-8' : ''}`}>
              <h2 className="text-xs uppercase tracking-widest text-hueso/45">
                {mesEnPalabras(mes)}
              </h2>
              <span className="h-px flex-1 bg-hueso/10" />
              <span className="text-xs text-hueso/35">
                {(dias ?? []).filter((d) => mesDe(d.fecha) === mes).length} días
              </span>
            </div>
          )}

          {/* **La semana es la caja y el mes la línea de arriba**, y no al
              revés como era hasta el 2026-10-30. Lo pidió el cliente con el
              porqué: en el local se piensa por semana. El mes sigue marcado
              —es la referencia para ubicarse entre 90 días— pero dejó de ser
              lo que agrupa: una grilla corrida bajo un título de mes no dice
              dónde termina un fin de semana y empieza el otro. */}
          <div
            className={`mb-4 rounded-lg border p-3 ${
              esta ? 'border-oro/40 bg-oro/[0.03]' : 'border-hueso/15'}`}>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1
                            border-b border-hueso/10 pb-2">
              <strong className="text-sm">
                {rangoEnPalabras(deLaSemana.map((x) => x.fecha))}
              </strong>
              {esta && (
                <span className="rounded bg-oro/15 px-1.5 py-0.5 text-[10px]
                                 font-semibold uppercase tracking-wide text-oro">
                  esta semana
                </span>
              )}
              {/* **Solo lo que se sale de lo normal** (2026-11-05). El conteo
                  de personas y reservas se sacó: ya se ve en las tarjetas de
                  abajo, y la línea sirve más para avisar. Ver
                  `lineaDeSemana()`. */}
              {resumen.avisos.map((a) => (
                <span key={a.texto}
                  className={`inline-flex items-center rounded-full border px-2 py-0.5
                              text-[13px] font-semibold ${TONO[a.tono]}`}>
                  {a.texto}
                </span>
              ))}
              <span className="flex-1" />
              {lejana && (
                <button type="button" onClick={alternar} aria-expanded={!chica}
                  className="boton boton-angosto">
                  {chica ? '+ Ampliar' : '− Achicar'}
                </button>
              )}
              {conPlanilla && (
                <button onClick={() => mandarPlanilla(semana)}
                  className="text-xs text-hueso/45 hover:text-oro">
                  Enviar planilla semanal
                </button>
              )}
            </div>
            {chica ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {deLaSemana.map((d) => (
                  <DiaCompacto key={d.fecha} d={d} onAbrir={alternar}
                    cambio={marcas.delta[d.fecha] ? { delta: marcas.delta[d.fecha], desde: marcas.desde } : undefined} />
                ))}
              </div>
            ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {deLaSemana.map((d) => (
              <TarjetaDia key={d.fecha} d={d} clima={pronostico.get(d.fecha)}
                delSocio={delSocio[d.fecha]}
                conEquipo={conEquipo} conDias={conDias}
                cambio={marcas.delta[d.fecha] ? { delta: marcas.delta[d.fecha], desde: marcas.desde } : undefined}
                resumen={equipo
                  ? resumenEquipo(equipo.turnos, equipo.puestos, d.fecha, d.tomadas)
                  : null}
                onEditar={() => setEditando(d)}
                onPlanificar={() => setPlanificando({ fecha: d.fecha, personas: d.tomadas })} />
            ))}
            </div>
            )}
          </div>
        </div>
        );
      })}
    </>
  );
}

export function Aviso({ error, permiso = false }: { error: string; permiso?: boolean }) {
  // Un 403 no es una falla de la planilla, y decir que lo es manda a buscar
  // el problema donde no está.
  if (permiso) {
    return (
      <div className="rounded border border-hueso/20 bg-panel p-4">
        <p className="font-semibold text-hueso/85">Esta parte no es tuya.</p>
        <p className="mt-1 text-sm text-hueso/70">{error}</p>
      </div>
    );
  }
  return (
    <div className="rounded border border-rojo/50 bg-rojo/5 p-4">
      <p className="font-semibold text-rojo-texto">No se pudo leer la planilla.</p>
      <p className="mt-1 text-sm text-hueso/70">{error}</p>
      <p className="mt-3 text-sm text-hueso/60">
        Abre <a className="underline" href="/api/diagnostico">/api/diagnostico</a> para
        ver si las hojas existen y si los encabezados calzan.
      </p>
    </div>
  );
}

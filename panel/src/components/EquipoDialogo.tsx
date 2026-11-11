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
import AyudaCorta from './AyudaCorta';
import Ayuda from './Ayuda';
import Dialogo from './Dialogo';
import ConfirmarCierre, { type PuntoDeCierre } from './ConfirmarCierre';
import { planDelDia, VINO, MODALIDAD, pagoDe, esContratado, totalAjustes,
         repartirPropina, propinaDelDia, porNombre,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import { faltaParaCerrar, type Cierre, yaLlego } from '@/lib/cierres';
import { enPesos } from '@/lib/ocupacion';
import type { Extra } from '@/lib/extras';

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';
import { normalizar } from '@/lib/columnas';
import { enPalabras, hoy } from '@/lib/fechas';
import FichaTrabajador from './FichaTrabajador';
import Asistencia from './Asistencia';
import BuscarPersona from './BuscarPersona';
import AvisoGuardado from './AvisoGuardado';
import ReservasDelDia from './ReservasDelDia';
import { AvisoCierre, PieCorreccion } from './Correccion';
import { usarAutoguardado } from './usarAutoguardado';

/** El rótulo encima de cada campo de la línea abierta de una persona. */
const ROTULO = 'mb-1 block text-[13px] font-semibold uppercase tracking-wide text-hueso/60';
/** Los campos de plata de la línea abierta: 40px, para el dedo. */
const ENTRADA_GRANDE =
  'rounded-lg border-2 border-hueso/20 bg-tinta px-2.5 py-1.5 text-[15px] ' +
  'tabular-nums focus:border-oro focus:outline-none';

export default function EquipoDialogo({
  fecha, personas, puestos, trabajadores, turnos, extras = [], cerrado = false,
  conCierre = false, verSueldos = false, enfocarPropina = false,
  conReservas = false, conAsistencia = false, cierre, puedeCorregir = false, puedeCerrar = false, onListo, onCancelar
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
  verSueldos?: boolean;
  /** Abre con el cursor en la propina, para quien viene justo a eso. */
  enfocarPropina?: boolean;
  /**
   * Si la ventana tiene **la otra cara, la de las reservas** (2026-11-03).
   * Solo la pide `/turnos`: la página del día ya muestra las reservas
   * debajo, y el calendario de la portada las tiene en el frente de su
   * tarjeta. Ver `ReservasDelDia`.
   */
  conReservas?: boolean;
  /**
   * Si se marca **Vino / No vino** (2026-11-05, lo pidió el cliente). Solo
   * en `/turnos`: desde el calendario y la página del día se planifica, y
   * quien planifica puede ser otro rol que quien pasa lista. Ahí la línea
   * dice el estado con palabras, sin botones.
   */
  conAsistencia?: boolean;
  /** Quién cerró el día y cuándo, para decirlo arriba. */
  cierre?: Cierre;
  /**
   * Si quien mira puede **corregir** un día cerrado (permiso `corregir`:
   * administrador y quien paga). Solo decide qué se dibuja; el servidor lo
   * vuelve a comprobar en cada ruta.
   */
  puedeCorregir?: boolean;
  /**
   * Si quien mira puede **cerrar el día**: el administrador y quien paga
   * (2026-11-05). Al encargado no se le ofrece el botón; la ventana le dice
   * que lo cierra quien hace los pagos.
   */
  puedeCerrar?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // El plan se edita en memoria y se guarda completo. Así quitar a alguien
  // es tan posible como agregarlo. Se conserva el turno entero, no solo
  // nombre y puesto: si alguien ya pasó lista, replanificar el día no puede
  // borrarle la asistencia ni el monto.
  const [inicial] = useState(() => ({
    plan: turnos.filter((t) => t.fecha === fecha).map(({ fila, ...resto }) => resto),
    propina: propinaDelDia(turnos.filter((t) => t.fecha === fecha), fecha)
  }));
  const [plan, setPlan] = useState<Omit<Turno, 'fila'>[]>(() => inicial.plan);
  const [error, setError] = useState('');
  const [cerrando, setCerrando] = useState(false);
  /** La ventana de "¿Cerrar el día?", con la lista de lo que se declara. */
  const [confirmando, setConfirmando] = useState(false);
  /**
   * Qué cara de la ventana se ve. **Se cambia de cara, no de ventana**: lo
   * escrito en la de trabajadores vive en el estado de este componente y no
   * en lo que se dibuja, así que girar y volver no pierde nada, y lo que
   * quede en el reloj del autoguardado se manda igual.
   */
  const [cara, setCara] = useState<'equipo' | 'reservas'>('equipo');
  const [nReservas, setNReservas] = useState<number | null>(null);
  // La propina del día, que se escribe UNA vez y el panel reparte. Lo que
  // se guarda es la parte de cada uno, no el pozo: ver `repartirPropina`.
  const [propina, setPropina] = useState(() => inicial.propina);

  /**
   * **Un día cerrado está en solo lectura, y se corrige, no se reabre**
   * (2026-11-03, decidido con el cliente).
   *
   * Hasta ese día cerrar era solo una marca: la ventana se seguía editando
   * igual y lo escrito se guardaba solo. Ahora, con el día cerrado, nada se
   * puede tocar —ni el equipo ni las reservas— y quien tiene el permiso
   * `corregir` ve *Corregir este día*. Mientras corrige **no se guarda
   * nada solo**: todo va junto al apretar *Guardar corrección*, con el
   * motivo escrito, y el día **nunca deja de estar cerrado**. Así no puede
   * quedar un día reabierto y olvidado, que era el riesgo de reabrir,
   * corregir y volver a cerrar en tres pasos.
   */
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  /** La asistencia de las reservas que se cambió durante la corrección. */
  const [pendientes, setPendientes] = useState<Record<number, string>>({});
  const bloqueado = cerrado && !corrigiendo;

  function descartarCorreccion() {
    setPlan(inicial.plan);
    setPropina(inicial.propina);
    setPendientes({});
    setMotivo('');
    setCorrigiendo(false);
  }

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
  //
  // **En orden alfabético, no en el que se grabaron las fichas** (2026-11-01,
  // lo pidió el cliente). El orden de la planilla no le sirve a quien busca a
  // una persona en una lista de quince, y deja a la recién creada al final,
  // que es justo la que se va a buscar.
  const libres = useMemo(
    () => gente.filter((t) => t.activo && !asignados.has(normalizar(t.nombre)))
               .sort(porNombre),
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

  /**
   * Cuál es el ajuste recién agregado, para llevar el cursor hasta él.
   *
   * Se agrega desde la línea de la persona, arriba, y el campo está en la
   * tabla de abajo: sin esto el botón parecería no hacer nada. La llave es
   * `nombre#posición` y se limpia al enfocar, así que no vuelve a saltar.
   */
  const [recienAjuste, setRecienAjuste] = useState('');
  /** La persona cuya línea está abierta, normalizada; una a la vez. */
  const [abierto, setAbierto] = useState('');

  const agregarAjuste = (i: number) => {
    const copia = plan.map((t) => ({ ...t, ajustes: t.ajustes.map((a) => ({ ...a })) }));
    setRecienAjuste(`${copia[i].trabajador}#${copia[i].ajustes.length}`);
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

  /**
   * Lo que se declara al cerrar, para la ventana de confirmación. Cada
   * punto con ✓ o con !; el ! no impide cerrar, pide mirarlo. Los montos
   * solo los lista quien los ve: el encargado no recibe los sueldos de la
   * ficha, así que para él un cero no querría decir nada.
   */
  const puntosDeCierre = (): PuntoDeCierre[] => {
    const p: PuntoDeCierre[] = [{
      que: 'Equipo',
      valor: `${vinieron} ${vinieron === 1 ? 'vino' : 'vinieron'}`
        + (faltaron ? ` · ${faltaron} no ${faltaron === 1 ? 'llegó' : 'llegaron'}` : ''),
      bien: true
    }, {
      que: 'Propina del día',
      valor: propina > 0 ? enPesos(propina) : 'Sin propina anotada',
      bien: propina > 0 || vinieron === 0
    }];
    // **Lo ve también el encargado** (2026-11-05, lo pidió el cliente):
    // cuánto costó el equipo de un día es algo que conviene que todos
    // tengan claro. La jornada del día es suya —la escribe él—; lo que
    // sigue siendo de quien paga son los sueldos habituales de la ficha.
    {
      const sinJornada = plan.filter((t) => t.asistencia === VINO.si
        && !esContratado(t.modalidad) && !t.pagoJornada).length;
      p.push({
        que: 'Lo que se paga',
        valor: sinJornada
          ? `${sinJornada} ${sinJornada === 1 ? 'persona' : 'personas'} sin jornada anotada`
          : enPesos(plan.reduce((s, t) => s + pagoDe(t), 0)),
        bien: !sinJornada
      });
    }
    const extrasDelDia = extras.filter((e) => e.fecha === fecha).length;
    if (extrasDelDia) {
      p.push({
        que: 'Actividades extras',
        valor: falta.extrasSinConfirmar
          ? `${falta.extrasSinConfirmar} sin confirmar`
          : 'Todas confirmadas',
        bien: !falta.extrasSinConfirmar
      });
    }
    return p;
  };

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
  // Un día que todavía no llega no se cierra (2026-11-05): ver `yaLlego()`.
  // `listo` sigue valiendo para corregir; esto es solo para cerrar.
  const llego = yaLlego(fecha, hoy());
  const listoParaCerrar = listo && llego;

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
      if (d.error) return d.error;
      // **Lo que el servidor completó desde la ficha vuelve a la pantalla.**
      // Un turno que llega sin jornada hereda la de la ficha al guardarse
      // (`guardarEquipoDelDia`), y el encargado —que no recibe las fichas—
      // seguía viendo un campo vacío y un total en cero. Solo se rellena lo
      // que acá está en cero: lo que alguien escribió nunca se pisa, y como
      // después de rellenar ya no queda nada en cero, no hay otra vuelta.
      const guardados = new Map<string, Omit<Turno, 'fila'>>(
        (d.turnos ?? []).map((t: Omit<Turno, 'fila'>) => [t.trabajador, t]));
      setPlan((antes) => {
        let cambio = false;
        const nuevo = antes.map((t) => {
          const g = guardados.get(t.trabajador);
          if (!g) return t;
          const pagoJornada = t.pagoJornada || g.pagoJornada || 0;
          const valorHora = t.valorHora || g.valorHora || 0;
          if (pagoJornada === t.pagoJornada && valorHora === t.valorHora) return t;
          cambio = true;
          return { ...t, pagoJornada, valorHora };
        });
        return cambio ? nuevo : antes;
      });
      return undefined;
    },
    600,
    // En un día cerrado nada se guarda solo: ver `corrigiendo`.
    !cerrado
  );

  /** Cierra la ventana, mandando antes lo que quede en el reloj. */
  async function salir() {
    if (corrigiendo && !confirm('¿Salir sin guardar la corrección? Lo que cambiaste se descarta.')) {
      return;
    }
    if (cerrado) { onCancelar(); return; }
    await guardado.forzar();
    if (guardado.hubo.current) onListo(); else onCancelar();
  }

  /**
   * Cerrar el día. Reabrirlo ya no se ofrece: un día cerrado se corrige,
   * ver `corrigiendo`.
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
    // Cerrar ya preguntó en su propia ventana (`ConfirmarCierre`), con la
    // lista de lo que se declara; reabrir sigue con la pregunta corta.
    if (!cerrar && !confirm(`¿Reabrir el ${enPalabras(fecha)} para corregirlo?`)) return;

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

  /**
   * Manda la corrección entera: el equipo del día y la asistencia de las
   * reservas que se cambió, todo con el mismo motivo.
   *
   * Primero el equipo y después las reservas. Son peticiones distintas y
   * no hay transacción que las junte; si una reserva falla, el equipo ya
   * quedó y el error se dice en pantalla, con la ventana abierta para
   * reintentar. Cada una queda en la bitácora con su motivo.
   */
  async function guardarCorreccion() {
    const m = motivo.trim();
    if (!m) return;
    setCerrando(true);
    setError('');
    try {
      const r = await fetch('/api/equipo/turnos', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fecha, turnos: repartirPropina(plan, propina, participa),
          correccion: { motivo: m }
        })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      for (const [fila, asistencia] of Object.entries(pendientes)) {
        const rr = await fetch(`/api/reservas/${fila}`, {
          method: 'PATCH', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ asistencia, correccion: { motivo: m } })
        });
        const dr = await rr.json();
        if (dr.error) {
          setError(`El equipo quedó corregido, pero una reserva no: ${dr.error}`);
          return;
        }
      }
      onListo();
    } catch (e) {
      setError(String(e));
    } finally { setCerrando(false); }
  }

  return (
    <Dialogo titulo={`${cara === 'reservas' ? 'Reservas' : 'Equipo'} · ${enPalabras(fecha)}`} onCerrar={() => void salir()} ancho="max-w-4xl">
      {/* **El switch de las dos caras** (2026-11-03, lo pidió el cliente):
          un lado son los trabajadores y el otro el resumen de reservas,
          como la tarjeta del calendario de la portada. Son dos botones a la
          vista y no uno que diga "Ver reservas", para que se lea en qué
          cara se está y a cuál se vuelve sin adivinar. El elegido va con
          tinte y borde dorado, no relleno: el relleno de esta ventana es
          *Cerrar el día*. */}
      {/* **El estado del cierre, arriba y a la vista de las dos caras.**
          Un día cerrado se ve en solo lectura, y la ventana dice por qué y
          qué se puede hacer: corregir, si se puede, o a quién pedírselo. */}
      {cerrado && (
        <AvisoCierre cierre={cierre} puedeCorregir={puedeCorregir}
          corrigiendo={corrigiendo} onCorregir={() => setCorrigiendo(true)} />
      )}

      {conReservas && (
        <div role="tablist" aria-label="Qué mirar de este día"
          className="mt-3 grid grid-cols-2 gap-2 sm:inline-grid">
          {([['equipo', 'Trabajadores'], ['reservas', 'Reservas']] as const).map(([k, rotulo]) => (
            <button key={k} role="tab" aria-selected={cara === k}
              onClick={() => setCara(k)}
              className={`boton justify-center ${cara === k
                ? 'border-oro bg-oro/15 font-semibold text-hueso' : ''}`}>
              {k === 'equipo' ? '↺ ' : '↻ '}{rotulo}
              {k === 'equipo' && plan.length > 0 && (
                <span className="ml-1.5 tabular-nums text-hueso/70">{plan.length}</span>
              )}
              {k === 'reservas' && nReservas !== null && (
                <span className="ml-1.5 tabular-nums text-hueso/70">{nReservas}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* La cara se gira al cambiar: `key` la vuelve a montar y con eso
          corre la animación de `.girar` (ver `globals.css`). */}
      <div key={cara} className={conReservas ? 'girar' : undefined}>
      {cara === 'reservas' ? (
        <ReservasDelDia fecha={fecha} onCuantas={setNReservas}
          modo={bloqueado ? 'bloqueado' : corrigiendo ? 'corrigiendo' : 'libre'}
          pendientes={pendientes}
          onPendiente={(fila, v) => setPendientes((p) => ({ ...p, [fila]: v }))} />
      ) : (
      /* `fieldset disabled` apaga de una vez todo lo que se escribe o se
         aprieta adentro —campos, selectores y botones—, sin tener que
         acordarse de cada uno. Es lo que deja un día cerrado en solo
         lectura en la pantalla; el servidor lo comprueba por su cuenta. */
      <fieldset disabled={bloqueado} className="m-0 min-w-0 border-0 p-0">
      {/* El `?` de esta ventana explica lo único que de verdad se aprende
          acá: qué significa dejar a alguien sin marcar. */}
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
        <Ayuda tema="asistencia" />
      </p>

      <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        {lineas.map((l) => (
          <div key={l.puesto} className="min-w-0 rounded-xl border border-hueso/15 p-2 sm:p-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="px-1 text-[15px] font-semibold">{l.puesto}</h3>
              <span className={`px-1 text-[13px] font-semibold tabular-nums ${
                l.faltan > 0 ? 'text-ambar-texto' : 'text-hueso/60'}`}>
                {l.asignados.length}
                {l.sugeridos > 0 && <> / {l.sugeridos}</>}
              </span>
            </div>

            {l.asignados.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {l.asignados.map((nombre) => {
                  const i = plan.findIndex(
                    (x) => normalizar(x.trabajador) === normalizar(nombre));
                  const t = i === -1 ? undefined : plan[i];
                  const abierta = abierto === normalizar(nombre);
                  const total = t ? pagoDe(t) : 0;
                  return (
                    /* **Una línea por persona: el nombre y Vino / No vino**
                       (2026-11-05, lo pidió el cliente). Antes eran tres
                       líneas fijas por persona —quién, si vino, y qué se
                       hace con él— más una segunda lista abajo con los
                       montos de la misma gente: con un equipo de quince,
                       había que hacer scroll hasta perder la orientación.

                       Cerrada, la línea trae **solo lo que se hace en la
                       mañana**: marcar si vino. Apretando el nombre se abre
                       la tarjeta completa —jornada, horas extra, ajustes,
                       propina, total, ficha y sacar—, **una a la vez**,
                       igual que las fichas de `/equipo`.

                       El nombre se recorta (`truncate`) en vez de envolver,
                       así que los dos botones quedan siempre en el mismo
                       lugar, se llame como se llame. */
                    <li key={nombre}
                      className={`rounded-xl border-2 ${
                        abierta ? 'border-oro/70'
                        : t?.asistencia === VINO.si ? 'border-verde/30 bg-verde/5'
                        : t?.asistencia === VINO.no ? 'border-rojo/30 bg-rojo/5'
                        : 'border-hueso/15 bg-panel'}`}>
                      <div className="flex items-center gap-1.5 p-1 sm:gap-2 sm:p-1.5">
                        <button type="button" aria-expanded={abierta}
                          onClick={() => setAbierto(abierta ? '' : normalizar(nombre))}
                          title={abierta ? 'Cerrar' : `Montos, ajustes y ficha de ${nombre}`}
                          className="tecla flex min-h-[44px] min-w-0 flex-1 items-center gap-1.5
                                     rounded-lg px-1 text-left hover:bg-hueso/5 sm:gap-2 sm:px-1.5">
                          <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center
                                                       justify-center rounded-full border-2
                                                       text-[14px] font-bold ${abierta
                            ? 'border-oro bg-oro text-tinta' : 'border-hueso/30 text-hueso/70'}`}>
                            {abierta ? '−' : '+'}
                          </span>
                          <span className="min-w-0">
                            <span className={`block truncate text-[15px] font-semibold ${
                              t?.asistencia === VINO.no ? 'text-hueso/45 line-through' : ''}`}>
                              {nombre}
                            </span>
                            {/* **La segunda línea dice lo que los botones no
                                dicen** (2026-11-05, lo pidió el cliente: "vino"
                                bajo un botón verde que dice Vino era doble).
                                Con los botones a la vista va solo la plata:
                                el total del día, cuántos ajustes y su parte de
                                la propina. Sin los botones —calendario y página
                                del día— el estado sí va con palabras, porque
                                es la única forma de saberlo. */}
                            {(() => {
                              const partes: string[] = [];
                              if (!conAsistencia && t) {
                                partes.push(!t.asistencia ? 'sin marcar'
                                  : t.asistencia === VINO.no ? 'no llegó' : 'vino');
                              }
                              if (t?.asistencia === VINO.si && total > 0) partes.push(enPesos(total));
                              if (t && esContratado(t.modalidad)) partes.push('contratado');
                              if (t?.ajustes.length) {
                                partes.push(`${t.ajustes.length} ${t.ajustes.length === 1 ? 'ajuste' : 'ajustes'}`);
                              }
                              if (repartida[i]?.propina) partes.push(`propina ${enPesos(repartida[i].propina)}`);
                              if (!partes.length) return null;
                              return (
                                <span className={`block truncate text-[13px] ${
                                  !conAsistencia && !t?.asistencia ? 'text-ambar-texto' : 'text-hueso/65'}`}>
                                  {partes.join(' · ')}
                                </span>
                              );
                            })()}
                          </span>
                        </button>
                        {conAsistencia && (
                          <Asistencia quien={nombre} valor={t?.asistencia ?? VINO.sinMarcar}
                            onCambio={(v) => marcar(nombre, v)} compacto esperar={!llego} />
                        )}
                      </div>

                      {abierta && t && (
                        <div className="space-y-3 border-t-2 border-hueso/10 px-3 pb-3 pt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className={ROTULO}>Jornada</span>
                              {/* A un contratado no se le paga jornada: su
                                  sueldo no sale de esta caja. */}
                              {esContratado(t.modalidad) ? (
                                <span className="block py-2 text-[14px] text-hueso/60">
                                  contratado · no aplica
                                </span>
                              ) : (
                                <input type="number" min={0} step={1000} className={`${ENTRADA_GRANDE} w-full`}
                                  value={t.pagoJornada || ''} placeholder="—"
                                  aria-label={`Jornada de ${t.trabajador}`}
                                  onChange={(e) => cambiarMonto(i, 'pagoJornada', e.target.value)} />
                              )}
                            </label>
                            <label className="block">
                              <span className={ROTULO}>Horas extra</span>
                              <input type="number" min={0} step={1} className={`${ENTRADA_GRANDE} w-full`}
                                value={t.horasExtra || ''} placeholder="0"
                                aria-label={`Horas extra de ${t.trabajador}`}
                                onChange={(e) => cambiarMonto(i, 'horasExtra', e.target.value)} />
                            </label>
                          </div>

                          {/* **Sumar o restar plata de ese día.** Llegó
                              tarde, se le adelantó de la caja, le toca más
                              por feriado: va como ajuste con su motivo, no
                              editando la jornada, para que quede el porqué. */}
                          <div>
                            <span className={ROTULO}>Ajustes</span>
                            {t.ajustes.map((a, k) => (
                              <div key={k} className="mb-2 flex items-center gap-1.5">
                                <input type="number" step={1000}
                                  className={`${ENTRADA_GRANDE} w-24 shrink-0`}
                                  value={a.monto || ''} placeholder="−5000"
                                  aria-label={`Monto del ajuste ${k + 1} de ${t.trabajador}`}
                                  /* El que se acaba de agregar se trae el
                                     cursor; la llave se limpia para que no
                                     vuelva a saltar en cada dibujado. */
                                  ref={(el) => {
                                    if (!el || recienAjuste !== `${t.trabajador}#${k}`) return;
                                    setRecienAjuste('');
                                    el.focus();
                                  }}
                                  onChange={(e) => cambiarAjuste(i, k, 'monto', e.target.value)} />
                                <input type="text" className={`${ENTRADA_GRANDE} w-full min-w-0 flex-1`}
                                  value={a.motivo} placeholder="por qué"
                                  aria-label={`Motivo del ajuste ${k + 1} de ${t.trabajador}`}
                                  onChange={(e) => cambiarAjuste(i, k, 'motivo', e.target.value)} />
                                <button type="button" onClick={() => quitarAjuste(i, k)}
                                  className="boton shrink-0 hover:border-rojo/60 hover:text-rojo-texto"
                                  aria-label={`Quitar el ajuste ${k + 1} de ${t.trabajador}`}
                                  title="Quitar este ajuste">✕</button>
                              </div>
                            ))}
                            <button type="button" onClick={() => agregarAjuste(i)}
                              className="boton border-oro/60 text-oro">
                              + {t.ajustes.length ? 'Otro ajuste' : 'Ajuste'}
                            </button>
                            {t.ajustes.length > 1 && (
                              /* El signo va adelante y aparte: "$-18.000" se
                                 lee como un error de tipeo. */
                              <span className="ml-2 text-[13px] tabular-nums text-hueso/65">
                                suman {totalAjustes(t.ajustes) < 0 ? '−' : '+'}
                                {enPesos(Math.abs(totalAjustes(t.ajustes)))}
                              </span>
                            )}
                          </div>

                          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-hueso/[0.04]
                                         px-3 py-2 text-[14px] tabular-nums">
                            <div>
                              <dt className={ROTULO}>Propina</dt>
                              <dd>
                                {repartida[i]?.propina
                                  ? enPesos(repartida[i].propina)
                                  : t.asistencia === VINO.si && !participa(t.trabajador)
                                    ? <span className="text-hueso/60">no participa</span>
                                    : <span className="text-hueso/45">—</span>}
                              </dd>
                            </div>
                            <div className="text-right">
                              <dt className={ROTULO}>Total del día</dt>
                              <dd>
                                {t.asistencia === VINO.si
                                  ? <strong className="text-[17px]">{enPesos(total)}</strong>
                                  : <span className="text-hueso/60">
                                      {t.asistencia === VINO.no ? 'no llegó' : 'falta marcar'}
                                    </span>}
                              </dd>
                            </div>
                          </dl>

                          <div className="flex items-center gap-2">
                            {/* La ficha, desde acá: teléfono, sueldo
                                habitual y cuenta. Si no tiene ficha —pasa al
                                renombrar a alguien con turnos— se abre para
                                crearla con su nombre. */}
                            <button type="button"
                              onClick={() => setFicha({
                                t: gente.find(
                                  (x) => normalizar(x.nombre) === normalizar(nombre)),
                                nombre
                              })}
                              className="boton flex-1 justify-center"
                              title={`Teléfono, pago y datos bancarios de ${nombre}`}>
                              Ficha
                            </button>
                            {/* Dice lo que hace y pregunta antes: es lo único
                                de esta ventana que deshace algo. */}
                            <button type="button"
                              onClick={() => {
                                if (!confirm(`¿Sacar a ${nombre} de este día?\n\n`
                                           + 'Se va de la planificación de esta fecha. '
                                           + 'Su ficha y sus otros días no se tocan.')) return;
                                setAbierto('');
                                setPlan(plan.filter(
                                  (x) => normalizar(x.trabajador) !== normalizar(nombre)));
                              }}
                              className="boton flex-1 justify-center hover:border-rojo/60
                                         hover:text-rojo-texto"
                              title={`Sacar a ${nombre} de este día`}>
                              Sacar del día
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-hueso/60">Nadie asignado.</p>
            )}

            {/* Se busca escribiendo el nombre: con veinte personas, un
                desplegable obliga a recorrerlas todas. Ver `BuscarPersona`. */}
            <div className="mt-2">
              <BuscarPersona etiqueta={`Agregar alguien a ${l.puesto}`}
                opciones={libres.map((t) => ({ nombre: t.nombre, detalle: t.puesto }))}
                onElegir={(nombre) => {
                  const ficha = gente.find((t) => t.nombre === nombre);
                  setPlan((antes) => [...antes, {
                    fecha, trabajador: nombre, puesto: l.puesto,
                    asistencia: VINO.sinMarcar,
                    modalidad: ficha?.modalidad ?? MODALIDAD.porTurno,
                    // El sueldo se propone desde la ficha y se congela al pasar
                    // lista; acá todavía no se le ha pagado nada a nadie.
                    pagoJornada: ficha?.pagoJornada ?? 0,
                    horasExtra: 0, valorHora: ficha?.valorHora ?? 0,
                    ajustes: [], propina: 0
                  }]);
                }} />
            </div>

            {/* Crear a alguien sin salir de acá. Es lo que destraba el caso
                en que la lista está vacía: sin esto hay que irse a /equipo,
                agregarlo, volver y empezar la planificación de nuevo. */}
            <button onClick={() => setFicha({ puesto: l.puesto })}
              className="tecla mt-2 min-h-[40px] w-full rounded-lg border-2 border-dashed border-hueso/25
                         px-2 text-[14px] font-semibold text-hueso/70 hover:border-oro hover:text-oro">
              + Nuevo trabajador
            </button>
          </div>
        ))}
      </div>

      {ficha && (
        <FichaTrabajador
          ficha={ficha.t} puesto={ficha.puesto ?? ''}
          nombreSugerido={ficha.nombre ?? ''} verSueldos={verSueldos}
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
          {/* **Los montos de cada persona viven en su línea**, arriba
              (2026-11-05): se abre con el `+` de su nombre. Antes iban en
              una segunda lista con la misma gente, que alargaba la ventana
              al doble. Acá queda lo único que es del día y no de una
              persona: la propina total. */}
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
            <AyudaCorta tema="propinaDia" />
            <span className="text-xs text-hueso/50">
              {propina > 0
                ? <>se reparte entre {reciben} {reciben === 1 ? 'persona' : 'personas'},
                    en partes iguales</>
                : <>si hubo, se escribe el total y el panel la reparte</>}
            </span>
          </div>
        </div>
      )}


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
      {conCierre && !cerrado && !corrigiendo && !llego && (
        <p className="mt-3 rounded border border-cielo/40 bg-cielo/5
                      px-3 py-2 text-sm text-cielo-texto">
          Este día <strong>todavía no llega</strong>. Se cierra desde el mismo
          día en adelante, cuando ya se sabe quién vino.
        </p>
      )}
      {((conCierre && !cerrado && llego) || corrigiendo) && !listo && (
        <p className="mt-3 rounded border border-ambar/40 bg-ambar/5
                      px-3 py-2 text-sm text-ambar-texto/90">
          {falta.conEquipo === 0
            ? <>Para cerrar el día, primero <strong>asigna a alguien</strong>.</>
            : <>{puedeCerrar || corrigiendo ? 'Para cerrar el día falta' : 'Falta'} marcar si{' '}
                <strong>{falta.sinMarcar === 1 ? 'una persona vino'
                       : `${falta.sinMarcar} personas vinieron`}</strong> o no.
                {conAsistencia
                  ? <>{' '}Son los botones <em>Vino</em> y <em>No vino</em> de arriba.</>
                  : <>{' '}Eso se marca en{' '}
                      <a href="/turnos" className="text-oro hover:underline">Turnos</a>.</>}</>}
        </p>
      )}

      {/* Sin botón de guardar hay que decirlo una vez, o quien lo busca
          creería que lo escrito se pierde al cerrar. Y sin el botón de
          cerrar hay que decir dónde está, o parecería que el día no se
          puede cerrar en ninguna parte. */}
      {plan.length > 0 && !cerrado && (
        <p className="mt-2 text-xs text-hueso/45">
          Lo que escribas acá <strong>se guarda solo</strong>.
          {/* El encargado no cierra (2026-11-05): se le dice quién lo hace,
              en vez de dejar un botón ausente que parece un error. */}
          {!puedeCerrar
            ? <> <strong>El día lo cierra quien hace los pagos</strong>, cuando
                revisa que esté todo listo.</>
            : !conCierre && <> <strong>El día se cierra en{' '}
            <a href="/turnos" className="text-oro hover:underline">Turnos</a></strong>,
            que es donde el panel va mostrando los días que quedaron pendientes.</>}
        </p>
      )}

      </fieldset>
      )}
      </div>

      {/* **Abajo queda una sola acción, y es la que declara algo.** Lo
          escrito ya está guardado —la línea de la izquierda lo dice—, así
          que *Listo* solo cierra la ventana y *Cerrar el día* pregunta
          antes. Dos botones hermanos, uno de ellos irreversible, eran justo
          lo que confundía.

          `flex-nowrap`: se quedan en la línea pase lo que pase. En un
          teléfono el día se recorta a "Cerrar", que dice lo mismo en menos
          espacio. */}
      {/* El error va fuera de las caras, para verse desde las dos. */}
      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      {/* **Mientras se corrige, el pie es otro**: el motivo —obligatorio,
          porque es lo que se va a preguntar un mes después— y dos botones,
          descartar o guardar. *Guardar corrección* es el único relleno. */}
      {corrigiendo ? (
        <PieCorreccion motivo={motivo} onMotivo={setMotivo}
          onCancelar={descartarCorreccion} onGuardar={() => void guardarCorreccion()}
          guardando={cerrando}
          porQueNo={listo ? undefined
            : 'El día sigue cerrado después: no puede quedar nadie sin marcar si vino o no.'} />
      ) : (
      /* **Abajo queda una sola acción, y es la que declara algo.** Lo
         escrito ya está guardado —la línea de la izquierda lo dice—, así
         que *Listo* solo cierra la ventana y *Cerrar el día* pregunta
         antes.

         **Ya no hay *Reabrir*** (2026-11-03): un día cerrado no se reabre,
         se corrige desde arriba con *Corregir este día*. Ver `corrigiendo`.

         `flex-nowrap`: se quedan en la línea pase lo que pase. En un
         teléfono el día se recorta a "Cerrar", que dice lo mismo en menos
         espacio. */
      <div className="mt-3 flex flex-nowrap items-center gap-2">
        {!cerrado && (
          <AvisoGuardado estado={guardado.estado} error={guardado.error}
            onReintentar={() => void guardado.reintentar()} />
        )}
        <span className="flex-1" />
        <button onClick={() => void salir()}
          className="boton whitespace-nowrap">
          Listo
        </button>
        {/* **Cerrar es una declaración, no un cálculo.** Deja dicho que
            alguien revisó este día: con su nombre y su hora, porque es lo
            que después permite preguntar. Mientras quede alguien sin marcar
            no se puede, y arriba dice por qué.

            **No aparece en el calendario de la portada**: ver `conCierre`. */}
        {conCierre && puedeCerrar && !cerrado && (
          <button onClick={() => setConfirmando(true)}
            disabled={cerrando || !listoParaCerrar}
            className="boton boton-relleno boton-hito whitespace-nowrap disabled:opacity-40"
            title={listoParaCerrar
              ? 'Deja el día cerrado, con tu nombre y la hora'
              : !llego ? 'Este día todavía no llega'
              : falta.conEquipo === 0
                ? 'Primero asigna a alguien'
                : `Falta marcar si ${falta.sinMarcar === 1 ? 'una persona vino' :
                    `${falta.sinMarcar} personas vinieron`} o no`}>
            {cerrando ? 'Cerrando…' : <>Cerrar<span className="hidden sm:inline"> el día</span></>}
          </button>
        )}
      </div>
      )}

      {confirmando && (
        <ConfirmarCierre fecha={enPalabras(fecha)} puntos={puntosDeCierre()}
          cerrando={cerrando}
          onVolver={() => setConfirmando(false)}
          onCerrar={() => { void cambiarCierre(true).finally(() => setConfirmando(false)); }} />
      )}
    </Dialogo>
  );
}


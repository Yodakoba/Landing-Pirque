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
import AvisoGuardado from './AvisoGuardado';
import { usarAutoguardado } from './usarAutoguardado';
import Dialogo from './Dialogo';
import { VINO, porNombre } from '@/lib/equipo';
import { costoDeExtra, actividadesConocidas,
         type Colaborador, type Extra } from '@/lib/extras';
import { normalizar } from '@/lib/columnas';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import { yaLlego } from '@/lib/cierres';
import FichaColaborador from './FichaColaborador';
import Asistencia from './Asistencia';
import BuscarPersona from './BuscarPersona';

/** El rótulo encima de cada campo de la línea abierta. */
const ROTULO = 'mb-1 block text-[13px] font-semibold uppercase tracking-wide text-hueso/60';
/** Los campos de la línea abierta: 40px, para el dedo. */
const ENTRADA_GRANDE =
  'rounded-lg border-2 border-hueso/20 bg-tinta px-2.5 py-1.5 text-[15px] ' +
  'focus:border-oro focus:outline-none';
import { AvisoCierre, PieCorreccion } from './Correccion';
import { usarSoloMira, AvisoSoloMira } from './SesionCliente';
import type { Cierre } from '@/lib/cierres';

export default function ExtrasDialogo({
  fecha, extras, colaboradores, verSueldos = false,
  cerrado = false, cierre, puedeCorregir = false, onListo, onCancelar
}: {
  fecha: string;
  /** Todas las actividades, de todos los días. Acá se filtra esta fecha. */
  extras: Extra[];
  colaboradores: Colaborador[];
  /** Si puede fijar el monto habitual al crear a alguien. */
  verSueldos?: boolean;
  /**
   * Si el día está cerrado (2026-11-03). Un día cerrado es el día completo,
   * así que sus actividades también quedan en solo lectura y se corrigen
   * igual que el equipo: ver `corregirDiaCerrado()`.
   */
  cerrado?: boolean;
  cierre?: Cierre;
  puedeCorregir?: boolean;
  onListo: () => void;
  onCancelar: () => void;
}) {
  // Se edita en memoria y se guarda el día completo, igual que el equipo:
  // así quitar una actividad es tan posible como agregarla, y nada se
  // escribe hasta apretar Guardar.
  const [inicial] = useState(
    () => extras.filter((e) => e.fecha === fecha).map(({ fila, ...resto }) => resto)
  );
  const [lista, setLista] = useState<Omit<Extra, 'fila'>[]>(() => inicial);
  // Un día cerrado: solo lectura, salvo una corrección con motivo que se
  // manda entera con un botón. Igual que la ventana del equipo.
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
  /** Vista gerencia sin el permiso de las extras: se mira y no se toca. */
  const soloMira = usarSoloMira('extras');
  const bloqueado = (cerrado && !corrigiendo) || soloMira;
  // La lista de fichas se guarda en estado y no se lee del prop: crear a
  // alguien desde acá tiene que dejarlo disponible sin cerrar la ventana.
  const [gente, setGente] = useState<Colaborador[]>(colaboradores);
  /**
   * La ficha abierta: `{}` para crear una nueva, `{ c }` para editar la de
   * alguien, `{ nombre }` para crear la que le falta a quien está asignado
   * sin tenerla. Una sola ventana para los tres casos, porque es el mismo
   * formulario.
   */
  const [ficha, setFicha] = useState<
    null | { c?: Colaborador; nombre?: string }>(null);
  const [error, setError] = useState('');
  /** El colaborador cuya línea está abierta, normalizado; uno a la vez. */
  const [abierto, setAbierto] = useState('');

  const puestas = new Set(lista.map((e) => normalizar(e.colaborador)));
  // En orden alfabético, igual que los trabajadores: dos pantallas que
  // preguntan lo mismo tienen que preguntarlo igual.
  const libres = gente.filter((c) => c.activo && !puestas.has(normalizar(c.nombre)))
                      .sort(porNombre);
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

  /**
   * **Se guarda solo**, igual que la ventana del equipo (2026-10-30): no hay
   * botón. Ver `usarAutoguardado`, que explica el porqué y el cómo.
   */
  const guardado = usarAutoguardado(lista, async (v) => {
    const r = await fetch('/api/extras/dia', {
      method: 'PUT', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fecha, extras: v })
    });
    const d = await r.json();
    return d.error || undefined;
  }, 600, !cerrado && !soloMira);

  async function guardarCorreccion() {
    const m = motivo.trim();
    if (!m) return;
    setGuardandoCorreccion(true);
    setError('');
    try {
      const r = await fetch('/api/extras/dia', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fecha, extras: lista, correccion: { motivo: m } })
      });
      const d = await r.json();
      if (d.error) { setError(d.error); return; }
      onListo();
    } catch (e) {
      setError(String(e));
    } finally { setGuardandoCorreccion(false); }
  }

  /** Cierra la ventana, mandando antes lo que quede en el reloj. */
  async function salir() {
    if (corrigiendo && !confirm('¿Salir sin guardar la corrección? Lo que cambiaste se descarta.')) {
      return;
    }
    if (cerrado || soloMira) { onCancelar(); return; }
    await guardado.forzar();
    if (guardado.hubo.current) onListo(); else onCancelar();
  }

  return (
    <Dialogo titulo={`Actividades · ${enPalabras(fecha)}`} onCerrar={() => void salir()}
             ancho="max-w-4xl">
      {cerrado && (
        <AvisoCierre cierre={cierre} puedeCorregir={puedeCorregir && !soloMira}
          corrigiendo={corrigiendo} onCorregir={() => setCorrigiendo(true)} />
      )}
      {soloMira && <AvisoSoloMira que="las actividades de este día" />}
      {/* Todo lo editable va en un `fieldset disabled` mientras el día está
          cerrado: ver la ventana del equipo. */}
      <fieldset disabled={bloqueado} className="m-0 min-w-0 border-0 p-0">
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
        /* **Una línea por persona: quién, qué hace, y Vino / No vino**
           (2026-11-05, lo pidió el cliente, igual que en el equipo). Era una
           tabla de ocho columnas que en un teléfono se desplazaba de lado;
           ahora la línea cerrada es lo que se hace en el día —marcar si
           vino— y apretando el nombre se abre lo demás: actividad, monto,
           ajuste con su motivo, total, ficha y sacar. Una a la vez. */
        <ul className="mt-4 space-y-2">
          {lista.map((e, i) => {
            const abierta = abierto === normalizar(e.colaborador);
            return (
              <li key={e.colaborador}
                className={`rounded-xl border-2 ${
                  abierta ? 'border-oro/70'
                  : e.estado === VINO.si ? 'border-verde/30 bg-verde/5'
                  : e.estado === VINO.no ? 'border-rojo/30 bg-rojo/5'
                  : 'border-hueso/15 bg-panel'}`}>
                <div className="flex items-center gap-1.5 p-1 sm:gap-2 sm:p-1.5">
                  <button type="button" aria-expanded={abierta}
                    onClick={() => setAbierto(abierta ? '' : normalizar(e.colaborador))}
                    title={abierta ? 'Cerrar' : `Actividad, monto y ficha de ${e.colaborador}`}
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
                        e.estado === VINO.no ? 'text-hueso/45 line-through' : ''}`}>
                        {e.colaborador}
                      </span>
                      {/* Qué hace y, si vino, cuánto: el estado ya lo dicen
                          los botones de al lado (ver la ventana del equipo). */}
                      <span className="block truncate text-[13px] text-hueso/65">
                        {e.actividad || 'sin actividad'}
                        {e.estado === VINO.si && <> · {enPesos(costoDeExtra(e))}</>}
                        {!!e.ajuste && <> · 1 ajuste</>}
                      </span>
                    </span>
                  </button>
                  {/* Los mismos dos botones que el equipo: dos pantallas
                      que preguntan lo mismo tienen que preguntarlo igual. */}
                  <Asistencia quien={e.colaborador} valor={e.estado}
                    onCambio={(v) => cambiar(i, 'estado', v)} compacto
                    esperar={!yaLlego(fecha, hoy())} />
                </div>

                {abierta && (
                  <div className="space-y-3 border-t-2 border-hueso/10 px-3 pb-3 pt-3">
                    <label className="block">
                      <span className={ROTULO}>Actividad</span>
                      <input type="text" list="actividades-conocidas"
                        value={e.actividad} className={`${ENTRADA_GRANDE} w-full`}
                        aria-label={`Qué hace ${e.colaborador}`}
                        placeholder="show ecuestre…"
                        onChange={(ev) => cambiar(i, 'actividad', ev.target.value)} />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className={ROTULO}>Monto</span>
                        <input type="number" min={0} step={1000}
                          className={`${ENTRADA_GRANDE} w-full`}
                          value={e.monto || ''} placeholder="—"
                          aria-label={`Cuánto cobra ${e.colaborador}`}
                          onChange={(ev) => cambiar(i, 'monto', ev.target.value)} />
                      </label>
                      <label className="block">
                        <span className={ROTULO}>Ajuste</span>
                        <input type="number" step={1000}
                          className={`${ENTRADA_GRANDE} w-full`}
                          value={e.ajuste || ''} placeholder="0"
                          aria-label={`Ajuste para ${e.colaborador}`}
                          onChange={(ev) => cambiar(i, 'ajuste', ev.target.value)} />
                      </label>
                    </div>
                    <label className="block">
                      <span className={ROTULO}>Motivo del ajuste</span>
                      <input type="text" className={`${ENTRADA_GRANDE} w-full`}
                        value={e.motivo}
                        aria-label={`Motivo del ajuste de ${e.colaborador}`}
                        placeholder={e.ajuste ? 'por qué' : ''}
                        onChange={(ev) => cambiar(i, 'motivo', ev.target.value)} />
                    </label>
                    <div className="flex items-baseline justify-between rounded-lg
                                    bg-hueso/[0.04] px-3 py-2 tabular-nums">
                      <span className={ROTULO}>Total del día</span>
                      {e.estado === VINO.si
                        ? <strong className="text-[17px]">{enPesos(costoDeExtra(e))}</strong>
                        : <span className="text-[14px] text-hueso/60">
                            {e.estado === VINO.no ? 'no llegó' : 'falta confirmar'}
                          </span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* La ficha, desde acá: teléfono, correo y cuenta. */}
                      <button type="button"
                        onClick={() => {
                          const c = gente.find(
                            (x) => normalizar(x.nombre) === normalizar(e.colaborador));
                          setFicha(c ? { c } : { nombre: e.colaborador });
                        }}
                        className="boton flex-1 justify-center"
                        title={`Teléfono, correo y datos de pago de ${e.colaborador}`}>
                        Ficha
                      </button>
                      <button type="button"
                        onClick={() => {
                          if (!confirm(`¿Sacar a ${e.colaborador} de este día?\n\n`
                                     + 'Se va de las actividades de esta fecha. '
                                     + 'Su ficha y sus otros días no se tocan.')) return;
                          setAbierto('');
                          setLista(lista.filter((_, k) => k !== i));
                        }}
                        className="boton flex-1 justify-center hover:border-rojo/60
                                   hover:text-rojo-texto"
                        title={`Sacar a ${e.colaborador} de este día`}>
                        Sacar del día
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Las actividades que alguien ya hace, para no escribirlas distinto
          cada vez. Es una ayuda, no una lista cerrada: el campo sigue
          aceptando una que no esté. */}
      <datalist id="actividades-conocidas">
        {actividadesConocidas(gente).map((a) => <option key={a} value={a} />)}
      </datalist>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <BuscarPersona etiqueta="Agregar una actividad a este día" ancho="w-full sm:w-80"
          opciones={libres.map((c) => ({ nombre: c.nombre, detalle: c.actividad }))}
          onElegir={(nombre) => {
            const c = gente.find((x) => x.nombre === nombre);
            if (c) agregar(c);
          }} />
        <button onClick={() => setFicha({})}
          className="rounded border border-dashed border-hueso/20 px-3 py-1.5
                     text-sm text-hueso/60 hover:border-oro hover:text-oro">
          + Nuevo colaborador
        </button>
      </div>

      {ficha && (
        <FichaColaborador
          ficha={ficha.c} nombreSugerido={ficha.nombre ?? ''} verSueldos={verSueldos}
          onCancelar={() => setFicha(null)}
          onListo={(c, aviso) => {
            setGente((antes) => antes.some(
              (x) => normalizar(x.nombre) === normalizar(c.nombre))
                ? antes.map((x) =>
                    (normalizar(x.nombre) === normalizar(c.nombre) ? c : x))
                : [...antes, c]);
            // Si todavía no está en el día, se agrega: crear a alguien desde
            // acá es para ponerlo a trabajar hoy. `agregar()` ya se protege
            // de duplicarlo, así que editar una ficha no agrega nada.
            agregar(c);
            setFicha(null);
            if (aviso) setError(aviso);
          }}
        />
      )}

      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      <p className="mt-4 max-w-2xl text-xs text-hueso/45">
        El monto se propone del que tiene puesto cada quien y se puede
        corregir; lo que se guarda acá es lo que se le pagó <em>ese día</em>.
        Si hay una diferencia por un acuerdo aparte,{' '}
        <strong>déjala en el ajuste con su motivo</strong>, igual que en los
        turnos: el total es el mismo y queda dicho por qué.
      </p>

      {/* Sin botón de guardar hay que decirlo una vez. */}
      </fieldset>

      {!cerrado && !soloMira && (
        <p className="mt-2 text-xs text-hueso/45">
          Lo que escribas acá <strong>se guarda solo</strong>.
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {lista.length > 0 && (
          <span className="text-sm">
            <strong className="tabular-nums text-oro">{enPesos(total)}</strong>
            <span className="text-hueso/55"> en actividades de este día</span>
            {sinConfirmar > 0 && (
              <span className="text-ambar-texto">
                {' '}· {sinConfirmar} sin confirmar
              </span>
            )}
          </span>
        )}
        {!cerrado && !soloMira && (
          <AvisoGuardado estado={guardado.estado} error={guardado.error}
            onReintentar={() => void guardado.reintentar()} />
        )}
        <span className="flex-1" />
        {!corrigiendo && (
          <button onClick={() => void salir()}
            className="boton">
            Listo
          </button>
        )}
      </div>
      {corrigiendo && (
        <PieCorreccion motivo={motivo} onMotivo={setMotivo}
          onCancelar={() => { setLista(inicial); setMotivo(''); setCorrigiendo(false); }}
          onGuardar={() => void guardarCorreccion()}
          guardando={guardandoCorreccion} />
      )}
    </Dialogo>
  );
}


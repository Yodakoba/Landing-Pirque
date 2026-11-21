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
import { useEffect, useMemo, useState } from 'react';
import { LISTA_TARJETAS, SignoAbrir, marcoGrupo, marcoTarjeta } from './TarjetaLista';
import { AjustesDelDia, BotonNuevaPersona, BotonesDeLaLinea, CampoAlLado, ENTRADA_DIA, TotalDelDia } from './LineaDelDia';
import AvisoGuardado from './AvisoGuardado';
import AyudaCorta from './AyudaCorta';
import { usarAutoguardado } from './usarAutoguardado';
import Dialogo from './Dialogo';
import { VINO, porNombre } from '@/lib/equipo';
import { costoDeExtra, actividadesConocidas, ajustesDe, conAjustes,
         type Colaborador, type Extra } from '@/lib/extras';
import { normalizar } from '@/lib/columnas';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';
import { yaLlego } from '@/lib/cierres';
import FichaColaborador from './FichaColaborador';
import Asistencia from './Asistencia';
import BuscarPersona from './BuscarPersona';

import { AvisoCierre, PieCorreccion } from './Correccion';
import { cambiosDeExtras, textoDeCambios } from '@/lib/correccion';
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
  /** La casilla que confirma la lista de cambios de la corrección. */
  const [confirmado, setConfirmado] = useState(false);
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
    if (campo === 'monto') {
      const n = Number(String(valor).replace(/[^\d]/g, ''));
      copia[i].monto = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
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
      monto: c.monto ?? 0, ...conAjustes([])
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

  /** Lo que cambió en esta corrección, con palabras: lo que se confirma y va a la bitácora. */
  const cambios = useMemo(() => (corrigiendo ? cambiosDeExtras(inicial, lista) : []), [corrigiendo, inicial, lista]);
  const firmaDeCambios = cambios.join('\n');
  useEffect(() => { setConfirmado(false); }, [firmaDeCambios]);

  async function guardarCorreccion() {
    // Lo que queda en la bitácora es la lista de cambios, no un texto libre.
    const m = textoDeCambios(cambios);
    if (!m || !confirmado) return;
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

      {/* **Un grupo, como un puesto de la ventana del equipo** (2026-11-21, lo
          pidió el cliente: *"este pop-up sigue completamente otra lógica de
          diseño y de distribución de espacios"*): el mismo marco
          (`marcoGrupo`), las tarjetas adentro, y al pie *+ Agregar…* y
          *+ Nuevo colaborador* a todo el ancho, con el ancho de una columna
          de la ventana del equipo. */}
      <div className="mt-4 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
      <div className={`min-w-0 p-2 sm:p-3 ${marcoGrupo()}`}>
        <div className="flex items-baseline justify-between gap-2">
          {/* Qué es, que sin confirmar no suma y dónde va una diferencia, en
              su `?` (2026-11-21, regla *lo que explica va en su ?*). */}
          <h3 className="flex items-center gap-2 px-1 text-[15px] font-semibold">
            Actividades del día <AyudaCorta tema="actividadesDia" />
          </h3>
          <span className="px-1 text-[13px] font-semibold tabular-nums text-hueso/60">{lista.length}</span>
        </div>
      {lista.length === 0 ? (
        <p className="mt-2 text-[13px] text-hueso/60">Nadie agendado.</p>
      ) : (
        <ul className={`mt-2 ${LISTA_TARJETAS}`}>
          {lista.map((e, i) => {
            const abierta = abierto === normalizar(e.colaborador);
            return (
              <li key={e.colaborador}
                className={marcoTarjeta(abierta, e.estado === VINO.si ? 'verde'
                  : e.estado === VINO.no ? 'rojo' : 'normal', true)}>
                <div className="flex items-center gap-1.5 p-1 sm:gap-2 sm:p-1.5">
                  <button type="button" aria-expanded={abierta}
                    onClick={() => setAbierto(abierta ? '' : normalizar(e.colaborador))}
                    title={abierta ? 'Cerrar' : `Actividad, monto y ficha de ${e.colaborador}`}
                    className="tecla flex min-h-[44px] min-w-0 flex-1 items-center gap-1.5
                               rounded-lg px-1 text-left hover:bg-hueso/5 sm:gap-2 sm:px-1.5">
                    <SignoAbrir abierta={abierta} tamano="h-6 w-6 text-[14px]" />
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
                        {ajustesDe(e).length > 0 && <> · {ajustesDe(e).length} {ajustesDe(e).length === 1 ? 'ajuste' : 'ajustes'}</>}
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
                  // **La misma línea que la del equipo** (`LineaDelDia`,
                  // 2026-11-21, lo pidió el cliente: *"la tarjeta adentro del
                  // extra tiene completamente otro diseño"*): los mismos
                  // campos, los mismos ajustes con *− Descontar / + Sumar* y
                  // el mismo total y botones.
                  <div className="space-y-2 border-t-2 border-hueso/10 px-2.5 pb-2.5 pt-2 sm:px-3">
                    {/* La actividad es texto: va en su fila, y el monto
                        debajo, donde el equipo tiene la jornada. */}
                    <CampoAlLado rotulo="Actividad">
                        <input type="text" list="actividades-conocidas"
                          value={e.actividad} className={`${ENTRADA_DIA} w-full min-w-0`}
                          aria-label={`Qué hace ${e.colaborador}`}
                          placeholder="show ecuestre…"
                          onChange={(ev) => cambiar(i, 'actividad', ev.target.value)} />
                    </CampoAlLado>
                    <div>
                      <CampoAlLado rotulo="Monto">
                        <input type="number" min={0} step={1000}
                          className={`${ENTRADA_DIA} w-full min-w-0 max-w-[10rem]`}
                          value={e.monto || ''} placeholder="—"
                          aria-label={`Cuánto cobra ${e.colaborador}`}
                          onChange={(ev) => cambiar(i, 'monto', ev.target.value)} />
                      </CampoAlLado>
                    </div>
                    <AjustesDelDia ajustes={ajustesDe(e)} quien={e.colaborador}
                      onCambio={(ajustes) => setLista(lista.map((x, k) => (k === i ? { ...x, ...conAjustes(ajustes) } : x)))} />
                    <TotalDelDia
                      total={e.estado === VINO.si
                        ? <strong className="text-[17px]">{enPesos(costoDeExtra(e))}</strong>
                        : <span className="text-hueso/60">
                            {e.estado === VINO.no ? 'no llegó' : 'falta confirmar'}
                          </span>} />
                    {/* La ficha, desde acá: teléfono, correo y cuenta. */}
                    <BotonesDeLaLinea quien={e.colaborador} que="Teléfono, correo y datos de pago"
                      onFicha={() => {
                        const c = gente.find((x) => normalizar(x.nombre) === normalizar(e.colaborador));
                        setFicha(c ? { c } : { nombre: e.colaborador });
                      }}
                      onSacar={() => {
                        if (!confirm(`¿Sacar a ${e.colaborador} de este día?\n\n`
                                   + 'Se va de las actividades de esta fecha. '
                                   + 'Su ficha y sus otros días no se tocan.')) return;
                        setAbierto('');
                        setLista(lista.filter((_, k) => k !== i));
                      }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

        {/* Se busca escribiendo el nombre, como en el equipo. En el
            computador, *+ Agregar…* y *+ Nuevo colaborador* van lado a lado,
            igual que en la ventana del equipo. */}
        <div className="lg:flex lg:flex-wrap lg:gap-x-2">
        <div className="mt-2 lg:min-w-0 lg:flex-1 lg:basis-[45%] lg:[&:has(input)]:basis-full">
          <BuscarPersona etiqueta="Agregar una actividad a este día"
            opciones={libres.map((c) => ({ nombre: c.nombre, detalle: c.actividad }))}
            onElegir={(nombre) => {
              const c = gente.find((x) => x.nombre === nombre);
              if (c) agregar(c);
            }} />
        </div>
        <div className="lg:min-w-0 lg:flex-1 lg:basis-[45%]">
        <BotonNuevaPersona texto="+ Nuevo colaborador" onClick={() => setFicha({})} />
        </div>
        </div>
      </div>
      </div>

      {/* Las actividades que alguien ya hace, para no escribirlas distinto
          cada vez. Es una ayuda, no una lista cerrada: el campo sigue
          aceptando una que no esté. */}
      <datalist id="actividades-conocidas">
        {actividadesConocidas(gente).map((a) => <option key={a} value={a} />)}
      </datalist>

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

      {/* Que se guarda solo lo dice el aviso de guardado del pie. */}
      </fieldset>

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
        <PieCorreccion cambios={cambios} confirmado={confirmado} onConfirmado={setConfirmado}
          onCancelar={() => { setLista(inicial); setConfirmado(false); setCorrigiendo(false); }}
          onGuardar={() => void guardarCorreccion()}
          guardando={guardandoCorreccion} />
      )}
    </Dialogo>
  );
}


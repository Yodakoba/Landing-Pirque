'use client';

/**
 * Las actividades extras, mes por mes, y la lista de quién las hace.
 *
 * Es una pantalla aparte y no una pestaña más del equipo, y eso lo pidió el
 * cliente con un motivo que vale tener escrito: **la planilla semanal que se
 * manda al grupo del restaurante no tiene por qué mostrar a los jinetes.**
 * Separarlas acá es lo que permite mandar esa planilla sin pensarlo.
 *
 * Donde sí vuelven a juntarse es en el informe: quien paga hace **un solo
 * pago a la semana** y necesita verlo todo junto, distinguido por quién
 * recibe propina y quién no. Eso vive en `/informe`.
 *
 * El calendario muestra lo mismo que el del equipo —cuánta gente viene ese
 * día, si está cerrado, si es privado— porque contratar un castillo inflable
 * para un día sin reservas es justo el error que esto tiene que hacer
 * evidente.
 */
import AvisoFijo from './AvisoFijo';
import AvisoGuardado from './AvisoGuardado';
import { usarGuardadoPorFicha } from './usarGuardadoPorFicha';
import { avisar, copiarConAviso } from './AvisoFlotante';
import MostrarDesactivados from './MostrarDesactivados';
import { estaCerrado, cierreDe, type Cierre } from '@/lib/cierres';
import { Fragment, useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import ExtrasDialogo from './ExtrasDialogo';
import { COLOR_TARJETA } from './TarjetaDia';
import { partesDelDia } from './PuntoDia';
import FechaDia from './FechaDia';
import BandaSeccion, { TONO } from './BandaSeccion';
import Clima, { usePronostico } from './Clima';
import { costoDeExtra, extrasDelDia, costoExtrasDelDia, actividadesConocidas,
         type Colaborador, type Extra } from '@/lib/extras';
import { VINO, porNombre } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import type { Ocupacion } from '@/lib/tipos';
import { enPesos } from '@/lib/ocupacion';
import DatosBancarios from './DatosBancarios';
import { usarSoloMira } from './SesionCliente';
import Campo from './Campo';
import { bancoVacio, sePuedeTransferir, type Banco } from '@/lib/banco';
import CampoTelefono from './CampoTelefono';
import { diasDelMes, sumarMeses, mesDe, mesEnPalabras, diaSemana, hoy,
         enPalabras } from '@/lib/fechas';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const columna = (f: string) => (diaSemana(f) === 0 ? 6 : diaSemana(f) - 1);

const ENTRADA =
  'w-full rounded border border-hueso/20 bg-tinta px-2 py-1 text-sm ' +
  'focus:border-oro focus:outline-none';

export default function CalendarioExtras({ dia }: { dia?: string } = {}) {
  const [mes, setMes] = useState(() => mesDe(dia ?? hoy()));
  const pronostico = usePronostico();
  const [colaboradores, setColaboradores] = useState<Colaborador[] | null>(null);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [verSueldos, setVerSueldos] = useState(false);
  /** Si esta cuenta administra los links personales (`links`), como en Equipo. */
  const [verLinks, setVerLinks] = useState(false);
  // **Vista gerencia** (2026-11-11): las fichas se miran y no se tocan si el
  // rol no tiene las extras; los montos y la cuenta, si no tiene `sueldos`.
  const soloMira = usarSoloMira('extras');
  const soloSueldos = usarSoloMira('sueldos');
  /** Si se muestran los colaboradores desactivados (`MostrarDesactivados`). */
  const [verInactivos, setVerInactivos] = useState(false);
  /**
   * **La ficha abierta y el buscador, igual que en Equipo** (2026-11-12, lo
   * pidió el cliente: Extras *"a la misma altura"* que Equipo). Cerrada, una
   * ficha es una línea; se abre de a una.
   */
  const [abierta, setAbierta] = useState<number | null>(null);
  const [busca, setBusca] = useState('');
  // Los días cerrados se abren en solo lectura también acá: ver `corregirDiaCerrado()`.
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [puedeCorregir, setPuedeCorregir] = useState(false);
  const [ocupacion, setOcupacion] = useState<Ocupacion[]>([]);
  // Con `?dia=` se abre esa ventana, pero recién cuando llegan los datos.
  const [editando, setEditando] = useState<string | null>(dia ?? null);
  const [listo, setListo] = useState(false);
  /** El nombre escrito y todavía no confirmado, por ficha (2026-11-12). */
  const [nombreEscrito, setNombreEscrito] = useState<Record<number, string>>({});
  /** El nombre de la ficha nueva que se está por agregar, o `null`. */
  const [nuevoNombre, setNuevoNombre] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sinPermiso, setSinPermiso] = useState(false);
  const [error, setError] = useState('');

  const cargar = () =>
    fetch('/api/extras').then((r) => r.json())
      .then((d) => {
        if (d.error) { setSinPermiso(!!d.permiso); return setError(d.error); }
        setColaboradores(d.colaboradores ?? []);
        setListo(true);
        setExtras(d.extras ?? []);
        setVerSueldos(!!d.verSueldos);
        setVerLinks(!!d.verLinks);
        setCierres(d.cierres ?? []);
        setPuedeCorregir(!!d.puedeCorregir);
      })
      .catch((e) => setError(String(e)));

  useEffect(() => { cargar(); }, []);

  // **Del mes que se está mirando, no de hoy en adelante.** Sin rango, un
  // mes pasado venía sin un solo día y las celdas perdían su color y su
  // palabra — el mismo error que se arregló en `/turnos`.
  //
  // La ocupación es solo para pintar el mes: si falla, el calendario se
  // dibuja igual y se pueden contratar actividades.
  useEffect(() => {
    const d = diasDelMes(mes);
    if (d.length === 0) return;
    fetch(`/api/ocupacion?desde=${d[0]}&hasta=${d[d.length - 1]}`)
      .then((r) => r.json())
      .then((x) => { if (x.ocupacion) setOcupacion(x.ocupacion); })
      .catch(() => {});
  }, [mes]);

  const porFecha = useMemo(
    () => new Map(ocupacion.map((o) => [o.fecha, o])), [ocupacion]
  );
  const dias = useMemo(() => diasDelMes(mes), [mes]);
  const delMes = extras.filter((e) => e.fecha.startsWith(mes));
  const totalDelMes = delMes.reduce((s, e) => s + costoDeExtra(e), 0);
  const conActividades = dias.filter((f) => extrasDelDia(extras, f).length > 0);

  /**
   * **Cada ficha se guarda sola** (2026-11-12, regla del cliente:
   * autoguardado por defecto): actividad, teléfono, monto y cuenta van por
   * `PATCH /api/extras/colaborador` con solo lo que se tocó. El nombre,
   * desactivar y quitar se confirman a mano.
   */
  const fichas = usarGuardadoPorFicha<Partial<Colaborador>>(async (nombre, cambios) => {
    const r = await fetch('/api/extras/colaborador', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre, ...cambios })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) return d.error || 'No se pudo guardar.';
  });

  /** Quitar a quien no tiene días: pregunta, y guarda la lista sin esa ficha. */
  async function quitar(i: number) {
    const c = (colaboradores ?? [])[i];
    if (!confirm(`¿Quitar a ${c.nombre || 'esta ficha'} de la lista? No tiene ningún día contratado.`)) return;
    await fichas.forzar();
    setGuardando(true);
    try {
      const resto = (colaboradores ?? []).filter((_, k) => k !== i);
      const r = await fetch('/api/extras', {
        method: 'PUT', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ colaboradores: resto })
      });
      const d = await r.json();
      if (d.error) return setError(d.error);
      setColaboradores(d.colaboradores ?? resto);
      avisar(`${c.nombre || 'La ficha'} se quitó de la lista`);
    } finally { setGuardando(false); }
  }

  /** Desactivar o activar: pregunta y se guarda en el acto. */
  async function cambiarActivo(i: number, activo: boolean) {
    const c = (colaboradores ?? [])[i];
    if (!activo && !confirm(`¿Desactivar a ${c.nombre}? Sus días guardados se conservan; deja de ofrecerse al agendar.`)) return;
    await fichas.forzar();
    const r = await fetch('/api/extras/colaborador', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: c.nombre, activo })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { avisar(d.error || 'No se pudo guardar.', 'atencion'); return; }
    setColaboradores((lista) => (lista ?? []).map((x, k) => (k === i ? { ...x, activo } : x)));
  }

  /** Renombrar: pregunta, porque sus días guardados siguen con el nombre de antes. */
  async function renombrar(i: number) {
    const c = (colaboradores ?? [])[i];
    const nuevo = (nombreEscrito[i] ?? '').trim();
    if (!nuevo || nuevo === c.nombre) return;
    const dias = extras.filter((e) => normalizar(e.colaborador) === normalizar(c.nombre)).length;
    if (!confirm(`¿Cambiar el nombre de ${c.nombre} a ${nuevo}?`
      + (dias > 0 ? `\n\nSus ${dias} días guardados siguen con el nombre ${c.nombre}.` : ''))) return;
    await fichas.forzar();
    const r = await fetch('/api/extras/colaborador', {
      method: 'PATCH', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre: c.nombre, nuevoNombre: nuevo })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { avisar(d.error || 'No se pudo cambiar el nombre.', 'atencion'); return; }
    fichas.renombrar(c.nombre, nuevo);
    setColaboradores((lista) => (lista ?? []).map((x, k) => (k === i ? { ...x, nombre: nuevo } : x)));
    setNombreEscrito(({ [i]: _x, ...resto }) => resto);
    avisar(`Ahora se llama ${nuevo}`);
  }

  /** Agregar: con su nombre, en el acto. Lo demás se guarda solo. */
  async function agregar() {
    const nombre = (nuevoNombre ?? '').trim();
    if (!nombre) return;
    setGuardando(true);
    try {
      const r = await fetch('/api/extras/colaborador', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { avisar(d.error || 'No se pudo agregar.', 'atencion'); return; }
      if (d.yaExistia) { avisar(d.aviso || `${nombre} ya estaba en la lista.`, 'atencion'); setNuevoNombre(null); return; }
      // La ficha nueva se abre sola, para completarla ahí mismo (como en Equipo).
      setAbierta((colaboradores ?? []).length);
      setColaboradores((lista) => [...(lista ?? []), d.colaborador]);
      setNuevoNombre(null);
      avisar(`${nombre} agregado`);
    } finally { setGuardando(false); }
  }

  /** Lo que va en la esquina de la ficha: el nombre por confirmar y el estado. */
  const guardarEnTarjeta = (i: number) => {
    const c = (colaboradores ?? [])[i];
    const { estado, error: falla } = fichas.estadoDe(c.nombre);
    const escrito = nombreEscrito[i];
    return (
      <>
        {escrito !== undefined && escrito.trim() !== c.nombre && (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-ambar-texto">Cambiaste el nombre.</span>
            <button type="button" className="boton boton-relleno" disabled={!escrito.trim()}
              onClick={() => void renombrar(i)}>Guardar el nombre</button>
            <button type="button" className="boton"
              onClick={() => setNombreEscrito(({ [i]: _x, ...resto }) => resto)}>Deshacer</button>
          </span>
        )}
        <AvisoGuardado estado={estado} error={falla} onReintentar={() => fichas.reintentar(c.nombre)} />
      </>
    );
  };

  /**
   * **El link personal del colaborador** (2026-11-12, lo pidió el cliente):
   * un solo botón, *Copiar link personal*, que lo crea la primera vez; y
   * *Renovar* / *Quitar link*, igual que en Equipo.
   */
  async function link(nombre: string, accion: 'crear' | 'renovar' | 'quitar') {
    if (accion === 'quitar' && !confirm(`¿Quitarle el acceso a ${nombre}? Su link deja de servir al instante.`)) return;
    await fichas.forzar();
    const r = await fetch('/api/extras/link', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ nombre, accion })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) { avisar(d.error || 'No se pudo.', 'atencion'); return; }
    setColaboradores((lista) => (lista ?? []).map((c) => (c.nombre === d.nombre ? { ...c, token: d.token } : c)));
    if (accion !== 'quitar') copiarLink(d.token, nombre);
    else avisar(`${nombre} ya no tiene acceso.`);
  }
  function copiarLink(token: string, nombre: string) {
    copiarConAviso(`${window.location.origin}/mi/${token}`, `Link de ${nombre} copiado`, `Link de ${nombre}:`);
  }

  /** El buscador: nombre, actividad y teléfono, sin tildes ni mayúsculas (como en Equipo). */
  const qBusca = normalizar(busca);
  const qDigitos = busca.replace(/\D/g, '');
  const calza = (c: Colaborador) => !qBusca
    || normalizar(`${c.nombre} ${c.actividad} ${c.telefono}`).includes(qBusca)
    || (qDigitos.length >= 3 && String(c.telefono).replace(/\D/g, '').includes(qDigitos));

  const cambiarBanco = (i: number, banco: Banco) => {
    const copia = (colaboradores ?? []).map((c) => ({ ...c }));
    copia[i].banco = banco;
    setColaboradores(copia);
    fichas.programar(copia[i].nombre, { banco });
  };

  const cambiar = (i: number, campo: keyof Colaborador, valor: string | boolean) => {
    if (campo === 'nombre') { setNombreEscrito((e) => ({ ...e, [i]: String(valor) })); return; }
    const copia = (colaboradores ?? []).map((c) => ({ ...c }));
    if (campo === 'activo') copia[i].activo = Boolean(valor);
    else if (campo === 'monto') {
      const n = Number(String(valor).replace(/[^\d]/g, ''));
      copia[i].monto = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    } else copia[i][campo] = String(valor) as never;
    setColaboradores(copia);
    fichas.programar(copia[i].nombre, { [campo]: copia[i][campo] } as Partial<Colaborador>);
  };

  // Quién tiene días contratados y no está en la lista. Pasa al renombrar a
  // alguien que ya tenía actividades; mismo mecanismo que `sinFicha()`.
  const conocidos = new Set((colaboradores ?? []).map((c) => normalizar(c.nombre)));
  const huerfanos = [...new Set(
    extras.map((e) => e.colaborador).filter((n) => !conocidos.has(normalizar(n)))
  )];

  if (error && !colaboradores) return <Aviso error={error} permiso={sinPermiso} />;
  if (!colaboradores) return <p className="text-hueso/50">Cargando…</p>;

  return (
    <section>
      {/* **La banda añil de Extras** (2026-11-13, lo pidió el cliente: el
          calendario de Extras *"al mismo formato que los otros"*). Igual que
          Reservas (dorado), Cotizaciones (rosado) y Turnos (celeste): la banda
          de una línea, la caja del mes con su tono, la fecha con `FechaDia`,
          el punto y la palabra del día, y la celda pintada por su estado.
          Ver `BandaSeccion.tsx`. */}
      <BandaSeccion tono="anil" icono="🎠" seccion="Extras" titulo="Actividades extras"
        ayuda={<Ayuda tema="extras" />} />
      <AvisoFijo clave="extras-intro" className="mb-5 max-w-2xl">
        Lo que se contrata aparte del equipo: jinetes, pintacaritas, el
        castillo inflable. <strong>Apreta un día</strong> para agregar lo que
        venga, marcar si llegó y anotar cuánto se le paga. Va aparte del
        equipo a propósito —la planilla semanal del grupo no los muestra— y
        se junta con él en el{' '}
        <a href="/informe" className="text-oro hover:underline">informe</a>,
        que es lo que descarga quien paga.
      </AvisoFijo>

      {/* La caja del mes, con el tono de Extras, como la de Turnos. */}
      <div className={`rounded-lg border p-3 ${TONO.anil.caja}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3 border-b border-hueso/10 pb-3">
        <button onClick={() => setMes(sumarMeses(mes, -1))}
          className="boton">
          ‹ Mes anterior
        </button>
        <h2 className="text-sm font-semibold uppercase tracking-wide capitalize">
          {mesEnPalabras(mes)}
        </h2>
        <button onClick={() => setMes(sumarMeses(mes, 1))}
          className="boton">
          Mes siguiente ›
        </button>
        <span className="flex-1" />
        <span className="text-[13px] text-hueso/65">
          {conActividades.length} {conActividades.length === 1 ? 'día' : 'días'} con
          actividades
          {totalDelMes > 0 && (
            <> · <strong className="tabular-nums text-anil-texto">{enPesos(totalDelMes)}</strong>
              {' '}en el mes</>
          )}
        </span>
      </div>

      {/* `relative` no es decorativo: sin él la caja clipea el mes pero el
          documento igual queda 95px más ancho que la pantalla, y en un
          teléfono **la página entera se corre de lado** —los títulos y los
          botones incluidos—, que es justo lo que este desplazamiento
          interno viene a evitar. Comprobado a 393px. El ancho mínimo es el
          de Turnos, para que la palabra del día no se corte. */}
      <div className="relative overflow-x-auto pb-1">
       <div className="min-w-[840px]">
        <div className="grid grid-cols-7 gap-1 text-center text-[13px] font-semibold
                        uppercase tracking-wide text-hueso/60">
          {DIAS.map((d) => <div key={d} className="pb-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: columna(dias[0] ?? hoy()) }, (_, i) => (
            <div key={`hueco-${i}`} />
          ))}

          {dias.map((f) => {
            const oc = porFecha.get(f);
            const delDia = extrasDelDia(extras, f);
            const costo = costoExtrasDelDia(extras, f);
            const sinConfirmar = delDia.filter((e) => !e.estado).length;
            const estado = partesDelDia(oc);
            // **El contenido va pegado arriba, y eso hay que pedirlo.** Las celdas
            // de una fila se estiran todas a la más alta, y el contenido de un
            // `<button>` se centra en vertical por defecto —es comportamiento propio
            // del botón, no del CSS de la página—, así que el número del día quedaba
            // a media altura, distinto en cada celda según cuántas líneas trajera.
            // Con `flex-col` y `justify-start` queda siempre en la primera línea y
            // lo demás se va acumulando debajo.
            //
            // **La celda la pinta el estado del día**, como en Turnos: antes
            // un día con actividades se pintaba dorado y perdía el color que
            // dice si abre, que es justo lo que esta pantalla quiere mostrar.
            return (
              <button key={f} onClick={() => setEditando(f)}
                title={`${enPalabras(f)} · actividades extras`}
                className={`flex min-h-[104px] flex-col items-stretch justify-start
                            overflow-hidden rounded border p-2
                            text-left align-top text-[13px] leading-snug transition
                            hover:border-oro
                            ${oc ? COLOR_TARJETA(oc) : 'border-hueso/10 bg-panel'}`}>
                {/* Las mismas tres líneas fijas de Turnos: la fecha y el punto,
                    el pronóstico, y la palabra del estado con todo el ancho. */}
                <span className="flex items-start justify-between gap-1">
                  <FechaDia fecha={f} tamano="celda" apagada={!(oc || delDia.length)} />
                  {estado && <span aria-hidden className="text-[14px] leading-none">{estado.punto}</span>}
                </span>
                {pronostico.get(f) && <span className="mt-1 block"><Clima c={pronostico.get(f)} /></span>}
                {estado && (
                  <span className={`mt-1 block whitespace-nowrap text-[13px] font-semibold uppercase tracking-wide ${estado.clase}`}>
                    {estado.texto}
                  </span>
                )}

                {oc && !oc.bloqueada && (
                  <span className="mt-1.5 block text-hueso/80">
                    {oc.tomadas > 0
                      ? <><b className="font-bold text-hueso">{oc.tomadas}</b> <span className="text-hueso/65">personas</span></>
                      : <span className="text-hueso/55">sin reservas</span>}
                  </span>
                )}

                {/* **Las actividades, en añil**: el tono de la sección, como
                    *en el equipo* va en dorado en Turnos. */}
                {delDia.length > 0 && (
                  <span className="mt-1 block text-anil-texto">
                    🎠 <b className="font-bold">{delDia.length}</b> {delDia.length === 1 ? 'actividad' : 'actividades'}
                    {costo > 0 && (
                      <span className="block tabular-nums">{enPesos(costo)}</span>
                    )}
                  </span>
                )}
                {/* **Lo que falta marcar, solo en un día que ya pasó**: *sin
                    confirmar* es que nadie dijo si vino, y en un día que no
                    llega es lo normal. Va abajo, siempre en el mismo lugar, con
                    borde y no relleno: como *! Sin cerrar* en Turnos. */}
                {sinConfirmar > 0 && f < hoy() && (
                  <span className="mt-auto block self-start pt-1.5">
                    <span className="block max-w-full whitespace-nowrap rounded-full border-[1.5px]
                                     border-ambar-fuerte bg-ambar/10 px-2 py-0.5 text-[13px]
                                     font-bold text-ambar-texto">
                      ! {sinConfirmar} sin confirmar
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
       </div>
      </div>
      </div>

      <AvisoFijo clave="extras-sin-confirmar" className="mt-4 max-w-2xl">
        <strong>Una actividad sin confirmar no suma</strong>, igual que un
        turno sin cerrar: agendar no es pagar. Los colores del día son
        los del calendario —cuánta gente viene, si está cerrado o es privado—
        porque contratar un castillo para un día sin nadie es justo lo que
        conviene ver antes de hacerlo.
      </AvisoFijo>

      {huerfanos.length > 0 && (
        <div className="mt-6 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-sm font-semibold text-ambar-texto">
            Hay actividades contratadas a nombre de alguien que no está en la lista.
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Pasa al renombrar a alguien que ya tenía días: los días viejos
            siguen con el nombre anterior. Agrégalo abajo con ese nombre
            exacto, o corrige el nombre en la pestaña{' '}
            <code className="text-hueso/90">Actividades</code> de la planilla.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {huerfanos.map((n) => (
              <li key={n} className="rounded bg-hueso/10 px-2 py-1 font-mono text-[13px]">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="mb-3 mt-10 text-[14px] font-bold uppercase tracking-widest text-hueso/70">
        Quiénes hacen las actividades
      </h2>
      <AvisoFijo clave="extras-fichas" className="mb-4 max-w-2xl">
        Se guardan como fichas porque se repiten: el mismo jinete vuelve el
        sábado siguiente. El <strong>monto habitual</strong> es el que se
        propone al agregarlo a un día y se puede corregir ahí; lo que se le
        pagó un día queda anotado en ese día y no cambia si después le subes
        la tarifa.
        {!verSueldos && (
          <> El monto y la cuenta bancaria los maneja el administrador.</>
        )}
      </AvisoFijo>

      {/* **Una tarjeta por colaborador**, igual que en Equipo y por el
          mismo motivo: con los datos del banco en una segunda línea, una
          tabla dejaba las líneas de uno pegadas a las del siguiente y no se
          veía dónde terminaba cada ficha. */}
      {/* Alfabética, igual que la lista de `/equipo` y el desplegable del
          planificador: tres lugares que muestran a la misma gente tienen que
          mostrarla igual. Se ordena **lo que se dibuja**, no lo que se
          guarda: `i` sigue siendo la fila real, y todo lo que edita una
          ficha la usa. Las sin nombre van al final, junto al botón de
          agregar. */}
      {/* **El buscador va arriba de la lista**, igual que en Equipo: nombre,
          actividad y teléfono, sin tildes ni mayúsculas, y el teléfono también
          por los dígitos solos. Filtra lo que ya está cargado. */}
      {(colaboradores ?? []).length > 0 && (
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nombre, actividad o teléfono"
          aria-label="Buscar colaborador"
          className="mb-3 min-h-[44px] w-full rounded-xl border-2 border-hueso/20 bg-tinta px-3
                     text-[15px] focus:border-oro focus:outline-none sm:max-w-md" />
      )}
      <MostrarDesactivados visible={verInactivos} onCambio={(v) => { setVerInactivos(v); setAbierta(null); }}
        cuantos={(colaboradores ?? []).filter((c) => !c.activo).length} />
      <fieldset disabled={soloMira} className="m-0 mt-3 min-w-0 border-0 p-0">
      <ul className="space-y-3">
        {(colaboradores ?? [])
          .map((c, i) => ({ c, i }))
          .sort((a, b) => {
            const va = !a.c.nombre.trim(), vb = !b.c.nombre.trim();
            if (va !== vb) return va ? 1 : -1;
            return porNombre(a.c, b.c);
          })
          .map(({ c, i }) => {
          // Escondidos dentro del map y no con un `filter` previo: `i` es la
          // fila real que se guarda (igual que en `/equipo`).
          if (!c.activo && !verInactivos) return null;
          // La ficha abierta no se esconde aunque deje de calzar (como en Equipo).
          if (!calza(c) && abierta !== i) return null;
          const tieneDias = extras.some(
            (e) => normalizar(e.colaborador) === normalizar(c.nombre));
          const abiertaEsta = abierta === i;
          return (
            <li key={i}
              className={`overflow-hidden rounded border ${c.activo
                ? 'border-hueso/15 bg-panel'
                : 'border-hueso/10 bg-transparent opacity-60'}`}>

              {/* **Cerrada es una línea**, como la ficha de un trabajador:
                  nombre, actividad, teléfono y lo que falta para pagarle. A la
                  derecha, dar de baja. */}
              <div className="flex items-center gap-2 pr-2">
                <button type="button" aria-expanded={abiertaEsta}
                  onClick={() => setAbierta(abiertaEsta ? null : i)}
                  className="flex min-h-[44px] min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1
                             px-3 py-2.5 text-left hover:bg-hueso/5">
                  <span aria-hidden className="w-3 text-base leading-none text-hueso/40">
                    {abiertaEsta ? '−' : '+'}
                  </span>
                  <span className="font-semibold">
                    {c.nombre.trim() || <span className="text-hueso/40">Sin nombre</span>}
                  </span>
                  <span className="text-[13px] text-hueso/70">{c.actividad || 'sin actividad'}</span>
                  <span className="text-[13px] text-hueso/60">{c.telefono}</span>
                  {verSueldos && c.monto > 0 && (
                    <span className="text-[13px] tabular-nums text-hueso/70">{enPesos(c.monto)}</span>
                  )}
                  {!c.activo && (
                    <span className="rounded-full border border-hueso/25 px-2 py-0.5
                                     text-[13px] font-semibold text-hueso/60">inactivo</span>
                  )}
                  {verSueldos && c.nombre.trim() && !sePuedeTransferir(c.banco) && (
                    <span className="rounded-full border border-ambar/50 px-2 py-0.5
                                     text-[13px] font-semibold text-ambar-texto">falta su cuenta</span>
                  )}
                </button>
                {/* Quitar solo a quien no tiene días contratados, igual que
                    en Equipo: borrar la ficha de alguien que ya vino dejaría
                    sus días con un nombre que no está en ninguna parte. */}
                {!soloMira && (!tieneDias ? (
                  <button onClick={() => void quitar(i)}
                    className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto"
                    title="Todavía no tiene ningún día contratado">Quitar</button>
                ) : c.activo ? (
                  <button onClick={() => void cambiarActivo(i, false)}
                    className="boton shrink-0 hover:border-rojo-fuerte hover:text-rojo-texto"
                    title="Tiene días guardados, así que su ficha no se quita: se desactiva">
                    Desactivar
                  </button>
                ) : (
                  <button onClick={() => void cambiarActivo(i, true)}
                    className="boton shrink-0 border-oro/50 text-oro hover:bg-oro/10">Activar</button>
                ))}
              </div>

              {abiertaEsta && (
              <div className="border-t border-hueso/10 p-3">
              <div className="flex flex-wrap items-start gap-3">
                <Campo etiqueta="Nombre" ancho="w-52">
                  <input type="text" value={nombreEscrito[i] ?? c.nombre} className={ENTRADA}
                    placeholder="Nombre o empresa"
                    aria-label={`Nombre del colaborador ${i + 1}`}
                    onChange={(e) => cambiar(i, 'nombre', e.target.value)} />
                </Campo>
                <Campo etiqueta="Actividad" ancho="w-44">
                  <input type="text" value={c.actividad} className={ENTRADA}
                    list="actividades-de-fichas" placeholder="show ecuestre…"
                    aria-label={`Actividad de ${c.nombre || 'esta persona'}`}
                    onChange={(e) => cambiar(i, 'actividad', e.target.value)} />
                </Campo>
                <Campo etiqueta="Teléfono" ancho="w-44">
                  <CampoTelefono valor={c.telefono} className={ENTRADA}
                    etiqueta={`Teléfono de ${c.nombre || 'esta persona'}`}
                    onCambio={(v) => cambiar(i, 'telefono', v)} />
                </Campo>
                {verSueldos && (
                  <Campo etiqueta="Monto habitual" ancho="w-32">
                    <input type="number" min={0} step={1000} className={ENTRADA}
                      value={c.monto || ''} placeholder="—" disabled={soloSueldos}
                      aria-label={`Monto habitual de ${c.nombre || 'esta persona'}`}
                      onChange={(e) => cambiar(i, 'monto', e.target.value)} />
                  </Campo>
                )}

                <span className="flex-1" />

                <div className="flex flex-wrap items-center gap-3 self-center pt-4 text-[13px]">
                  {guardarEnTarjeta(i)}
                </div>
              </div>

              {verLinks && (
                <div className="mt-3 border-t border-hueso/10 pt-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-36 whitespace-nowrap text-[13px] font-semibold uppercase tracking-widest text-hueso/60">
                      Link personal
                    </span>
                    {!c.nombre.trim() || (nombreEscrito[i] !== undefined && nombreEscrito[i].trim() !== c.nombre) ? (
                      <span className="text-[13px] text-ambar-texto/85">Guarda el nombre para administrar su link.</span>
                    ) : (
                      <>
                        <button onClick={() => (c.token ? copiarLink(c.token, c.nombre) : void link(c.nombre, 'crear'))}
                          className="boton boton-relleno">Copiar link personal</button>
                        {c.token && (
                          <>
                            <button onClick={() => void link(c.nombre, 'renovar')} className="boton"
                              title="Crea uno nuevo; el anterior deja de servir">Renovar</button>
                            <button onClick={() => void link(c.nombre, 'quitar')}
                              className="boton hover:border-rojo-fuerte hover:text-rojo-texto">Quitar link</button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-hueso/65">
                    Abre sus días, lo que ganó y lo que se le pagó, sin contraseña. Mándaselo por WhatsApp.
                  </p>
                </div>
              )}

              {verSueldos && (
                <div className="mt-3 border-t border-hueso/10 pt-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="w-36 pt-4 text-[13px] font-semibold uppercase tracking-widest
                                     text-hueso/60">Transferencia</span>
                    <div className="min-w-[20rem] flex-1">
                      <fieldset disabled={soloSueldos} className="m-0 min-w-0 border-0 p-0">
                      <DatosBancarios
                        banco={c.banco} nombre={c.nombre}
                        onCambio={(b) => cambiarBanco(i, b)} />
                      </fieldset>
                    </div>
                  </div>
                </div>
              )}
              </div>
              )}
            </li>
          );
        })}
        {(colaboradores ?? []).length > 0 && busca.trim() && !(colaboradores ?? []).some((c) => (c.activo || verInactivos) && calza(c)) && (
          <li className="rounded border border-dashed border-hueso/15 p-4 text-[15px] text-hueso/70">
            Nadie calza con “{busca.trim()}”.
          </li>
        )}
        {(colaboradores ?? []).length === 0 && (
          <li className="rounded border border-dashed border-hueso/15 p-6 text-sm text-hueso/50">
            Todavía no hay nadie. Apreta <strong>Agregar colaborador</strong>, o
            créalo desde un día.
          </li>
        )}
      </ul>
      </fieldset>

      {/* Las actividades que ya hace alguien, para sugerirlas al escribir. */}
      <datalist id="actividades-de-fichas">
        {actividadesConocidas(colaboradores ?? []).map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      {!soloMira && (
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {nuevoNombre === null ? (
          <button type="button" onClick={() => setNuevoNombre('')} className="boton">
            + Agregar colaborador
          </button>
        ) : (
          <form className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => { e.preventDefault(); void agregar(); }}>
            <input type="text" autoFocus value={nuevoNombre} placeholder="Nombre o empresa"
              aria-label="Nombre del colaborador nuevo" className={`${ENTRADA} w-56`}
              onChange={(e) => setNuevoNombre(e.target.value)} />
            <button type="submit" className="boton boton-relleno"
              disabled={!nuevoNombre.trim() || guardando}>{guardando ? 'Agregando…' : 'Agregar'}</button>
            <button type="button" className="boton" onClick={() => setNuevoNombre(null)}>Cancelar</button>
          </form>
        )}
        <span className="flex-1" />
        <span className="text-[13px] text-hueso/60">Los cambios de cada ficha se guardan solos.</span>
      </div>
      )}

      {error && <p className="mt-4 text-sm text-rojo-texto">{error}</p>}

      {editando && listo && (
        <ExtrasDialogo
          fecha={editando}
          extras={extras}
          colaboradores={colaboradores}
          verSueldos={verSueldos}
          cerrado={estaCerrado(cierres, editando)}
          cierre={cierreDe(cierres, editando)}
          puedeCorregir={puedeCorregir}
          onListo={() => { setEditando(null); cargar(); }}
          onCancelar={() => setEditando(null)}
        />
      )}
    </section>
  );
}

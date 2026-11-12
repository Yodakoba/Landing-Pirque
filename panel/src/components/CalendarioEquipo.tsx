'use client';

/**
 * El mes completo, para planificar el equipo también los días cerrados.
 *
 * Existe por algo que pasa seguido en el restaurante: **hay días en que no
 * entra nadie y sin embargo se trabaja.** Preparar un matrimonio, dejar la
 * carne lista, montar el salón. Esos días no están en el calendario de la
 * portada —y no deberían estarlo: ese calendario es el comercial, el que
 * contesta cómo va la ocupación, y llenarlo de martes vacíos le quita
 * justamente eso— así que no había forma de asignarles equipo.
 *
 * Acá están **todos los días del mes**, los abiertos y los que no, y
 * cualquiera se puede planificar — y marcar quién llegó, que es lo que hace
 * la jefa de turno con esta misma ventana abierta.
 *
 * **Un día de preparación no es un dato nuevo: se deduce.** Si un día no
 * recibe público y tiene gente asignada, es preparación. No hay columna que
 * llenar ni casilla que marcar, y por lo tanto tampoco hay dos verdades que
 * se puedan desalinear — el mismo criterio con el que un turno sin pasar
 * lista no suma nada.
 *
 * **Planificar un día cerrado no lo abre.** Los turnos viven en su propia
 * pestaña y no tocan `Fechas Hábiles`, así que el sitio sigue sin ofrecer
 * ese día. Se dice en pantalla porque es la duda razonable al usarlo.
 */
import { useEffect, useMemo, useState } from 'react';
import Ayuda from './Ayuda';
import { Aviso } from './CalendarView';
import EquipoDialogo from './EquipoDialogo';
import { COLOR_TARJETA } from './TarjetaDia';
import { partesDelDia } from './PuntoDia';
import Clima, { usePronostico } from './Clima';
import { resumenEquipo, esPreparacion,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import type { Ocupacion } from '@/lib/tipos';
import { estaCerrado, cierreDe, faltaParaCerrar, diasPorCerrar, type Cierre } from '@/lib/cierres';
import type { Extra } from '@/lib/extras';
import { diasDelMes, sumarMeses, mesDe, mesEnPalabras, diaSemana, hoy,
         enPalabras } from '@/lib/fechas';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Lunes primero, que es la convención chilena y la que ya usa el sitio. */
const columna = (f: string) => (diaSemana(f) === 0 ? 6 : diaSemana(f) - 1);

export default function CalendarioEquipo({ dia }: { dia?: string } = {}) {
  const [mes, setMes] = useState(() => mesDe(dia ?? hoy()));
  const pronostico = usePronostico();
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[];
    cierres: Cierre[]; extras: Extra[]; verSueldos: boolean; puedeCorregir: boolean; puedeCerrar: boolean;
  } | null>(null);
  const [ocupacion, setOcupacion] = useState<Ocupacion[]>([]);
  // Con `?dia=` se abre esa ventana apenas cargue el equipo.
  const [planificando, setPlanificando] = useState<string | null>(dia ?? null);
  const [error, setError] = useState('');

  const cargarEquipo = () =>
    fetch('/api/equipo').then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setEquipo({
          puestos: d.puestos ?? [], trabajadores: d.trabajadores ?? [],
          turnos: d.turnos ?? [], cierres: d.cierres ?? [], extras: d.extras ?? [],
          verSueldos: !!d.verSueldos, puedeCorregir: !!d.puedeCorregir, puedeCerrar: !!d.puedeCerrar
        });
      })
      .catch((e) => setError(String(e)));

  // **La ocupación se pide del mes que se está mirando, no de hoy en
  // adelante.** Pedirla sin rango es lo que hacía que un mes pasado saliera
  // entero como "preparación": sin ocupación ningún día recibe público, y la
  // regla de preparación es justamente "tiene equipo y no recibe público".
  // De paso, la tarjeta decía 0 personas en días que sí tuvieron gente.
  //
  // La ocupación es solo para pintar el mes: si falla, el calendario se
  // dibuja igual y se puede planificar. Lo que no se podría es saber cuánta
  // gente viene, y eso se nota solo.
  const cargarDias = (m: string) => {
    const dias = diasDelMes(m);
    if (dias.length === 0) return;
    const rango = `desde=${dias[0]}&hasta=${dias[dias.length - 1]}`;
    fetch(`/api/ocupacion?${rango}`).then((r) => r.json())
      .then((d) => { if (d.ocupacion) setOcupacion(d.ocupacion); })
      .catch(() => {});
  };

  useEffect(() => { cargarEquipo(); }, []);
  // Y se vuelve a pedir al cambiar de mes, que es cuando cambia el rango.
  useEffect(() => { cargarDias(mes); }, [mes]);

  const porFecha = useMemo(
    () => new Map(ocupacion.map((o) => [o.fecha, o])), [ocupacion]
  );
  const dias = useMemo(() => diasDelMes(mes), [mes]);
  const turnos = equipo?.turnos ?? [];
  const puestos = equipo?.puestos ?? [];

  const cierres = equipo?.cierres ?? [];
  const extras = equipo?.extras ?? [];
  const cerrado = (f: string) => estaCerrado(cierres, f);
  const falta = (f: string) => faltaParaCerrar(turnos, extras, f);

  const personasDe = (f: string) => porFecha.get(f)?.tomadas ?? 0;
  const resumenDe = (f: string) => resumenEquipo(turnos, puestos, f, personasDe(f));

  const prepara = (f: string) => esPreparacion({
    conEquipo: resumenDe(f).total > 0,
    abierto: !!porFecha.get(f) && !porFecha.get(f)!.bloqueada,
    personas: personasDe(f)
  });

  // Cuántos días del mes tienen equipo, y cuántos de esos son preparación.
  const conEquipo = dias.filter((f) => resumenDe(f).total > 0);
  const preparacion = conEquipo.filter(prepara);
  // Los días que ya pasaron, tienen equipo y nadie cerró todavía. Es lo que
  // el encargado tiene que ir a mirar, y por eso va arriba y no escondido
  // en una celda del mes.
  const porCerrar = diasPorCerrar(turnos, extras, cierres, hoy())
    .filter((f) => dias.includes(f));

  if (error) return <Aviso error={error} />;

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Calendario del equipo<Ayuda tema="turnos" />
      </h1>
      <p className="mb-5 max-w-2xl text-sm text-hueso/60">
        El mes completo, para asignar equipo <strong>cualquier día</strong>,
        incluidos los que no reciben público: los de preparación, montaje o
        cierre. <strong>Apreta el día</strong> —el que sea— y asígnale equipo;
        ahí mismo se marca quién llegó.
      </p>
      <p className="mb-5 max-w-2xl text-sm text-hueso/60">
        Planificar un día cerrado <strong>no lo abre al público</strong>, así
        que un día de preparación no necesita nada más. Abrir un día para
        recibir reservas se sigue haciendo en el{' '}
        <a href="/" className="text-oro hover:underline">calendario</a>.
      </p>

      {/* **Lo que falta por cerrar, arriba y no escondido en una celda.**
          Lo pidió el cliente así: una vez que el día pasó, el panel avisa
          cuánta gente y cuántas actividades quedaron sin confirmar, y desde
          ahí se cierra. Un día que todavía no llega no aparece: nadie puede
          decir quién vino a un sábado que no ha ocurrido. */}
      {porCerrar.length > 0 && (
        <div className="mb-5 rounded border border-ambar/50 bg-ambar/5 p-4">
          <p className="text-sm font-semibold text-ambar-texto">
            {porCerrar.length === 1
              ? 'Hay un día por cerrar.'
              : `Hay ${porCerrar.length} días por cerrar.`}
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Un día cerrado es uno donde alguien ya confirmó quién vino, anotó
            la propina y revisó los montos. Mientras no se cierre, el informe
            de ese periodo está incompleto. Después de cerrarlo, solo quien
            hace los pagos lo puede corregir.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {porCerrar.map((f) => {
              const x = falta(f);
              return (
                <button key={f} onClick={() => setPlanificando(f)}
                  className="rounded border border-ambar/40 px-2 py-1 text-xs
                             hover:border-oro">
                  <span className="inline-block first-letter:uppercase">{enPalabras(f)}</span>
                  {x.sinMarcar > 0 && (
                    <span className="text-ambar-texto"> · {x.sinMarcar} sin marcar</span>
                  )}
                  {x.extrasSinConfirmar > 0 && (
                    <span className="text-ambar-texto">
                      {' '}· {x.extrasSinConfirmar} extra{x.extrasSinConfirmar === 1 ? '' : 's'}
                    </span>
                  )}
                  {x.sinPropina && <span className="text-hueso/50"> · sin propina</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
        <span className="text-xs text-hueso/50">
          {conEquipo.length} {conEquipo.length === 1 ? 'día' : 'días'} con equipo
          {preparacion.length > 0 && (
            <> · {preparacion.length} de preparación</>
          )}
        </span>
      </div>

      {/* Siete columnas no caben en un teléfono sin volver ilegible cada
          celda, así que el mes se desplaza de lado DENTRO de su caja. Es lo
          mismo que hacen las tablas del panel, y es preferible a achicar el
          texto hasta que "preparación" no se lea. */}
      {/* `relative` no es decorativo: sin él la caja clipea el mes pero el
          documento igual queda 95px más ancho que la pantalla, y en un
          teléfono **la página entera se corre de lado** —los títulos y los
          botones incluidos—, que es justo lo que este desplazamiento
          interno viene a evitar. Comprobado a 393px. */}
      <div className="relative overflow-x-auto pb-1">
       <div className="min-w-[840px]">
        <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold
                        uppercase tracking-wide text-hueso/60">
          {DIAS.map((d) => <div key={d} className="pb-1">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
        {/* Los huecos hasta el primer día, para que caiga en su columna. */}
        {Array.from({ length: columna(dias[0] ?? hoy()) }, (_, i) => (
          <div key={`hueco-${i}`} />
        ))}

        {dias.map((f) => {
          const oc = porFecha.get(f);
          const res = resumenDe(f);
          const preparando = prepara(f);
          const esHoy = f === hoy();
          const estado = partesDelDia(oc, preparando);
          // **El contenido va pegado arriba, y eso hay que pedirlo.** Las celdas
          // de una fila se estiran todas a la más alta, y el contenido de un
          // `<button>` se centra en vertical por defecto —es comportamiento propio
          // del botón, no del CSS de la página—, así que el número del día quedaba
          // a media altura, distinto en cada celda según cuántas líneas trajera.
          // Con `flex-col` y `justify-start` queda siempre en la primera línea y
          // lo demás se va acumulando debajo.
          return (
            <button key={f} onClick={() => setPlanificando(f)} disabled={!equipo}
              title={`${enPalabras(f)} · planificar el equipo`}
              className={`flex min-h-[104px] flex-col items-stretch justify-start
                          overflow-hidden rounded border p-2
                          text-left align-top
                          text-[13px] leading-snug transition
                          hover:border-oro disabled:opacity-40
                          ${preparando ? 'border-cafe/50 bg-cafe/[0.06]'
                             : oc ? COLOR_TARJETA(oc)
                                  : 'border-hueso/10 bg-panel'}
                          ${esHoy ? 'ring-1 ring-oro' : ''}`}>
              {/* **Tres líneas fijas, ninguna que envuelve** (2026-11-06). La
                  fecha y el punto de color arriba; el pronóstico debajo; y la
                  palabra del estado en su propia línea, con todo el ancho de
                  la celda. Antes la palabra iba al lado de la fecha y del
                  pronóstico, y en un teléfono "preparación" no cabía y se
                  cortaba: un dato que desaparece a medias es peor que uno
                  chico. */}
              <span className="flex items-start justify-between gap-1">
                {/* **La fecha es lo primero que se busca** (2026-11-06, lo
                    pidió el cliente: iba a 11px, más chica que todo lo que
                    tenía debajo). Va a 18, en negrita si el día tiene algo,
                    y en un día vacío sigue legible: más clara, no borrada. */}
                {/* **El día de la semana va en la celda, al lado del número**
                    (2026-11-06, lo pidió el cliente: *"hay suficiente espacio
                    para que se ponga el jueves 6 en la misma tarjeta… chao,
                    Excel"*). Con el nombre solo en la fila de arriba había
                    que subir la vista y contar columnas para saber qué día
                    era; ahora cada celda se lee sola. La fila de arriba se
                    queda como guía al recorrer el mes. */}
                <span className={`flex items-baseline gap-1.5 leading-none ${oc || preparando || res.total > 0
                  ? 'text-hueso' : 'text-hueso/55'}`}>
                  <span className="text-[13px] font-semibold uppercase tracking-wide opacity-75">
                    {DIAS[columna(f)]}
                  </span>
                  <span className={`text-[18px] ${oc || preparando || res.total > 0 ? 'font-bold' : 'font-medium'}`}>
                    {Number(f.slice(8, 10))}
                  </span>
                </span>
                {estado && <span aria-hidden className="text-[14px] leading-none">{estado.punto}</span>}
              </span>
              {pronostico.get(f) && <span className="mt-1 block"><Clima c={pronostico.get(f)} /></span>}
              {estado && (
                <span className={`mt-1 block whitespace-nowrap text-[12px] font-semibold uppercase tracking-wide ${estado.clase}`}>
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

              {/* **Lo cotizado, en rosado, al lado de lo demás y no en vez
                  de** (2026-11-01). Un presupuesto no es un estado del día
                  —eso lo dice `PuntoDia`: público, cerrado, preparación— es
                  una capa encima. Un sábado cerrado puede tener una
                  cotización dando vueltas, y las dos cosas son ciertas.

                  Está acá porque un día con 43 personas posibles es un día
                  que quizás haya que armar, y esta es la pantalla donde se
                  decide a quién se le avisa. */}
              {oc && oc.presupuestos > 0 && (
                <span className="mt-1 block text-rosa-texto">
                  {oc.presupuestadas > 0
                    ? <><b className="font-bold">{oc.presupuestadas}</b> posibles</>
                    : <>{oc.presupuestos} presup.</>}
                </span>
              )}

              {res.total > 0 && (
                <span className="mt-1 block text-oro">
                  <b className="font-bold">{res.total}</b> en el equipo
                </span>
              )}
              {res.faltan > 0 && (
                <span className="mt-0.5 block font-semibold text-ambar-texto">faltan {res.faltan}</span>
              )}
              {/* **Cerrado o no, de un vistazo** (2026-11-05, lo pidió el
                  cliente). Un día cerrado lleva una pastilla verde llena;
                  uno que ya pasó y nadie cerró, una ámbar con borde y
                  debajo qué le falta. Se distinguen por forma además de
                  por color: relleno contra borde. Un día sin equipo no
                  dice nada, porque no hay qué cerrar.

                  **Sin brillo ni letra extra gruesa** (2026-11-06): con
                  eso la pastilla era lo más fuerte de la celda, más que la
                  fecha y que la gente. Sigue siendo la única cosa rellena
                  de la celda, que es lo que la hace encontrable. */}
              {/* **La pastilla de cierre vive siempre en el mismo lugar**:
                  abajo a la izquierda de la celda (2026-11-06, lo pidió el
                  cliente). Antes iba pegada a lo último que hubiera, así que
                  en un día con mucho quedaba abajo y en uno con poco a media
                  altura, y el "3 por marcar" iba debajo de ella. Ahora
                  `mt-auto` la empuja al fondo —la celda se estira al alto de
                  su fila— y lo que le falta va arriba, con el resto de los
                  datos. Mismo lugar en todas las celdas: se busca sin leer. */}
              {res.total > 0 && cerrado(f) && (
                <span className="mt-auto block self-start pt-1.5">
                  <span className="block max-w-full whitespace-nowrap rounded-full bg-verde-fuerte
                                   px-2 py-0.5 text-[12px] font-bold text-tinta">
                    ✓ Cerrado
                  </span>
                </span>
              )}
              {res.total > 0 && !cerrado(f) && f < hoy() && (() => {
                const x = falta(f);
                const pendiente = x.sinMarcar > 0
                  ? `${x.sinMarcar} por marcar`
                  : x.extrasSinConfirmar > 0
                    ? `${x.extrasSinConfirmar} extra${x.extrasSinConfirmar === 1 ? '' : 's'} por confirmar`
                    : 'listo para cerrar';
                return (
                  <>
                    <span className="mt-1 block text-[12px] font-semibold text-ambar-texto">{pendiente}</span>
                    <span className="mt-auto block self-start pt-1.5">
                      <span className="block max-w-full whitespace-nowrap rounded-full border-[1.5px]
                                       border-ambar-fuerte bg-ambar/10 px-2 py-0.5 text-[12px]
                                       font-bold text-ambar-texto">
                        ! Sin cerrar
                      </span>
                    </span>
                  </>
                );
              })()}
            </button>
          );
        })}
        </div>
       </div>
      </div>

      <p className="mt-4 max-w-2xl text-xs text-hueso/50">
        <strong>Un día con equipo y sin público es un día de preparación</strong>,
        y así aparece acá y en la planilla semanal. No hay que marcarlo: se
        deduce de que el día no recibe gente y tiene a alguien asignado.
        Los colores son los del calendario — verde, amarillo y rojo según la
        ocupación, azul privado, rojo cerrado, gris sin configurar — y un día
        sin borde de color simplemente no abre.
      </p>

      {planificando && equipo && (
        <EquipoDialogo
          fecha={planificando}
          personas={personasDe(planificando)}
          puestos={equipo.puestos}
          trabajadores={equipo.trabajadores}
          turnos={equipo.turnos}
          extras={equipo.extras}
          cerrado={cerrado(planificando)}
          cierre={cierreDe(cierres, planificando)}
          puedeCorregir={equipo.puedeCorregir}
          puedeCerrar={equipo.puedeCerrar}
          // La única pantalla que cierra un día: ver `conCierre`.
          conCierre
          // La otra cara, la de las reservas: ver `conReservas`.
          conReservas
          // Vino / No vino se marca solo acá: ver `conAsistencia`.
          conAsistencia
          verSueldos={equipo.verSueldos}
          onListo={() => { setPlanificando(null); cargarEquipo(); }}
          onCancelar={() => setPlanificando(null)}
        />
      )}
    </section>
  );
}

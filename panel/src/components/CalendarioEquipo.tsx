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
import { Aviso } from './CalendarView';
import EquipoDialogo from './EquipoDialogo';
import { COLOR_TARJETA } from './TarjetaDia';
import PuntoDia from './PuntoDia';
import Clima, { usePronostico } from './Clima';
import { resumenEquipo, esPreparacion,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import type { Ocupacion } from '@/lib/tipos';
import { estaCerrado, faltaParaCerrar, diasPorCerrar, type Cierre } from '@/lib/cierres';
import type { Extra } from '@/lib/extras';
import { diasDelMes, sumarMeses, mesDe, mesEnPalabras, diaSemana, hoy,
         enPalabras } from '@/lib/fechas';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Lunes primero, que es la convención chilena y la que ya usa el sitio. */
const columna = (f: string) => (diaSemana(f) === 0 ? 6 : diaSemana(f) - 1);

export default function CalendarioEquipo() {
  const [mes, setMes] = useState(() => mesDe(hoy()));
  const pronostico = usePronostico();
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[];
    cierres: Cierre[]; extras: Extra[]; esAdmin: boolean;
  } | null>(null);
  const [ocupacion, setOcupacion] = useState<Ocupacion[]>([]);
  const [planificando, setPlanificando] = useState<string | null>(null);
  const [error, setError] = useState('');

  const cargarEquipo = () =>
    fetch('/api/equipo').then((r) => r.json())
      .then((d) => {
        if (d.error) return setError(d.error);
        setEquipo({
          puestos: d.puestos ?? [], trabajadores: d.trabajadores ?? [],
          turnos: d.turnos ?? [], cierres: d.cierres ?? [], extras: d.extras ?? [],
          esAdmin: !!d.esAdmin
        });
      })
      .catch((e) => setError(String(e)));

  // La ocupación es solo para pintar el mes: si falla, el calendario se
  // dibuja igual y se puede planificar. Lo que no se podría es saber cuánta
  // gente viene, y eso se nota solo.
  const cargarDias = () =>
    fetch('/api/ocupacion').then((r) => r.json())
      .then((d) => { if (d.ocupacion) setOcupacion(d.ocupacion); })
      .catch(() => {});

  useEffect(() => { cargarEquipo(); cargarDias(); }, []);

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
        Calendario del equipo
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
        <div className="mb-5 rounded border border-amber-500/50 bg-amber-500/5 p-4">
          <p className="text-sm font-semibold text-amber-300">
            {porCerrar.length === 1
              ? 'Hay un día por cerrar.'
              : `Hay ${porCerrar.length} días por cerrar.`}
          </p>
          <p className="mt-1 text-sm text-hueso/70">
            Un día cerrado es uno donde alguien ya confirmó quién vino, anotó
            la propina y revisó los montos. Mientras no se cierre, el informe
            de ese periodo está incompleto.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {porCerrar.map((f) => {
              const x = falta(f);
              return (
                <button key={f} onClick={() => setPlanificando(f)}
                  className="rounded border border-amber-500/40 px-2 py-1 text-xs
                             hover:border-oro">
                  <span className="capitalize">{enPalabras(f)}</span>
                  {x.sinMarcar > 0 && (
                    <span className="text-amber-300"> · {x.sinMarcar} sin marcar</span>
                  )}
                  {x.extrasSinConfirmar > 0 && (
                    <span className="text-amber-300">
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
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
          ‹ Mes anterior
        </button>
        <h2 className="text-sm font-semibold uppercase tracking-wide capitalize">
          {mesEnPalabras(mes)}
        </h2>
        <button onClick={() => setMes(sumarMeses(mes, 1))}
          className="rounded border border-hueso/20 px-3 py-1.5 text-sm hover:border-oro">
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
      <div className="overflow-x-auto pb-1">
       <div className="min-w-[640px]">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px]
                        uppercase tracking-wide text-hueso/40">
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
              className={`flex min-h-[92px] flex-col items-stretch justify-start
                          overflow-hidden rounded border p-1.5
                          text-left align-top
                          text-[11px] leading-tight transition
                          hover:border-oro disabled:opacity-40
                          ${preparando ? 'border-oro/40 bg-oro/5'
                             : oc ? COLOR_TARJETA(oc)
                                  : 'border-hueso/10 bg-hueso/[0.02]'}
                          ${esHoy ? 'ring-1 ring-oro' : ''}`}>
              <span className="flex items-start justify-between">
                {/* El pronóstico bajo el número, en el aire que ya deja el
                    punto con su palabra: no cambia el alto de la celda. */}
                <span className="flex flex-col items-start gap-1">
                  <span className={oc || preparando ? 'font-semibold' : 'text-hueso/45'}>
                    {Number(f.slice(8, 10))}
                  </span>
                  <Clima c={pronostico.get(f)} />
                </span>
                {/* El punto con su palabra debajo: la misma regla en los
                    tres calendarios, para que un día se lea igual en
                    cualquier pantalla. */}
                <PuntoDia d={oc} preparacion={preparando} />
              </span>

              {oc && !oc.bloqueada && (
                <span className="mt-1 block text-hueso/70">
                  {oc.tomadas > 0
                    ? <>{oc.tomadas} <span className="text-hueso/45">personas</span></>
                    : <span className="text-hueso/35">sin reservas</span>}
                </span>
              )}

              {res.total > 0 && (
                <span className="mt-1 block text-oro">
                  {res.total} en el equipo
                </span>
              )}
              {res.faltan > 0 && (
                <span className="mt-0.5 block text-amber-300">faltan {res.faltan}</span>
              )}
              {res.total > 0 && cerrado(f) && (
                <span className="mt-0.5 block text-hueso/45">✓ cerrado</span>
              )}
              {res.total > 0 && !cerrado(f) && f < hoy() && falta(f).sinMarcar > 0 && (
                <span className="mt-0.5 block text-amber-300">
                  {falta(f).sinMarcar} sin marcar
                </span>
              )}
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
          // La única pantalla que cierra un día: ver `conCierre`.
          conCierre
          esAdmin={equipo.esAdmin}
          onListo={() => { setPlanificando(null); cargarEquipo(); }}
          onCancelar={() => setPlanificando(null)}
        />
      )}
    </section>
  );
}

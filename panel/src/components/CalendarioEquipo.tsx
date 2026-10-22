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
 * cualquiera se puede planificar.
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
import { COLOR_TARJETA, PUNTO_TARJETA } from './TarjetaDia';
import { resumenEquipo, esPreparacion,
         type Puesto, type Trabajador, type Turno } from '@/lib/equipo';
import type { Ocupacion } from '@/lib/tipos';
import { diasDelMes, sumarMeses, mesDe, mesEnPalabras, diaSemana, hoy,
         enPalabras } from '@/lib/fechas';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

/** Lunes primero, que es la convención chilena y la que ya usa el sitio. */
const columna = (f: string) => (diaSemana(f) === 0 ? 6 : diaSemana(f) - 1);

export default function CalendarioEquipo() {
  const [mes, setMes] = useState(() => mesDe(hoy()));
  const [equipo, setEquipo] = useState<{
    puestos: Puesto[]; trabajadores: Trabajador[]; turnos: Turno[]; esAdmin: boolean;
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
          turnos: d.turnos ?? [], esAdmin: !!d.esAdmin
        });
      })
      .catch((e) => setError(String(e)));

  useEffect(() => {
    cargarEquipo();
    // La ocupación es solo para pintar el mes: si falla, el calendario se
    // dibuja igual y se puede planificar. Lo que no se podría es saber
    // cuánta gente viene, y eso se nota solo.
    fetch('/api/ocupacion').then((r) => r.json())
      .then((d) => { if (d.ocupacion) setOcupacion(d.ocupacion); })
      .catch(() => {});
  }, []);

  const porFecha = useMemo(
    () => new Map(ocupacion.map((o) => [o.fecha, o])), [ocupacion]
  );
  const dias = useMemo(() => diasDelMes(mes), [mes]);
  const turnos = equipo?.turnos ?? [];
  const puestos = equipo?.puestos ?? [];

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

  if (error) return <Aviso error={error} />;

  return (
    <section>
      <h1 className="mb-1 text-xl font-bold uppercase tracking-wide">
        Calendario del equipo
      </h1>
      <p className="mb-5 max-w-2xl text-sm text-hueso/60">
        El mes completo, para asignar equipo <strong>cualquier día</strong>,
        incluidos los que no reciben público: los de preparación, montaje o
        cierre. Planificar un día cerrado <strong>no lo abre al público</strong>
        {' '}— eso se hace en el calendario, día por día.
      </p>

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
          return (
            <button key={f} onClick={() => setPlanificando(f)} disabled={!equipo}
              title={`${enPalabras(f)} · planificar el equipo`}
              className={`min-h-[82px] overflow-hidden rounded border p-1.5
                          text-left align-top
                          text-[11px] leading-tight transition
                          hover:border-oro disabled:opacity-40
                          ${preparando ? 'border-oro/40 bg-oro/5'
                             : oc ? COLOR_TARJETA(oc)
                                  : 'border-hueso/10 bg-hueso/[0.02]'}
                          ${esHoy ? 'ring-1 ring-oro' : ''}`}>
              <span className="flex items-start justify-between">
                <span className={oc || preparando ? 'font-semibold' : 'text-hueso/45'}>
                  {Number(f.slice(8, 10))}
                </span>
                {oc && <span aria-hidden>{PUNTO_TARJETA(oc)}</span>}
              </span>

              {oc && !oc.bloqueada && (
                <span className="mt-1 block text-hueso/70">
                  {oc.tomadas > 0
                    ? <>{oc.tomadas} <span className="text-hueso/45">personas</span></>
                    : <span className="text-hueso/35">sin reservas</span>}
                </span>
              )}
              {oc?.bloqueada && (
                <span className="mt-1 block text-red-300/70">cerrado</span>
              )}
              {oc?.privada && (
                <span className="mt-1 block text-sky-300/80">privado</span>
              )}

              {res.total > 0 && (
                <span className="mt-1 block text-oro">
                  {preparando && (
                    <span className="block text-[10px] uppercase tracking-wide
                                     text-oro/70">preparación</span>
                  )}
                  {res.total} en el equipo
                </span>
              )}
              {res.faltan > 0 && (
                <span className="mt-0.5 block text-amber-300">faltan {res.faltan}</span>
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
          esAdmin={equipo.esAdmin}
          enlaceAlDia
          onListo={() => { setPlanificando(null); cargarEquipo(); }}
          onCancelar={() => setPlanificando(null)}
        />
      )}
    </section>
  );
}

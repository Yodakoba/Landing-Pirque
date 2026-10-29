'use client';

/**
 * La tarjeta de un día, con sus dos caras.
 *
 * Al frente, la ocupación: cuánta gente viene, cuánto está cobrado y cuánto
 * hay que cobrar en la puerta. Al dorso, el equipo de ese día.
 *
 * **Se da vuelta de verdad, con una rotación en 3D**, que es lo que pidió el
 * cliente y lo que el sitio público ya usa en las tarjetas de experiencias.
 * Dos detalles de implementación que no son adorno:
 *
 * - **Las dos caras van en la MISMA celda de una grilla**, no con
 *   `position:absolute`. Así el alto de la tarjeta es el de la cara más alta
 *   y las dos quedan del mismo tamaño sin tener que fijarlo a mano. Con
 *   `absolute` habría que darle un alto explícito al contenedor, y ese es
 *   justo el tipo de medida que queda vieja cuando el contenido cambia.
 * - **La cara que está de espaldas se apaga para todo el mundo**, no solo a
 *   la vista: `aria-hidden` para los lectores de pantalla,
 *   `pointer-events-none` para el mouse y `tabIndex -1` en sus botones para
 *   el teclado. `backface-visibility` oculta el dibujo pero deja los enlaces
 *   alcanzables, así que sin esto se podría tabular hacia botones invisibles.
 */
import { useState } from 'react';
import type { Ocupacion } from '@/lib/tipos';
import type { ResumenEquipo } from '@/lib/equipo';
import { enPalabras } from '@/lib/fechas';
import PuntoDia from './PuntoDia';
import Clima from './Clima';
import type { Clima as DatoClima } from '@/lib/clima';

const COLOR: Record<Ocupacion['semaforo'], string> = {
  verde: 'border-emerald-500/50 bg-emerald-500/5',
  amarillo: 'border-amber-500/60 bg-amber-500/5',
  rojo: 'border-red-500/60 bg-red-500/5'
};
const PUNTO: Record<Ocupacion['semaforo'], string> = {
  verde: '🟢', amarillo: '🟡', rojo: '🔴'
};

/**
 * Qué porcentaje del cupo ocupa un número.
 *
 * Se recorta a 100 porque un día sobrevendido existe —el cupo se puede bajar
 * después de que la gente reservó— y una barra que se sale de su caja se ve
 * como un error de dibujo en vez de como un día lleno.
 */
const pct = (n: number, de: number) =>
  de > 0 ? Math.min(100, (n / de) * 100) : 0;

/** Un día que existe pero al que nadie le puso cupo todavía. */
export const sinConfigurar = (d: Ocupacion) =>
  d.capacidad === 0 && !d.bloqueada;

/**
 * El color de la tarjeta, que dice de un vistazo **quién puede reservar**:
 *
 * - **verde / amarillo / rojo** — abierto al público, con su ocupación.
 * - **azul** — privado: recibe reservas pero no está en el sitio.
 * - **rojo apagado** — cerrado.
 * - **gris** — sin configurar. No es lo mismo que cerrado, y confundirlos
 *   era justo el error: un día que nadie tocó salía pintado de rojo como
 *   si alguien lo hubiera cerrado a propósito.
 */
export const COLOR_TARJETA = (d: Ocupacion) => {
  if (d.bloqueada) return 'border-red-500/60 bg-red-500/5';
  if (d.privada) return 'border-sky-400/50 bg-sky-400/5';
  if (sinConfigurar(d)) return 'border-hueso/15 bg-hueso/[0.03]';
  return COLOR[d.semaforo];
};

export const PUNTO_TARJETA = (d: Ocupacion) => {
  if (d.bloqueada) return '🔴';
  if (d.privada) return '🔵';
  if (sinConfigurar(d)) return '⚪';
  return PUNTO[d.semaforo];
};

// `flex-col` + un pie con `mt-auto`: como las dos caras comparten el alto
// de la más alta, la más corta sobra espacio. Con el pie pegado abajo ese
// aire queda en el medio, donde se lee como respiro, y no colgando bajo los
// botones, donde se lee como un error de dibujo.
const CARA = 'col-start-1 row-start-1 flex flex-col rounded border p-4 ' +
             '[backface-visibility:hidden]';
const PIE = 'mt-auto flex items-center gap-3 border-t border-hueso/10 pt-3 text-xs';

export default function TarjetaDia({
  d, resumen, clima, onEditar, onPlanificar
}: {
  d: Ocupacion;
  /** El pronóstico de ese día, si cae dentro de los que hay (unos 9 o 10). */
  clima?: DatoClima;
  /** El equipo de este día. `null` mientras todavía no se cargó. */
  resumen: ResumenEquipo | null;
  onEditar: () => void;
  onPlanificar: () => void;
}) {
  const [volteada, setVolteada] = useState(false);
  // Lo que no se ve no se puede tabular. Ver el comentario de arriba.
  const alFrente = { tabIndex: volteada ? -1 : 0 };
  const alDorso = { tabIndex: volteada ? 0 : -1 };

  return (
    <div className="[perspective:1200px]">
      <div
        className="grid transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: volteada ? 'rotateY(180deg)' : undefined }}>

        {/* ---------- el frente: la ocupación ---------- */}
        <div className={`${CARA} ${COLOR_TARJETA(d)} ${volteada ? 'pointer-events-none' : ''}`}
             aria-hidden={volteada}>
          <div className="flex items-start justify-between gap-2">
            {/* El pronóstico va bajo la fecha, en el aire que deja el punto
                con su palabra a la derecha: no cambia el alto de la tarjeta. */}
            <span className="flex flex-col items-start gap-1">
              <a href={`/dia/${d.fecha}`} {...alFrente}
                 className="text-sm capitalize hover:text-oro">
                {enPalabras(d.fecha)}
              </a>
              <Clima c={clima} />
            </span>
            {/* El punto y, debajo, la palabra: público, privado, cerrado.
                Antes eso era una línea más abajo del contenido, y una línea
                de más cambia el alto de la tarjeta — o sea que los días de
                una misma semana dejaban de medir lo mismo según su estado.
                Acá el aire ya estaba. */}
            <PuntoDia d={d} />
          </div>

          {sinConfigurar(d) ? (
            <>
              {/* Un día que aparece solo porque tiene reservas: existe,
                  pero nadie le puso cupo. Se muestran las personas igual
                  —si no, una reserva quedaría invisible otra vez— y se
                  dice qué falta. */}
              <p className="mt-3 text-2xl font-bold">
                {d.tomadas}
                <span className="ml-1 text-xs font-normal text-hueso/50">
                  {d.tomadas === 1 ? 'persona' : 'personas'}
                </span>
              </p>
              <p className="mt-2 text-xs text-hueso/60">
                Sin cupo definido. Apreta <strong>Editar</strong> para abrir
                este día o dejarlo privado.
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">
                {d.tomadas}<span className="text-hueso/40">/{d.capacidad}</span>
                <span className="ml-1 text-xs font-normal text-hueso/50">personas</span>
              </p>
              {/* La barra: cuánto del cupo está cobrado y cuánto falta
                  cobrar el mismo día. Verde es plata que ya está; ámbar
                  es plata que hay que cobrar en la puerta. El resto de la
                  barra es lo que queda libre. */}
              <div className="mt-3 flex h-1.5 overflow-hidden rounded bg-hueso/10"
                   role="img"
                   aria-label={`${d.online} pagadas online, ${d.local} pagan en el local, de ${d.capacidad} lugares`}>
                <div className="bg-emerald-400"
                     style={{ width: `${pct(d.online, d.capacidad)}%` }} />
                <div className="bg-amber-400"
                     style={{ width: `${pct(d.local, d.capacidad)}%` }} />
              </div>

              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="text-hueso/70">
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400" />
                  <strong className="tabular-nums text-hueso">{d.online}</strong> pagadas
                </span>
                <span className="text-hueso/70">
                  <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
                  <strong className="tabular-nums text-hueso">{d.local}</strong> en el local
                </span>
              </p>

              {/* **Acá iba "$X por cobrar", y se sacó el 2026-10-23 a pedido
                  del cliente.** El número era la suma de las reservas que
                  pagan en el local, y en el local se paga otra cosa: una
                  bebida más, un postre, lo que sea que se consuma ese día.
                  O sea que nunca iba a ser lo que hay que cobrar, y un total
                  que no es el total no sirve para cuadrar la caja ni para
                  nada más — solo para que alguien lo crea.

                  El dato se sigue calculando (`porCobrar`, `sinMonto` en
                  `ocupacion.ts`) y se sigue viendo en la página del día, que
                  es donde se mira una reserva de a una. Lo que se liberó es
                  este espacio de la tarjeta, para cuando aparezca algo que de
                  verdad ayude a decidir mirando el mes. */}
            </>
          )}

          {/* Que el día esté cerrado o privado ya lo dice la palabra bajo
              el punto. Lo único que sobrevive como línea es el aviso de un
              día cerrado **con gente ya reservada**, porque eso no es un
              estado: es algo que hay que hacer. */}
          {d.bloqueada && d.tomadas > 0 && (
            <p className="mt-2 text-xs text-amber-300/90">
              Con {d.tomadas} {d.tomadas === 1 ? 'persona' : 'personas'} ya
              reservada{d.tomadas === 1 ? '' : 's'}: hay a quién avisarle.
            </p>
          )}
          {d.notas && <p className="mt-1 text-xs text-hueso/50">{d.notas}</p>}

          <div className={`mt-3 ${PIE}`}>
            {/* "Ver reservas" y no "Ver quiénes vienen": con tres acciones
                en el pie, el texto largo se partía en dos líneas en una
                tarjeta de cuatro columnas. La fecha de arriba lleva al mismo
                lugar, así que el detalle no se pierde. */}
            <a href={`/dia/${d.fecha}`} {...alFrente}
               className="whitespace-nowrap text-hueso/60 hover:text-oro">
              Ver reservas
            </a>
            <span className="flex-1" />
            <button onClick={() => setVolteada(true)} {...alFrente}
              className="whitespace-nowrap text-hueso/60 hover:text-oro">
              Equipo
              {/* El número va acá para no tener que dar vuelta la tarjeta
                  solo para saber si hay alguien asignado. */}
              {resumen && resumen.total > 0 && (
                <span className="ml-1 tabular-nums text-hueso/45">{resumen.total}</span>
              )}
              {resumen && resumen.faltan > 0 && (
                <span className="ml-1 text-amber-300" title={`Faltan ${resumen.faltan}`}>•</span>
              )}
            </button>
            <button onClick={onEditar} {...alFrente}
              className="whitespace-nowrap text-hueso/60 hover:text-oro">
              {sinConfigurar(d) ? 'Abrir día' : 'Editar'}
            </button>
          </div>
        </div>

        {/* ---------- el dorso: el equipo ---------- */}
        <div
          className={`${CARA} border-hueso/15 bg-hueso/[0.04] [transform:rotateY(180deg)] ${
            volteada ? '' : 'pointer-events-none'}`}
          aria-hidden={!volteada}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm capitalize text-hueso/80">{enPalabras(d.fecha)}</h3>
            <span className="text-xs uppercase tracking-widest text-oro">Equipo</span>
          </div>

          {!resumen ? (
            <p className="mt-3 text-xs text-hueso/50">Cargando…</p>
          ) : resumen.total === 0 ? (
            <p className="mt-3 text-sm text-hueso/55">
              Nadie asignado todavía.
            </p>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">
                {resumen.total}
                <span className="ml-1 text-xs font-normal text-hueso/50">
                  {resumen.total === 1 ? 'persona' : 'personas'}
                </span>
              </p>
              {/* "Garzón 4" y no "4 garzones": los nombres de puesto los
                  escribe el cliente y no hay forma de pluralizarlos bien
                  sin inventar reglas del español. */}
              <ul className="mt-2 space-y-0.5 text-xs">
                {resumen.porPuesto.map((p) => (
                  <li key={p.puesto} className="flex justify-between gap-2">
                    <span className="text-hueso/70">{p.puesto}</span>
                    <strong className="tabular-nums text-hueso">{p.cuantos}</strong>
                  </li>
                ))}
              </ul>
            </>
          )}

          {resumen && resumen.faltan > 0 && (
            <p className="mt-2 text-xs text-amber-300/90">
              Faltan {resumen.faltan} según las reglas de cada puesto.
            </p>
          )}

          <div className={`mt-3 ${PIE}`}>
            <button onClick={() => setVolteada(false)} {...alDorso}
              className="text-hueso/60 hover:text-oro">
              Volver
            </button>
            <span className="flex-1" />
            <button onClick={onPlanificar} {...alDorso}
              className="font-semibold text-oro hover:underline">
              Planificar equipo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
 *
 *   **Se probó lo contrario el 2026-10-30 y se descartó**: con el frente en
 *   el flujo y el dorso encima, la tarjeta quedaba tan baja como el frente
 *   y el dorso salía **cortado a media línea**, sin nada que dijera que
 *   seguía. Arreglar una cara rompiendo la otra no es arreglarlo. Lo que sí
 *   se hizo es acotar el dorso, que era lo que lo volvía desmedido: ver
 *   `PUESTOS_A_LA_VISTA`.
 * - **La cara que está de espaldas se apaga para todo el mundo**, no solo a
 *   la vista: `aria-hidden` para los lectores de pantalla,
 *   `pointer-events-none` para el mouse y `tabIndex -1` en sus botones para
 *   el teclado. `backface-visibility` oculta el dibujo pero deja los enlaces
 *   alcanzables, así que sin esto se podría tabular hacia botones invisibles.
 */
import { MarcaCambio } from './AlDia';
import { useState } from 'react';
import { LineaCRM } from './EventosCRM';
import type { EventosDelDia } from '@/lib/crm';
import type { Ocupacion } from '@/lib/tipos';
import { textoFaltantes, type ResumenEquipo } from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';
import { enPalabras } from '@/lib/fechas';
import PuntoDia from './PuntoDia';
import Clima from './Clima';
import type { Clima as DatoClima } from '@/lib/clima';

const COLOR: Record<Ocupacion['semaforo'], string> = {
  verde: 'border-verde/50 bg-verde/5',
  amarillo: 'border-ambar/60 bg-ambar/5',
  rojo: 'border-rojo/60 bg-rojo/5'
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
 * - **morado** — exclusivo: el recinto arrendado completo (2026-11-12, lo
 *   pidió el cliente; antes iba en el mismo azul que el privado).
 * - **rojo apagado** — cerrado.
 * - **gris** — sin configurar. No es lo mismo que cerrado, y confundirlos
 *   era justo el error: un día que nadie tocó salía pintado de rojo como
 *   si alguien lo hubiera cerrado a propósito.
 */
export const COLOR_TARJETA = (d: Ocupacion) => {
  if (d.bloqueada) return 'border-rojo/60 bg-rojo/5';
  if (d.exclusiva) return 'border-morado-fuerte/50 bg-morado-fuerte/5';
  if (d.privada) return 'border-cielo-fuerte/50 bg-cielo-fuerte/5';
  if (sinConfigurar(d)) return 'border-hueso/15 bg-panel';
  return COLOR[d.semaforo];
};

export const PUNTO_TARJETA = (d: Ocupacion) => {
  if (d.bloqueada) return '🔴';
  if (d.exclusiva) return '🟣';
  if (d.privada) return '🔵';
  if (sinConfigurar(d)) return '⚪';
  return PUNTO[d.semaforo];
};

// `flex-col` + un pie con `mt-auto`: como las dos caras comparten el alto
// de la más alta, la más corta sobra espacio. Con el pie pegado abajo ese
// aire queda en el medio, donde se lee como respiro, y no colgando bajo los
// botones, donde se lee como un error de dibujo.
/**
 * El alto estándar de una tarjeta, **un piso y no un techo**.
 *
 * Lo pidió el cliente el 2026-10-30: *"encontrar el tamaño estándar con el
 * cual llegar a la tarjeta y poder rellenar siempre todos los puestos que se
 * llenan"*. Con el dorso en una lista corrida, un sábado cargado de verdad
 * —18 personas en los nueve puestos— medía 201px a 1280.
 *
 * **Subió de 13rem a 14.25 el 2026-11-01**, con el rediseño de la tarjeta:
 * medido quitándole el piso a las 52 caras de la página, la más alta pasó a
 * 225px, así que 228 la contiene y deja otra vez todas las tarjetas de la
 * página del mismo alto — no solo las de una misma fila. Es la medida que
 * hay que volver a tomar cada vez que la tarjeta cambie de contenido.
 *
 * **Y a 15.125 el 2026-11-12**, cuando las pastillas del pago pasaron a ser
 * celdas de dos líneas (pagadas · abonadas · sin pagar): el frente con gente
 * mide 241px.
 *
 * **Es `min-height` y no `height`, y esa es toda la diferencia**: la medida
 * fija que este archivo venía evitando es la que recorta el contenido cuando
 * crece. Un piso no recorta nada — si algún día no alcanza (una pantalla
 * angosta hace envolver más la lista), la tarjeta crece y `h-full` deja
 * pareja su fila igual.
 */
const ALTO_ESTANDAR = 'min-h-[15.125rem]';

/** El tramo de las abonadas: el verde de las pagadas, rayado (falta el resto). */
const RAYAS = 'repeating-linear-gradient(135deg, rgb(var(--verde-fuerte)) 0 4px, rgb(var(--verde-fuerte) / 0.4) 4px 7px)';

const CARA = `col-start-1 row-start-1 flex h-full flex-col rounded border p-4 ` +
             `${ALTO_ESTANDAR} [backface-visibility:hidden]`;

const PIE = 'mt-auto flex items-center gap-2 border-t border-hueso/10 pt-3';

/**
 * **La regla PlayStation, aplicada al pie de la tarjeta** (2026-11-01).
 *
 * Eran tres textos de 12px al 60% de opacidad, uno al lado del otro: no se
 * leían como botones y, en un teléfono, se fallaban con el dedo.
 *
 * El estilo **no se escribe acá**: es `.boton` de `globals.css`, el mismo
 * que usan la barra de arriba y el menú. Tenerlo en un solo lugar es lo que
 * evita que cada pantalla invente su propio tamaño, que era justamente el
 * problema. `.tecla` le da al `<a>` el hundido que un `<button>` ya trae.
 */
const BOTON = 'tecla boton boton-angosto';

export default function TarjetaDia({
  d, resumen, clima, delSocio, conEquipo = true, conDias = true,
  onEditar, onPlanificar, cambio
}: {
  d: Ocupacion;
  /** Si este día cambió de gente en la última actualización (ver `AlDia`). */
  cambio?: { delta: number; desde: string };
  /**
   * Si esta cuenta puede ver y planificar el equipo.
   *
   * **En falso la tarjeta no tiene dorso**, y no es un detalle de estilo:
   * un vendedor recibe 403 de `/api/equipo`, así que el botón *Equipo*
   * daría vuelta la tarjeta para mostrarle una cara vacía. Que no exista
   * dice la verdad —ese dato no es suyo— y un botón que no lleva a nada
   * dice que el panel está roto.
   */
  conEquipo?: boolean;
  /** Si esta cuenta puede abrir, cerrar y editar días. */
  conDias?: boolean;
  /** Lo que el CRM del socio tiene para este día y acá no está anotado. */
  delSocio?: EventosDelDia;
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
  // Las abonadas son parte de las por cobrar; las que no pagaron nada, el resto.
  const abonadas = d.abonadas ?? 0;
  const sinPagar = Math.max(0, d.porPagar - abonadas);
  const tramos = [
    { n: d.pagadas, icono: '✓', palabra: 'pagadas', clase: 'border-verde/40 bg-verde/10 text-verde-texto' },
    { n: abonadas, icono: '½', palabra: 'abonadas', clase: 'border-dashed border-verde/50 bg-verde/5 text-verde-texto' },
    { n: sinPagar, icono: '○', palabra: 'sin pagar', clase: 'border-ambar/40 bg-ambar/10 text-ambar-texto' }
  ].filter((t) => t.n > 0);

  return (
    /* `h-full` en los tres niveles: **todas las tarjetas de una misma fila
       miden lo mismo**. Sin esto, una tarjeta más baja que su fila dejaba
       un hueco debajo del borde, que se lee como un error de dibujo y no
       como aire. El pie va con `mt-auto`, así que el sobrante queda en el
       medio. */
    /* **`min-w-0` es la guarda, y sin ella esto ya se rompió una vez**
       (2026-11-02). Un ítem de grilla nace con `min-width: auto`, así que
       **crece por fuera de su columna** cuando algo adentro no cabe, en vez
       de quedarse en su sitio: el pie de la tarjeta se pasó 10px y se comió
       la separación con la tarjeta de al lado. Con la guarda, lo que no
       quepa queda como problema DENTRO de su propio borde, donde se ve, y
       no ensuciando la grilla entera. */
    <div className="relative h-full min-w-0 [perspective:1200px]">
      {cambio && <MarcaCambio {...cambio} />}
      <div
        className="grid h-full min-w-0 grid-cols-1 transition-transform duration-500
                   [transform-style:preserve-3d]"
        style={{ transform: volteada ? 'rotateY(180deg)' : undefined }}>

        {/* ---------- el frente: la ocupación ---------- */}
        <div className={`${CARA} ${COLOR_TARJETA(d)} ${volteada ? 'pointer-events-none' : ''}`}
             aria-hidden={volteada}>
          <div className="flex items-start justify-between gap-2">
            {/* **El pronóstico ya no va acá.** Estaba bajo la fecha a 10px,
                donde no lo veía nadie; ahora es una pastilla al lado del
                número, que es lo que se mira. Ver el bloque de abajo. */}
            <a href={`/dia/${d.fecha}`} {...alFrente}
               className="text-[15px] font-semibold leading-tight
                          text-hueso/90 first-letter:uppercase hover:text-oro">
              {enPalabras(d.fecha)}
            </a>
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
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-3xl font-bold leading-none">
                  {d.tomadas}
                  <span className="ml-1.5 text-[13px] font-medium text-hueso/70">
                    {d.tomadas === 1 ? 'persona' : 'personas'}
                  </span>
                </p>
                <Clima c={clima} tamano="tarjeta" />
              </div>
              {/* **Nombra un botón, así que solo va si el botón está.** Un
                  vendedor no abre ni cierra días: mandarlo a apretar
                  *Editar* sería mandarlo a buscar algo que no existe. */}
              <p className="mt-3 text-[13px] leading-snug text-hueso/70">
                {conDias
                  ? <>Sin cupo definido. Apreta <strong className="text-hueso">Editar</strong>{' '}
                     para abrir este día o dejarlo privado.</>
                  : <>Sin cupo definido: este día existe porque tiene reservas, pero
                     nadie le puso cupo todavía.</>}
              </p>
            </>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-3xl font-bold leading-none">
                  {d.tomadas}<span className="text-hueso/45">/{d.capacidad}</span>
                  <span className="ml-1.5 text-[13px] font-medium text-hueso/70">personas</span>
                </p>
                {/* La pastilla del tiempo ocupa el aire que antes quedaba
                    muerto a la derecha del número, así que no alarga nada. */}
                <Clima c={clima} tamano="tarjeta" />
              </div>
              {/* La barra: tres tramos de gente (2026-11-12, lo pidió el
                  cliente). Verde lleno: ya pagaron todo. **Verde rayado:
                  abonaron una parte** —casi seguro vienen, falta el resto—;
                  antes iban en ámbar con las que no han pagado nada, y un
                  día con 80 personas abonadas se veía casi sin plata.
                  Ámbar: no han pagado nada. El resto es lo libre. */}
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-hueso/15"
                   role="img"
                   aria-label={`${d.pagadas} pagadas, ${abonadas} abonadas, ${sinPagar} sin pagar, de ${d.capacidad} lugares`}>
                <div className="bg-verde-fuerte"
                     style={{ width: `${pct(d.pagadas, d.capacidad)}%` }} />
                <div style={{ width: `${pct(abonadas, d.capacidad)}%`, backgroundImage: RAYAS }} />
                <div className="bg-ambar-fuerte"
                     style={{ width: `${pct(sinPagar, d.capacidad)}%` }} />
              </div>

              {/* **Las dos pastillas aparecen solo si hay alguien**
                  (2026-11-02, lo notó el cliente mirando un miércoles y un
                  domingo vacíos). "0 pagadas · 0 por cobrar" no contesta
                  nada: que no hay nadie ya lo dice el número grande, y las
                  dos pastillas en cero son ruido justo en la fila que se
                  mira para saber cuánto falta cobrar. Es el mismo criterio
                  del azulejo de "ya no vienen" en la página del día, que
                  tampoco se dibuja en cero.

                  **La barra sí se queda**, aunque vaya vacía: es lo que
                  dibuja el cupo del día, así que en cero dice "no hay nada
                  tomado de los 120" — que es un dato, no un relleno. */}
              {/* **Una celda por tramo, solo si tiene gente**, en una grilla
                  de columnas parejas: número arriba con su ícono —✓ ½ ○,
                  los mismos del pago en las cotizaciones, para distinguirlas
                  sin el color— y la palabra abajo. Tres pastillas en una
                  línea no caben en la tarjeta (piden 333px de 261) y al
                  envolver la estiraban; en dos líneas siempre miden igual. */}
              {tramos.length > 0 && (
                <div className="mt-3 grid gap-1.5"
                     style={{ gridTemplateColumns: `repeat(${tramos.length}, minmax(0, 1fr))` }}>
                  {tramos.map((t) => (
                    <span key={t.palabra}
                      className={`rounded-md border px-2 py-1 leading-tight ${t.clase}`}>
                      <span className="block text-[15px] font-bold tabular-nums">
                        <span aria-hidden>{t.icono} </span>{t.n}
                      </span>
                      <span className="block text-[13px]">{t.palabra}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* **Sobrecupo** (2026-11-12): un pago entró sobre reservas sin
                  pagar y el día se pasó. Es algo que hay que hacer —ampliar
                  el cupo o soltar una reserva—, así que es una línea que se
                  aprieta y lleva a decidirlo, no una palabra bajo el punto. */}
              {(d.sobrecupo ?? 0) > 0 && (
                <a href={`/dia/${d.fecha}#sobrecupo`} {...alFrente}
                  className="tecla mt-2 flex items-center gap-2 rounded-md border-2 border-rojo-fuerte/70
                             bg-rojo/10 px-2 py-1 text-[13px] font-bold text-rojo-texto hover:bg-rojo/20">
                  ⚠ {d.sobrecupo} sobre el cupo
                  <span className="ml-auto font-semibold underline">Decidir</span>
                </a>
              )}

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

          {/* **Lo cotizado y sin confirmar, en rosado** (2026-11-01, lo pidió
              el cliente: *"este día tú tienes dos presupuestos enviados con
              un total de 43 posibles reservas, pero si no está confirmado,
              no toquen nada de lo concreto"*).

              Va **debajo de la barra y de las pastillas**, no dentro: ahí
              arriba está lo que ya es, y esto es lo que podría ser. Mezclarlo
              con las pagadas y las por cobrar sería exactamente lo que no
              hay que hacer — y no entra en la barra ni en el número grande,
              porque no ocupa cupo. El rosado es el único color que no está
              usado por nada que sí sea un hecho.

              Aparece solo si hay alguno: un "0 presupuestos" es ruido en una
              tarjeta que se mira para decidir. */}
          {/* **Lo que el socio tiene vendido para este día** (2026-11-03).
              Va junto a lo cotizado y debajo de todo, por lo mismo: son las
              dos capas de gente que el cupo no cuenta. Los ganados en cielo
              y los cotizados en rosado — ver `EventosCRM.tsx`. */}
          {delSocio && <LineaCRM e={delSocio} quedan={d.quedan} />}

          {d.presupuestos > 0 && (
            <p className="mt-2 flex flex-wrap gap-2 text-[13px]">
              <span className="inline-flex items-center gap-1.5 rounded-md border
                               border-rosa/50 bg-rosa/10 px-2 py-1 text-rosa-texto">
                <span aria-hidden className="h-2 w-2 rounded-full bg-rosa-fuerte" />
                <strong className="tabular-nums">{d.presupuestos}</strong>
                {d.presupuestos === 1 ? 'presupuesto' : 'presupuestos'}
                {d.presupuestadas > 0 && (
                  <> · <strong className="tabular-nums">{d.presupuestadas}</strong> posibles</>
                )}
              </span>
            </p>
          )}

          {/* Que el día esté cerrado o privado ya lo dice la palabra bajo
              el punto. Lo único que sobrevive como línea es el aviso de un
              día cerrado **con gente ya reservada**, porque eso no es un
              estado: es algo que hay que hacer. */}
          {d.bloqueada && d.tomadas > 0 && (
            <p className="mt-3 text-[13px] font-medium leading-snug text-ambar-texto">
              Con {d.tomadas} {d.tomadas === 1 ? 'persona' : 'personas'} ya
              reservada{d.tomadas === 1 ? '' : 's'}: hay a quién avisarle.
            </p>
          )}
          {d.notas && <p className="mt-2 text-[13px] text-hueso/70">{d.notas}</p>}

          {/* `pie-tarjeta`: si los tres botones no caben en una línea, pasan
              a dos (ver `globals.css`). */}
          <div className={`mt-3 ${PIE} pie-tarjeta`}><div className={`pie-botones${conDias ? '' : ' pie-sin-editar'}`}>
            {/* "Ver reservas" y no "Ver quiénes vienen": con tres acciones
                en el pie, el texto largo se partía en dos líneas en una
                tarjeta de cuatro columnas. La fecha de arriba lleva al mismo
                lugar, así que el detalle no se pierde. */}
            <a href={`/dia/${d.fecha}`} {...alFrente}
               className={`${BOTON} whitespace-nowrap`}>
              {/* **Un ícono por botón** (2026-11-12, lo pidió el cliente: los
                  tres se veían iguales). Se reconocen por forma sin leerlos. */}
              <span aria-hidden>📋</span> Reservas
            </a>
            <span className="pie-hueco" />
            {conEquipo && (
            <button onClick={() => setVolteada(true)} {...alFrente}
              className={`${BOTON} pie-equipo whitespace-nowrap ${
                resumen && resumen.faltan > 0 ? '!border-ambar/70' : ''}`}>
              <span aria-hidden>🧑‍🍳</span> Equipo
              {/* El número va acá para no tener que dar vuelta la tarjeta
                  solo para saber si hay alguien asignado.

                  **Pesa más que la palabra, no menos** (2026-11-01, lo pidió
                  el cliente). Iba en `text-hueso/60` al lado de un rótulo al
                  80: el dato quedaba más apagado que su propia etiqueta, que
                  es al revés de lo que alguien mira. Va en su propia cajita
                  para distinguirse por forma y no solo por peso. */}
              {resumen && (resumen.total > 0 || resumen.faltan > 0) && (
                /* **"4 / 5" y no "4" con un punto al lado** (2026-11-02, lo
                   notó el cliente). Cuando faltaba gente aparecía un `•`
                   ámbar que solo se explicaba en el `title`, o sea en un
                   globito del mouse: en un teléfono eso no existe y lo que
                   queda es un punto que no dice nada. Es el mismo error que
                   ya se había arreglado en el botón de cerrar el día.

                   El segundo número son los que sugieren las reglas de cada
                   puesto, así que "4 / 5" se lee solo y no necesita ningún
                   globito. Va en ámbar porque falta alguien, y el dorso lo
                   dice con todas sus letras. */
                /* Sin la cajita gris (2026-11-12, lo pidió el cliente: no
                   aportaba): el número en negrita ya pesa más que la palabra,
                   y si falta gente el borde del botón va en ámbar. */
                <span className="text-[14px] font-bold tabular-nums text-hueso">
                  {resumen.total}
                  {resumen.faltan > 0 && (
                    <span className="text-ambar-texto">/{resumen.total + resumen.faltan}</span>
                  )}
                </span>
              )}
            </button>
            )}
            {conDias && (
              <button onClick={onEditar} {...alFrente}
                className={`${BOTON} whitespace-nowrap`}>
                <span aria-hidden>✎</span> {sinConfigurar(d) ? 'Abrir' : 'Editar'}
              </button>
            )}
          </div></div>
        </div>

        {/* ---------- el dorso: el equipo ---------- */}
        {conEquipo && (
        <div
          className={`${CARA} border-hueso/15 bg-panel [transform:rotateY(180deg)] ${
            volteada ? '' : 'pointer-events-none'}`}
          aria-hidden={!volteada}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-hueso/90
                           first-letter:uppercase">
              {enPalabras(d.fecha)}
            </h3>
            {/* **Lo que va a costar ese equipo** (2026-11-01, lo pidió el
                cliente: en el espacio libre de arriba a la derecha, al lado
                de cuánta gente trabaja). Ocupa el aire que ya estaba ahí, así
                que no alarga la tarjeta.

                **Cuenta a quien todavía no está marcado**, por una razón
                concreta: `pagoDe()` da cero hasta que alguien pase lista, y
                un sábado recién planificado habría mostrado $0 justo cuando
                uno decide cuánta gente poner. Un cero no se lee como "falta
                marcar", se lee como "no cuesta nada". Ver `costoPlanificado()`. */}
            <div className="shrink-0 text-right">
              <span className="block text-[11px] font-semibold uppercase
                               tracking-widest text-oro">
                Equipo
              </span>
              {!!resumen?.costo && (
                <span className="mt-0.5 block whitespace-nowrap rounded-full border
                                 border-oro/40 px-2 py-0.5 text-[13px] font-bold
                                 tabular-nums text-oro">
                  {enPesos(resumen.costo)}
                </span>
              )}
            </div>
          </div>

          {!resumen ? (
            <p className="mt-3 text-[13px] text-hueso/70">Cargando…</p>
          ) : resumen.total === 0 ? (
            <p className="mt-3 text-[15px] text-hueso/70">
              Nadie asignado todavía.
            </p>
          ) : (
            <>
              <p className="mt-3 text-3xl font-bold leading-none">
                {resumen.total}
                <span className="ml-1.5 text-[13px] font-medium text-hueso/70">
                  {resumen.total === 1 ? 'persona' : 'personas'}
                </span>
              </p>
              {/* **Todos los puestos, en una lista corrida separada por
                  comas** (2026-10-30, lo pidió el cliente: *"juntarlos en lo
                  menos filas posible, separados por comas"*). Un renglón por
                  puesto no escala: **siempre van a ser más de seis**, así que
                  la lista vertical crecía sin techo y estiraba la tarjeta.
                  En línea, nueve puestos ocupan tres o cuatro renglones en
                  vez de nueve.

                  **"2 × Garzón" y no "dos garzones"**: los nombres de puesto
                  los escribe el cliente y no hay forma de pluralizarlos bien
                  sin inventar reglas del español —"asistente de bar" no se
                  pluraliza como "garzón"—. El `×` es además la misma
                  convención que los menús del día: "5 × Tradiciones". */}
              <p className="mt-3 text-[13px] leading-snug text-hueso/75">
                {resumen.porPuesto.map((p, k) => (
                  <span key={p.puesto}>
                    {k > 0 && ', '}
                    {/* **Uno no lleva número.** Nueve "1 ×" seguidos son
                        ruido, y sin número se lee "uno", que es como lo
                        escribiría una persona. */}
                    {p.cuantos > 1 && (
                      <><strong className="tabular-nums text-hueso">{p.cuantos}</strong>{' × '}</>
                    )}
                    {p.puesto}
                  </span>
                ))}
              </p>
            </>
          )}

          {resumen && resumen.faltan > 0 && (
            <p className="mt-3 text-[13px] font-medium text-ambar-texto">
              {resumen.faltan === 1 ? 'Falta' : 'Faltan'} {resumen.faltan}:{' '}
              {textoFaltantes(resumen.faltantes ?? [])}
            </p>
          )}

          <div className={`mt-3 ${PIE}`}>
            <button onClick={() => setVolteada(false)} {...alDorso}
              className={BOTON}>
              Volver
            </button>
            <span className="flex-1" />
            {/* El relleno es para el que decide: planificar es a lo que se
                vino al dar vuelta la tarjeta. */}
            <button onClick={onPlanificar} {...alDorso}
              className="boton boton-relleno">
              Planificar
            </button>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

/**
 * La página del trabajador: sus turnos, y nada más.
 *
 * Entra con un link personal, sin contraseña ni correo. Se eligió sobre una
 * clave compartida de solo lectura por una razón concreta: cuando el panel
 * tenga sueldos y ajustes, una clave compartida dejaría que cualquier
 * trabajador viera lo que gana y lo que le descontaron a todos los demás.
 *
 * **Es un componente de servidor y lee la planilla directamente, sin pasar
 * por una ruta de API.** Así no existe ningún endpoint nuevo que alguien
 * pueda llamar con un token prestado para sacar datos en bruto: lo único que
 * sale de acá es el HTML ya recortado de una persona.
 *
 * Lo que muestra está elegido a la mano: qué día, a qué hora, en qué puesto,
 * cuánta gente se espera y **qué menús hay que preparar**. Lo último lo pidió
 * el cliente pensando en la cocina, y va para todos los puestos por igual:
 * saber que vienen 30 Tradiciones y 8 de niños sirve lo mismo para montar
 * las mesas que para calcular la parrilla, y hacer dos versiones de esta
 * página sería mantener dos.
 *
 * **No muestra reservas, ni nombres de clientes, ni montos, ni a los demás
 * trabajadores.** Los totales por menú son cuánto hay que cocinar; quién lo
 * pidió y cuánto pagó no es dato de un turno.
 */
import { leerTrabajadores, leerTurnos, leerFechas, leerConfig, leerReservas,
         leerMenus } from '@/lib/datos';
import { menusDe } from '@/lib/shopify';
import { trabajadorPorToken, turnosDe, pagoDe, esContratado, esPreparacion,
         totalAjustes, VINO, type Turno } from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';
import { ocupaLugar } from '@/lib/ocupacion';
import { enPalabras, hoy, sumarDias, diaSemana } from '@/lib/fechas';
import { estaCerrado } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * Una línea del desglose: qué es a la izquierda, cuánto a la derecha.
 *
 * **Va al nivel del módulo y no dentro de la página**, que es la regla del
 * proyecto: un componente declarado adentro de otro es un tipo nuevo en cada
 * dibujado, y React lo desmonta y lo vuelve a montar.
 *
 * `conSigno` pone el **−** o el **+** adelante —`−$5.000`, no `$-5.000`—,
 * que es la convención del panel: el signo pegado al peso se lee como un
 * error de tipeo justo donde importa saber si se suma o se resta.
 */
function Linea({ que, monto, conSigno = false, fuerte = false, nota }: {
  que: string;
  monto: number;
  conSigno?: boolean;
  fuerte?: boolean;
  /** Para decir por qué una línea vale cero, en vez de dejar el cero solo. */
  nota?: string;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${
      fuerte ? 'mt-1.5 border-t border-hueso/15 pt-1.5' : ''}`}>
      <dt className={fuerte ? 'font-semibold text-hueso/85' : 'text-hueso/65'}>
        {que}
        {nota && <span className="text-hueso/45"> · {nota}</span>}
      </dt>
      <dd className={`shrink-0 tabular-nums ${fuerte
        ? 'text-base font-bold text-oro'
        : monto < 0 ? 'text-rojo-texto' : 'text-hueso/85'}`}>
        {conSigno && (monto < 0 ? '−' : '+')}
        {enPesos(Math.abs(monto))}
      </dd>
    </div>
  );
}

export default async function Pagina({ params }: { params: { token: string } }) {
  const [gente, turnos, fechas, cfg, reservas, catalogo] = await Promise.all([
    leerTrabajadores(), leerTurnos(),
    // Igual que las reservas: la hora de apertura y las notas del día son un
    // extra. `leerFechas()` no atrapa sus errores —las pantallas del panel
    // quieren verlos— así que se atrapan acá.
    leerFechas().catch(() => []), leerConfig(),
    // Cuánta gente se espera es un extra: si no se puede leer, la página
    // igual tiene que decirle a la persona qué día y en qué puesto trabaja.
    // Sin esto, una falla al leer las reservas le devolvía un error 500.
    leerReservas().catch(() => []),
    // El catálogo solo sirve para escribir bien los nombres de los menús.
    // Si no se puede leer, los totales salen igual con el nombre crudo.
    leerMenus().catch(() => [])
  ]);

  // La lista vacía no es "tu link no sirve": no existe el caso de un token
  // válido con la lista en cero. Es la planilla que no respondió, y decirle
  // a la persona que su link está malo la manda a pedir uno nuevo que
  // tampoco va a funcionar.
  if (gente.length === 0) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">No se pudo cargar</h1>
        <p className="mt-3 text-sm text-hueso/60">
          Tu link está bien; el problema es nuestro. Vuelve a intentarlo en un
          rato, y si sigue igual avísale a quien organiza los turnos.
        </p>
      </section>
    );
  }

  const quien = trabajadorPorToken(gente, decodeURIComponent(params.token));

  // **El mismo mensaje para un link inventado y para uno revocado.** Decir
  // "ese link ya no sirve" confirmaría que existió, y no le sirve de nada a
  // quien sí es trabajador: para él la salida es la misma, pedir uno nuevo.
  if (!quien) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/60">
          Puede estar mal copiado, o puede que te hayan dado uno nuevo.
          Pídele el link a quien organiza los turnos.
        </p>
      </section>
    );
  }

  const desde = hoy();
  const mios = turnosDe(turnos, quien.nombre, desde);

  // Lo ya trabajado, para poder contestar "¿cuánto llevo?" sin tener que
  // preguntarle a nadie. Treinta días: lo que normalmente se cobra junto.
  const hace30 = sumarDias(desde, -30);
  const pasados = turnosDe(turnos, quien.nombre, hace30)
    .filter((t) => t.fecha < desde && t.asistencia)
    .reverse();
  const ganado = pasados.reduce((s, t) => s + pagoDe(t), 0);
  /**
   * El total partido en sus pedazos, que es lo que pidió el cliente: *"ve
   * todos sus datos de forma ordenada, cuánto por turno, cuánto propina,
   * cuánto se le restó por alguna razón, los extras"*.
   *
   * Se suman **solo los días que vino**, igual que `pagoDe()`: un turno sin
   * marcar o marcado "no vino" no suma nada, y hacerlo aparecer acá diría
   * que se le debe algo que nadie confirmó.
   */
  const vinieron = pasados.filter((t) => t.asistencia === VINO.si);
  const suma = (f: (t: Turno) => number) => vinieron.reduce((n, t) => n + f(t), 0);
  const jornadas = suma((t) => (esContratado(t.modalidad) ? 0 : t.pagoJornada || 0));
  const horas = suma((t) => (t.horasExtra || 0) * (t.valorHora || 0));
  const ajustes = suma((t) => totalAjustes(t.ajustes));
  /**
   * Si los pedazos no suman el total, es porque **algún día quedó en cero**:
   * `pagoDe()` nunca baja de cero, así que un descuento mayor que la jornada
   * se come el resto y deja de cuadrar. Es raro, pero callarlo haría que la
   * persona sumara con la calculadora y le diera otra cosa — que es
   * exactamente lo que esta página viene a evitar.
   */
  const cuadra = jornadas + horas + ajustes === ganado;
  // La propina va sumada en lo que recibe la persona —para ella sí es todo
  // lo mismo— pero mostrada aparte, para que pueda revisar cada cosa.
  const propinas = pasados.reduce((s, t) => s + (t.propina || 0), 0);
  const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
  const delDia = (fecha: string) => reservas.filter((r) => r.fecha === fecha && ocupaLugar(r));
  const personasDe = (fecha: string) =>
    delDia(fecha).reduce((s, r) => s + (Number(r.personas) || 0), 0);

  return (
    <section className="mx-auto max-w-md">
      <p className="text-xs uppercase tracking-widest text-oro">Tus turnos</p>
      <h1 className="mt-1 text-xl font-bold uppercase tracking-wide">{quien.nombre}</h1>

      {mios.length === 0 ? (
        <p className="mt-6 text-sm text-hueso/60">
          No tienes turnos asignados por ahora. Cuando te asignen uno, aparece
          acá — este mismo link sigue sirviendo, no hace falta pedir otro.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {mios.map((t) => {
            const dia = porFecha.get(t.fecha);
            const personas = personasDe(t.fecha);
            const menus = menusDe(delDia(t.fecha), catalogo);
            // Un día sin público y con equipo es preparación. Sin esto se
            // veía igual que un día de atención sin reservas, que es otra
            // cosa: quien lo lee tiene que saber si va a atender o a montar.
            const preparando = esPreparacion({
              conEquipo: true,
              abierto: dia ? !estaCerrado(dia.estado) : cfg.diasAbiertos.includes(diaSemana(t.fecha)),
              personas
            });
            return (
              <li key={t.fecha + t.puesto}
                  className="rounded border border-hueso/15 bg-panel p-4">
                <p className="text-sm text-hueso/85 first-letter:uppercase">{enPalabras(t.fecha)}</p>
                <p className="mt-2 text-lg font-bold">
                  {t.puesto || <span className="text-hueso/50">Sin puesto definido</span>}
                </p>
                <p className="mt-1 text-xs text-hueso/55">
                  Desde las {dia?.apertura || cfg.horaApertura}
                  {personas > 0 && (
                    <> · {personas} {personas === 1 ? 'persona' : 'personas'} esperada
                      {personas === 1 ? '' : 's'}</>
                  )}
                  {preparando && (
                    <span className="text-oro"> · día de preparación, no abre al público</span>
                  )}
                </p>
                {menus.length > 0 && (
                  <>
                    <p className="mt-3 text-xs uppercase tracking-widest text-hueso/40">
                      Qué se prepara
                    </p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {menus.map(({ menu, cantidad }) => (
                        <li key={menu}
                            className="rounded border border-hueso/15 bg-panel px-2 py-1 text-xs">
                          <strong className="tabular-nums text-oro">{cantidad}</strong>
                          <span className="text-hueso/50"> × </span>
                          <span className="text-hueso/80">{menu}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {dia?.notas && <p className="mt-2 text-xs text-hueso/50">{dia.notas}</p>}
              </li>
            );
          })}
        </ul>
      )}

      {pasados.length > 0 && (
        <>
          <h2 className="mt-10 text-sm font-semibold uppercase tracking-widest text-hueso/70">
            Tus últimos 30 días
          </h2>

          {/* **Un día es una tarjeta con su desglose, no una línea con un
              monto** (2026-11-01, lo pidió el cliente: que la persona vea
              *"cuánto por turno, cuánto propina, cuánto se le restó por
              alguna razón, los extras"*).

              Antes acá iba una sola cifra por día, que es justo la que no se
              puede revisar: quien ve $35.000 y esperaba $40.000 no tiene
              cómo saber si le descontaron algo, si le pagaron horas extra o
              si está mal. Con la jornada, las horas, cada ajuste **con su
              motivo** y la propina a la vista, la pregunta se contesta sola
              — y si queda algo que reclamar, se reclama nombrando la línea.

              El motivo es la parte que importa: es lo único que explica un
              descuento un mes después, y es para esto que se escribe. */}
          <ul className="mt-3 space-y-2">
            {pasados.map((t) => {
              const jornada = esContratado(t.modalidad) ? 0 : (t.pagoJornada || 0);
              const horasExtra = (t.horasExtra || 0) * (t.valorHora || 0);
              const total = pagoDe(t);
              return (
                <li key={t.fecha + t.puesto}
                    className="rounded border border-hueso/15 bg-panel p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-sm font-semibold text-hueso/85 first-letter:uppercase">
                      {enPalabras(t.fecha)}
                    </span>
                    <span className="text-[13px] text-hueso/60">{t.puesto}</span>
                  </div>

                  {t.asistencia === VINO.no ? (
                    <p className="mt-1.5 text-[13px] text-hueso/55">No viniste ese día.</p>
                  ) : (
                    <dl className="mt-2 space-y-1 text-[13px]">
                      {esContratado(t.modalidad) ? (
                        <Linea que="Jornada" nota="va en tu sueldo, no acá" monto={0} />
                      ) : (
                        <Linea que="Jornada" monto={jornada} />
                      )}
                      {horasExtra > 0 && (
                        <Linea monto={horasExtra}
                          que={`Horas extra (${t.horasExtra} × ${enPesos(t.valorHora)})`} />
                      )}
                      {/* Cada ajuste por separado y con su motivo: sumarlos
                          en una línea sería volver a esconder el porqué. */}
                      {t.ajustes.map((a, k) => (
                        <Linea key={k} monto={a.monto} conSigno
                          que={a.motivo || (a.monto < 0 ? 'Descuento' : 'Extra')} />
                      ))}
                      {t.propina > 0 && <Linea que="Propina" monto={t.propina} />}
                      {/* **La propina va sumada en el total de la persona**,
                          al revés que en las cuentas del negocio: para quien
                          la recibe es todo lo mismo. Mostrada aparte, eso sí,
                          para que pueda revisar cada cosa por separado.

                          Y va ARRIBA del total, no debajo: un total seguido
                          de otra cifra se lee como si esa otra no estuviera
                          contada, que es justo la duda que esta página viene
                          a sacar. */}
                      <Linea que="Total del día" monto={total + (t.propina || 0)} fuerte />
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>

          {(ganado > 0 || propinas > 0) && (
            <div className="mt-4 rounded border border-oro/30 bg-oro/[0.06] p-3">
              <p className="text-xs uppercase tracking-widest text-hueso/60">
                En estos 30 días
              </p>
              <dl className="mt-2 space-y-1 text-[13px]">
                {jornadas > 0 && (
                  <Linea monto={jornadas}
                    que={`Turnos (${vinieron.length} ${vinieron.length === 1 ? 'día' : 'días'})`} />
                )}
                {horas > 0 && <Linea que="Horas extra" monto={horas} />}
                {ajustes !== 0 && <Linea que="Ajustes" monto={ajustes} conSigno />}
                {propinas > 0 && <Linea que="Propina" monto={propinas} />}
                <Linea que="Total" monto={ganado + propinas} fuerte />
              </dl>
              {!cuadra && (
                <p className="mt-2 text-xs text-hueso/55">
                  Algún día quedó en cero porque el descuento era mayor que la
                  jornada: un día nunca baja de cero.
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-[13px] text-hueso/60">
            {esContratado(quien.modalidad)
              ? 'Tu sueldo no sale de acá: lo que aparece son tus horas extra y los ajustes del día.'
              : 'Es lo que quedó anotado al cerrar cada día. Si ves algo raro, dilo.'}
          </p>
        </>
      )}

      <p className="mt-8 text-xs text-hueso/40">
        Esta página es solo tuya. Si te cambian el turno, cambia sola: no
        hace falta que vuelvan a mandarte nada.
      </p>
    </section>
  );
}

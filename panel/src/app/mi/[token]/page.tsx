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
         VINO } from '@/lib/equipo';
import { enPesos } from '@/lib/ocupacion';
import { ocupaLugar } from '@/lib/ocupacion';
import { enPalabras, hoy, sumarDias, diaSemana } from '@/lib/fechas';
import { estaCerrado } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

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
                <p className="text-sm capitalize text-hueso/85">{enPalabras(t.fecha)}</p>
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
          <h2 className="mt-10 text-xs uppercase tracking-widest text-hueso/45">
            Tus últimos 30 días
          </h2>
          <ul className="mt-3 space-y-1.5">
            {pasados.map((t) => (
              <li key={t.fecha + t.puesto}
                  className="flex items-baseline justify-between gap-3 border-b
                             border-hueso/5 pb-1.5 text-sm">
                <span className="capitalize text-hueso/70">{enPalabras(t.fecha)}</span>
                <span className="text-xs text-hueso/40">{t.puesto}</span>
                <span className="flex-1" />
                {t.asistencia === VINO.no ? (
                  <span className="text-xs text-hueso/35">no viniste</span>
                ) : esContratado(t.modalidad) && pagoDe(t) === 0 ? (
                  <span className="text-xs text-hueso/35">contratado</span>
                ) : (
                  <span className="tabular-nums">
                    <strong>{enPesos(pagoDe(t))}</strong>
                    {t.propina > 0 && (
                      <span className="ml-1 text-xs text-hueso/50">
                        + {enPesos(t.propina)} propina
                      </span>
                    )}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {(ganado > 0 || propinas > 0) && (
            <p className="mt-3 text-sm">
              <span className="text-hueso/55">En total: </span>
              <strong className="tabular-nums text-oro">{enPesos(ganado + propinas)}</strong>
              {propinas > 0 && (
                <span className="text-xs text-hueso/50">
                  {' '}({enPesos(ganado)} de turnos + {enPesos(propinas)} de propina)
                </span>
              )}
            </p>
          )}
          <p className="mt-2 text-xs text-hueso/40">
            {esContratado(quien.modalidad)
              ? 'Tu sueldo no sale de acá: lo que aparece son horas extra y ajustes del día.'
              : 'Es lo que quedó anotado al pasar lista. Si ves algo raro, dilo.'}
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

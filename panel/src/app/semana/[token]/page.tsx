/**
 * La planilla semanal: quién trabaja cada día de la semana, en qué puesto.
 *
 * **Es el link que se manda al grupo**, así que está hecho con la idea de
 * que va a circular más de lo que uno quisiera. Por eso muestra lo mínimo
 * que sirve para organizarse:
 *
 *   - quién trabaja cada día y en qué puesto
 *   - cuánta gente se espera y cuántas reservas son
 *
 * **Y nada más. Ni un peso, ni un menú, ni un nombre de cliente.** Lo que un
 * trabajador necesita saber de su propio día —los menús que hay que
 * preparar, lo que gana ese día— vive en su link personal, que es de una
 * sola persona. Separarlos es justamente lo que permite mandar este sin
 * pensarlo dos veces.
 *
 * La llave de la URL se renueva desde /config cuando hace falta que las
 * copias viejas dejen de servir.
 */
import { leerConfig, leerTurnos, leerPuestos, leerReservas, leerFechas } from '@/lib/datos';
import { ocupaLugar } from '@/lib/ocupacion';
import { iguales } from '@/lib/auth';
import { normalizar, estaCerrado } from '@/lib/columnas';
import { VINO, esPreparacion } from '@/lib/equipo';
import { hoy, semanaDe, sumarDias, enPalabras, rangoEnPalabras, esFecha,
         diaSemana } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

export default async function Pagina({
  params, searchParams
}: {
  params: { token: string };
  searchParams: { semana?: string };
}) {
  const cfg = await leerConfig();
  const pedido = decodeURIComponent(params.token ?? '');

  // La llave vacía no abre nada, aunque la configuración tampoco tenga una.
  // Si calzaran, entrar a /semana/ con cualquier cosa abriría la planilla el
  // día en que nadie haya creado el link todavía.
  if (!cfg.tokenPlanilla || !pedido || !iguales(cfg.tokenPlanilla, pedido)) {
    return (
      <section className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide">Este link no sirve</h1>
        <p className="mt-3 text-sm text-hueso/60">
          Puede estar mal copiado, o puede que hayan creado uno nuevo. Pídele
          el link a quien organiza los turnos.
        </p>
      </section>
    );
  }

  const base = esFecha(searchParams?.semana) ? searchParams.semana! : hoy();
  const lunes = semanaDe(base);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

  const [turnos, puestos, reservas, fechas] = await Promise.all([
    leerTurnos(), leerPuestos(),
    leerReservas().catch(() => []), leerFechas().catch(() => [])
  ]);

  const deLaSemana = turnos.filter((t) => dias.includes(t.fecha));
  // Solo los días con alguien asignado. Siete columnas para un negocio que
  // abre dos es una tabla llena de huecos, y lo que se manda al grupo tiene
  // que leerse en un teléfono.
  const conEquipo = dias.filter((d) => deLaSemana.some((t) => t.fecha === d));

  const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
  const delDia = (f: string) => reservas.filter((r) => r.fecha === f && ocupaLugar(r));
  const personasDe = (f: string) =>
    delDia(f).reduce((s, r) => s + (Number(r.personas) || 0), 0);
  const preparando = (f: string) => esPreparacion({
    conEquipo: true,                       // la columna existe porque hay equipo
    abierto: porFecha.has(f)
      ? !estaCerrado(porFecha.get(f)!.estado)
      : cfg.diasAbiertos.includes(diaSemana(f)),
    personas: personasDe(f)
  });

  // Los puestos de la lista primero, en su orden, y después los que aparecen
  // en los turnos sin estar en ella: alguien asignado no puede desaparecer
  // de la planilla porque le renombraron el puesto.
  const orden = puestos.map((p) => p.nombre);
  for (const t of deLaSemana) {
    if (!orden.some((n) => normalizar(n) === normalizar(t.puesto))) {
      orden.push(t.puesto || 'Sin puesto');
    }
  }
  const filas = orden.filter((nombre) =>
    deLaSemana.some((t) => normalizar(t.puesto || 'Sin puesto') === normalizar(nombre)));

  const quienes = (puesto: string, fecha: string) => deLaSemana
    .filter((t) => t.fecha === fecha &&
      normalizar(t.puesto || 'Sin puesto') === normalizar(puesto))
    .map((t) => t);

  return (
    <section>
      <p className="text-xs uppercase tracking-widest text-oro">Planilla de la semana</p>
      <h1 className="mt-1 text-xl font-bold uppercase tracking-wide">
        {rangoEnPalabras(dias)}
      </h1>

      {conEquipo.length === 0 ? (
        <p className="mt-6 text-sm text-hueso/60">
          Todavía no hay nadie asignado para esta semana.
        </p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-hueso/15 text-left align-bottom">
                  <th className="w-32 py-2 pr-3 text-xs uppercase tracking-wide text-hueso/45">
                    Puesto
                  </th>
                  {conEquipo.map((f) => (
                    <th key={f} className="py-2 pr-3">
                      <span className="block capitalize text-hueso/85">{enPalabras(f)}</span>
                      <span className="block text-xs font-normal text-hueso/45">
                        {porFecha.get(f)?.apertura || cfg.horaApertura}
                        {/* Un día sin público y con equipo es preparación, y
                            decirlo importa más acá que en ninguna parte: esta
                            es la tabla que se manda al grupo, y "0 personas"
                            se lee como un día flojo y no como un día de
                            montaje. */}
                        {preparando(f) ? (
                          <span className="text-oro"> · preparación</span>
                        ) : (
                          <>
                            {' · '}
                            {personasDe(f)} personas
                            <span className="text-hueso/30">
                              {' · '}{delDia(f).length} reservas
                            </span>
                          </>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((puesto) => (
                  <tr key={puesto} className="border-b border-hueso/5 align-top">
                    <td className="py-2 pr-3 text-hueso/55">{puesto}</td>
                    {conEquipo.map((f) => (
                      <td key={f} className="py-2 pr-3">
                        {quienes(puesto, f).length === 0 ? (
                          <span className="text-hueso/20">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {quienes(puesto, f).map((t) => (
                              <li key={t.trabajador}
                                  className={t.asistencia === VINO.no
                                    ? 'text-hueso/30 line-through' : 'text-hueso/85'}>
                                {t.trabajador}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-hueso/40">
            Un nombre tachado es alguien que no llegó ese día.
          </p>
        </>
      )}

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <a href={`?semana=${sumarDias(lunes, -7)}`} className="text-hueso/60 hover:text-oro">
          ← Semana anterior
        </a>
        <a href={`?semana=${sumarDias(lunes, 7)}`} className="text-hueso/60 hover:text-oro">
          Semana siguiente →
        </a>
      </div>

      <p className="mt-8 text-xs text-hueso/40">
        ¿Eres parte del equipo y quieres ver los menús de tu día o lo que
        ganas? Eso está en tu link personal, el que es solo tuyo.
      </p>
    </section>
  );
}

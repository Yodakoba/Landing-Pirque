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
 * Lo que muestra está elegido a la mano: qué día, a qué hora, en qué puesto
 * y cuánta gente se espera. **No muestra reservas, ni montos, ni a los demás
 * trabajadores.** Un turno no necesita saber quién viene a comer.
 */
import { leerTrabajadores, leerTurnos, leerFechas, leerConfig, leerReservas } from '@/lib/datos';
import { trabajadorPorToken, turnosDe } from '@/lib/equipo';
import { ocupaLugar } from '@/lib/ocupacion';
import { enPalabras, hoy } from '@/lib/fechas';

export const dynamic = 'force-dynamic';

export default async function Pagina({ params }: { params: { token: string } }) {
  const [gente, turnos, fechas, cfg, reservas] = await Promise.all([
    leerTrabajadores(), leerTurnos(),
    // Igual que las reservas: la hora de apertura y las notas del día son un
    // extra. `leerFechas()` no atrapa sus errores —las pantallas del panel
    // quieren verlos— así que se atrapan acá.
    leerFechas().catch(() => []), leerConfig(),
    // Cuánta gente se espera es un extra: si no se puede leer, la página
    // igual tiene que decirle a la persona qué día y en qué puesto trabaja.
    // Sin esto, una falla al leer las reservas le devolvía un error 500.
    leerReservas().catch(() => [])
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
  const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
  const personasDe = (fecha: string) => reservas
    .filter((r) => r.fecha === fecha && ocupaLugar(r))
    .reduce((s, r) => s + (Number(r.personas) || 0), 0);

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
            return (
              <li key={t.fecha + t.puesto}
                  className="rounded border border-hueso/15 bg-hueso/[0.03] p-4">
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
                </p>
                {dia?.notas && <p className="mt-2 text-xs text-hueso/50">{dia.notas}</p>}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 text-xs text-hueso/40">
        Esta página es solo tuya. Si te cambian el turno, cambia sola: no
        hace falta que vuelvan a mandarte nada.
      </p>
    </section>
  );
}

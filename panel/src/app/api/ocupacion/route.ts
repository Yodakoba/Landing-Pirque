import { NextResponse } from 'next/server';
import { exigir, exigirVer } from '@/lib/permisos';
import { leerReservas, leerFechas, leerConfig, posiblesDeLosDias } from '@/lib/datos';
import { ocupacionDeTodos } from '@/lib/ocupacion';
import { diasAbiertosEntre, hoy, sumarDias, esFecha } from '@/lib/fechas';
import type { FechaHabil } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/**
 * La ocupación de los días que vienen.
 *
 * **Hasta dónde llega lo decide `dias_a_futuro` de la configuración**, no un
 * número en el código. Antes eran "los próximos 8 días abiertos", fijos: el
 * panel mostraba cuatro fines de semana y los 90 días configurados no se
 * veían por ninguna parte.
 *
 * Los días salen de TRES lugares que se unen:
 *
 *   1. La regla —qué días de la semana se abre— dentro de la ventana.
 *   2. **Lo que haya en la hoja dentro de esa ventana**, aunque no calce con
 *      la regla. Un viernes abierto a mano para un feriado es justamente lo
 *      que no hay que esconder.
 *   3. **Los días que tienen alguna reserva**, aunque no estén en ninguna de
 *      las dos listas. Faltaba, y el síntoma era feo: una reserva anotada a
 *      mano para un miércoles —un evento privado, por ejemplo— quedaba
 *      invisible en el panel. La reserva existía en la planilla y el día
 *      simplemente no se dibujaba.
 *
 * Un día que la regla abre pero que todavía no está en la hoja se muestra
 * igual, en gris y con capacidad 0: así se ve cuáles faltan por abrir, en
 * vez de que simplemente no aparezcan.
 *
 * **La ventana parte hoy salvo que se pida otra** (`desde` y `hasta`), y eso
 * último se agregó el 2026-11-01 para arreglar un error que se veía feo.
 * `/turnos` y `/extras` dibujan **cualquier mes**, incluidos los que ya
 * pasaron, y pedían esta ocupación una sola vez y sin parámetros: para un
 * mes de atrás no venía ningún día, así que **todo sábado con equipo se leía
 * como "preparación"** —la regla es "tiene equipo y no recibe público", y
 * sin ocupación ningún día recibe público— y la tarjeta además decía 0
 * personas. Lo notó el cliente mirando octubre.
 */
export async function GET(req: Request) {
  const no = await exigirVer(req, 'ver');
  if (no) return no;
  try {
    // El parámetro sigue existiendo para poder pedir otra ventana a mano,
    // pero el valor de siempre sale de la planilla.
    const pedido = Number(new URL(req.url).searchParams.get('dias'));
    const [reservas, fechas, cfg, posibles] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig(),
      // Lo cotizado y sin confirmar. Viaja aparte y no entra en ninguna
      // cuenta del cupo: ver `ocupacionDe()`. Si no se puede leer vuelve
      // vacío, porque una falla de la capa comercial no puede dejar sin
      // calendario a quien vino a mirar las reservas.
      posiblesDeLosDias(hoy())
    ]);

    // Un rango explícito manda sobre la ventana de siempre: es lo que piden
    // los calendarios que se mueven de mes en mes. Lo que no venga, o venga
    // mal escrito, cae en el comportamiento de antes.
    const q = new URL(req.url).searchParams;
    const desde = esFecha(q.get('desde') ?? '') ? q.get('desde')! : hoy();
    const hasta = esFecha(q.get('hasta') ?? '')
      ? q.get('hasta')!
      : sumarDias(desde, pedido > 0 ? pedido : cfg.diasAFuturo);

    const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
    const porRegla = diasAbiertosEntre(desde, hasta, cfg.diasAbiertos);

    const enLaVentana = (f: string) => f >= desde && f <= hasta;
    // Lo de la hoja que cae en la ventana y que la regla no habría incluido.
    const aMano = fechas.map((f) => f.fecha).filter(enLaVentana);
    // Y los días que tienen reservas, estén donde estén. Una reserva sin su
    // día dibujado es una reserva que nadie va a ver.
    const conReservas = reservas.map((r) => r.fecha).filter(enLaVentana);

    const dias: FechaHabil[] = [...new Set([...porRegla, ...aMano, ...conReservas])]
      .sort().map(
      (f) => porFecha.get(f) ?? {
        // Capacidad 0 a propósito, no el cupo normal: un día que todavía no
        // está en la hoja no está abierto, y mostrarlo con 60 lugares diría
        // que se puede reservar.
        fecha: f, capacidad: 0, apertura: cfg.horaApertura,
        // Estado VACIO, no "Sin definir": estaCerrado() cierra todo lo que
        // no reconoce —a propósito, falla cerrando— y con ese texto un día
        // que nadie configuró todavía salía marcado como CERRADO, que es
        // otra cosa. En blanco se lee como "sin novedad", que es lo que es.
        estado: '', notas: '', fila: -1
      }
    );
    // Un día CERRADO no se muestra: cerrarlo es decir "este día no existe
    // para nosotros", y dejarlo en el calendario es ensuciar la vista con
    // algo que no hay que hacer. Se reabre desde "Agregar fecha", que
    // avisa que esa fecha ya estaba.
    //
    // **Salvo que tenga reservas.** Ahí hay gente que ya reservó y a la
    // que probablemente haya que llamar: esconder el día escondería a esas
    // personas, que es el único resultado peor que una vista sucia.
    const ocupacion = ocupacionDeTodos(reservas, dias, cfg.cortes, posibles)
      // **O que tenga algo cotizado.** Mismo motivo que las reservas: si
      // alguien cotizó un día que después se cerró, esconderlo escondería
      // una conversación abierta con un cliente.
      .filter((o) => !o.bloqueada || o.tomadas > 0 || o.presupuestos > 0);

    return NextResponse.json({ ocupacion, config: cfg });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

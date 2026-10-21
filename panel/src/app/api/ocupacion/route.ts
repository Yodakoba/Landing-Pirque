import { NextResponse } from 'next/server';
import { leerReservas, leerFechas, leerConfig } from '@/lib/datos';
import { ocupacionDeTodos } from '@/lib/ocupacion';
import { diasAbiertosEntre, hoy, sumarDias } from '@/lib/fechas';
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
 */
export async function GET(req: Request) {
  try {
    // El parámetro sigue existiendo para poder pedir otra ventana a mano,
    // pero el valor de siempre sale de la planilla.
    const pedido = Number(new URL(req.url).searchParams.get('dias'));
    const [reservas, fechas, cfg] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig()
    ]);

    const desde = hoy();
    const hasta = sumarDias(desde, pedido > 0 ? pedido : cfg.diasAFuturo);

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
    return NextResponse.json({
      ocupacion: ocupacionDeTodos(reservas, dias, cfg.cortes),
      config: cfg
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

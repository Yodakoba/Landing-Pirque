import { NextResponse } from 'next/server';
import { leerReservas, leerFechas, leerConfig } from '@/lib/datos';
import { ocupacionDeTodos } from '@/lib/ocupacion';
import { proximosFinesDeSemana, hoy } from '@/lib/fechas';
import type { FechaHabil } from '@/lib/tipos';

export const dynamic = 'force-dynamic';

/**
 * La ocupación de los próximos fines de semana.
 *
 * Los días salen de la hoja "Fechas Hábiles". Los fines de semana que
 * todavía no están en esa hoja se muestran igual, en gris y con capacidad 0:
 * así se ve de inmediato cuáles faltan por abrir, en vez de que simplemente
 * no aparezcan.
 */
export async function GET(req: Request) {
  try {
    const cuantos = Number(new URL(req.url).searchParams.get('dias')) || 8;
    const [reservas, fechas, cfg] = await Promise.all([
      leerReservas(), leerFechas(), leerConfig()
    ]);

    const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
    const dias: FechaHabil[] = proximosFinesDeSemana(hoy(), cuantos, cfg.diasAbiertos).map(
      (f) => porFecha.get(f) ?? {
        // Capacidad 0 a propósito, no el cupo normal: un día que todavía no
        // está en la hoja no está abierto, y mostrarlo con 60 lugares diría
        // que se puede reservar.
        fecha: f, capacidad: 0, apertura: cfg.horaApertura,
        estado: 'Sin definir', notas: '', fila: -1
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

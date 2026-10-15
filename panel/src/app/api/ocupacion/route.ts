import { NextResponse } from 'next/server';
import { leerReservas, leerFechas } from '@/lib/datos';
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
    const [reservas, fechas] = await Promise.all([leerReservas(), leerFechas()]);

    const porFecha = new Map(fechas.map((f) => [f.fecha, f]));
    const dias: FechaHabil[] = proximosFinesDeSemana(hoy(), cuantos).map(
      (f) => porFecha.get(f) ?? {
        fecha: f, capacidad: 0, apertura: '13:00',
        estado: 'Sin definir', notas: '', fila: -1
      }
    );
    return NextResponse.json({ ocupacion: ocupacionDeTodos(reservas, dias) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

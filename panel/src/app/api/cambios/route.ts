import { NextResponse } from 'next/server';
import { conLecturas, MENSAJE_LIMITE } from '@/lib/sheets';
import { HOJA_FECHAS, HOJA_RESERVAS } from '@/lib/columnas';
import { exigirVer } from '@/lib/permisos';
import { leerReservas, leerFechas } from '@/lib/datos';
import { firmaDe, personasPorDia } from '@/lib/cambios';

export const dynamic = 'force-dynamic';

/**
 * **La revisión liviana** (2026-11-12): la firma de las reservas y los días,
 * y cuánta gente hay por día. Las dos pestañas van en la misma tanda, así
 * que cuesta **una lectura** a Google. La pantalla la pregunta cada dos
 * minutos mientras está a la vista, y recarga todo solo si la firma cambió.
 * Ver `lib/cambios.ts`.
 */
export const GET = conLecturas([HOJA_RESERVAS, HOJA_FECHAS], async function GET(req: Request) {
  const no = await exigirVer(req, 'ver');
  if (no) return no;
  try {
    const [reservas, fechas] = await Promise.all([leerReservas(), leerFechas()]);
    return NextResponse.json({ firma: firmaDe(reservas, fechas), personas: personasPorDia(reservas) });
  } catch (e) {
    const msg = (e as Error).message;
    // Un 429 de Google se dice como 429, para que la pantalla espere más.
    const limite = msg === MENSAJE_LIMITE;
    return NextResponse.json({ error: msg }, { status: limite ? 429 : 500 });
  }
});

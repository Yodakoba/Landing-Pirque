import { NextResponse } from 'next/server';
import { leerTurnos } from '@/lib/datos';
import { exigir } from '@/lib/permisos';

export const dynamic = 'force-dynamic';

/**
 * Los turnos, y nada más, para armar el informe.
 *
 * Existe porque el informe lo lee también **quien hace los pagos**, y esa
 * cuenta no puede llamar a `/api/equipo`: ahí viajan las reservas del
 * calendario, la lista completa de trabajadores y los puestos, que no son
 * asunto suyo. Pedirle a esa persona permiso de "ver" para que pudiera
 * sacar sus cuentas habría sido abrirle el panel entero.
 *
 * Es una ruta de solo lectura: el informe no escribe nada.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'informe');
  if (no) return no;
  try {
    return NextResponse.json({ turnos: await leerTurnos() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

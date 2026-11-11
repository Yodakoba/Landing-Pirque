import { NextResponse } from 'next/server';
import { exigir, exigirVer } from '@/lib/permisos';
import { ufDelDia } from '@/lib/ufRed';

export const dynamic = 'force-dynamic';

/**
 * La UF del día, para la ventana de cotizar. Si ninguno de los dos
 * servicios contesta, lo dice: la pantalla deja escribir el precio en pesos.
 */
export async function GET(req: Request) {
  const no = await exigirVer(req, 'presupuestos');
  if (no) return no;
  const uf = await ufDelDia();
  if (!uf) {
    return NextResponse.json(
      { error: 'No se pudo leer la UF de hoy. Escribe el precio en pesos.' }, { status: 502 });
  }
  return NextResponse.json(uf);
}

import { NextResponse } from 'next/server';
import { diagnostico } from '@/lib/datos';

export const dynamic = 'force-dynamic';

/**
 * Abrir /api/diagnostico es lo primero que hay que hacer si el panel se ve
 * vacío. Dice si las hojas existen y qué columnas no calzaron, que es el
 * único fallo que esto tiene y que de otro modo pasa callado.
 */
export async function GET() {
  try {
    return NextResponse.json(await diagnostico());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

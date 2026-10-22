import { NextResponse } from 'next/server';
import { leerTurnos, leerTrabajadores, leerExtras, leerColaboradores } from '@/lib/datos';
import { exigir } from '@/lib/permisos';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * Lo que hay que pagar, y nada más, para armar el informe.
 *
 * Existe porque el informe lo lee también **quien hace los pagos**, y esa
 * cuenta no puede llamar a `/api/equipo`: ahí viajan las reservas del
 * calendario, la lista completa de trabajadores y los puestos, que no son
 * asunto suyo. Pedirle a esa persona permiso de "ver" para que pudiera
 * sacar sus cuentas habría sido abrirle el panel entero.
 *
 * **Desde el 2026-10-22 también devuelve las actividades extras**, porque
 * quien paga hace un solo pago a la semana y necesita verlo todo junto. Lo
 * que no se mezcla es el cálculo: el equipo cobra jornadas y recibe propina,
 * un jinete cobra lo acordado y no recibe ninguna.
 *
 * De las fichas sale **solo la cuenta bancaria**, que es lo que falta para
 * poder transferir sin cruzar la planilla con otra lista a mano. Ni
 * teléfonos, ni sueldos de hoy, ni tokens: esta ruta la lee una cuenta que
 * no tiene permiso para ver el equipo.
 *
 * Es una ruta de solo lectura: el informe no escribe nada.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'informe');
  if (no) return no;
  try {
    const [turnos, extras, gente, colaboradores] = await Promise.all([
      leerTurnos(), leerExtras(), leerTrabajadores(), leerColaboradores()
    ]);
    const cuentas: Record<string, string> = {};
    for (const p of [...gente, ...colaboradores]) {
      if (p.cuenta) cuentas[normalizar(p.nombre)] = p.cuenta;
    }
    return NextResponse.json({ turnos, extras, cuentas });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

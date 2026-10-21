import { NextResponse } from 'next/server';
import { leerConfig, guardarConfig, anotar } from '@/lib/datos';
import { nuevoToken } from '@/lib/equipo';
import { exigir, quienEs } from '@/lib/permisos';

export const dynamic = 'force-dynamic';

/**
 * La llave del link de la planilla semanal.
 *
 * **No se genera sola.** Que exista un link que abre la planilla sin
 * contraseña tiene que ser una decisión de alguien, no un efecto secundario
 * de desplegar.
 *
 * Renovar invalida todas las copias que estén dando vueltas —en el grupo de
 * WhatsApp, en el teléfono de alguien que ya no trabaja acá— y es lo que hay
 * que hacer cuando eso importa. El costo a asumir: también deja de servir el
 * link que la gente que sí trabaja tiene guardado, así que hay que volver a
 * mandarlo.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'links');
  if (no) return no;

  try {
    const { accion } = await req.json();
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json(
        { error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 }
      );
    }

    const cfg = await leerConfig();
    const tokenPlanilla = accion === 'quitar' ? '' : nuevoToken();
    await guardarConfig({ ...cfg, tokenPlanilla });

    await anotar({ ...(await quienEs(req)),
      accion: accion === 'quitar' ? 'Quitó el link de la planilla semanal'
            : accion === 'renovar' ? 'Renovó el link de la planilla semanal'
            : 'Creó el link de la planilla semanal' });

    return NextResponse.json({ tokenPlanilla });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

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
  /**
   * **Crear y renovar son del encargado; quitar, del administrador.**
   *
   * Mandar la planilla al grupo es parte de organizar la semana, y las dos
   * primeras acciones son esa misma tarea: crear el link cuando todavía no
   * hay, y renovarlo cuando alguien deja el equipo y conviene que su copia
   * deje de servir. Quien se entera de eso, y quien va a tener que volver a
   * mandar el link, es el mismo encargado.
   *
   * **Quitar se queda en `links`**: renovar deja la planilla andando con un
   * link nuevo, quitarlo la apaga hasta que alguien la vuelva a encender.
   *
   * Se pide primero el permiso chico y después el grande, en ese orden, para
   * que a quien no tiene ninguno se le conteste "esta parte no es tuya"
   * antes de mirarle el cuerpo de la petición. Y se comprueba acá, en la
   * ruta, no solo en el middleware: ver "El middleware autentica, cada ruta
   * autoriza".
   */
  const no = await exigir(req, 'planilla');
  if (no) return no;

  try {
    const { accion } = await req.json();
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json(
        { error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 }
      );
    }
    if (accion === 'quitar') {
      const soloAdmin = await exigir(req, 'links');
      if (soloAdmin) return soloAdmin;
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

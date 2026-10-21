import { NextResponse } from 'next/server';
import { leerTrabajadores, guardarTrabajadores, anotar } from '@/lib/datos';
import { nuevoToken } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';

export const dynamic = 'force-dynamic';

/**
 * Crear, renovar o quitar el link personal de un trabajador.
 *
 * Es una ruta aparte de `PUT /api/equipo` y no un campo más del formulario
 * **porque no es lo mismo editar una lista que repartir credenciales**.
 * Separadas, el permiso se lee de un vistazo —solo el administrador llega
 * acá— y guardar la lista no puede cambiarle el acceso a nadie por accidente.
 *
 * Renovar es crear uno nuevo encima: el anterior deja de servir en el acto.
 * Es lo que hay que hacer cuando alguien pierde el teléfono.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'links');
  if (no) return no;

  try {
    const { nombre, accion } = await req.json();
    const buscado = normalizar(String(nombre ?? ''));
    if (!buscado) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json(
        { error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 }
      );
    }

    const gente = await leerTrabajadores();
    const i = gente.findIndex((t) => normalizar(t.nombre) === buscado);
    if (i === -1) {
      return NextResponse.json(
        { error: `"${nombre}" no está en la lista de trabajadores. Guarda la lista primero.` },
        { status: 404 }
      );
    }

    const token = accion === 'quitar' ? '' : nuevoToken();
    gente[i] = { ...gente[i], token };
    await guardarTrabajadores(gente);

    // El token NO se anota: la bitácora la lee gente, y una credencial
    // copiada ahí sería una credencial más dando vueltas.
    await anotar({ ...(await quienEs(req)),
      accion: accion === 'quitar' ? 'Quitó un link personal'
            : accion === 'renovar' ? 'Renovó un link personal'
            : 'Creó un link personal',
      detalle: gente[i].nombre });
    return NextResponse.json({ nombre: gente[i].nombre, token });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

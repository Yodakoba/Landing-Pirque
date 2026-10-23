import { NextResponse } from 'next/server';
import { leerTrabajadores, guardarTrabajadores, anotar } from '@/lib/datos';
import { aEntero, esContratado, esSi, MODALIDAD, type Trabajador } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { ROL } from '@/lib/auth';
import { bancoVacio } from '@/lib/banco';
import { telefonoNormal } from '@/lib/contacto';

export const dynamic = 'force-dynamic';

/**
 * Agrega UN trabajador, sin tocar al resto.
 *
 * Existe aparte del `PUT /api/equipo` —que guarda la lista entera— porque se
 * usa desde el planificador: alguien está armando el turno del sábado,
 * aparece un nombre que no estaba en la lista, y tiene que poder crearlo ahí
 * sin salir de lo que está haciendo.
 *
 * **Que sea una sola fila importa**: la pantalla del planificador no tiene
 * la lista completa en la mano —de hecho puede estar desactualizada— y
 * mandarla entera para agregar a uno sería arriesgarse a pisar un cambio de
 * otra persona.
 *
 * El nuevo trabajador **no es un caso especial**: queda en la lista como
 * cualquier otro, con su puesto habitual, y desde ahí se le pone sueldo o
 * link como a todos.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;

  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }

    const gente = await leerTrabajadores();
    const yaEsta = gente.find((t) => normalizar(t.nombre) === normalizar(nombre));
    if (yaEsta) {
      // No es un error que valga la pena hacer fallar la pantalla: lo más
      // probable es que la persona ya exista y quien está planificando no la
      // vio en el desplegable porque estaba inactiva. Se devuelve la que hay.
      return NextResponse.json({
        trabajador: { ...yaEsta, token: '' },
        yaExistia: true,
        aviso: yaEsta.activo
          ? `${yaEsta.nombre} ya estaba en la lista.`
          : `${yaEsta.nombre} ya estaba en la lista, pero inactivo. Actívalo en Equipo.`
      });
    }

    const esAdmin = (await quienEs(req)).rol === ROL.admin;
    const nuevo: Trabajador = {
      nombre,
      telefono: telefonoNormal(b?.telefono),
      puesto: String(b?.puesto ?? '').trim(),
      activo: true,
      // El link personal no se crea acá: repartir credenciales es del
      // administrador y es una decisión aparte de sumar a alguien al equipo.
      token: '',
      // Los sueldos y la modalidad solo los fija el administrador.
      modalidad: esAdmin && esContratado(b?.modalidad)
        ? MODALIDAD.contratado : MODALIDAD.porTurno,
      pagoJornada: esAdmin ? aEntero(b?.pagoJornada) : 0,
      // Los datos bancarios no se piden acá: crear a alguien en mitad de la
      // planificación es apurado, y un número de cuenta mal tecleado es de
      // las cosas que no conviene apurar. Se agregan después, en Equipo.
      banco: bancoVacio(),
      // Participa salvo que se diga lo contrario: es la regla del negocio.
      propina: b?.propina === undefined ? true : esSi(b.propina),
      valorHora: esAdmin ? aEntero(b?.valorHora) : 0
    };

    await guardarTrabajadores([...gente, nuevo]);
    await anotar({ ...(await quienEs(req)), accion: 'Agregó un trabajador',
      detalle: `${nuevo.nombre}${nuevo.puesto ? ` · ${nuevo.puesto}` : ''}` });

    return NextResponse.json({ trabajador: { ...nuevo, token: '' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

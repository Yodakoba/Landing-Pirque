import { NextResponse } from 'next/server';
import { leerTrabajadores, guardarTrabajadores, leerTurnos, anotar } from '@/lib/datos';
import { aEntero, esContratado, esSi, MODALIDAD, type Trabajador } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { ROL } from '@/lib/auth';
import { bancoVacio, limpiarBanco } from '@/lib/banco';
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
      // **Los datos bancarios SÍ se piden al crear** (2026-10-23). Hasta ese
      // día no: el argumento era que crear a alguien en mitad de la
      // planificación es apurado y un número de cuenta mal tecleado no
      // conviene apurarlo. Suena razonable y no resistió el uso — nadie
      // volvía después a `/equipo` a completarlos, así que la planilla del
      // pago semanal salía sin cuentas. Lo pidió el cliente al revés: que se
      // pidan acá, para que la ficha quede completa de entrada.
      banco: esAdmin ? limpiarBanco(b?.banco) : bancoVacio(),
      // Participa salvo que se diga lo contrario: es la regla del negocio.
      propina: b?.propina === undefined ? true : esSi(b.propina),
      valorHora: esAdmin ? aEntero(b?.valorHora) : 0
    };

    await guardarTrabajadores([...gente, nuevo]);
    await anotar({ ...(await quienEs(req)), accion: 'Agregó un trabajador',
      detalle: `${nuevo.nombre}${nuevo.puesto ? ` · ${nuevo.puesto}` : ''}` });

    // El token nunca viaja de vuelta a quien no es administrador, y acá no
    // hay ninguno: repartir credenciales es una decisión aparte.
    return NextResponse.json({
      trabajador: esAdmin ? { ...nuevo, token: '' }
                          : { ...nuevo, token: '', banco: bancoVacio() }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Edita la ficha de UN trabajador, sin tocar al resto.
 *
 * Se abre desde el planificador, con el botón **ficha** de cada persona
 * asignada: así el teléfono, el sueldo habitual o la cuenta bancaria se
 * completan sin salir de lo que se está haciendo. Misma razón que el POST
 * de arriba, y misma forma: una fila, no la lista entera.
 *
 * **El nombre no se cambia por acá**: los turnos guardados apuntan a la
 * persona por su nombre, y renombrarla desde la ventana de un día dejaría
 * los turnos de los otros días huérfanos. Eso se hace en `/equipo`, que es
 * donde el panel avisa del daño.
 */
export async function PATCH(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;

  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }

    const gente = await leerTrabajadores();
    const antes = gente.find((t) => normalizar(t.nombre) === normalizar(nombre));
    if (!antes) {
      return NextResponse.json(
        { error: `${nombre} no está en la lista del equipo.` }, { status: 404 }
      );
    }

    const esAdmin = (await quienEs(req)).rol === ROL.admin;
    const nueva: Trabajador = {
      // El nombre se conserva como está escrito en la planilla: un cambio de
      // mayúsculas no puede desenganchar sus turnos.
      nombre: antes.nombre,
      // **Lo que no venga en el cuerpo se conserva**, que es lo que un PATCH
      // significa. Antes el teléfono y el puesto se escribían siempre, así
      // que una llamada que solo quisiera desactivar a alguien le habría
      // borrado los dos. La ficha manda los campos completos y no nota la
      // diferencia; la línea de `/equipo` manda `activo` y nada más.
      telefono: b?.telefono === undefined
        ? antes.telefono : telefonoNormal(b.telefono),
      puesto: b?.puesto === undefined
        ? antes.puesto : String(b.puesto).trim(),
      activo: b?.activo === undefined ? antes.activo : esSi(b.activo),
      // El token no viene nunca del navegador: se administra en `/equipo`.
      token: antes.token,
      modalidad: esAdmin && b?.modalidad !== undefined
        ? (esContratado(b.modalidad) ? MODALIDAD.contratado : MODALIDAD.porTurno)
        : antes.modalidad,
      pagoJornada: esAdmin && b?.pagoJornada !== undefined
        ? aEntero(b.pagoJornada) : antes.pagoJornada,
      valorHora: esAdmin && b?.valorHora !== undefined
        ? aEntero(b.valorHora) : antes.valorHora,
      propina: esAdmin
        ? (b?.propina === undefined ? antes.propina : esSi(b.propina))
        : antes.propina,
      banco: esAdmin && b?.banco !== undefined
        ? limpiarBanco(b.banco) : antes.banco
    };

    await guardarTrabajadores(
      gente.map((t) => (normalizar(t.nombre) === normalizar(nombre) ? nueva : t))
    );
    await anotar({ ...(await quienEs(req)), accion: 'Editó la ficha de un trabajador',
      detalle: nueva.nombre });

    return NextResponse.json({
      trabajador: esAdmin ? { ...nueva, token: '' }
                          : { ...nueva, token: '', banco: bancoVacio() }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Saca UNA ficha de la lista.
 *
 * **Solo a quien no tiene ningún turno guardado.** Borrar la ficha de
 * alguien que ya trabajó dejaría sus turnos apuntando a un nombre que no
 * está en ninguna parte, y esos turnos son el registro de quién trabajó
 * qué día. La pantalla ya ofrece *Desactivar* en ese caso, pero **la regla
 * se comprueba acá**: una llamada directa a la API tiene que obedecerla
 * igual que un clic.
 *
 * Es una fila y no la lista entera por lo mismo que `POST` y `PATCH`: quien
 * aprieta *Quitar* en una línea cerrada no tiene por qué mandar —ni pisar—
 * lo que haya escrito en otra.
 */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;

  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }

    const gente = await leerTrabajadores();
    const quien = gente.find((t) => normalizar(t.nombre) === normalizar(nombre));
    if (!quien) {
      return NextResponse.json({ quitado: nombre });
    }

    const turnos = (await leerTurnos())
      .filter((t) => normalizar(t.trabajador) === normalizar(nombre)).length;
    if (turnos > 0) {
      return NextResponse.json({
        error: `${quien.nombre} tiene ${turnos} turnos guardados, así que su `
             + 'ficha no se quita: desactívala y conserva su historia.'
      }, { status: 409 });
    }

    await guardarTrabajadores(
      gente.filter((t) => normalizar(t.nombre) !== normalizar(nombre))
    );
    await anotar({ ...(await quienEs(req)), accion: 'Quitó a un trabajador de la lista',
      detalle: quien.nombre });

    return NextResponse.json({ quitado: quien.nombre });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

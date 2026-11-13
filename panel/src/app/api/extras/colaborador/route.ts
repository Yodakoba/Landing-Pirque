import { NextResponse } from 'next/server';
import { cambiosDePlata, porConfirmarDespues } from '@/lib/plata';
import { ahoraEnChile } from '@/lib/bitacora';
import { conLecturas } from '@/lib/sheets';
import { leerColaboradores, guardarColaboradores, anotar } from '@/lib/datos';
import { aEntero, esSi } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { puede, type Rol } from '@/lib/auth';
import type { Colaborador } from '@/lib/extras';
import { bancoVacio, limpiarBanco } from '@/lib/banco';
import { telefonoNormal } from '@/lib/contacto';

export const dynamic = 'force-dynamic';

/**
 * Agrega UN colaborador, sin tocar al resto.
 *
 * Existe por lo mismo que `POST /api/equipo/trabajador`: aparece un jinete
 * nuevo mientras se arma el sábado, y tiene que poder crearse ahí sin salir
 * de lo que se está haciendo. Y agrega una fila en vez de guardar la lista
 * entera porque la pantalla del día no tiene la lista completa en la mano
 * —puede estar desactualizada— y mandarla entera sería arriesgarse a pisar
 * el cambio de otra persona.
 *
 * Si el nombre ya existe no falla: devuelve el que hay y lo dice.
 */
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'extras');
  if (no) return no;

  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }

    const gente = await leerColaboradores();
    const yaEsta = gente.find((c) => normalizar(c.nombre) === normalizar(nombre));
    if (yaEsta) {
      return NextResponse.json({
        colaborador: { ...yaEsta, banco: bancoVacio() },
        yaExistia: true,
        aviso: yaEsta.activo
          ? `${yaEsta.nombre} ya estaba en la lista.`
          : `${yaEsta.nombre} ya estaba en la lista, pero inactivo. Actívalo en Extras.`
      });
    }

    const esAdmin = puede((await quienEs(req)).rol as Rol, 'sueldos');
    const nuevo: Colaborador = {
      nombre,
      actividad: String(b?.actividad ?? '').trim(),
      telefono: telefonoNormal(b?.telefono),
      activo: true,
      // El monto habitual y la cuenta son del administrador, igual que los
      // sueldos del equipo.
      monto: esAdmin ? aEntero(b?.monto) : 0,
      // **Los datos bancarios SÍ se piden al crear** (2026-10-23). Antes no:
      // la ficha nacía con el nombre y los datos de pago se completaban
      // después en `/extras`. En la práctica nadie iba, porque quien agenda
      // un jinete está armando un sábado y no la lista de fichas — y la
      // planilla del pago semanal aparecía sin cuentas. Lo pidió el cliente
      // así: que se pidan acá "y así todos los colaboradores están
      // completos directo".
      banco: esAdmin ? limpiarBanco(b?.banco) : bancoVacio(),
      // El link se crea aparte, con `/api/extras/link` (permiso `links`).
      token: '',
      porConfirmar: ''
    };
    // **La plata la confirma pagos** (2026-11-13, `plata.ts`): una ficha
    // nueva con cuenta o monto, hecha por quien no es pagos, nace por confirmar.
    {
      const q = await quienEs(req);
      nuevo.porConfirmar = porConfirmarDespues('', cambiosDePlata(null, nuevo), q.usuario, ahoraEnChile(),
        puede(q.rol as Rol, 'pagar'));
    }

    await guardarColaboradores([...gente, nuevo]);
    await anotar({ ...(await quienEs(req)), accion: 'Agregó un colaborador',
      detalle: `${nuevo.nombre}${nuevo.actividad ? ` · ${nuevo.actividad}` : ''}` });

    // Al encargado se le devuelve sin cuenta, como todo lo demás: lo que no
    // recibe, tampoco lo puede pisar al guardar.
    return NextResponse.json({
      colaborador: esAdmin ? nuevo : { ...nuevo, banco: bancoVacio() }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Edita la ficha de UN colaborador, sin tocar al resto.
 *
 * Es la otra mitad de lo mismo: se abre desde la ventana del día, con el
 * botón **ficha** de cada fila, para poder completar el teléfono, el correo
 * del comprobante o la cuenta bancaria en la misma pasada en que se agenda
 * —que es cuando alguien tiene esos datos a mano—.
 *
 * **El nombre no se cambia por acá.** Las actividades ya guardadas apuntan a
 * la persona por su nombre; renombrarla desde la ventana de un día dejaría
 * las de los otros días apuntando a nadie. Eso se hace en `/extras`.
 */
export const PATCH = conLecturas([], async function PATCH(req: Request) {
  const no = await exigir(req, 'extras');
  if (no) return no;

  try {
    const b = await req.json();
    const nombre = String(b?.nombre ?? '').trim();
    if (!nombre) {
      return NextResponse.json({ error: 'Falta el nombre.' }, { status: 400 });
    }

    const gente = await leerColaboradores();
    const antes = gente.find((c) => normalizar(c.nombre) === normalizar(nombre));
    if (!antes) {
      return NextResponse.json(
        { error: `${nombre} no está en la lista de colaboradores.` },
        { status: 404 }
      );
    }

    // Sueldos y cuenta: quien tenga `sueldos`, no solo el admin (2026-11-12).
    const esAdmin = puede((await quienEs(req)).rol as Rol, 'sueldos');
    // Renombrar es aparte y se confirma en la pantalla (`nuevoNombre`).
    const nuevoNombre = String(b?.nuevoNombre ?? '').trim();
    if (b?.nuevoNombre !== undefined) {
      if (!nuevoNombre) return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 });
      if (normalizar(nuevoNombre) !== normalizar(antes.nombre)
          && gente.some((c) => normalizar(c.nombre) === normalizar(nuevoNombre))) {
        return NextResponse.json({ error: `Ya hay alguien llamado ${nuevoNombre}.` }, { status: 409 });
      }
    }
    // **Parcial de verdad** (2026-11-12): lo que no viene se conserva. El
    // autoguardado manda solo el campo que se tocó.
    const nueva: Colaborador = {
      nombre: nuevoNombre || antes.nombre,
      actividad: b?.actividad === undefined ? antes.actividad : String(b.actividad).trim(),
      telefono: b?.telefono === undefined ? antes.telefono : telefonoNormal(b.telefono),
      activo: b?.activo === undefined ? antes.activo : esSi(b.activo),
      // Lo que el encargado no recibe, tampoco lo puede pisar.
      monto: esAdmin && b?.monto !== undefined ? aEntero(b.monto) : antes.monto,
      banco: esAdmin && b?.banco !== undefined ? limpiarBanco(b.banco) : antes.banco,
      // El link no se toca desde acá: se administra en `/api/extras/link`.
      token: antes.token,
      porConfirmar: antes.porConfirmar ?? ''
    };
    // **La plata la confirma pagos** (2026-11-13, `plata.ts`).
    {
      const q = await quienEs(req);
      nueva.porConfirmar = porConfirmarDespues(nueva.porConfirmar, cambiosDePlata(antes, nueva), q.usuario,
        ahoraEnChile(), puede(q.rol as Rol, 'pagar'));
    }

    await guardarColaboradores(
      gente.map((c) => (normalizar(c.nombre) === normalizar(nombre) ? nueva : c))
    );
    await anotar({ ...(await quienEs(req)),
      accion: nueva.nombre !== antes.nombre ? 'Renombró a un colaborador' : 'Editó la ficha de un colaborador',
      detalle: nueva.nombre !== antes.nombre ? `${antes.nombre} → ${nueva.nombre}` : nueva.nombre });

    return NextResponse.json({
      colaborador: { ...(esAdmin ? nueva : { ...nueva, banco: bancoVacio() }), token: '' }
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

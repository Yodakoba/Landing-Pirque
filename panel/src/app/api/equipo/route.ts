import { NextResponse } from 'next/server';
import {
  leerPuestos, guardarPuestos, leerTrabajadores, guardarTrabajadores, leerTurnos,
  leerCierres, leerExtras
} from '@/lib/datos';
import { aEntero, esSi, sinFicha, esContratado, MODALIDAD,
         type Puesto, type Trabajador } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { anotar } from '@/lib/datos';
import { ROL, puede, type Rol } from '@/lib/auth';
import { bancoVacio, limpiarBanco } from '@/lib/banco';
import { telefonoNormal } from '@/lib/contacto';

export const dynamic = 'force-dynamic';

/**
 * Todo el equipo en una llamada: los puestos, la gente y los turnos.
 *
 * Va junto porque el calendario los necesita los tres a la vez para dibujar
 * el resumen de cada día, y tres peticiones para pintar una pantalla son tres
 * oportunidades de que una llegue tarde y la vista quede a medias.
 */
/**
 * Los links personales **solo los ve el administrador.**
 *
 * Un encargado administra la lista de trabajadores —eso lo pidió el
 * cliente— pero no tiene por qué recibir las llaves con las que cada
 * persona entra a ver lo suyo. No es que un encargado vaya a hacer algo
 * malo con ellas: es que no las necesita, y una credencial que viaja a
 * quien no la necesita es una credencial de más dando vueltas.
 */
const recortada = (gente: Trabajador[], verLinks: boolean, verSueldos: boolean) =>
  gente.map((t) => ({
    ...t,
    // **El token lo recibe quien administra los links.** Un encargado no:
    // una credencial que viaja a quien no la usa es una credencial de más
    // dando vueltas.
    token: verLinks ? t.token : '',
    // **Los sueldos y la cuenta bancaria van por su propio permiso.**
    // Hasta el 2026-11-01 esto iba con `esAdmin`, la misma condición que el
    // token, y los dos se abrieron para la cuenta de pagos. Siguen
    // separados igual: uno es plata y el otro una credencial, así que el
    // día que un rol necesite ver lo uno y no lo otro, la costura está.
    // Un encargado sigue sin recibir ninguno de los dos.
    ...(verSueldos ? {} : { banco: bancoVacio(), pagoJornada: 0, valorHora: 0 })
    // La modalidad y la participación en la propina SÍ bajan siempre: el
    // encargado las necesita al pasar lista —a quién no se le paga por
    // turno, entre quiénes se reparte— y ninguna dice cuánto gana nadie.
  }));

export async function GET(req: Request) {
  // **`equipo` y no `ver`** (2026-11-05). Esto devuelve la lista entera del
  // equipo —nombres, teléfonos, puesto— y quién trabaja cada día, que no es
  // el calendario de reservas. Mientras los tres roles que entraban al panel
  // tenían los dos permisos la diferencia no existía; con el vendedor sí,
  // y es justo la que el cliente pidió: *"no necesita ver nada más que
  // esto"*. Para el administrador, el encargado y quien paga no cambia nada.
  const no = await exigir(req, 'equipo');
  if (no) return no;
  try {
    // Los cierres y las actividades extras viajan con el resto porque las
    // dos pantallas que planifican necesitan saber qué días están cerrados
    // y qué falta por confirmar. Son dos listas chicas: una fila por día
    // cerrado y una por actividad.
    const [puestos, trabajadores, turnos, cierres, extras] = await Promise.all([
      leerPuestos(), leerTrabajadores(), leerTurnos(), leerCierres(), leerExtras()
    ]);
    const rol = (await quienEs(req)).rol as Rol;
    // **Tres banderas, una por permiso**, en vez de un `esAdmin` que
    // gobernaba cosas sin relación: la plata, las credenciales y la lista
    // de puestos. Hoy las tres las tiene el mismo par de roles, pero cada
    // una dice qué gobierna, así que moverlas por separado es cambiar la
    // tabla de permisos y nada más.
    const verSueldos = puede(rol, 'sueldos');
    const verLinks = puede(rol, 'links');
    const editarPuestos = puede(rol, 'puestos');
    // Si puede corregir un día cerrado. Solo decide qué botón se dibuja: la
    // regla de verdad la vuelve a comprobar cada ruta que escribe un día.
    const puedeCorregir = puede(rol, 'corregir');
    const puedeCerrar = puede(rol, 'cerrar');
    return NextResponse.json({
      puestos,
      trabajadores: recortada(trabajadores, verLinks, verSueldos),
      turnos, cierres, extras, verSueldos, verLinks, editarPuestos, puedeCorregir, puedeCerrar,
      // Quién tiene turnos y no está en la lista. Pasa al renombrar a
      // alguien que ya estaba asignado; el panel lo muestra en vez de que
      // se descubra cuando el conteo del día no cuadre.
      sinFicha: sinFicha(turnos, trabajadores)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Guarda la lista de puestos, la de trabajadores, o las dos.
 *
 * Se limpia antes de escribir, con el mismo criterio que los menús: sin
 * nombres vacíos y sin repetidos, donde "repetido" se decide normalizado,
 * para que no convivan `Garzón` y `GARZON` como si fueran dos puestos. Lo
 * que se guarda es exactamente lo que se va a volver a leer.
 */
export async function PUT(req: Request) {
  const no = await exigir(req, 'equipo');
  if (no) return no;
  const rol = (await quienEs(req)).rol as Rol;
  // Lo que no se recibe, tampoco se puede pisar: quien no ve los sueldos
  // tampoco los escribe, y lo que mande el navegador se descarta a favor de
  // lo que ya había. Ver `recortada()`.
  const verSueldos = puede(rol, 'sueldos');
  const verLinks = puede(rol, 'links');
  try {
    const cuerpo = await req.json();
    const salida: { puestos?: Puesto[]; trabajadores?: Trabajador[] } = {};

    if (Array.isArray(cuerpo?.puestos)) {
      // Los puestos y su regla son del administrador: ahí se decide cuánta
      // gente hace falta, que es una decisión del negocio y no del turno.
      const noPuestos = await exigir(req, 'puestos');
      if (noPuestos) return noPuestos;
      const limpia: Puesto[] = [];
      const vistos = new Set<string>();
      for (const p of cuerpo.puestos) {
        const nombre = String(p?.nombre ?? '').trim();
        if (!nombre || vistos.has(normalizar(nombre))) continue;
        vistos.add(normalizar(nombre));
        limpia.push({ nombre, cadaCuantas: aEntero(p?.cadaCuantas) });
      }
      await guardarPuestos(limpia);
      salida.puestos = limpia;
      await anotar({ ...(await quienEs(req)), accion: 'Cambió los puestos',
        detalle: limpia.map((p) => p.nombre).join(', ') });
    }

    if (Array.isArray(cuerpo?.trabajadores)) {
      // Los tokens que vengan del navegador se IGNORAN salvo que escriba el
      // administrador. Para los demás se arrastra el que ya estaba, buscado
      // por nombre: así guardar la lista no le borra el acceso a nadie.
      // Se arrastra la ficha entera anterior, no solo el token: los sueldos
      // también son del administrador, y un encargado guardando la lista no
      // puede cambiarlos ni borrarlos por el camino.
      const previos = new Map(
        (await leerTrabajadores()).map((t) => [normalizar(t.nombre), t])
      );
      const limpia: Trabajador[] = [];
      const vistos = new Set<string>();
      for (const t of cuerpo.trabajadores) {
        const nombre = String(t?.nombre ?? '').trim();
        if (!nombre || vistos.has(normalizar(nombre))) continue;
        vistos.add(normalizar(nombre));
        limpia.push({
          nombre,
          telefono: telefonoNormal(t?.telefono),
          puesto: String(t?.puesto ?? '').trim(),
          // Si no viene el campo, activo. Es la misma regla que la celda en
          // blanco de la planilla, y por el mismo motivo: existe la fila
          // porque alguien agregó a esa persona al equipo.
          activo: t?.activo === undefined ? true : esSi(t.activo),
          token: verLinks
            ? String(t?.token ?? '').trim()
            : (previos.get(normalizar(nombre))?.token ?? ''),
          // La modalidad la fija el administrador, igual que los montos:
          // marcar a alguien como contratado cambia lo que cuesta el día.
          modalidad: verSueldos
            ? (esContratado(t?.modalidad) ? MODALIDAD.contratado : MODALIDAD.porTurno)
            : (previos.get(normalizar(nombre))?.modalidad ?? MODALIDAD.porTurno),
          pagoJornada: verSueldos
            ? aEntero(t?.pagoJornada)
            : (previos.get(normalizar(nombre))?.pagoJornada ?? 0),
          valorHora: verSueldos
            ? aEntero(t?.valorHora)
            : (previos.get(normalizar(nombre))?.valorHora ?? 0),
          // Quién entra en el reparto de la propina también lo fija el
          // administrador: decide a dónde va plata, aunque no sea del
          // negocio. En blanco es SÍ, que es la regla; no entrar es la
          // excepción y por eso se marca.
          propina: verSueldos
            ? (t?.propina === undefined ? true : esSi(t.propina))
            : (previos.get(normalizar(nombre))?.propina ?? true),
          // Los datos bancarios van con los montos: quien no los recibe
          // (ver `recortada()`) tampoco los guarda, porque si pudiera los
          // borraría sin querer al guardar la lista.
          banco: verSueldos
            ? limpiarBanco(t?.banco)
            : (previos.get(normalizar(nombre))?.banco ?? bancoVacio())
        });
      }
      await guardarTrabajadores(limpia);
      salida.trabajadores = recortada(limpia, verLinks, verSueldos);
      await anotar({ ...(await quienEs(req)), accion: 'Cambió la lista de trabajadores',
        detalle: `${limpia.length} en la lista · ` +
                 `${limpia.filter((t) => t.activo).length} activos` });
    }

    if (!salida.puestos && !salida.trabajadores) {
      return NextResponse.json(
        { error: 'No vino ninguna lista para guardar.' }, { status: 400 }
      );
    }
    return NextResponse.json(salida);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

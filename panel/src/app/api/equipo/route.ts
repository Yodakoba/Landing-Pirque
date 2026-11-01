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
const recortada = (gente: Trabajador[], esAdmin: boolean, verSueldos: boolean) =>
  gente.map((t) => ({
    ...t,
    // **El token es de quien administra los links, y de nadie más.** Ni el
    // encargado ni quien paga lo necesitan, y una credencial que viaja a
    // quien no la usa es una credencial de más dando vueltas.
    token: esAdmin ? t.token : '',
    // **Los sueldos y la cuenta bancaria son de quien paga.** Hasta el
    // 2026-11-01 esto iba con `esAdmin` —la misma condición que el token— y
    // el cliente pidió que la cuenta de pagos los viera. Abrir `esAdmin`
    // le habría dado de paso los tokens de todo el equipo; por eso son dos
    // permisos y no uno. Un encargado sigue sin recibirlos: no los necesita
    // para asignar turnos, y cuánto gana cada compañero no es dato suyo.
    ...(verSueldos ? {} : { banco: bancoVacio(), pagoJornada: 0, valorHora: 0 })
    // La modalidad y la participación en la propina SÍ bajan siempre: el
    // encargado las necesita al pasar lista —a quién no se le paga por
    // turno, entre quiénes se reparte— y ninguna dice cuánto gana nadie.
  }));

export async function GET(req: Request) {
  const no = await exigir(req, 'ver');
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
    const esAdmin = rol === ROL.admin;
    const verSueldos = puede(rol, 'sueldos');
    return NextResponse.json({
      puestos,
      trabajadores: recortada(trabajadores, esAdmin, verSueldos),
      turnos, cierres, extras, esAdmin, verSueldos,
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
  const esAdmin = rol === ROL.admin;
  // Lo que no se recibe, tampoco se puede pisar: quien no ve los sueldos
  // tampoco los escribe, y lo que mande el navegador se descarta a favor de
  // lo que ya había. Ver `recortada()`.
  const verSueldos = puede(rol, 'sueldos');
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
          token: esAdmin
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
      salida.trabajadores = recortada(limpia, esAdmin, verSueldos);
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

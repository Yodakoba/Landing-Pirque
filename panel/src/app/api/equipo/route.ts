import { NextResponse } from 'next/server';
import {
  leerPuestos, guardarPuestos, leerTrabajadores, guardarTrabajadores, leerTurnos
} from '@/lib/datos';
import { aEntero, esSi, sinFicha, type Puesto, type Trabajador } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, rolDePeticion } from '@/lib/permisos';
import { ROL } from '@/lib/auth';

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
const sinTokens = (gente: Trabajador[]) => gente.map((t) => ({ ...t, token: '' }));

export async function GET(req: Request) {
  const no = exigir(req, 'ver');
  if (no) return no;
  try {
    const [puestos, trabajadores, turnos] = await Promise.all([
      leerPuestos(), leerTrabajadores(), leerTurnos()
    ]);
    const esAdmin = rolDePeticion(req) === ROL.admin;
    return NextResponse.json({
      puestos, trabajadores: esAdmin ? trabajadores : sinTokens(trabajadores), turnos,
      esAdmin,
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
  const no = exigir(req, 'equipo');
  if (no) return no;
  const esAdmin = rolDePeticion(req) === ROL.admin;
  try {
    const cuerpo = await req.json();
    const salida: { puestos?: Puesto[]; trabajadores?: Trabajador[] } = {};

    if (Array.isArray(cuerpo?.puestos)) {
      // Los puestos y su regla son del administrador: ahí se decide cuánta
      // gente hace falta, que es una decisión del negocio y no del turno.
      const noPuestos = exigir(req, 'puestos');
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
    }

    if (Array.isArray(cuerpo?.trabajadores)) {
      // Los tokens que vengan del navegador se IGNORAN salvo que escriba el
      // administrador. Para los demás se arrastra el que ya estaba, buscado
      // por nombre: así guardar la lista no le borra el acceso a nadie.
      const previos = new Map(
        (await leerTrabajadores()).map((t) => [normalizar(t.nombre), t.token])
      );
      const limpia: Trabajador[] = [];
      const vistos = new Set<string>();
      for (const t of cuerpo.trabajadores) {
        const nombre = String(t?.nombre ?? '').trim();
        if (!nombre || vistos.has(normalizar(nombre))) continue;
        vistos.add(normalizar(nombre));
        limpia.push({
          nombre,
          telefono: String(t?.telefono ?? '').trim(),
          puesto: String(t?.puesto ?? '').trim(),
          // Si no viene el campo, activo. Es la misma regla que la celda en
          // blanco de la planilla, y por el mismo motivo: existe la fila
          // porque alguien agregó a esa persona al equipo.
          activo: t?.activo === undefined ? true : esSi(t.activo),
          token: esAdmin
            ? String(t?.token ?? '').trim()
            : (previos.get(normalizar(nombre)) ?? '')
        });
      }
      await guardarTrabajadores(limpia);
      salida.trabajadores = esAdmin ? limpia : sinTokens(limpia);
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

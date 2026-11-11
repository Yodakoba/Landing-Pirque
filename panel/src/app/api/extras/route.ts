import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_CIERRES } from '@/lib/cierres';
import { HOJA_ACTIVIDADES, HOJA_COLABORADORES } from '@/lib/extras';
import {
  leerColaboradores, guardarColaboradores, leerExtras, leerCierres, anotar
} from '@/lib/datos';
import { aEntero, esSi } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede, puedeVer, type Rol } from '@/lib/auth';
import type { Colaborador } from '@/lib/extras';
import { bancoVacio, limpiarBanco } from '@/lib/banco';
import { telefonoNormal } from '@/lib/contacto';

export const dynamic = 'force-dynamic';

/**
 * Las actividades extras en una llamada: las fichas y los días.
 *
 * Van juntas por lo mismo que el equipo: el calendario las necesita a las
 * dos a la vez para dibujar un mes, y dos peticiones para pintar una
 * pantalla son dos oportunidades de que una llegue tarde y la vista quede a
 * medias.
 *
 * **A quien no puede ver sueldos se le recortan los montos habituales y las cuentas
 * bancarias.** Los necesita para agendar tanto como necesita los sueldos del
 * equipo para asignar turnos: no los necesita. El monto del día lo escribe
 * él, y el que propone el servidor al guardar; lo que no recibe es la lista
 * de lo que cobra cada proveedor ni dónde se le transfiere.
 */
const sinPlata = (gente: Colaborador[]) => gente.map((c) => ({
  ...c, monto: 0, banco: bancoVacio()
}));

export const GET = conLecturas([HOJA_COLABORADORES, HOJA_ACTIVIDADES, HOJA_CIERRES], async function GET(req: Request) {
  const no = await exigirVer(req, 'extras');
  if (no) return no;
  try {
    // Los cierres viajan porque un día cerrado se dibuja en solo lectura
    // también acá: un día cerrado es el día completo, extras incluidas.
    const [colaboradores, extras, cierres] = await Promise.all([
      leerColaboradores(), leerExtras(), leerCierres()
    ]);
    const { rol, gerencia } = await quienEs(req);
    const verSueldos = puedeVer(rol, 'sueldos', gerencia);
    return NextResponse.json({
      colaboradores: verSueldos ? colaboradores : sinPlata(colaboradores),
      extras, cierres,
      verSueldos,
      puedeCorregir: puede(rol, 'corregir')
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Guarda la lista de colaboradores completa.
 *
 * Se limpia antes de escribir con el mismo criterio que las demás listas:
 * sin nombres vacíos y sin repetidos, donde "repetido" se decide
 * normalizado, para que no convivan `Juan` y `JUAN` como si fueran dos.
 */
export const PUT = conLecturas([], async function PUT(req: Request) {
  const no = await exigir(req, 'extras');
  if (no) return no;
  const verSueldos = puede((await quienEs(req)).rol as Rol, 'sueldos');
  try {
    const cuerpo = await req.json();
    if (!Array.isArray(cuerpo?.colaboradores)) {
      return NextResponse.json(
        { error: 'No vino ninguna lista para guardar.' }, { status: 400 }
      );
    }

    // Lo que el encargado no recibe, tampoco lo puede pisar: para los
    // montos y las cuentas se arrastra lo que ya estaba, buscado por nombre.
    const previos = new Map(
      (await leerColaboradores()).map((c) => [normalizar(c.nombre), c])
    );
    const limpia: Colaborador[] = [];
    const vistos = new Set<string>();
    for (const c of cuerpo.colaboradores) {
      const nombre = String(c?.nombre ?? '').trim();
      if (!nombre || vistos.has(normalizar(nombre))) continue;
      vistos.add(normalizar(nombre));
      const antes = previos.get(normalizar(nombre));
      limpia.push({
        nombre,
        actividad: String(c?.actividad ?? '').trim(),
        telefono: telefonoNormal(c?.telefono),
        // Si no viene el campo, activo: existe la fila porque alguien lo
        // agregó. Misma regla que la celda en blanco de la planilla.
        activo: c?.activo === undefined ? true : esSi(c.activo),
        monto: verSueldos ? aEntero(c?.monto) : (antes?.monto ?? 0),
        banco: verSueldos ? limpiarBanco(c?.banco) : (antes?.banco ?? bancoVacio())
      });
    }

    await guardarColaboradores(limpia);
    await anotar({ ...(await quienEs(req)), accion: 'Cambió la lista de colaboradores',
      detalle: `${limpia.length} en la lista · ` +
               `${limpia.filter((c) => c.activo).length} activos` });
    return NextResponse.json({
      colaboradores: verSueldos ? limpia : sinPlata(limpia)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

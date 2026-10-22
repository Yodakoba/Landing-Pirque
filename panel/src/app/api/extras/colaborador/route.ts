import { NextResponse } from 'next/server';
import { leerColaboradores, guardarColaboradores, anotar } from '@/lib/datos';
import { aEntero } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';
import { exigir, quienEs } from '@/lib/permisos';
import { ROL } from '@/lib/auth';
import type { Colaborador } from '@/lib/extras';

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
export async function POST(req: Request) {
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
        colaborador: { ...yaEsta, cuenta: '' },
        yaExistia: true,
        aviso: yaEsta.activo
          ? `${yaEsta.nombre} ya estaba en la lista.`
          : `${yaEsta.nombre} ya estaba en la lista, pero inactivo. Actívalo en Extras.`
      });
    }

    const esAdmin = (await quienEs(req)).rol === ROL.admin;
    const nuevo: Colaborador = {
      nombre,
      actividad: String(b?.actividad ?? '').trim(),
      telefono: String(b?.telefono ?? '').trim(),
      activo: true,
      // El monto habitual y la cuenta son del administrador, igual que los
      // sueldos del equipo.
      monto: esAdmin ? aEntero(b?.monto) : 0,
      cuenta: ''
    };

    await guardarColaboradores([...gente, nuevo]);
    await anotar({ ...(await quienEs(req)), accion: 'Agregó un colaborador',
      detalle: `${nuevo.nombre}${nuevo.actividad ? ` · ${nuevo.actividad}` : ''}` });

    return NextResponse.json({ colaborador: { ...nuevo, cuenta: '' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

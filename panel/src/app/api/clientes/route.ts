import { NextResponse } from 'next/server';
import { exigir, quienEs } from '@/lib/permisos';
import {
  leerClientes, crearCliente, editarCliente, borrarCliente, leerPresupuestos,
  migrarPresupuestosAClientes, anotar, sincronizarReserva, leerLineasPresupuesto
} from '@/lib/datos';
import { limpiarCliente, faltaEnCliente, parecidos } from '@/lib/clientes';
import { folioDe, estadoVisible, totalDe, lineasDe } from '@/lib/presupuestos';
import { grupoDe } from '@/lib/cotizar';
import { hoy } from '@/lib/fechas';
import { puede } from '@/lib/auth';
import { ahoraEnChile } from '@/lib/bitacora';

export const dynamic = 'force-dynamic';

/**
 * Las fichas de clientes, y cuántas cotizaciones tiene cada una.
 *
 * Trae además cuántos presupuestos todavía no tienen ficha, para que la
 * pantalla ofrezca pasarlos — pero solo a quien puede ver presupuestos.
 */
export async function GET(req: Request) {
  const no = await exigir(req, 'clientes');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const [clientes, presupuestos] = await Promise.all([
      leerClientes(),
      leerPresupuestos().catch(() => [])
    ]);
    const cotizaciones: Record<string, number> = {};
    for (const p of presupuestos) {
      if (p.idCliente) cotizaciones[p.idCliente] = (cotizaciones[p.idCliente] ?? 0) + 1;
    }
    const verPresupuestos = puede(quien.rol, 'presupuestos');
    // **El historial de cada cliente** (Fase 2): todas sus cotizaciones, con
    // la ganada marcada. Un cliente que pide varias, o dos alternativas,
    // las ve juntas acá.
    const historial: Record<string, {
      id: string; folio: string; fecha: string; periodo: string; estado: string;
      total: number; grupo: string;
    }[]> = {};
    if (verPresupuestos) {
      const lineas = await leerLineasPresupuesto().catch(() => []);
      const h = hoy();
      for (const p of presupuestos) {
        if (!p.idCliente) continue;
        (historial[p.idCliente] ??= []).push({
          id: p.id, folio: folioDe(p), fecha: p.fecha, periodo: p.periodo,
          estado: estadoVisible(p, h), total: totalDe(lineasDe(lineas, p.id), p.descuento),
          grupo: grupoDe(p)
        });
      }
      for (const k of Object.keys(historial)) {
        historial[k].sort((a, b) => (b.fecha || '9').localeCompare(a.fecha || '9'));
      }
    }
    return NextResponse.json({
      clientes,
      cotizaciones,
      historial,
      sinFicha: verPresupuestos ? presupuestos.filter((p) => !p.idCliente).length : 0
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Crea una ficha, o pasa los presupuestos viejos a fichas (`accion: 'migrar'`).
 *
 * **Si se parece a una que ya existe, no la crea**: devuelve las parecidas
 * para que la pantalla pregunte *"¿es este cliente?"*. Solo con
 * `forzar: true` —la persona ya vio las parecidas y dijo que no— se crea
 * igual. Es la regla que en el CRM del socio faltaba.
 */
export async function POST(req: Request) {
  const no = await exigir(req, 'clientes');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = await req.json();

    if (cuerpo?.accion === 'migrar') {
      const no2 = await exigir(req, 'presupuestos');
      if (no2) return no2;
      const r = await migrarPresupuestosAClientes(quien.usuario, ahoraEnChile());
      await anotar({ ...quien, accion: 'Pasó los presupuestos a fichas de clientes',
        detalle: `${r.creadas} fichas nuevas · ${r.vinculados} presupuestos vinculados` });
      return NextResponse.json(r);
    }

    const datos = limpiarCliente(cuerpo ?? {});
    const falta = faltaEnCliente(datos);
    if (falta) return NextResponse.json({ error: falta }, { status: 400 });

    const lista = await leerClientes();
    const iguales = parecidos(datos, lista);
    if (iguales.length && !cuerpo?.forzar) {
      return NextResponse.json({ parecidos: iguales });
    }
    const id = await crearCliente({ ...datos, creadoPor: quien.usuario, creado: ahoraEnChile() });
    await anotar({ ...quien, accion: 'Creó un cliente', detalle: `${id} · ${datos.nombre}` });
    return NextResponse.json({ id, clientes: await leerClientes() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Edita una ficha. Lo que no viene en el cuerpo se conserva, igual que el
 * `PATCH` de un trabajador. Avisa —sin bloquear— si quedó igual a otra.
 */
export async function PATCH(req: Request) {
  const no = await exigir(req, 'clientes');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const cuerpo = await req.json();
    const id = String(cuerpo?.id ?? '');
    const lista = await leerClientes();
    const previo = lista.find((c) => c.id === id);
    if (!previo) return NextResponse.json({ error: 'Ese cliente no existe.' }, { status: 404 });

    const mezcla: Record<string, unknown> = { ...previo };
    for (const k of ['nombre', 'empresa', 'rut', 'domicilio', 'giro', 'telefono', 'correo', 'notas']) {
      if (cuerpo?.[k] !== undefined) mezcla[k] = cuerpo[k];
    }
    const datos = limpiarCliente(mezcla);
    const falta = faltaEnCliente(datos);
    if (falta) return NextResponse.json({ error: falta }, { status: 400 });

    await editarCliente({ ...previo, ...datos });
    // **Las reservas de sus cotizaciones ganadas se corrigen solas**: llevan
    // el nombre y el contacto copiados para que la planilla se lea a mano, y
    // esa copia la escribe el sistema, no una persona.
    for (const p of await leerPresupuestos()) {
      if (p.idCliente === id && p.idReserva) await sincronizarReserva(p.id);
    }
    await anotar({ ...quien, accion: 'Editó un cliente', detalle: `${id} · ${datos.nombre}` });
    return NextResponse.json({
      clientes: await leerClientes(),
      parecidos: parecidos(datos, lista, id)
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Borra una ficha **solo si no tiene cotizaciones**. Se comprueba acá y no
 * solo en la pantalla: una cotización que apunta a una ficha borrada queda
 * sin cliente, que es justo lo que las fichas vinieron a evitar.
 */
export async function DELETE(req: Request) {
  const no = await exigir(req, 'clientes');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const id = new URL(req.url).searchParams.get('id') ?? '';
    // Sin `catch`: si no se pueden leer los presupuestos, no se borra. Mejor
    // un error que borrar una ficha que sí tenía cotizaciones.
    const presupuestos = await leerPresupuestos();
    const suyos = presupuestos.filter((p) => p.idCliente === id).length;
    if (suyos) {
      return NextResponse.json({
        error: `No se puede borrar: tiene ${suyos} cotizaci${suyos === 1 ? 'ón' : 'ones'}.`
      }, { status: 409 });
    }
    if (!(await borrarCliente(id))) {
      return NextResponse.json({ error: 'Ese cliente no existe.' }, { status: 404 });
    }
    await anotar({ ...quien, accion: 'Borró un cliente', detalle: id });
    return NextResponse.json({ clientes: await leerClientes() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede, ROL, type Rol } from '@/lib/auth';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, ESTADO_PRESUPUESTO, estadoNormal, lineasDe, cuentasDe,
         folioDe } from '@/lib/presupuestos';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_PAGOS, CONCEPTO, pagosEnPeriodo } from '@/lib/remuneraciones';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { leerUsuarios, leerVendedores, guardarVendedor, leerPresupuestos, leerLineasPresupuesto,
         leerCobros, leerPagosEquipo, leerClientes, anotar } from '@/lib/datos';
import { conCliente } from '@/lib/cotizar';
import { HOJA_VENDEDORES, fichaDe, ventasDe, resumenDelPeriodo, porCobrar, comisionDe, porcentaje,
         tieneFormaDePago, BASE_COMISION, type FichaVendedor } from '@/lib/vendedores';
import { bancoVacio } from '@/lib/banco';
import { normalizar } from '@/lib/columnas';
import { esFecha, hoy } from '@/lib/fechas';
import { rangoDelPeriodo } from '@/lib/equipo';

export const dynamic = 'force-dynamic';

/**
 * **El resumen de un vendedor** (2026-11-12, ver `lib/vendedores.ts`): lo
 * que vendió, la comisión que ganó en el periodo, lo que viene y lo que se le
 * pagó. **El vendedor recibe solo el suyo**, aunque pida otro usuario.
 * Quien paga, la gerencia y el administrador eligen a cualquiera.
 *
 * Una sola tanda de lecturas: las cuentas, las fichas, las cotizaciones con
 * sus líneas, sus cobros, los pagos y los clientes para el nombre.
 */
export const GET = conLecturas([HOJA_USUARIOS, HOJA_VENDEDORES, HOJA_PRESUPUESTOS, HOJA_LINEAS,
  HOJA_COBROS, HOJA_PAGOS, HOJA_CLIENTES], async function GET(req: Request) {
  const no = await exigirVer(req, 'vendedores');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const q = new URL(req.url).searchParams;
    const [usuarios, fichas, presupuestos, lineas, cobros, pagos, clientes] = await Promise.all([
      leerUsuarios(), leerVendedores(), leerPresupuestos(), leerLineasPresupuesto(), leerCobros(),
      leerPagosEquipo(), leerClientes()
    ]);
    const esVendedor = quien.rol === ROL.vendedor;
    // Los vendedores son las cuentas con ese rol; una desactivada sigue si tiene ficha.
    const lista = usuarios
      .filter((u) => u.rol === ROL.vendedor && (u.activo || fichas.some((f) => normalizar(f.usuario) === normalizar(u.usuario))))
      .map((u) => ({ usuario: u.usuario, nombre: u.nombre || u.usuario, activo: u.activo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pedido = esVendedor ? quien.usuario : String(q.get('usuario') ?? '') || lista[0]?.usuario || '';
    const cuenta = lista.find((v) => normalizar(v.usuario) === normalizar(pedido))
      ?? (esVendedor ? { usuario: quien.usuario, nombre: quien.usuario, activo: true } : undefined);
    const periodo = String(q.get('p') ?? '') || hoy().slice(0, 7);
    const { desde, hasta } = esFecha(q.get('desde') ?? '') && esFecha(q.get('hasta') ?? '')
      ? { desde: q.get('desde')!, hasta: q.get('hasta')! } : rangoDelPeriodo(periodo);
    const puedeEditar = puede(quien.rol as Rol, 'pagar');
    if (!cuenta) {
      return NextResponse.json({ vendedores: esVendedor ? [] : lista, usuario: '', desde, hasta, periodo, puedeEditar, hoy: hoy() });
    }

    const ficha = fichaDe(fichas, cuenta.usuario, cuenta.nombre);
    const conNombre = presupuestos.map((p) => conCliente(p, clientes));
    const ventas = ventasDe(cuenta.usuario, conNombre, lineas, cobros, ficha)
      .map((v) => ({ ...v, folio: folioDe({ id: v.grupo }) }));
    const resumen = resumenDelPeriodo(ficha, ventas, desde, hasta);
    // Lo que se le pagó: los pagos con concepto Comisión, a su nombre.
    const suyos = pagosEnPeriodo(pagos.filter((p) => p.concepto === CONCEPTO.comision), ficha.nombre || cuenta.nombre, desde, hasta);
    const pagado = suyos.reduce((n, p) => n + p.monto, 0);

    // **En curso**: lo mandado y sin ganar, una vez por cotización (la alternativa más cara).
    const enCurso = new Map<string, { id: string; folio: string; cliente: string; fecha: string; estado: string; total: number; comision: number }>();
    for (const p of conNombre) {
      if (normalizar(p.creadoPor) !== normalizar(cuenta.usuario) || p.idReserva) continue;
      const e = estadoNormal(p.estado);
      if (e !== ESTADO_PRESUPUESTO.enviado && e !== ESTADO_PRESUPUESTO.negociacion) continue;
      const c = cuentasDe(lineasDe(lineas, p.id), p.descuento);
      const grupo = p.grupo || p.id;
      const ya = enCurso.get(grupo);
      if (ya && ya.total >= c.total) continue;
      enCurso.set(grupo, { id: p.id, folio: folioDe({ id: grupo }), cliente: p.cliente || 'sin nombre', fecha: p.fecha || p.periodo,
        estado: e, total: c.total, comision: comisionDe(ficha, c) });
    }

    // La cuenta bancaria la ven quien paga y el propio vendedor; nadie más.
    const verBanco = puedeEditar || esVendedor;
    return NextResponse.json({
      vendedores: esVendedor ? [] : lista,
      usuario: cuenta.usuario, nombre: ficha.nombre || cuenta.nombre,
      ficha: { ...ficha, banco: verBanco ? ficha.banco : bancoVacio() },
      formaDePago: tieneFormaDePago(ficha),
      desde, hasta, periodo, hoy: hoy(),
      resumen, pagado, falta: Math.max(0, resumen.total - pagado), pagos: suyos,
      porCobrar: porCobrar(ventas),
      ventas, enCurso: [...enCurso.values()],
      puedeEditar
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Cambiar cómo se le paga a un vendedor, o su cuenta** (permiso `pagar`).
 * Se guarda solo, campo por campo, y queda en la bitácora: es plata.
 */
export const PATCH = conLecturas([HOJA_USUARIOS, HOJA_VENDEDORES], async function PATCH(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const [usuarios, fichas] = await Promise.all([leerUsuarios(), leerVendedores()]);
    const cuenta = usuarios.find((u) => u.rol === ROL.vendedor && normalizar(u.usuario) === normalizar(String(b.usuario ?? '')));
    if (!cuenta) return NextResponse.json({ error: 'Esa cuenta no es de un vendedor.' }, { status: 404 });
    const antes = fichaDe(fichas, cuenta.usuario, cuenta.nombre);
    const c = b.cambios ?? {};
    const monto = (v: unknown) => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0));
    const nueva: FichaVendedor = {
      ...antes, usuario: cuenta.usuario, nombre: cuenta.nombre || cuenta.usuario,
      ...(c.sueldoFijo !== undefined ? { sueldoFijo: monto(c.sueldoFijo) } : {}),
      ...(c.comisionPct !== undefined ? { comisionPct: porcentaje(c.comisionPct) } : {}),
      ...(c.montoEvento !== undefined ? { montoEvento: monto(c.montoEvento) } : {}),
      ...(c.base !== undefined ? { base: c.base === 'neto' ? 'neto' : 'total' } : {}),
      ...(c.banco && typeof c.banco === 'object' ? { banco: { ...bancoVacio(), ...antes.banco, ...c.banco } } : {})
    };
    await guardarVendedor(nueva);
    const quien = await quienEs(req);
    const dif = (['sueldoFijo', 'comisionPct', 'montoEvento', 'base'] as const)
      .filter((k) => c[k] !== undefined && antes[k] !== nueva[k])
      .map((k) => `${k === 'base' ? 'base' : k === 'comisionPct' ? 'comisión' : k === 'sueldoFijo' ? 'sueldo fijo' : 'monto por evento'}: `
        + `${k === 'base' ? BASE_COMISION[antes.base] : antes[k]} → ${k === 'base' ? BASE_COMISION[nueva.base] : nueva[k]}`);
    if (dif.length || c.banco) {
      await anotar({ ...quien, accion: 'Cambió la ficha de un vendedor',
        detalle: `${nueva.nombre} · ${[...dif, ...(c.banco ? ['cuenta bancaria'] : [])].join(' · ')}` });
    }
    return NextResponse.json({ ok: true, ficha: nueva });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

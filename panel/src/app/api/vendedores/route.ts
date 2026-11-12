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
import { HOJA_MENUS } from '@/lib/menus';
import { leerUsuarios, leerVendedores, guardarVendedor, leerPresupuestos, leerLineasPresupuesto,
         leerCobros, leerPagosEquipo, leerClientes, leerMenus, anotar } from '@/lib/datos';
import { conCliente } from '@/lib/cotizar';
import { HOJA_VENDEDORES, fichaDe, ventasDe, resumenDelPeriodo, porCobrar, comisionDe, porcentaje, baseDeVenta,
         tieneFormaDePago, esVentaDe, fichaSocio, nuevoIdSocio, BASE_COMISION,
         type FichaVendedor } from '@/lib/vendedores';
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
  HOJA_COBROS, HOJA_PAGOS, HOJA_CLIENTES, HOJA_MENUS], async function GET(req: Request) {
  const no = await exigirVer(req, 'vendedores');
  if (no) return no;
  try {
    const quien = await quienEs(req);
    const q = new URL(req.url).searchParams;
    const [usuarios, fichas, presupuestos, lineas, cobros, pagos, clientes, menus] = await Promise.all([
      leerUsuarios(), leerVendedores(), leerPresupuestos(), leerLineasPresupuesto(), leerCobros(),
      leerPagosEquipo(), leerClientes(), leerMenus()
    ]);
    const esVendedor = quien.rol === ROL.vendedor;
    // Los vendedores son las cuentas con ese rol; una desactivada sigue si tiene ficha.
    const lista = usuarios
      .filter((u) => u.rol === ROL.vendedor && (u.activo || fichas.some((f) => normalizar(f.usuario) === normalizar(u.usuario))))
      .map((u) => ({ usuario: u.usuario, nombre: u.nombre || u.usuario, activo: u.activo }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    // **Los socios comerciales** (2026-11-12): fichas sin cuenta, en la misma
    // pestaña. El vendedor no los ve acá —sí sus nombres al cotizar—.
    const socios = esVendedor ? [] : fichas.filter((f) => f.tipo === 'socio')
      .map((f) => ({ usuario: f.usuario, nombre: f.nombre || f.usuario, activo: f.activo }))
      .sort((a, b) => Number(b.activo) - Number(a.activo) || a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    const pedido = esVendedor ? quien.usuario : String(q.get('usuario') ?? '') || lista[0]?.usuario || socios[0]?.usuario || '';
    const cuenta = [...lista, ...socios].find((v) => normalizar(v.usuario) === normalizar(pedido))
      ?? (esVendedor ? { usuario: quien.usuario, nombre: quien.usuario, activo: true } : undefined);
    const periodo = String(q.get('p') ?? '') || hoy().slice(0, 7);
    const { desde, hasta } = esFecha(q.get('desde') ?? '') && esFecha(q.get('hasta') ?? '')
      ? { desde: q.get('desde')!, hasta: q.get('hasta')! } : rangoDelPeriodo(periodo);
    const puedeEditar = puede(quien.rol as Rol, 'pagar');
    const puedeLinks = puede(quien.rol as Rol, 'links');
    if (!cuenta) {
      return NextResponse.json({ vendedores: esVendedor ? [] : lista, socios, usuario: '', desde, hasta, periodo, puedeEditar, hoy: hoy() });
    }

    const ficha = fichaDe(fichas, cuenta.usuario, cuenta.nombre);
    const conNombre = presupuestos.map((p) => conCliente(p, clientes));
    const ventas = ventasDe(cuenta.usuario, conNombre, lineas, cobros, ficha, menus)
      .map((v) => ({ ...v, folio: folioDe({ id: v.grupo }) }));
    const resumen = resumenDelPeriodo(ficha, ventas, desde, hasta);
    // Lo que se le pagó: los pagos con concepto Comisión, a su nombre.
    const suyos = pagosEnPeriodo(pagos.filter((p) => p.concepto === CONCEPTO.comision), ficha.nombre || cuenta.nombre, desde, hasta);
    const pagado = suyos.reduce((n, p) => n + p.monto, 0);

    // **En curso**: lo mandado y sin ganar, una vez por cotización (la alternativa más cara).
    const suya = esVentaDe(cuenta.usuario, ficha.tipo);
    const enCurso = new Map<string, { id: string; folio: string; cliente: string; fecha: string; estado: string; total: number; comision: number; detalle: string }>();
    for (const p of conNombre) {
      if (!suya(p) || p.idReserva) continue;
      const e = estadoNormal(p.estado);
      if (e !== ESTADO_PRESUPUESTO.enviado && e !== ESTADO_PRESUPUESTO.negociacion) continue;
      const b = baseDeVenta(p, lineas, menus);
      const grupo = p.grupo || p.id;
      const ya = enCurso.get(grupo);
      if (ya && ya.total >= b.total) continue;
      const com = comisionDe(ficha, b, !!p.socio);
      enCurso.set(grupo, { id: p.id, folio: folioDe({ id: grupo }), cliente: p.cliente || 'sin nombre', fecha: p.fecha || p.periodo,
        estado: e, total: b.total, comision: com.monto, detalle: com.detalle });
    }

    // La cuenta bancaria la ven quien paga y el propio vendedor; nadie más.
    const verBanco = puedeEditar || esVendedor;
    return NextResponse.json({
      vendedores: esVendedor ? [] : lista, socios,
      usuario: cuenta.usuario, nombre: ficha.nombre || cuenta.nombre, tipo: ficha.tipo,
      // El token del link solo a quien maneja links (`links`), como en Extras.
      ficha: { ...ficha, banco: verBanco ? ficha.banco : bancoVacio(), token: puedeLinks ? ficha.token : '' },
      puedeLinks,
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
    const pedido = normalizar(String(b.usuario ?? ''));
    const socio = fichas.find((f) => f.tipo === 'socio' && normalizar(f.usuario) === pedido);
    const cuenta = socio ? { usuario: socio.usuario, nombre: socio.nombre }
      : usuarios.find((u) => u.rol === ROL.vendedor && normalizar(u.usuario) === pedido);
    if (!cuenta) return NextResponse.json({ error: 'Esa cuenta no es de un vendedor ni de un socio.' }, { status: 404 });
    const antes = socio ?? fichaDe(fichas, cuenta.usuario, cuenta.nombre);
    const c = b.cambios ?? {};
    const monto = (v: unknown) => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0));
    // **El nombre de un socio y si está activo se confirman en pantalla**
    // (regla del cliente: cambiar el nombre de algo que otros usan, o
    // desactivarlo). El de un vendedor sale de su cuenta.
    let nombre = cuenta.nombre || cuenta.usuario;
    if (socio && c.nombre !== undefined) {
      nombre = String(c.nombre ?? '').trim();
      if (!nombre) return NextResponse.json({ error: 'El nombre no puede quedar vacío.' }, { status: 400 });
      if (fichas.some((f) => f.tipo === 'socio' && f.usuario !== socio.usuario && normalizar(f.nombre) === normalizar(nombre))) {
        return NextResponse.json({ error: `Ya hay un socio que se llama ${nombre}.` }, { status: 409 });
      }
    }
    const nueva: FichaVendedor = {
      ...antes, usuario: cuenta.usuario, nombre,
      ...(socio && c.activo !== undefined ? { activo: c.activo !== false } : {}),
      ...(c.etapa1Desde !== undefined ? { etapa1Desde: monto(c.etapa1Desde) } : {}),
      ...(!socio && c.conSocio !== undefined ? { conSocio: porcentaje(c.conSocio) } : {}),
      ...(c.sueldoFijo !== undefined ? { sueldoFijo: monto(c.sueldoFijo) } : {}),
      ...(c.comisionPct !== undefined ? { comisionPct: porcentaje(c.comisionPct) } : {}),
      ...(c.montoEvento !== undefined ? { montoEvento: monto(c.montoEvento) } : {}),
      ...(c.etapa2Desde !== undefined ? { etapa2Desde: monto(c.etapa2Desde) || antes.etapa2Desde } : {}),
      ...(c.etapa2Pct !== undefined ? { etapa2Pct: porcentaje(c.etapa2Pct) } : {}),
      ...(c.etapa3Desde !== undefined ? { etapa3Desde: monto(c.etapa3Desde) || antes.etapa3Desde } : {}),
      ...(c.etapa3Pct !== undefined ? { etapa3Pct: porcentaje(c.etapa3Pct) } : {}),
      ...(c.bonoPuntos !== undefined ? { bonoPuntos: porcentaje(c.bonoPuntos) } : {}),
      ...(c.base !== undefined ? { base: c.base === 'total' ? 'total' : 'neto' } : {}),
      ...(c.banco && typeof c.banco === 'object' ? { banco: { ...bancoVacio(), ...antes.banco, ...c.banco } } : {})
    };
    await guardarVendedor(nueva);
    const quien = await quienEs(req);
    const NOMBRES = { nombre: 'nombre', activo: 'activo', etapa1Desde: 'etapa 1 desde', conSocio: 'con socio cobra %',
      sueldoFijo: 'sueldo fijo', comisionPct: 'etapa 1 %', montoEvento: 'monto por evento', base: 'base',
      etapa2Desde: 'etapa 2 desde', etapa2Pct: 'etapa 2 %', etapa3Desde: 'etapa 3 desde', etapa3Pct: 'etapa 3 %',
      bonoPuntos: 'bono premium' } as const;
    const dif = (Object.keys(NOMBRES) as (keyof typeof NOMBRES)[])
      .filter((k) => c[k] !== undefined && antes[k] !== nueva[k])
      .map((k) => `${NOMBRES[k]}: ${k === 'base' ? BASE_COMISION[antes.base] : antes[k]} → ${k === 'base' ? BASE_COMISION[nueva.base] : nueva[k]}`);
    if (dif.length || c.banco) {
      await anotar({ ...quien, accion: socio ? 'Cambió la ficha de un socio comercial' : 'Cambió la ficha de un vendedor',
        detalle: `${nueva.nombre} · ${[...dif, ...(c.banco ? ['cuenta bancaria'] : [])].join(' · ')}` });
    }
    return NextResponse.json({ ok: true, ficha: nueva });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Agregar un socio comercial** (permiso `pagar`, 2026-11-12): pide el
 * nombre y crea la ficha con el trato de partida —5% desde 22, 10% desde 55,
 * 15% desde 77, sobre el neto—, que se edita ahí mismo.
 */
export const POST = conLecturas([HOJA_VENDEDORES], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const nombre = String(b.nombre ?? '').trim();
    if (!nombre) return NextResponse.json({ error: 'Escribe el nombre del socio.' }, { status: 400 });
    const fichas = await leerVendedores();
    const ya = fichas.find((f) => f.tipo === 'socio' && normalizar(f.nombre) === normalizar(nombre));
    if (ya) return NextResponse.json({ error: `Ya hay un socio que se llama ${ya.nombre}.`, usuario: ya.usuario }, { status: 409 });
    const ficha = fichaSocio(nuevoIdSocio(fichas), nombre);
    await guardarVendedor(ficha);
    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Agregó un socio comercial', detalle: `${nombre} · ${ficha.usuario}` });
    return NextResponse.json({ ok: true, ficha });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

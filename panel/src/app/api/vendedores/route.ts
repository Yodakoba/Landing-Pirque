import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { puede, ROL, type Rol } from '@/lib/auth';
import { HOJA_USUARIOS, cuentaDeSesion } from '@/lib/usuarios';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, ESTADO_PRESUPUESTO, estadoNormal, lineasDe, cuentasDe,
         folioDe } from '@/lib/presupuestos';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_PAGOS, CONCEPTO, pagosEnPeriodo } from '@/lib/remuneraciones';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { HOJA_MENUS } from '@/lib/menus';
import { leerUsuarios, leerVendedores, guardarVendedor, leerPresupuestos, leerLineasPresupuesto,
         leerCobros, leerPagosEquipo, leerClientes, leerMenus, anotar, guardarUsuarios } from '@/lib/datos';
import { hashDeClave } from '@/lib/usuarios';
import { LARGO_MINIMO_CLAVE } from '@/lib/auth';
import { ahoraEnChile } from '@/lib/bitacora';
import { desgloseDocumento, retencionDelAno, fechaDeEmision } from '@/lib/boletas';
import { conCliente } from '@/lib/cotizar';
import { HOJA_VENDEDORES, fichaDe, ventasDe, resumenDelPeriodo, porCobrar, comisionDe, porcentaje, baseDeVenta,
         tieneFormaDePago, esVentaDe, fichaSocio, nuevoIdSocio, BASE_COMISION, fichaVacia, comoDe,
         faltaParaFacturar, facturaVacia, type FichaVendedor } from '@/lib/vendedores';
import { bancoVacio, sePuedeTransferir } from '@/lib/banco';
import { normalizar } from '@/lib/columnas';
import { esFecha, hoy } from '@/lib/fechas';
import { rangoDelPeriodo } from '@/lib/equipo';

export const dynamic = 'force-dynamic';

const texto = (v: unknown, largo = 120) => String(v ?? '').trim().slice(0, largo);

/**
 * **Los datos de pago que vienen del navegador** (2026-11-20): el documento
 * —boleta o factura—, si lo que gana trae el impuesto, los datos de la
 * factura y la transferencia. Solo lo que viene; lo demás se conserva.
 */
function pagoDelCuerpo(b: Record<string, unknown>, antes: FichaVendedor): Partial<FichaVendedor> {
  const x: Partial<FichaVendedor> = {};
  if (b.documento === 'boleta' || b.documento === 'factura') x.documento = b.documento;
  if (typeof b.incluido === 'boolean') x.incluido = b.incluido;
  const f = b.factura as Record<string, unknown> | undefined;
  if (f && typeof f === 'object') {
    x.factura = { ...facturaVacia(), ...antes.factura,
      ...(f.razonSocial !== undefined ? { razonSocial: texto(f.razonSocial) } : {}),
      ...(f.rut !== undefined ? { rut: texto(f.rut, 20) } : {}),
      ...(f.giro !== undefined ? { giro: texto(f.giro) } : {}),
      ...(f.direccion !== undefined ? { direccion: texto(f.direccion, 200) } : {}) };
  }
  const k = b.banco as Record<string, unknown> | undefined;
  if (k && typeof k === 'object') {
    x.banco = { ...bancoVacio(), ...antes.banco,
      ...Object.fromEntries(Object.entries(k).filter(([c]) => c in bancoVacio()).map(([c, v]) => [c, texto(v)])) };
  }
  return x;
}

/** Lo que se le transfiere en el periodo, según su documento: ver `desgloseDocumento()`. */
const documentoDe = (f: FichaVendedor, total: number, hasta: string) =>
  desgloseDocumento(total, comoDe(f), retencionDelAno(fechaDeEmision(hasta, hoy())));

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
    // La sesión trae el NOMBRE de la persona; la lista va por usuario.
    const propia = esVendedor ? cuentaDeSesion(usuarios, quien.usuario) : undefined;
    // **Sin `usuario`, quien paga recibe solo la lista** (2026-11-20): la
    // pantalla es una tarjeta por persona y todas parten cerradas; el
    // detalle llega al abrir una.
    const pedido = esVendedor ? propia?.usuario ?? quien.usuario : String(q.get('usuario') ?? '');
    const cuenta = [...lista, ...socios].find((v) => normalizar(v.usuario) === normalizar(pedido))
      ?? (esVendedor ? { usuario: quien.usuario, nombre: quien.usuario, activo: true } : undefined);
    const periodo = String(q.get('p') ?? '') || hoy().slice(0, 7);
    const { desde, hasta } = esFecha(q.get('desde') ?? '') && esFecha(q.get('hasta') ?? '')
      ? { desde: q.get('desde')!, hasta: q.get('hasta')! } : rangoDelPeriodo(periodo);
    const puedeEditar = puede(quien.rol as Rol, 'pagar');
    const puedeLinks = puede(quien.rol as Rol, 'links');
    // Quién ve los botones de agregar (2026-11-20): la ruta lo vuelve a comprobar.
    const agregar = { puedeAgregarVendedor: puede(quien.rol as Rol, 'agregarVendedores'),
      puedeAgregarSocio: puede(quien.rol as Rol, 'agregarSocios') };
    const conNombre = presupuestos.map((p) => conCliente(p, clientes));
    const comisiones = pagos.filter((p) => p.concepto === CONCEPTO.comision);
    /**
     * **Una línea por persona** (2026-11-20, lo pidió el cliente: con varios
     * vendedores tiene que verse cada uno con lo suyo, como en Equipo). Lo
     * que le toca en el periodo, lo pagado y lo que falta, con las mismas
     * cuentas del detalle y del informe. Sale de lo que ya se leyó: ninguna
     * lectura más. Si falta su cuenta, solo a quien paga.
     */
    const resumenes = esVendedor ? [] : [...lista.map((v) => ({ ...v, tipo: 'vendedor' as const })),
      ...socios.map((v) => ({ ...v, tipo: 'socio' as const }))].map((v) => {
      const f = fichaDe(fichas, v.usuario, v.nombre);
      const r = resumenDelPeriodo(f, ventasDe(v.usuario, conNombre, lineas, cobros, f, menus, v.nombre), desde, hasta);
      const pag = pagosEnPeriodo(comisiones, f.nombre || v.nombre, desde, hasta).reduce((n, p) => n + p.monto, 0);
      // **Lo que falta es contra lo que se le transfiere** (2026-11-20): con
      // boleta y la retención incluida, menos la retención; con factura más
      // IVA, más el IVA.
      const d = documentoDe(f, r.total, hasta);
      return { usuario: v.usuario, nombre: f.nombre || v.nombre, tipo: v.tipo, activo: v.activo,
        total: r.total, aTransferir: d.aTransferir, pagado: pag, falta: Math.max(0, d.aTransferir - pag),
        ventas: r.cuentan.length, fijo: r.sueldoFijo, documento: f.documento,
        formaDePago: tieneFormaDePago(f), sinCuenta: puedeEditar && !sePuedeTransferir(f.banco),
        faltaFactura: faltaParaFacturar(f).length > 0, porConfirmar: !!f.porConfirmar };
    });
    if (!cuenta) {
      return NextResponse.json({ vendedores: esVendedor ? [] : lista, socios, resumenes, usuario: '', desde, hasta, periodo, puedeEditar,
        ...agregar, hoy: hoy() });
    }

    const ficha = fichaDe(fichas, cuenta.usuario, cuenta.nombre);
    const ventas = ventasDe(cuenta.usuario, conNombre, lineas, cobros, ficha, menus, cuenta.nombre)
      .map((v) => ({ ...v, folio: folioDe({ id: v.grupo }) }));
    const resumen = resumenDelPeriodo(ficha, ventas, desde, hasta);
    // Lo que se le pagó: los pagos con concepto Comisión, a su nombre.
    const suyos = pagosEnPeriodo(comisiones, ficha.nombre || cuenta.nombre, desde, hasta);
    const pagado = suyos.reduce((n, p) => n + p.monto, 0);

    // **En curso**: lo mandado y sin ganar, una vez por cotización (la alternativa más cara).
    const suya = esVentaDe(cuenta.usuario, ficha.tipo, cuenta.nombre);
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
      vendedores: esVendedor ? [] : lista, socios, resumenes,
      usuario: cuenta.usuario, nombre: ficha.nombre || cuenta.nombre, tipo: ficha.tipo,
      // El token del link solo a quien maneja links (`links`), como en Extras.
      ficha: { ...ficha, banco: verBanco ? ficha.banco : bancoVacio(), token: puedeLinks ? ficha.token : '' },
      puedeLinks,
      formaDePago: tieneFormaDePago(ficha),
      desde, hasta, periodo, hoy: hoy(),
      // El documento del periodo y lo que se le transfiere (2026-11-20).
      documento: documentoDe(ficha, resumen.total, hasta),
      resumen, pagado, falta: Math.max(0, documentoDe(ficha, resumen.total, hasta).aTransferir - pagado), pagos: suyos,
      porCobrar: porCobrar(ventas),
      ventas, enCurso: [...enCurso.values()],
      puedeEditar, ...agregar
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
      ...(c.etapa1Desde !== undefined ? { etapa1Desde: Math.max(1, monto(c.etapa1Desde)) } : {}),
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
      ...(c.banco && typeof c.banco === 'object' ? { banco: { ...bancoVacio(), ...antes.banco, ...c.banco } } : {}),
      ...pagoDelCuerpo({ documento: c.documento, incluido: c.incluido, factura: c.factura }, antes),
      // **Lo que guarda quien paga queda confirmado** (`plata.ts`): el trato
      // de un socio que agregó un vendedor deja de estar por confirmar.
      porConfirmar: ''
    };
    await guardarVendedor(nueva);
    const quien = await quienEs(req);
    const NOMBRES = { nombre: 'nombre', activo: 'activo', etapa1Desde: 'etapa 1 desde', conSocio: 'con socio cobra %',
      sueldoFijo: 'sueldo fijo', comisionPct: 'etapa 1 %', montoEvento: 'monto por evento', base: 'base',
      etapa2Desde: 'etapa 2 desde', etapa2Pct: 'etapa 2 %', etapa3Desde: 'etapa 3 desde', etapa3Pct: 'etapa 3 %',
      bonoPuntos: 'bono premium', documento: 'documento', incluido: 'impuesto incluido' } as const;
    const dif = (Object.keys(NOMBRES) as (keyof typeof NOMBRES)[])
      .filter((k) => c[k] !== undefined && antes[k] !== nueva[k])
      .map((k) => `${NOMBRES[k]}: ${k === 'base' ? BASE_COMISION[antes.base] : antes[k]} → ${k === 'base' ? BASE_COMISION[nueva.base] : nueva[k]}`);
    if (dif.length || c.banco || c.factura) {
      await anotar({ ...quien, accion: socio ? 'Cambió la ficha de un socio comercial' : 'Cambió la ficha de un vendedor',
        detalle: `${nueva.nombre} · ${[...dif, ...(c.banco ? ['cuenta bancaria'] : []), ...(c.factura ? ['datos de la factura'] : [])].join(' · ')}` });
    }
    if (antes.porConfirmar) {
      await anotar({ ...quien, accion: 'Confirmó el trato de un socio comercial',
        detalle: `${nueva.nombre} · lo agregó ${antes.porConfirmar.split(' · ')[1] || 'un vendedor'}` });
    }
    return NextResponse.json({ ok: true, ficha: nueva });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * **Agregar un vendedor o un socio comercial**, con sus datos de pago de una
 * vez (2026-11-20, lo pidió el cliente: *"agregar al tiro los datos
 * necesarios para el pago"*).
 *
 * - **Un vendedor** (`tipo: 'vendedor'`, permiso `agregarVendedores`: pagos,
 *   la gerencia y el administrador) es **una cuenta del panel con el rol
 *   Vendedor**: pide usuario y clave. Ninguna otra cuenta ni rol se crea
 *   acá —eso sigue siendo de *Cuentas*—.
 * - **Un socio** (permiso `agregarSocios`) nace con el trato de partida —5%
 *   desde 22, 10% desde 55, 15% desde 77, sobre el neto—. **Si lo agrega
 *   quien no paga** —un vendedor, desde la cotización— **su trato queda por
 *   confirmar** y le llega a la bandeja de pagos.
 * - Los dos con su documento (boleta o factura), si lo que gana trae el
 *   impuesto, los datos de la factura y la transferencia.
 */
export const POST = conLecturas([HOJA_VENDEDORES, HOJA_USUARIOS], async function POST(req: Request) {
  try {
    const b = (await req.json().catch(() => ({}))) ?? {};
    const esVendedor = b.tipo === 'vendedor';
    const no = await exigir(req, esVendedor ? 'agregarVendedores' : 'agregarSocios');
    if (no) return no;
    const quien = await quienEs(req);
    const nombre = texto(b.nombre, 80);
    if (!nombre) return NextResponse.json({ error: esVendedor ? 'Escribe el nombre del vendedor.' : 'Escribe el nombre del socio.' }, { status: 400 });
    const fichas = await leerVendedores();

    if (esVendedor) {
      // El usuario no lleva espacios: se escribe al entrar (igual que en Cuentas).
      const usuario = String(b.usuario ?? '').trim().replace(/\s+/g, '');
      const clave = String(b.clave ?? '');
      if (!usuario) return NextResponse.json({ error: 'Escribe el usuario con que va a entrar.' }, { status: 400 });
      if (clave.length < LARGO_MINIMO_CLAVE) {
        return NextResponse.json({ error: `La clave tiene que tener ${LARGO_MINIMO_CLAVE} caracteres o más.` }, { status: 400 });
      }
      const usuarios = await leerUsuarios();
      if (usuarios.some((u) => normalizar(u.usuario) === normalizar(usuario))) {
        return NextResponse.json({ error: `Ya hay una cuenta con el usuario ${usuario}.` }, { status: 409 });
      }
      if (fichas.some((f) => normalizar(f.usuario) === normalizar(usuario))) {
        return NextResponse.json({ error: `El usuario ${usuario} ya tiene una ficha: elige otro.` }, { status: 409 });
      }
      await guardarUsuarios([...usuarios, { nombre, usuario, rol: ROL.vendedor, activo: true,
        huella: hashDeClave(clave), avisosLeidos: [], gerencia: false }]);
      const base = fichaVacia(usuario, nombre);
      const ficha: FichaVendedor = { ...base, ...pagoDelCuerpo(b, base) };
      await guardarVendedor(ficha);
      await anotar({ ...quien, accion: 'Creó la cuenta de un vendedor',
        detalle: `${nombre} · ${usuario} · ${ficha.documento === 'factura' ? 'factura' : 'boleta'}` });
      return NextResponse.json({ ok: true, ficha });
    }

    const ya = fichas.find((f) => f.tipo === 'socio' && normalizar(f.nombre) === normalizar(nombre));
    if (ya) return NextResponse.json({ error: `Ya hay un socio que se llama ${ya.nombre}.`, usuario: ya.usuario }, { status: 409 });
    const base = fichaSocio(nuevoIdSocio(fichas), nombre);
    const porConfirmar = puede(quien.rol as Rol, 'pagar') ? '' : `${ahoraEnChile()} · ${quien.usuario} · trato de partida`;
    const ficha: FichaVendedor = { ...base, ...pagoDelCuerpo(b, base), porConfirmar };
    await guardarVendedor(ficha);
    await anotar({ ...quien, accion: 'Agregó un socio comercial',
      detalle: `${nombre} · ${ficha.usuario}${porConfirmar ? ' · trato por confirmar' : ''}` });
    return NextResponse.json({ ok: true, ficha: { usuario: ficha.usuario, nombre: ficha.nombre, activo: ficha.activo,
      porConfirmar: !!porConfirmar } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

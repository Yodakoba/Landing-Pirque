import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { HOJA_TRABAJADORES, HOJA_TURNOS } from '@/lib/equipo';
import { HOJA_ACTIVIDADES, HOJA_COLABORADORES } from '@/lib/extras';
import { HOJA_BOLETAS, HOJA_PAGOS } from '@/lib/remuneraciones';
import { leerTurnos, leerTrabajadores, leerExtras, leerColaboradores,
         leerPagosEquipo, anotarPagoEquipo, anotarPagosEquipo, borrarPagoEquipo, leerBoletas,
         anotar } from '@/lib/datos';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { normalizar } from '@/lib/columnas';
import { pagoDelCuerpo } from '@/lib/remuneraciones';
import { puede } from '@/lib/auth';
import { enPesos } from '@/lib/ocupacion';
import type { Banco } from '@/lib/banco';
import { HOJA_USUARIOS } from '@/lib/usuarios';
import { HOJA_PRESUPUESTOS, HOJA_LINEAS, folioDe } from '@/lib/presupuestos';
import { HOJA_COBROS } from '@/lib/cobros';
import { HOJA_CLIENTES } from '@/lib/clientes';
import { HOJA_VENDEDORES, fichaDe, ventasDe } from '@/lib/vendedores';
import { leerUsuarios, leerVendedores, leerPresupuestos, leerLineasPresupuesto, leerCobros,
         leerClientes } from '@/lib/datos';
import { conCliente } from '@/lib/cotizar';
import { HOJA_MENUS } from '@/lib/menus';
import { leerMenus } from '@/lib/datos';
import { ROL } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Lo que hay que pagar, y nada más, para armar el informe.
 *
 * Existe porque el informe lo lee también **quien hace los pagos**, y esa
 * cuenta no puede llamar a `/api/equipo`: ahí viajan las reservas del
 * calendario, la lista completa de trabajadores y los puestos, que no son
 * asunto suyo. Pedirle a esa persona permiso de "ver" para que pudiera
 * sacar sus cuentas habría sido abrirle el panel entero.
 *
 * **Desde el 2026-10-22 también devuelve las actividades extras**, porque
 * quien paga hace un solo pago a la semana y necesita verlo todo junto. Lo
 * que no se mezcla es el cálculo: el equipo cobra jornadas y recibe propina,
 * un jinete cobra lo acordado y no recibe ninguna.
 *
 * De las fichas salen **solo los datos de la transferencia** —titular, RUT,
 * banco, tipo, número, correo y la nota—, que es lo que falta para poder
 * pagar sin cruzar la planilla con otra lista a mano. Ni teléfonos, ni
 * sueldos habituales, ni tokens.
 *
 * Ese recorte **se mantiene aunque la cuenta de pagos ya pueda ver el
 * equipo** (cambió el 2026-11-01): lo que se paga es lo que quedó congelado
 * en cada turno, no lo que la ficha dice que alguien gana de costumbre, así
 * que el sueldo habitual sigue sin hacer falta acá. Y los tokens no los
 * recibe nadie que no sea el administrador, que es de quien son los links.
 *
 * Es una ruta de solo lectura: el informe no escribe nada.
 */
export const GET = conLecturas([HOJA_TURNOS, HOJA_ACTIVIDADES, HOJA_TRABAJADORES, HOJA_COLABORADORES, HOJA_PAGOS, HOJA_BOLETAS,
  HOJA_USUARIOS, HOJA_VENDEDORES, HOJA_PRESUPUESTOS, HOJA_LINEAS, HOJA_COBROS, HOJA_CLIENTES, HOJA_MENUS], async function GET(req: Request) {
  const no = await exigirVer(req, 'informe');
  if (no) return no;
  try {
    const [turnos, extras, gente, colaboradores, pagos, boletas] = await Promise.all([
      leerTurnos(), leerExtras(), leerTrabajadores(), leerColaboradores(),
      leerPagosEquipo(), leerBoletas()
    ]);
    const { rol } = await quienEs(req);
    const puedePagar = puede(rol, 'pagar');
    // **El equipo de ventas** (2026-11-12): solo para quien ve a los
    // vendedores (quien paga, la gerencia y el administrador). Viajan sus
    // ventas y su forma de pago; el periodo lo calcula la pantalla con
    // `resumenDelPeriodo()`, igual que los turnos.
    let vendedores: { nombre: string; usuario: string; ficha: object; ventas: object[]; tipo: 'vendedor' | 'socio' }[] = [];
    const fichasV = puede(rol, 'vendedores') ? await leerVendedores() : [];
    if (puede(rol, 'vendedores')) {
      const [usuarios, presupuestos, lineas, cobros, clientes, menus] = await Promise.all([
        leerUsuarios(), leerPresupuestos(), leerLineasPresupuesto(), leerCobros(), leerClientes(), leerMenus()
      ]);
      const conNombre = presupuestos.map((p) => conCliente(p, clientes));
      vendedores = usuarios
        .filter((u) => u.rol === ROL.vendedor
          && (u.activo || fichasV.some((f) => normalizar(f.usuario) === normalizar(u.usuario))))
        .map((u) => {
          const f = fichaDe(fichasV, u.usuario, u.nombre);
          const nombre = f.nombre || u.nombre || u.usuario;
          return {
            nombre, usuario: u.usuario,
            ficha: { sueldoFijo: f.sueldoFijo, comisionPct: f.comisionPct, montoEvento: f.montoEvento, base: f.base },
            ventas: ventasDe(u.usuario, conNombre, lineas, cobros, f, menus, u.nombre).map((v) => ({ ...v, folio: folioDe({ id: v.grupo }) })),
            tipo: 'vendedor'
          };
        });
      // **Los socios comerciales** (2026-11-12, segunda entrega): en la misma
      // lista, con su comisión congelada o calculada y sin sueldo fijo.
      for (const f of fichasV.filter((x) => x.tipo === 'socio')) {
        vendedores.push({
          nombre: f.nombre || f.usuario, usuario: f.usuario, tipo: 'socio',
          ficha: { sueldoFijo: 0, comisionPct: f.comisionPct, montoEvento: f.montoEvento, base: f.base },
          ventas: ventasDe(f.usuario, conNombre, lineas, cobros, f, menus).map((v) => ({ ...v, folio: folioDe({ id: v.grupo }) }))
        });
      }
    }
    // **Los datos de la transferencia, solo a quien paga** (2026-11-12): el
    // gerente ve el informe pero no copia cuentas. Se recortan acá, no en
    // la pantalla, para que tampoco salgan en la planilla que se descarga.
    const cuentas: Record<string, Banco> = {};
    if (puedePagar) {
      for (const p of [...gente, ...colaboradores]) {
        cuentas[normalizar(p.nombre)] = p.banco;
      }
      for (const v of vendedores) {
        cuentas[normalizar(v.nombre)] = fichaDe(fichasV, v.usuario, v.nombre).banco;
      }
    }
    // Si esta cuenta puede registrar pagos. Se resuelve en el servidor y
    // no en la pantalla: el botón se esconde por comodidad, pero lo que de
    // verdad cierra la puerta es el `exigir('pagar')` del POST.
    return NextResponse.json({
      turnos, extras, cuentas, pagos, boletas, puedePagar, vendedores,
      puedeBoleta: puede(rol, 'boleta')
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/**
 * Anota que a alguien ya se le pagó, entero o en parte.
 *
 * **Es del permiso `pagar`, no del de leer el informe.** El encargado ve el
 * informe pero no registra pagos: mirar cuánto se le debe a alguien y
 * declarar que esa plata salió son dos cosas distintas, y la segunda es un
 * hecho con nombre y hora, como cerrar un día.
 *
 * **El pago se agrega, nunca se edita el anterior.** Un pago parcial no es
 * un estado intermedio que haya que mantener: es un pago más chico, y pagar
 * el resto después es otra fila. La suma cierra sola.
 */
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const cuerpo = await req.json();
    // **Varios pagos juntos**: el "todos pagados" de una transferencia
    // masiva. Se limpian uno por uno con la misma regla que un pago suelto;
    // si alguno no sirve, no se anota ninguno, para que no quede la mitad.
    if (Array.isArray(cuerpo?.pagos)) {
      const limpios = (cuerpo.pagos as unknown[]).map(pagoDelCuerpo);
      if (!limpios.length || limpios.some((x) => !x)) {
        return NextResponse.json(
          { error: 'Algún pago viene sin persona, periodo o monto.' }, { status: 400 }
        );
      }
      const lista = limpios as NonNullable<ReturnType<typeof pagoDelCuerpo>>[];
      const quien = await quienEs(req);
      const pagosNuevos = await anotarPagosEquipo(lista, quien.usuario);
      const suma = lista.reduce((t, x) => t + x.monto, 0);
      await anotar({ ...quien, accion: 'Registró pagos en bloque',
        detalle: `${lista.length} pagos · ${lista[0].concepto || 'sin concepto'} · `
          + `${enPesos(suma)} · ${lista[0].desde} a ${lista[0].hasta}` });
      return NextResponse.json({ pagos: pagosNuevos });
    }
    const limpio = pagoDelCuerpo(cuerpo);
    if (!limpio) {
      return NextResponse.json(
        { error: 'Falta el trabajador, el periodo o el monto.' }, { status: 400 }
      );
    }
    const quien = await quienEs(req);
    const pago = await anotarPagoEquipo(limpio, quien.usuario);
    await anotar({ ...quien, accion: 'Registró un pago',
      detalle: `${limpio.quien} · ${limpio.concepto || 'sin concepto'} · `
        + `${enPesos(limpio.monto)} · ${limpio.desde} a ${limpio.hasta}` });
    return NextResponse.json({ pago });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

/** Borra un pago anotado por error. Queda en la bitácora. */
export const DELETE = conLecturas([], async function DELETE(req: Request) {
  const no = await exigir(req, 'pagar');
  if (no) return no;
  try {
    const { id } = await req.json();
    const borrado = await borrarPagoEquipo(String(id ?? ''));
    if (!borrado) {
      return NextResponse.json({ error: 'Ese pago ya no está.' }, { status: 404 });
    }
    await anotar({ ...(await quienEs(req)), accion: 'Borró un pago',
      detalle: String(id ?? '') });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

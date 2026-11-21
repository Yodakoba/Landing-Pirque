/**
 * **Las estadísticas de reservas** (2026-11-19). Manda **una fila chica por
 * reserva** —fecha, origen, gente, asistencia, plata, menús—, sin nombres ni
 * contactos, y los días con su cupo. Las cuentas las hace la pantalla con
 * `lib/estadisticas.ts`, así que cambiar el periodo o un filtro no vuelve a
 * leer la planilla.
 *
 * Las reglas se aplican acá con las mismas funciones del calendario:
 * `ocupaLugar()`, `personasEnLaMesa()`, `menusDe()` y el estado del pago.
 *
 * Permiso `estadisticas` (operaciones, pagos, gerencia y administrador; la
 * vista gerencia también mira). Una tanda de lecturas.
 *
 * **El equipo** (2026-11-21, vista *👥 Equipo*): a quien también puede ver el
 * informe le manda además lo que costó el equipo **por día y por puesto**,
 * la propina y las ventas (`lib/estadisticasEquipo.ts`). Montos, sin un solo
 * nombre. Va en la misma tanda: suma `Turnos`, `Actividades` y `Puestos`.
 */
import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigirVer, quienEs } from '@/lib/permisos';
import { puedeVer, type Rol } from '@/lib/auth';
import { HOJA_TURNOS, HOJA_PUESTOS } from '@/lib/equipo';
import { HOJA_ACTIVIDADES } from '@/lib/extras';
import { estadisticasPorDia, ordenDePuestos } from '@/lib/estadisticasEquipo';
import { HOJA_RESERVAS, HOJA_FECHAS, ASISTENCIA, ESTADO_PAGO, TIPO_PAGO, esManual, estaCerrado } from '@/lib/columnas';
import { HOJA_MENUS } from '@/lib/menus';
import { HOJA_PRESUPUESTOS } from '@/lib/presupuestos';
import { leerReservas, leerFechas, leerMenus, reservasDeCotizaciones, leerTurnos, leerExtras, leerPuestos } from '@/lib/datos';
import { ocupaLugar } from '@/lib/ocupacion';
import { personasEnLaMesa, cuantosAgregados } from '@/lib/mesa';
import { menusDe } from '@/lib/shopify';
import { fechaEnZona, hoy, esFecha } from '@/lib/fechas';
import type { Reserva } from '@/lib/tipos';
import type { FilaEst, DiaEst } from '@/lib/estadisticas';

export const dynamic = 'force-dynamic';

/** El día en que se reservó, en hora de Chile. */
function diaReservada(creada: string): string {
  const c = String(creada ?? '').trim();
  if (esFecha(c)) return c;
  const t = Date.parse(c);
  return Number.isFinite(t) ? fechaEnZona(new Date(t)) : '';
}

function filaDe(r: Reserva, menus: Awaited<ReturnType<typeof leerMenus>>, deCotizacion: boolean): FilaEst {
  const e = String(r.estadoPago || '').trim().toLowerCase();
  const monto = r.monto != null && Number.isFinite(Number(r.monto)) ? Number(r.monto) : null;
  const pagado = e === ESTADO_PAGO.pagado ? (monto ?? 0) : e === ESTADO_PAGO.abonado ? Number(r.abonado) || 0 : 0;
  const asistencia = r.asistencia === ASISTENCIA.vino ? 'si' : r.asistencia === ASISTENCIA.noVino ? 'no' : '';
  const reservadas = (Number(r.personas) || 0) + cuantosAgregados(r.agregados);
  return {
    fecha: r.fecha,
    reservadaEl: diaReservada(r.creada),
    origen: deCotizacion ? 'cotizacion' : esManual(r.id) ? 'mano'
      : r.tipoPago === TIPO_PAGO.local ? 'soloReserva' : 'directo',
    ocupa: ocupaLugar(r),
    personas: personasEnLaMesa(r),
    asistencia,
    faltaron: asistencia === 'si' && r.llegaron != null ? Math.max(0, reservadas - Number(r.llegaron)) : 0,
    monto,
    pagado,
    valorFinal: r.valorFinal != null && Number(r.valorFinal) > 0 ? Number(r.valorFinal) : null,
    menus: menusDe([r], menus)
  };
}

export const GET = conLecturas([HOJA_RESERVAS, HOJA_FECHAS, HOJA_MENUS, HOJA_PRESUPUESTOS,
  HOJA_TURNOS, HOJA_ACTIVIDADES, HOJA_PUESTOS], async function GET(req: Request) {
  const no = await exigirVer(req, 'estadisticas');
  if (no) return no;
  try {
    const { rol, gerencia } = await quienEs(req);
    const veEquipo = puedeVer(rol as Rol, 'informe', gerencia === true);
    const [reservas, fechas, menus, deCot, turnos, extras, puestos] = await Promise.all([
      leerReservas(), leerFechas(), leerMenus(),
      reservasDeCotizaciones().catch(() => new Map<string, string>()),
      veEquipo ? leerTurnos() : Promise.resolve([]),
      veEquipo ? leerExtras().catch(() => []) : Promise.resolve([]),
      veEquipo ? leerPuestos().catch(() => []) : Promise.resolve([])
    ]);
    const filas = reservas.filter((r) => esFecha(r.fecha)).map((r) => filaDe(r, menus, deCot.has(r.id)));
    const dias: DiaEst[] = fechas.map((f) => ({
      fecha: f.fecha, cupo: f.capacidad, abierto: !estaCerrado(f.estado) && f.capacidad > 0
    }));
    // Todos los días que haya: con la base partiendo en cero son pocos, y así
    // cambiar el periodo en la pantalla no vuelve a pedir nada.
    const equipo = veEquipo ? (() => {
      const diasEquipo = estadisticasPorDia({ turnos, extras, reservas, desde: '2000-01-01', hasta: '2100-12-31', hoy: hoy() });
      const vistos = [...new Set(diasEquipo.flatMap((d) => Object.keys(d.porPuesto)))];
      return { dias: diasEquipo, puestos: ordenDePuestos(puestos.map((p) => p.nombre), vistos) };
    })() : null;
    return NextResponse.json({ hoy: hoy(), filas, dias, equipo }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

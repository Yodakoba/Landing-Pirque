import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, exigirVer, quienEs } from '@/lib/permisos';
import { leerFechas, guardarFecha, anotar, leerConfig } from '@/lib/datos';
import { puede } from '@/lib/auth';
import { subeElCupo, limiteSinAprobar } from '@/lib/cupo';
import { empujarDia } from '@/lib/crm-escribir';

export const dynamic = 'force-dynamic';

export const GET = conLecturas([], async function GET(req: Request) {
  const no = await exigirVer(req, 'ver');
  if (no) return no;
  try {
    return NextResponse.json({ fechas: await leerFechas() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

// Sin precarga: solo la cuenta sin `cupo` lee los días y la Configuración
// —juntos, en una tanda— para ver si sube el cupo.
export const POST = conLecturas([], async function POST(req: Request) {
  const no = await exigir(req, 'dias');
  if (no) return no;
  try {
    const b = await req.json();
    if (!b.fecha) return NextResponse.json({ error: 'Falta la fecha.' }, { status: 400 });
    // **Subir el cupo es del gerente o más arriba** (2026-11-12). El
    // encargado lo pide por `/api/fechas/cupo`; acá se rechaza, para que una
    // llamada directa obedezca lo mismo que la pantalla.
    const { rol } = await quienEs(req);
    if (!puede(rol, 'cupo')) {
      const [fechas, cfg] = await Promise.all([leerFechas(), leerConfig()]);
      const antes = fechas.find((x) => x.fecha === b.fecha)?.capacidad;
      if (subeElCupo(antes, Number(b.capacidad) || 0, cfg.cupoNormal)) {
        const limite = limiteSinAprobar(antes, cfg.cupoNormal);
        return NextResponse.json({
          error: `Subir el cupo sobre ${limite} lo aprueba el gerente de operaciones: pídeselo.`, limite
        }, { status: 403 });
      }
    }
    await guardarFecha({
      fecha: b.fecha,
      capacidad: Number(b.capacidad) || 0,
      apertura: b.apertura || '13:00',
      estado: b.estado || 'Abierta',
      notas: b.notas ?? ''
    });
    // El calendario del socio se entera ahora mismo. **No puede bloquear el
    // guardado**: `empujarDia()` no lanza, y lo que se pierda lo recupera la
    // reconciliación diaria. Va después de guardar, nunca antes.
    await empujarDia(b.fecha);

    const quien = await quienEs(req);
    await anotar({ ...quien, accion: 'Cambió un día',
      detalle: `${b.fecha} · ${b.estado || 'Abierta'} · cupo ${Number(b.capacidad) || 0}` });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

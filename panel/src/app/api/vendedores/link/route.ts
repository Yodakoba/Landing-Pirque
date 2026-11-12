import { NextResponse } from 'next/server';
import { conLecturas } from '@/lib/sheets';
import { exigir, quienEs } from '@/lib/permisos';
import { HOJA_VENDEDORES } from '@/lib/vendedores';
import { leerVendedores, guardarVendedor, anotar } from '@/lib/datos';
import { nuevoToken } from '@/lib/equipo';
import { normalizar } from '@/lib/columnas';

export const dynamic = 'force-dynamic';

/**
 * **El link personal de un socio comercial** (2026-11-12, segunda entrega):
 * crear, renovar o quitar, igual que `/api/extras/link`. Permiso `links`.
 * Renovar invalida el anterior; quitar lo apaga. Solo socios: el vendedor
 * entra al panel con su cuenta.
 */
export const POST = conLecturas([HOJA_VENDEDORES], async function POST(req: Request) {
  const no = await exigir(req, 'links');
  if (no) return no;
  try {
    const { usuario, accion } = (await req.json().catch(() => ({}))) ?? {};
    if (!['crear', 'renovar', 'quitar'].includes(accion)) {
      return NextResponse.json({ error: 'La acción tiene que ser crear, renovar o quitar.' }, { status: 400 });
    }
    const fichas = await leerVendedores();
    const s = fichas.find((f) => f.tipo === 'socio' && normalizar(f.usuario) === normalizar(String(usuario ?? '')));
    if (!s) return NextResponse.json({ error: 'Ese socio comercial no está.' }, { status: 404 });
    // Crear uno que ya existe lo devuelve tal cual: copiarlo dos veces no lo cambia.
    const token = accion === 'quitar' ? '' : accion === 'crear' && s.token ? s.token : nuevoToken();
    if (token !== s.token) await guardarVendedor({ ...s, token });
    if (token !== s.token) {
      await anotar({ ...(await quienEs(req)),
        accion: accion === 'quitar' ? 'Quitó un link personal'
          : accion === 'renovar' ? 'Renovó un link personal' : 'Creó un link personal',
        detalle: `${s.nombre} · socio comercial` });
    }
    return NextResponse.json({ usuario: s.usuario, token });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
});

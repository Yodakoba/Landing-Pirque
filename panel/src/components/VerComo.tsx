'use client';
/**
 * **Ver el panel como otro rol** (2026-11-12, lo pidió el cliente): desde su
 * cuenta, el administrador elige cómo quiere mirar el panel —como encargado,
 * pagos, vendedor o anfitrión— y vuelve cuando quiere.
 *
 * Dos piezas: el botón con su ventana, para elegir; y la franja que se queda
 * arriba mientras se mira como otro rol, con *Volver a administrador*. La
 * franja va siempre, en todas las pantallas, porque es la única puerta de
 * vuelta: mirando como anfitrión, por ejemplo, el menú es una sola pastilla.
 *
 * El cambio lo hace `/api/sesion/ver-como`, que firma la sesión de nuevo, y
 * después la página se recarga desde la portada: así el menú, el middleware y
 * cada pantalla se arman con el rol nuevo, igual que al entrar.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { avisar } from './AvisoFlotante';
import { NOMBRE_ROL, RESUMEN_ROL } from '@/lib/roles';

const ROLES: { rol: string; icono: string }[] = [
  { rol: 'encargado', icono: '🧑‍🍳' },
  { rol: 'pagos', icono: '💰' },
  { rol: 'vendedor', icono: '🤝' },
  { rol: 'anfitrion', icono: '🚪' }
];

async function cambiar(rol: string) {
  const r = await fetch('/api/sesion/ver-como', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ rol })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) { avisar(d.error || 'No se pudo cambiar la vista.', 'atencion'); return; }
  window.location.href = '/';
}

/** El botón del administrador, con la ventana para elegir el rol. */
export function BotonVerComo() {
  const [abierto, setAbierto] = useState(false);
  const [cambiando, setCambiando] = useState('');
  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="tecla boton">👁 Ver como…</button>
      {abierto && (
        <Dialogo titulo="Ver el panel como otro rol" onCerrar={() => setAbierto(false)}>
          <p className="mt-3 text-[15px] text-hueso/85">
            Mira el panel tal como lo ve esa cuenta: su menú, sus pantallas y sus botones. Vuelves con
            un toque a administrador.
          </p>
          <div className="mt-4 grid gap-2">
            {ROLES.map(({ rol, icono }) => (
              <button key={rol} type="button" disabled={!!cambiando}
                onClick={() => { setCambiando(rol); void cambiar(rol).finally(() => setCambiando('')); }}
                className="tecla flex items-center gap-3 rounded-xl border-2 border-hueso/20 bg-panel p-3 text-left
                           hover:border-oro disabled:opacity-50">
                <span aria-hidden className="text-[28px] leading-none">{icono}</span>
                <span>
                  <span className="block text-[17px] font-bold">
                    {cambiando === rol ? 'Cambiando…' : NOMBRE_ROL[rol]}
                  </span>
                  <span className="block text-[14px] text-hueso/75">{RESUMEN_ROL[rol]}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" className="boton min-h-[44px]" onClick={() => setAbierto(false)}>Volver</button>
          </div>
        </Dialogo>
      )}
    </>
  );
}

/** La franja que se queda arriba mientras el administrador mira como otro rol. */
export function FranjaVerComo({ rol }: { rol: string }) {
  const [volviendo, setVolviendo] = useState(false);
  return (
    <div role="status" className="mb-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-oro bg-oro/15 px-3 py-2">
      <span className="text-[15px]">
        👁 Estás mirando el panel como <strong>{NOMBRE_ROL[rol] ?? rol}</strong>: así lo ve esa cuenta.
      </span>
      <button type="button" disabled={volviendo}
        onClick={() => { setVolviendo(true); void cambiar('admin').finally(() => setVolviendo(false)); }}
        className="boton boton-relleno ml-auto">
        {volviendo ? 'Volviendo…' : '↩ Volver a administrador'}
      </button>
    </div>
  );
}

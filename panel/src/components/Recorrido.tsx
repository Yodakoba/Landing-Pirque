'use client';

/**
 * La tira de bienvenida: *¿Primera vez acá?* con un botón a las misiones de
 * la ayuda.
 *
 * **Desde el 2026-11-12 ya no tiene recorrido propio**: el recorrido son las
 * misiones de `/ayuda` (`lib/misiones.ts`), con capturas reales del panel de
 * cada rol. Dos recorridos distintos habrían enseñado dos versiones del mismo
 * panel.
 *
 * **Se ofrece, no se impone, y se ofrece dos veces.** Una sola oferta se la
 * pierde quien entró apurado; una oferta eterna se vuelve parte del fondo.
 * Quien la cierra o va a las misiones no la ve más. Se recuerda **por rol** en
 * `localStorage`: un cambio de rol la vuelve a ofrecer. Si `localStorage` está
 * bloqueado, la tira aparece siempre: molesto, no roto.
 */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const LLAVE = 'brasas-recorrido';
/** Cuántas veces se ofrece antes de no molestar más. */
const OFRECIDAS = 2;

const leer = (llave: string): string => {
  try { return localStorage.getItem(llave) ?? ''; } catch { return ''; }
};
const anotar = (llave: string, v: string) => {
  try { localStorage.setItem(llave, v); } catch { /* sin memoria, paciencia */ }
};

/** Lleva a las misiones (el `?` del calendario la usa). */
export function verRecorrido() {
  window.location.href = '/ayuda';
}

export default function Recorrido({ rol }: { rol: string }) {
  const ruta = usePathname();
  const llave = `${LLAVE}-${rol}`;
  const [ofrecer, setOfrecer] = useState(false);

  useEffect(() => {
    const v = leer(llave);
    if (v !== 'listo') setOfrecer(Number(v || 0) < OFRECIDAS);
  }, [llave]);

  // Ni la página del trabajador, ni la planilla del grupo, ni los documentos
  // que se le mandan al cliente —se imprimen a PDF, y la tira saldría en la
  // hoja—, ni la entrada, ni la propia ayuda.
  const fuera = ruta.startsWith('/mi/') || ruta.startsWith('/semana/')
             || ruta.startsWith('/presupuesto/') || ruta.startsWith('/contrato/')
             || ruta === '/login' || ruta.startsWith('/ayuda') || !rol;
  if (fuera || !ofrecer) return null;

  return (
    <div className="border-b border-oro/30 bg-oro/5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2.5 text-sm">
        <span>
          <strong>¿Primera vez acá?</strong>{' '}
          <span className="text-hueso/70">Cinco misiones cortas con tu panel de verdad.</span>
        </span>
        <span className="flex-1" />
        <a href="/ayuda" onClick={() => anotar(llave, 'listo')} className="tecla boton boton-relleno min-h-[40px]">
          ▶ Ver mis misiones
        </a>
        <button onClick={() => { anotar(llave, String(Number(leer(llave) || 0) + 1)); setOfrecer(false); }}
          className="boton min-h-[40px] text-hueso/70 hover:text-hueso">
          Ahora no
        </button>
      </div>
    </div>
  );
}

'use client';
/**
 * **La pantalla se mantiene al día sola** (2026-11-12, lo pidió el cliente).
 *
 * La encargada abre el calendario a las 10 y lo deja abierto. Si entra una
 * compra por Shopify, sus números quedan viejos y nada lo dice. Ahora:
 *
 * - **Cada dos minutos, solo con la pantalla a la vista**, se pregunta a
 *   `/api/cambios` por la firma de las reservas y los días: una lectura a
 *   Google. Un teléfono en el bolsillo o una pestaña de fondo no gastan nada.
 * - **Al volver a la pestaña** se revisa al tiro (si pasaron 30 s).
 * - **Si la firma cambió, se recarga sola**, salvo que haya una ventana
 *   abierta: ahí espera a que se cierre, para no mover nada bajo los dedos
 *   de quien está anotando una reserva.
 * - **Si Google pide calma**, la próxima revisión espera el doble, hasta
 *   diez minutos (`siguienteIntervalo()`).
 * - **↻ Actualizar** recarga todo cuando se quiera, y la línea dice a qué
 *   hora se actualizó por última vez.
 *
 * Lo que no detecta: cambios en el equipo, los turnos o las cotizaciones.
 * Para eso queda el botón.
 */
import { useEffect, useRef, useState } from 'react';
import { REVISAR_CADA, VOLVER_A_REVISAR, siguienteIntervalo } from '@/lib/cambios';

/** Si hay una ventana del panel abierta (todas usan `Dialogo`, con `role="dialog"`). */
function hayVentanaAbierta(): boolean {
  return typeof document !== 'undefined' && !!document.querySelector('[role="dialog"]');
}

export function horaDe(t: number): string {
  return new Date(t).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago'
  });
}

/**
 * `firma` es la que trajo la última carga completa; `recargar` hace esa
 * carga y termina cuando llegó. Devuelve cuándo se actualizó, si está
 * recargando, si hay cambios esperando que se cierre una ventana, y la
 * función del botón.
 */
export function usarAlDia(firma: string, recargar: () => Promise<unknown>) {
  const [actualizado, setActualizado] = useState<number | null>(null);
  const [recargando, setRecargando] = useState(false);
  const [esperando, setEsperando] = useState(false);
  const firmaRef = useRef(firma);
  const recargarRef = useRef(recargar);
  recargarRef.current = recargar;
  const intervalo = useRef(REVISAR_CADA);
  const ultimaRevision = useRef(Date.now());
  const enCurso = useRef(false);

  // Cada carga completa trae su firma: esa es la base para comparar.
  useEffect(() => {
    if (!firma) return;
    firmaRef.current = firma;
    setActualizado(Date.now());
  }, [firma]);

  async function actualizar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setRecargando(true);
    setEsperando(false);
    try { await recargarRef.current(); } finally {
      enCurso.current = false;
      setRecargando(false);
      ultimaRevision.current = Date.now();
    }
  }

  useEffect(() => {
    let vivo = true;
    let reloj: ReturnType<typeof setTimeout>;
    let pendiente = false;

    async function revisar() {
      if (!vivo || enCurso.current || !firmaRef.current) return;
      if (document.visibilityState !== 'visible') return;
      ultimaRevision.current = Date.now();
      let salioBien = false;
      try {
        const r = await fetch('/api/cambios', { cache: 'no-store' });
        const d = await r.json().catch(() => ({}));
        salioBien = r.ok && !d.error;
        if (salioBien && d.firma && d.firma !== firmaRef.current) pendiente = true;
      } catch { /* sin red: se reintenta en el próximo turno */ }
      intervalo.current = siguienteIntervalo(intervalo.current, salioBien);
      aplicar();
    }

    /** Recarga si hay cambios y no hay una ventana abierta; si la hay, espera. */
    function aplicar() {
      if (!pendiente || !vivo) return;
      if (hayVentanaAbierta()) { setEsperando(true); return; }
      pendiente = false;
      void actualizar();
    }

    function programar() {
      clearTimeout(reloj);
      reloj = setTimeout(async () => { await revisar(); if (vivo) programar(); }, intervalo.current);
    }

    function alVolver() {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - ultimaRevision.current >= VOLVER_A_REVISAR) void revisar();
    }

    // Mientras espera que se cierre una ventana, mira cada 2 s si ya se
    // cerró. No cuesta lecturas: es solo mirar la pantalla.
    const vigia = setInterval(() => { if (pendiente) aplicar(); }, 2000);

    programar();
    document.addEventListener('visibilitychange', alVolver);
    window.addEventListener('focus', alVolver);
    return () => {
      vivo = false;
      clearTimeout(reloj);
      clearInterval(vigia);
      document.removeEventListener('visibilitychange', alVolver);
      window.removeEventListener('focus', alVolver);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { actualizado, recargando, esperando, actualizar };
}

/** La línea con la hora y el botón ↻ Actualizar. */
export function BarraAlDia({ actualizado, recargando, esperando, actualizar }:
  ReturnType<typeof usarAlDia>) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2" aria-live="polite">
      <span className="text-[14px] text-hueso/70">
        {recargando ? 'Actualizando…'
          : esperando ? <span className="font-semibold text-ambar-texto">Hay cambios: se actualiza al cerrar la ventana</span>
          : actualizado ? <>Al día · actualizado a las {horaDe(actualizado)}</> : ''}
      </span>
      <button type="button" className="boton" disabled={recargando} onClick={() => void actualizar()}>
        ↻ Actualizar
      </button>
    </div>
  );
}

/**
 * La marca de un día que cambió: un borde dorado y una pastilla encima
 * —*+12 personas desde las 10:04*— durante un minuto. Va en posición
 * absoluta para no cambiar el alto de la tarjeta.
 */
export function MarcaCambio({ delta, desde }: { delta: number; desde: string }) {
  const n = Math.abs(delta);
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-4 ring-oro" />
      <span className="pointer-events-none absolute -top-3 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap
                       rounded-full border-2 border-oro bg-panel px-2.5 py-0.5 text-[13px] font-bold text-oro shadow">
        {delta > 0 ? '+' : '−'}{n} {n === 1 ? 'persona' : 'personas'}{desde ? ` desde las ${desde}` : ''}
      </span>
    </>
  );
}

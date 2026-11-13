'use client';
/**
 * **Los avisos de la recepción, en la portada** (2026-11-13, lo pidió el
 * cliente: *"colapsar y mostrar los distintos avisos y ofrecer el link
 * directamente al día de problema… guiar más al usuario"*).
 *
 * La anfitriona deja un aviso en una reserva (`RecepcionVista`: *Llegaron 6
 * de 4*, o lo que escriba) y le llega al encargado y al jefe de turno.
 * Antes la portada decía solo *"La recepción dejó 2 avisos hoy"*, sin
 * nombres, y **solo los de hoy**: uno sin resolver de ayer desaparecía.
 *
 * - **Uno solo** se muestra entero, con su nombre.
 * - **Varios** se pliegan en una línea con el total, y *Ver* los lista.
 * - **Entran los de días anteriores** mientras nadie los resuelva.
 * - *Ir a la reserva* abre el día, baja a esa reserva y la deja abierta
 *   (`/dia/<fecha>#reserva-<fila>`, ver `DayView`).
 *
 * **Rojo suave y no ámbar**: ámbar en el panel ya quiere decir *falta
 * cobrar*. Sale de las reservas que la portada ya cargó: ninguna lectura más.
 */
import { useState } from 'react';
import type { Reserva } from '@/lib/tipos';
import { enCorto, hoy, sumarDias } from '@/lib/fechas';

/** `"13:42 · Llegaron 6 de 4"` → hora y texto. Uno sin hora se lee entero. */
export function partirAviso(aviso: string): { hora: string; texto: string } {
  const m = /^(\d{1,2}:\d{2})\s*·\s*([\s\S]*)$/.exec(aviso.trim());
  return m ? { hora: m[1], texto: m[2] } : { hora: '', texto: aviso.trim() };
}

/** *Hoy*, *Ayer* o el día corto. */
export function cuandoAviso(fecha: string): string {
  const h = hoy();
  if (fecha === h) return 'Hoy';
  if (fecha === sumarDias(h, -1)) return 'Ayer';
  return enCorto(fecha);
}

/** Las reservas con aviso, el más nuevo primero. */
export function conAviso(reservas: Reserva[]): Reserva[] {
  return reservas
    .filter((r) => (r.avisoRecepcion ?? '').trim())
    .sort((a, b) => (b.fecha + partirAviso(b.avisoRecepcion!).hora)
      .localeCompare(a.fecha + partirAviso(a.avisoRecepcion!).hora));
}

function Fila({ r }: { r: Reserva }) {
  const { hora, texto } = partirAviso(r.avisoRecepcion ?? '');
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-rojo-fuerte/30 bg-panel px-3 py-1.5">
      <p className="min-w-[14rem] flex-1 text-[15px] leading-snug">
        <span className="text-hueso/70">{cuandoAviso(r.fecha)}{hora && ` ${hora}`}</span>
        {' · '}<b>{r.nombre || 'Sin nombre'}</b>{' · '}
        <span className="text-rojo-texto">{texto}</span>
      </p>
      <a href={`/dia/${r.fecha}#reserva-${r.fila}`} className="tecla boton min-h-[44px] !text-[15px]">
        Ir a la reserva →
      </a>
    </li>
  );
}

export default function AvisosRecepcion({ reservas }: { reservas: Reserva[] }) {
  const [abierto, setAbierto] = useState(false);
  const avisos = conAviso(reservas);
  if (!avisos.length) return null;
  const caja = 'mb-4 rounded-xl border-2 border-rojo-fuerte/50 bg-rojo/[0.08] p-2 sm:p-3';

  if (avisos.length === 1) {
    return (
      <section aria-label="Aviso de la recepción" className={caja}>
        <h2 className="px-1 pb-1.5 text-[15px] font-bold text-rojo-texto">📣 La recepción dejó un aviso</h2>
        <ul><Fila r={avisos[0]} /></ul>
      </section>
    );
  }
  return (
    <section aria-label="Avisos de la recepción" className={caja}>
      <button type="button" aria-expanded={abierto} onClick={() => setAbierto((v) => !v)}
        className="tecla flex min-h-[44px] w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-1 text-left">
        <span className="flex-1 text-[15px] font-bold text-rojo-texto">
          📣 {avisos.length} avisos de la recepción sin resolver
        </span>
        <span className="boton !min-h-[40px] !text-[15px]">{abierto ? 'Ocultar ▴' : 'Ver ▾'}</span>
      </button>
      {abierto && <ul className="mt-2 space-y-1.5">{avisos.map((r) => <Fila key={r.fila} r={r} />)}</ul>}
    </section>
  );
}

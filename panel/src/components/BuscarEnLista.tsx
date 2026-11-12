'use client';

/**
 * **Elegir a alguien de una lista que crece, con buscador** (2026-11-12,
 * regla del cliente). Para vendedores, socios comerciales y cualquier lista
 * de personas o empresas: **no un botón por cada uno**, que con veinte llena
 * la pantalla, sino un botón que abre esto —un campo con el cursor puesto y
 * la lista que calza debajo—. Los botones a la vista quedan para las
 * opciones fijas y pocas (*No, directo*, *Mes / Semana*).
 *
 * - Busca **sin tildes ni mayúsculas**, en el nombre y en el detalle.
 * - **Enter elige al primero**; Escape cierra sin cerrar la ventana de atrás.
 * - Cada fila es un botón de 44px; la elegida va marcada con ✓.
 * - `pie`: lo que va debajo de la lista, como *+ Agregar socio comercial*.
 */
import { useState } from 'react';

export interface OpcionLista { id: string; nombre: string; detalle?: string }

const llano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function BuscarEnLista({ opciones, elegido = '', onElegir, onCerrar, etiqueta, vacia, pie }: {
  opciones: OpcionLista[];
  elegido?: string;
  onElegir: (id: string) => void;
  onCerrar: () => void;
  /** Para el campo y los lectores de pantalla: "Buscar socio comercial". */
  etiqueta: string;
  /** Lo que se dice si la lista está vacía. */
  vacia: string;
  pie?: React.ReactNode;
}) {
  const [texto, setTexto] = useState('');
  const q = llano(texto);
  const calzan = q ? opciones.filter((o) => llano(`${o.nombre} ${o.detalle ?? ''}`).includes(q)) : opciones;
  return (
    <div className="rounded-xl border-2 border-oro/70 bg-panel p-2">
      <div className="flex items-center gap-2">
        <input type="search" autoFocus value={texto} placeholder="Escribe un nombre" aria-label={etiqueta}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && calzan[0]) { e.preventDefault(); onElegir(calzan[0].id); }
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); }
          }}
          className="min-h-[44px] min-w-0 flex-1 rounded-lg border-2 border-hueso/20 bg-tinta px-3 text-[16px] focus:border-oro focus:outline-none" />
        <button type="button" onClick={onCerrar} className="boton min-h-[44px] shrink-0">Cerrar</button>
      </div>
      <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
        {calzan.map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => onElegir(o.id)} aria-pressed={o.id === elegido}
              className={`tecla flex min-h-[44px] w-full items-center justify-between gap-2 rounded-lg px-3 text-left hover:bg-oro/10
                ${o.id === elegido ? 'bg-oro/15 text-oro' : ''}`}>
              <span className="truncate text-[15px] font-semibold">{o.id === elegido ? '✓ ' : ''}{o.nombre}</span>
              {o.detalle && <span className="shrink-0 text-[13px] text-hueso/65">{o.detalle}</span>}
            </button>
          </li>
        ))}
        {calzan.length === 0 && (
          <li className="px-3 py-2 text-[14px] text-hueso/65">{opciones.length ? 'Nadie se llama así.' : vacia}</li>
        )}
      </ul>
      {pie && <div className="mt-2 border-t border-hueso/15 pt-2">{pie}</div>}
    </div>
  );
}

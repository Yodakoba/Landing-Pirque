'use client';

/**
 * **Agregar a alguien escribiendo su nombre** (2026-11-05).
 *
 * Lo pidió el cliente: *"con tantos trabajadores ya sería útil que cuando
 * aprietas agregar, no solo muestra todos los trabajadores posibles, sino que
 * se puede buscar por nombre"*. Un `<select>` con veinte nombres obliga a
 * recorrer la lista entera con el dedo; acá se escriben dos letras y queda
 * la persona.
 *
 * - **Cerrado es un botón** —*+ Agregar…*— del mismo tamaño que el desplegable
 *   de antes, así la caja del puesto no cambia de alto.
 * - **Abierto**: un campo con el cursor ya puesto y, debajo, la lista que
 *   calza. Busca **sin tildes ni mayúsculas** y en cualquier parte del
 *   nombre o del detalle (el puesto habitual, la actividad): "jose" encuentra
 *   a "José Pérez", y "garz" a los garzones.
 * - **Elegir a alguien deja el buscador abierto y vacío**, igual que el
 *   desplegable volvía a "" después de elegir: se agrega a varios seguidos
 *   sin abrirlo cada vez. *Listo* o Escape lo cierran.
 * - **Un clic afuera lo cierra** (2026-11-12, lo pidió el cliente), igual
 *   que `BuscarEnLista`; *Listo* sigue para quien agregó a varios.
 * - **Enter agrega al primero de la lista**, que es justo el que se busca
 *   cuando el nombre ya quedó solo.
 * - Cada nombre es un botón de 44px, para el dedo.
 *
 * Al nivel del módulo, como todo componente de este panel: declarado
 * adentro de otro, el campo perdería el foco a cada letra.
 */
import { useEffect, useRef, useState } from 'react';

export interface Opcion { nombre: string; detalle?: string }

/** Minúsculas y sin tildes: lo que se escribe y lo que se busca, parejos. */
const llano = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export default function BuscarPersona({ opciones, onElegir, etiqueta, ancho = 'w-full', destacar = false, abrir = 0 }: {
  /** Las personas que se pueden agregar, ya ordenadas. */
  opciones: Opcion[];
  onElegir: (nombre: string) => void;
  /** Para los lectores de pantalla: "Agregar alguien a Garzón". */
  etiqueta: string;
  ancho?: string;
  /** En ámbar: a este puesto le falta gente (2026-11-12). */
  destacar?: boolean;
  /** Cada vez que cambia, el buscador se abre: lo usa el aviso de lo que falta. */
  abrir?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  useEffect(() => { if (abrir) setAbierto(true); }, [abrir]);
  const caja = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const afuera = (e: PointerEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) { setAbierto(false); setTexto(''); }
    };
    document.addEventListener('pointerdown', afuera);
    return () => document.removeEventListener('pointerdown', afuera);
  }, [abierto]);

  if (opciones.length === 0) {
    return (
      <p className={`${ancho} rounded-lg border-2 border-hueso/15 px-3 py-2 text-[14px] text-hueso/60`}>
        No queda nadie libre
      </p>
    );
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} aria-label={etiqueta}
        className={`tecla flex min-h-[40px] ${ancho} items-center rounded-lg border-2
                    ${destacar ? 'border-ambar-fuerte/70 text-ambar-texto' : 'border-hueso/20'} bg-tinta px-3
                    text-left text-[14px] font-semibold hover:border-oro`}>
        + Agregar…
      </button>
    );
  }

  const q = llano(texto);
  const calzan = q
    ? opciones.filter((o) => llano(`${o.nombre} ${o.detalle ?? ''}`).includes(q))
    : opciones;
  const cerrar = () => { setAbierto(false); setTexto(''); };
  const elegir = (nombre: string) => { onElegir(nombre); setTexto(''); };

  return (
    <div ref={caja} className={`${ancho} rounded-lg border-2 border-oro/70 bg-panel p-2`}>
      <div className="flex items-center gap-2">
        <input type="search" autoFocus value={texto} placeholder="Escribe un nombre"
          aria-label={etiqueta}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && calzan[0]) { e.preventDefault(); elegir(calzan[0].nombre); }
            // Escape cierra el buscador y no la ventana de atrás.
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); }
          }}
          className="min-h-[40px] min-w-0 flex-1 rounded-lg border-2 border-hueso/20 bg-tinta
                     px-2.5 text-[15px] focus:border-oro focus:outline-none" />
        <button type="button" onClick={cerrar} className="boton shrink-0">Listo</button>
      </div>
      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {calzan.map((o) => (
          <li key={o.nombre}>
            <button type="button" onClick={() => elegir(o.nombre)}
              className="tecla flex min-h-[44px] w-full items-center justify-between gap-2
                         rounded-lg px-2.5 text-left hover:bg-oro/10">
              <span className="truncate text-[15px] font-semibold">{o.nombre}</span>
              {o.detalle && (
                <span className="shrink-0 text-[13px] text-hueso/60">{o.detalle}</span>
              )}
            </button>
          </li>
        ))}
        {calzan.length === 0 && (
          <li className="px-2.5 py-2 text-[14px] text-hueso/60">
            Nadie se llama así. Puedes crearlo con <strong>+ Nuevo</strong>.
          </li>
        )}
      </ul>
    </div>
  );
}

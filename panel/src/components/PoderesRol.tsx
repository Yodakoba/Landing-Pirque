'use client';

/**
 * **Tus poderes** (2026-11-13). Ver `lib/poderes.ts`.
 *
 * Reemplaza a las dos listas *"Tu cuenta puede / No es de tu rol"*, que el
 * cliente encontró *"muy Excel"*. Cada mundo es una tarjeta con su marcador
 * (*3 de 9*) y sus poderes como casillas:
 *
 * - **Desbloqueado**: en color, con ✓. **Bloqueado**: gris, borde cortado y
 *   🔒. Se distinguen por forma, no solo por color.
 * - **Tocar uno** abre debajo qué es, con la frase entera.
 * - **Uno bloqueado ofrece 🙋 Lo necesito**: sube a Tu voz con el pedido ya
 *   escrito, para que diga para qué lo necesita.
 */
import { useState } from 'react';
import { poderesDe, type PoderDeRol } from '@/lib/poderes';
import type { Rol } from '@/lib/auth';

export default function PoderesRol({ rol, onPedir }: {
  rol: string;
  /** Sin esto (comentarios sin conectar), no se ofrece pedirlo. */
  onPedir?: (p: PoderDeRol) => void;
}) {
  const mundos = poderesDe(rol as Rol);
  const [abierto, setAbierto] = useState('');

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {mundos.map((m) => {
        const elegido = m.poderes.find((p) => p.accion === abierto);
        const todos = m.tiene === m.poderes.length;
        return (
          <section key={m.id} aria-label={m.nombre}
            className={`overflow-hidden rounded-2xl border-2 bg-panel ${m.tiene ? 'border-oro/40' : 'border-hueso/15'}`}>
            <header className={`flex items-center gap-3 border-b-2 px-4 py-2.5 ${m.tiene ? 'border-oro/25 bg-oro/10' : 'border-hueso/10 bg-hueso/5'}`}>
              <span className="text-[26px] leading-none" aria-hidden>{m.icono}</span>
              <h3 className="flex-1 text-[16px] font-black uppercase tracking-wide">{m.nombre}</h3>
              <span className={`rounded-full border-2 px-2.5 py-0.5 text-[14px] font-black tabular-nums ${todos
                ? 'border-verde-fuerte bg-verde-fuerte text-white'
                : m.tiene ? 'border-oro text-oro' : 'border-hueso/25 text-hueso/55'}`}>
                {todos ? '★ ' : ''}{m.tiene}/{m.poderes.length}
              </span>
            </header>

            <ul className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
              {m.poderes.map((p) => {
                const aqui = abierto === p.accion;
                return (
                  <li key={p.accion}>
                    <button type="button" onClick={() => setAbierto(aqui ? '' : p.accion)} aria-pressed={aqui}
                      aria-label={`${p.corto}: ${p.tiene ? 'lo tienes' : 'bloqueado, no es de tu rol'}`}
                      className={`tecla relative flex min-h-[92px] w-full flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-center
                        ${p.tiene
                          ? 'border-2 border-verde-fuerte/60 bg-verde/10'
                          : 'border-2 border-dashed border-hueso/25 bg-transparent'}
                        ${aqui ? 'ring-4 ring-oro/50' : ''}`}>
                      <span className={`text-[28px] leading-none ${p.tiene ? '' : 'opacity-35 grayscale'}`} aria-hidden>{p.icono}</span>
                      <span className={`text-[13px] font-semibold leading-tight ${p.tiene ? 'text-hueso' : 'text-hueso/55'}`}>{p.corto}</span>
                      <span className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-black
                        ${p.tiene ? 'bg-verde-fuerte text-white' : 'bg-hueso/15'}`} aria-hidden>{p.tiene ? '✓' : '🔒'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {elegido && (
              <div className={`mx-3 mb-3 rounded-xl border-2 px-4 py-3 ${elegido.tiene ? 'border-verde-fuerte/40 bg-verde/10' : 'border-hueso/20 bg-hueso/5'}`}>
                <p className="text-[15px] font-bold">
                  {elegido.icono} {elegido.corto}{' '}
                  <span className={elegido.tiene ? 'text-verde-texto' : 'text-hueso/60'}>
                    · {elegido.tiene ? '✓ lo tienes' : '🔒 no es de tu rol'}
                  </span>
                </p>
                <p className="mt-1 text-[15px] text-hueso/80">{elegido.frase}.</p>
                {!elegido.tiene && onPedir && (
                  <button type="button" onClick={() => onPedir(elegido)}
                    className="boton mt-3 min-h-[44px] border-2 border-rosa-fuerte/60 bg-rosa/10 text-[15px] font-bold text-rosa-texto">
                    🙋 Lo necesito para mi trabajo
                  </button>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

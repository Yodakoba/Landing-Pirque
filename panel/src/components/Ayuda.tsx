'use client';

/**
 * El signo de interrogación que va al lado del título de cada pantalla.
 *
 * Lo pidió el cliente: *"signo de interrogación, clic, quiero aprender más y
 * se abre y aprendo más sobre esto"*.
 *
 * **La ayuda se pide, no aparece.** No hay globitos que salgan solos ni
 * carteles que haya que cerrar: quien ya sabe usar el panel no ve nada
 * distinto, y quien no sabe tiene el mismo signo en el mismo lugar en todas
 * las pantallas. Una ayuda que interrumpe se aprende a cerrar sin leerla.
 *
 * El texto no está acá: vive en `ayudas.ts`, todo junto, para poder leerlo y
 * corregirlo de una sentada. Ver ese archivo.
 */
import { useState } from 'react';
import Dialogo from './Dialogo';
import { AYUDAS } from '@/lib/ayudas';

export default function Ayuda({ tema, onRecorrido }: {
  /** La llave en `AYUDAS`. */
  tema: string;
  /** Si se pasa, la ventana ofrece además volver a ver el recorrido. */
  onRecorrido?: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const a = AYUDAS[tema];
  if (!a) return null;

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}
        aria-label={`Qué es esto: ${a.titulo}`}
        title="Qué es esta pantalla y cómo se usa"
        className="ml-2 inline-flex h-6 w-6 shrink-0 items-center justify-center
                   rounded-full border border-hueso/25 align-middle text-xs
                   font-bold text-hueso/55 hover:border-oro hover:text-oro">
        ?
      </button>

      {abierta && (
        <Dialogo titulo={a.titulo} onCerrar={() => setAbierta(false)}>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-hueso/80">
            {a.cuerpo.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {a.pasos && (
            <>
              <h3 className="mt-5 text-xs uppercase tracking-wide text-hueso/55">
                Cómo se usa
              </h3>
              {/* Números a la izquierda y el texto alineado entre sí: una
                  lista numerada que envuelve bajo su propio número se lee
                  como párrafos sueltos. */}
              <ol className="mt-2 space-y-2 text-sm text-hueso/80">
                {a.pasos.map((p, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 font-semibold text-oro tabular-nums">
                      {i + 1}.
                    </span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {a.ojo && (
            <p className="mt-5 rounded border border-ambar/40 bg-ambar/5 px-3 py-2
                          text-sm text-ambar-texto">
              <strong>Ojo:</strong> {a.ojo}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {onRecorrido && (
              <button type="button"
                onClick={() => { setAbierta(false); onRecorrido(); }}
                className="rounded border border-hueso/20 px-3 py-1.5 text-sm
                           hover:border-oro hover:text-oro">
                Ver el recorrido de nuevo
              </button>
            )}
            <span className="flex-1" />
            <button type="button" onClick={() => setAbierta(false)}
              className="rounded bg-oro px-4 py-1.5 text-sm font-semibold text-tinta">
              Entendido
            </button>
          </div>
        </Dialogo>
      )}
    </>
  );
}

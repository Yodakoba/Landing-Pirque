'use client';
/**
 * **Un aviso que se cierra para siempre** (2026-11-13, lo pidió el cliente:
 * una ✕ *"que realmente funciona bien para que no vuelva este aviso después
 * más, como muchas veces pasa en otros sitios"*). Lo usa `AvisoFijo`.
 *
 * Lo que hace que no vuelva es **guardarlo en la cuenta** (`/api/avisos`,
 * columna *Avisos leídos* de `Usuarios`), no en el navegador: así no
 * reaparece en el teléfono, en otro computador ni al borrar los datos del
 * navegador. **Cada pantalla lo sabe por la sesión** (`usarAvisosDeLaSesion`):
 * se carga al entrar y `/api/avisos` vuelve a sellar la cookie al cerrar uno,
 * así que no cuesta lecturas de Google.
 *
 * - **Se oculta al tiro**, sin esperar a la planilla.
 * - **También se anota en el navegador** (`blp-aviso-leido:<clave>`): si la
 *   planilla no responde, al menos en este navegador no vuelve, y lo dice.
 */
import { useEffect, useState } from 'react';
import { avisar } from './AvisoFlotante';
import { usarAvisosDeLaSesion } from './SesionCliente';

const llave = (clave: string) => `blp-aviso-leido:${clave}`;

export function usarAvisoCerrable(clave: string, delServidor?: string[]) {
  const deLaSesion = usarAvisosDeLaSesion();
  const [enNavegador, setEnNavegador] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  // `localStorage` se lee después de dibujar: el servidor no lo tiene.
  useEffect(() => {
    try { setEnNavegador(localStorage.getItem(llave(clave)) === 'si'); } catch { /* sin memoria */ }
  }, [clave]);

  const leido = cerrado || enNavegador || deLaSesion.includes(clave) || (delServidor ?? []).includes(clave);

  async function cerrar() {
    setCerrado(true);
    try { localStorage.setItem(llave(clave), 'si'); } catch { /* sin memoria */ }
    try {
      const r = await fetch('/api/avisos', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error || d.falla) throw new Error(d.error || d.falla);
    } catch {
      avisar('Se ocultó en este navegador, pero no se pudo guardar en tu cuenta.', 'atencion');
    }
  }
  return { leido, cerrar };
}

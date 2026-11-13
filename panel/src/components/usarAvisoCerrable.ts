'use client';
/**
 * **Un aviso que se cierra para siempre** (2026-11-13, lo pidió el cliente:
 * una ✕ *"que realmente funciona bien para que no vuelva este aviso después
 * más, como muchas veces pasa en otros sitios"*).
 *
 * Lo que hace que no vuelva es **guardarlo en la cuenta** (`/api/avisos`,
 * columna *Avisos leídos* de `Usuarios`), no en el navegador: así no
 * reaparece en el teléfono, en otro computador ni al borrar los datos del
 * navegador. La ruta de la pantalla trae la lista (`avisosLeidos`) en la
 * misma tanda de lecturas.
 *
 * - **Se oculta al tiro**, sin esperar a la planilla.
 * - **También se anota en el navegador**: si la planilla no responde, o la
 *   cuenta es la de emergencia del entorno, que no tiene fila, al menos en
 *   este navegador no vuelve. Si no se pudo guardar en la cuenta, lo dice.
 */
import { useEffect, useState } from 'react';
import { avisar } from './AvisoFlotante';

const llave = (clave: string) => `blp-aviso-leido:${clave}`;

export function usarAvisoCerrable(clave: string, delServidor: string[] | undefined) {
  const [enNavegador, setEnNavegador] = useState(false);
  const [cerrado, setCerrado] = useState(false);
  // `localStorage` se lee después de dibujar: el servidor no lo tiene.
  useEffect(() => {
    try { setEnNavegador(localStorage.getItem(llave(clave)) === 'si'); } catch { /* sin memoria */ }
  }, [clave]);

  const leido = cerrado || enNavegador || (delServidor ?? []).includes(clave);

  async function cerrar() {
    setCerrado(true);
    try { localStorage.setItem(llave(clave), 'si'); } catch { /* sin memoria */ }
    try {
      const r = await fetch('/api/avisos', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clave })
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) throw new Error(d.error);
      if (d.enLaCuenta === false) avisar('Listo. Esta cuenta no está en la planilla: no vuelve en este navegador.', 'atencion');
    } catch {
      avisar('Se ocultó en este navegador, pero no se pudo guardar en tu cuenta.', 'atencion');
    }
  }
  return { leido, cerrar };
}

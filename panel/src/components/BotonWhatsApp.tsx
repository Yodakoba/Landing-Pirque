'use client';

/**
 * **Un solo botón de WhatsApp para todo el panel** (2026-11-13, lo pidió el
 * cliente: *"el WhatsApp debería haber al tiro el WhatsApp"*). Antes había
 * cuatro formas: un enlace pelado en la página del día, `abrirFuera()` en la
 * cotización y dos copias en Sobrecupo y Liberar el día.
 *
 * - **Al tiro**: en un celular abre la aplicación (`wa.me`); en un
 *   computador va derecho al chat de WhatsApp Web, sin la página intermedia
 *   de `wa.me` (`enlaceWhatsAppDirecto()` en `contacto.ts`).
 * - **Si el navegador bloquea la pestaña nueva** —no avisa, pero
 *   `window.open` devuelve `null`— se abre en la misma.
 * - **El mensaje va escrito y firmado** por quien lo manda: lo arma quien
 *   llama, con `saludoAlCliente()`.
 * - El `href` sigue siendo el `wa.me` de siempre, para abrirlo con el botón
 *   del medio o copiarlo.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { enlaceWhatsAppDirecto } from '@/lib/contacto';

/**
 * **Quién firma los mensajes de una pantalla**: el nombre de la cuenta y el
 * nombre comercial. La página del día lo pone una vez y lo leen sus bloques
 * (Sobrecupo, Liberar el día) sin pasarlo de mano en mano.
 */
const Firma = createContext<{ quien: string; empresa: string }>({ quien: '', empresa: '' });
export const FirmaWhatsApp = Firma.Provider;
export const usarFirmaWhatsApp = () => useContext(Firma);

/** Si esto es un celular o una tableta: ahí `wa.me` abre la aplicación. */
export function enCelular(): boolean {
  if (typeof navigator === 'undefined') return true;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches);
}

/** Abre un enlace `wa.me` al tiro: la aplicación en el celular, WhatsApp Web en el computador. */
export function abrirWhatsApp(waMe: string) {
  const url = enlaceWhatsAppDirecto(waMe, enCelular());
  const w = window.open(url, '_blank');
  if (w) { try { w.opener = null; } catch { /* sin acceso: da igual */ } }
  else window.location.href = url;
}

export default function BotonWhatsApp({ enlace, children = '💬 WhatsApp', className = '', onAbrir }: {
  /** El `wa.me` con el mensaje, de `enlaceWhatsApp()`. Vacío: no se dibuja. */
  enlace: string;
  children?: ReactNode;
  className?: string;
  /** Lo que pasa además de abrir, como preguntar *¿la mandaste?*. */
  onAbrir?: () => void;
}) {
  if (!enlace) return null;
  return (
    <a href={enlace} target="_blank" rel="noopener noreferrer"
      onClick={(e) => { e.preventDefault(); abrirWhatsApp(enlace); onAbrir?.(); }}
      className={`tecla boton min-h-[44px] !border-verde-fuerte/60 text-verde-texto ${className}`}>
      {children}
    </a>
  );
}

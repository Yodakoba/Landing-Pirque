/**
 * **El título de un link al llegar** (2026-11-13, lo pidió el cliente: cuando
 * la planilla semanal le llega al grupo, *"que diga al tiro planilla semanal
 * de Brasas"*). WhatsApp, y casi cualquier app de mensajes, arma la vista
 * previa con el `og:title` y la `og:description` de la página; hasta hoy todos
 * los links del panel decían *Reservas — Brasas de Lo Pirque*, que es el
 * título del panel interno.
 *
 * - **Sin fechas ni nombres en el título**: WhatsApp guarda la vista previa por
 *   dirección, y la planilla semanal es el mismo link todas las semanas. Un
 *   título con la semana quedaría viejo; uno con un nombre mostraría un dato
 *   de alguien a quien vea el chat.
 * - **No lee la planilla**: es texto fijo, así que no gasta lecturas de
 *   Google. La empresa es la de los mensajes (`EMPRESA_DE_LOS_MENSAJES`).
 * - **Sigue sin indexarse**, igual que todo el panel.
 */
import type { Metadata } from 'next';
import { EMPRESA_DE_LOS_MENSAJES } from './contacto.ts';

export function vistaPrevia(titulo: string, descripcion: string): Metadata {
  const t = `${titulo} · ${EMPRESA_DE_LOS_MENSAJES}`;
  return {
    title: t,
    description: descripcion,
    openGraph: { title: t, description: descripcion, siteName: EMPRESA_DE_LOS_MENSAJES, type: 'website', locale: 'es_CL' },
    robots: { index: false, follow: false }
  };
}

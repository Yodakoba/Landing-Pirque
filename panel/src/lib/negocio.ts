/**
 * Los datos del negocio que van en los documentos que recibe el cliente: la
 * cotización y el contrato.
 *
 * **Quién es el negocio sale de Configuración** cuando está escrito (Fase 1
 * de las cotizaciones); si no, los datos confirmados de siempre.
 *
 * **El WhatsApp es el de Eventos**, no el de Reservas, y eso es deliberado:
 * una cotización se conversa —agencias, empresas, matrimonios— y ese es el
 * canal de ese público. Los dos números son distintos a propósito; ver
 * CLAUDE.md.
 */
import type { Empresa } from './config.ts';

export const NEGOCIO = {
  nombre: 'Brasas de Lo Pirque',
  direccion: 'Casas de San Vicente, lote 4, Pirque, Región Metropolitana',
  email: 'contacto@lopirque.cl',
  whatsapp: '+56 9 3385 8575'
};

export function negocioDe(empresa: Empresa) {
  return {
    nombre: empresa.nombre || NEGOCIO.nombre,
    direccion: empresa.domicilio || NEGOCIO.direccion,
    email: NEGOCIO.email,
    whatsapp: empresa.whatsapp || NEGOCIO.whatsapp,
    razonSocial: empresa.razonSocial,
    rut: empresa.rut
  };
}

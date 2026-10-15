import type { Fecha } from './fechas.ts';
import type { TipoPago } from './columnas.ts';

export interface Reserva {
  id: string;            // ID Orden. MANUAL-<timestamp> si se creó a mano.
  fecha: Fecha;
  nombre: string;
  email: string;
  telefono: string;
  menu: string;          // Tradiciones | A Brasas Abiertas | Niños
  personas: number;
  monto: number | null;  // en blanco para las manuales: el panel no fija precios
  tipoPago: TipoPago | '';
  estadoPago: string;    // el financial_status de Shopify, tal cual
  creada: string;
  asistencia: string;   // '' sin marcar · 'Sí' vino · 'No' no-show
  fila: number;          // número de fila en la planilla, para poder editarla
}

export interface FechaHabil {
  fecha: Fecha;
  capacidad: number;
  apertura: string;      // "13:00"
  estado: string;        // Abierta | Bloqueada
  notas: string;
  fila: number;
}

export interface Ocupacion {
  fecha: Fecha;
  capacidad: number;
  tomadas: number;
  quedan: number;
  online: number;        // personas que ya pagaron
  local: number;         // personas que pagan al llegar
  semaforo: Semaforo;
  bloqueada: boolean;
  notas: string;
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

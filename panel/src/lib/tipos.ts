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
  // **Solo lo escribe Shopify.** Vacío en una reserva anotada a mano: sale
  // del `variant_title` del pedido, y una manual no compró ninguna variante.
  tipoPago: TipoPago | '';
  estadoPago: string;    // el financial_status de Shopify, tal cual
  creada: string;
  asistencia: string;   // '' sin marcar · 'Sí' vino · 'No' no-show
  // Cómo se pagó una reserva anotada a mano: "transferencia 28/10",
  // "efectivo en el mesón". Texto libre a propósito: cuáles son los medios
  // de pago del negocio es dato del cliente, no una lista nuestra.
  notaPago: string;
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
  pagadas: number;       // personas de reservas ya pagadas
  porPagar: number;      // personas a las que hay que cobrarles
  porCobrar: number;     // pesos a cobrar el mismo día
  sinMonto: number;      // reservas por cobrar SIN monto anotado
  privada: boolean;      // recibe reservas, pero el sitio no la ofrece
  semaforo: Semaforo;
  bloqueada: boolean;
  notas: string;
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

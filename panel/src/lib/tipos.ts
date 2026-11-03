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
  /** El id del evento del CRM del socio del que salió, o vacío. */
  eventoCRM: string;
  fila: number;          // número de fila en la planilla, para poder editarla
  /**
   * Cuántas filas de la planilla traen este mismo `ID Orden`. Ausente o 1 es
   * lo normal. Más de una significa que el mismo pedido quedó anotado dos
   * veces: `leerReservasDe()` lo cuenta una sola vez y deja esto para que la
   * pantalla pueda decirlo. Ver su comentario.
   */
  duplicadas?: number;
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
  /**
   * El recinto arrendado **completo y en exclusiva** ese día.
   *
   * Siempre viene junto con `privada`, nunca sola: un día exclusivo es un
   * día privado al que además no le cabe otro evento. Lo que distingue es
   * eso último, y es lo que el calendario del socio necesita — un privado
   * corriente admite un segundo evento en paralelo, un exclusivo no.
   */
  exclusiva: boolean;
  /**
   * Cuántos presupuestos vigentes hay ese día, y cuánta gente sumarían si
   * todos se confirmaran.
   *
   * **Son dos campos que nadie más mira.** No entran en `tomadas`, no
   * descuentan de `quedan` y no mueven el `semaforo`: un presupuesto es una
   * posibilidad, no una silla ocupada, y hasta que se confirme no puede
   * sacarle el lugar a quien sí reservó. Están para poder decirlo en
   * pantalla —"2 presupuestos · 43 posibles"— y para nada más.
   *
   * Al sitio público **nunca llegan**: `paraElSitio()` devuelve tres campos
   * y hay una prueba que lo fija.
   */
  presupuestos: number;
  presupuestadas: number;
  semaforo: Semaforo;
  bloqueada: boolean;
  notas: string;
}

export type Semaforo = 'verde' | 'amarillo' | 'rojo';

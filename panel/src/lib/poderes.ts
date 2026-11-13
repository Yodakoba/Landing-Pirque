/**
 * **Tus poderes** (2026-11-13, lo pidió el cliente: la lista de *"puede / no
 * puede"* de la ayuda era *"muy Excel… como ejecutiva"*; que fuera más
 * entretenida y más fácil de entender).
 *
 * Cada permiso del panel es **un poder con su ícono y un nombre corto**,
 * agrupado en **cinco mundos**. La ayuda los dibuja como casillas:
 * desbloqueado (en color, ✓) o bloqueado (🔒, gris y borde cortado). Tocar uno
 * muestra la frase entera de `PALABRAS`; uno bloqueado ofrece *🙋 Lo
 * necesito*, que lleva al formulario de comentarios con el pedido escrito.
 *
 * **Si un poder está desbloqueado no lo dice esta lista: lo dice `PERMISOS`**,
 * igual que el menú (`puede()`). Acá solo vive cómo se ve. `Record<Accion, …>`
 * hace que un permiso nuevo sin su ícono no compile, y una prueba fija que
 * cada permiso esté en exactamente un mundo.
 *
 * Puro: lo usan la página `/ayuda` y las pruebas.
 */
import { puede, type Accion, type Rol } from './auth.ts';
import { PALABRAS } from './roles.ts';

/** El ícono y el nombre corto de cada poder. */
export const PODER: Record<Accion, { icono: string; corto: string }> = {
  ver: { icono: '👀', corto: 'Ver el calendario' },
  anotar: { icono: '✍️', corto: 'Anotar reservas' },
  reservas: { icono: '📝', corto: 'Editar reservas' },
  asistencia: { icono: '🚪', corto: 'Marcar llegadas' },
  dias: { icono: '📅', corto: 'Abrir y cerrar días' },
  operarDia: { icono: '🧭', corto: 'Llevar el día' },
  cupo: { icono: '📈', corto: 'Subir el cupo' },
  rectificar: { icono: '🔧', corto: 'Rectificar en el día' },
  exclusividad: { icono: '🟣', corto: 'Días exclusivos' },
  equipo: { icono: '👥', corto: 'Armar el equipo' },
  extras: { icono: '🐴', corto: 'Actividades extras' },
  cerrar: { icono: '🔒', corto: 'Cerrar el día' },
  corregir: { icono: '✏️', corto: 'Corregir días cerrados' },
  planilla: { icono: '📲', corto: 'Planilla del grupo' },
  puestos: { icono: '🏷️', corto: 'Editar puestos' },
  links: { icono: '🔗', corto: 'Links personales' },
  sueldos: { icono: '🧾', corto: 'Sueldos y cuentas' },
  presupuestos: { icono: '💼', corto: 'Cotizar' },
  clientes: { icono: '👤', corto: 'Fichas de clientes' },
  aprobar: { icono: '✅', corto: 'Aprobar descuentos' },
  vendedores: { icono: '🤝', corto: 'Ventas y comisiones' },
  informe: { icono: '📊', corto: 'Ver el informe' },
  pagar: { icono: '💸', corto: 'Registrar pagos' },
  boleta: { icono: '🧾', corto: 'Marcar boletas' },
  configurar: { icono: '⚙️', corto: 'Precios y Configuración' },
  bitacora: { icono: '📜', corto: 'Ver la bitácora' },
  usuarios: { icono: '🔑', corto: 'Cuentas y roles' },
  mantencion: { icono: '🛠️', corto: 'Mantención técnica' }
};

/** Los cinco mundos, en el orden en que se leen. */
export const MUNDOS: { id: string; icono: string; nombre: string; poderes: Accion[] }[] = [
  { id: 'reservas', icono: '📅', nombre: 'Reservas y días',
    poderes: ['ver', 'anotar', 'reservas', 'asistencia', 'dias', 'operarDia', 'cupo', 'rectificar', 'exclusividad'] },
  { id: 'equipo', icono: '👥', nombre: 'El equipo',
    poderes: ['equipo', 'extras', 'cerrar', 'corregir', 'planilla', 'puestos', 'links', 'sueldos'] },
  { id: 'ventas', icono: '💼', nombre: 'Ventas',
    poderes: ['presupuestos', 'clientes', 'aprobar', 'vendedores'] },
  { id: 'plata', icono: '💰', nombre: 'La plata',
    poderes: ['informe', 'pagar', 'boleta'] },
  { id: 'sistema', icono: '⚙️', nombre: 'El sistema',
    poderes: ['configurar', 'bitacora', 'usuarios', 'mantencion'] }
];

export interface PoderDeRol { accion: Accion; icono: string; corto: string; frase: string; tiene: boolean }

/** Los mundos de esta cuenta: cada poder con si lo tiene, según `PERMISOS`. */
export function poderesDe(rol: Rol) {
  return MUNDOS.map((m) => {
    const poderes: PoderDeRol[] = m.poderes.map((a) => ({
      accion: a, ...PODER[a], frase: PALABRAS[a], tiene: puede(rol, a)
    }));
    return { ...m, poderes, tiene: poderes.filter((p) => p.tiene).length };
  });
}

/** El texto que deja escrito *🙋 Lo necesito* en el formulario de comentarios. */
export function pedidoDePoder(p: { corto: string; frase: string }): string {
  return `Necesito poder «${p.corto}» (${p.frase.charAt(0).toLowerCase()}${p.frase.slice(1)}) para mi trabajo, porque…`;
}

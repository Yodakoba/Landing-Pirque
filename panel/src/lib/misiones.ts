/**
 * **Las misiones de la ayuda** (2026-11-12, lo pidió el cliente: que cada rol
 * entienda en 4 o 5 pasos lo que puede hacer, *"con gráficas originales, no
 * con gráficas que tú inventas"*, interactivo donde se pueda, y con el
 * formulario de comentarios al centro).
 *
 * Cada rol tiene **cuatro misiones con una captura real de su panel**, tomada
 * con una cuenta de ese rol: el menú y los botones son los que ve.
 *
 * **Tu voz ya no es la quinta misión** (2026-11-13, lo pidió el cliente: *"el
 * formulario tiene que estar muy presente… en primer paso"*): es lo primero
 * de la página `/ayuda`, antes de las misiones (`VozAyuda.tsx`).
 *
 * - **Las capturas no se dibujan: se sacan.** `pruebas/capturas-ayuda.mjs`
 *   abre el panel con cada rol, hace los clics de cada escena, saca la foto a
 *   `public/ayuda/<escena>.jpg` y **mide dónde quedó cada punto** (el centro
 *   del botón o texto real, en su borde izquierdo) en `public/ayuda/puntos.json`. Si una pantalla
 *   cambia, se vuelven a sacar y los puntos caen solos en su lugar.
 * - **El texto de cada punto vive acá**, en el mismo orden que los
 *   localizadores del script. Una prueba fija que cada escena tiene tantos
 *   puntos medidos como textos.
 *
 * Puro: lo usan la página `/ayuda` y las pruebas.
 */
import { ROL, type Rol } from './auth.ts';

export interface Mision {
  id: string;
  emoji: string;
  titulo: string;
  /** Una o dos frases: qué se hace acá. */
  intro: string;
  /** La captura (`public/ayuda/<escena>.jpg`). */
  escena: string;
  /** Qué es cada punto numerado de la captura, en orden. */
  puntos?: string[];
  /** Para ir a hacerlo en la pantalla de verdad. */
  probar?: { texto: string; url: string };
}

const ANFITRION: Mision[] = [
  {
    id: 'recepcion', emoji: '🚪', titulo: 'Tu pantalla: la recepción', escena: 'anf-recepcion',
    intro: 'Ves solo las reservas de hoy, en grande, para recibir a la gente con el teléfono o un tablet en la mano.',
    puntos: [
      'Cuánta gente llegó de la que se espera hoy. Se pone al día solo cada minuto.',
      'Busca a quien llega por su nombre: no hace falta bajar por toda la lista.',
      'Cada reserva es una fila con Llegó y No vino a la vista. El círculo dice cómo viene el pago; con + ves el detalle.'
    ],
    probar: { texto: 'Abrir la recepción', url: '/recepcion' }
  },
  {
    id: 'llego', emoji: '✅', titulo: 'Llegó: ¿llegaron todos?', escena: 'anf-llego',
    intro: 'Al apretar Llegó te muestra cómo ingresarla en Fudo y te pregunta si llegaron todas las personas de esa reserva.',
    puntos: [
      'Si llegaron todas, un toque y listo.',
      'Si llegaron más o menos, cuéntalas con − y +.',
      'Un número distinto no cambia la reserva: le avisa al jefe de turno, que decide.'
    ],
    probar: { texto: 'Abrir la recepción', url: '/recepcion' }
  },
  {
    id: 'cobrar', emoji: '💵', titulo: 'Qué cobrar al abrir la mesa', escena: 'anf-fudo',
    intro: 'El círculo de cada reserva dice cómo viene el pago: ✓ ya pagó, $ se cobra, ½ abonó, ! ojo. Ábrela con + para ver cómo ingresarla en Fudo.',
    puntos: [
      'El círculo: cómo viene el pago, sin abrir nada.',
      'Abierta, dice qué cobrar: el precio sin descuento y el total.',
      'Si alguien no llegó, márcalo No vino.'
    ],
    probar: { texto: 'Abrir la recepción', url: '/recepcion' }
  },
  {
    id: 'avisar', emoji: '📣', titulo: 'Avisar al jefe de turno', escena: 'anf-aviso',
    intro: 'Para lo que no cambias tú —personas, menús, pago o un pedido especial— abre la reserva con + y le escribes al jefe de turno.',
    puntos: [
      'Escribe el aviso en pocas palabras.',
      'Avisar se lo manda al jefe de turno.',
      'Volver cierra sin mandar nada.'
    ],
    probar: { texto: 'Abrir la recepción', url: '/recepcion' }
  }
];

const VENDEDOR: Mision[] = [
  {
    id: 'calendario', emoji: '📅', titulo: 'El calendario: qué hay para vender', escena: 'ven-calendario',
    intro: 'Cada día dice cuánta gente lleva y cuánto cupo le queda, para saber qué ofrecer.',
    puntos: [
      'Tus reservas nacen de una cotización ganada: se parte cotizando.',
      'La gente reservada sobre el cupo del día. La barra dice cuánto queda.',
      'Quiénes vienen ese día.'
    ],
    probar: { texto: 'Abrir el calendario', url: '/' }
  },
  {
    id: 'cotizar', emoji: '🧾', titulo: 'Cotizar en 5 pasos', escena: 'ven-cotizar',
    intro: 'Cliente, Evento, Productos, Envío y Contrato. Lo cotizado no ocupa cupo hasta que se gana.',
    puntos: [
      'Los cinco pasos: el dorado es en el que vas.',
      'Busca al cliente antes de crearlo: así no queda dos veces.',
      'Si no está, créalo con su nombre y un teléfono o correo.',
      'Seguir al paso 2 lo guarda.'
    ],
    probar: { texto: 'Abrir Cotizaciones', url: '/presupuestos' }
  },
  {
    id: 'ganar', emoji: '🏆', titulo: 'Mandarla, esperar y ganarla', escena: 'ven-envio',
    intro: 'En el paso 4 está el camino de la venta, de Enviada a Pagada. El panel te avisa cuándo preguntarle al cliente.',
    puntos: [
      'El camino de la venta: cada hito se pinta al cumplirse.',
      'El que sigue: el anticipo del cliente. Con él se marca ganada.',
      'Ofrécele otra versión con una alternativa: van todas en un solo link.'
    ],
    probar: { texto: 'Abrir Cotizaciones', url: '/presupuestos' }
  },
  {
    id: 'resumen', emoji: '💰', titulo: 'Mi resumen: lo que ganas', escena: 'ven-resumen',
    intro: 'Tu comisión cuenta cuando el cliente termina de pagar y el encargado de pagos lo revisa. Aquí ves cuánto te toca y cuánto viene.',
    puntos: [
      'Lo que te toca en el periodo. El ? explica cómo se calcula.',
      'Lo que ya se te pagó y lo que falta.',
      'Lo que viene: las ganadas que el cliente todavía está pagando o que falta revisar, y las mandadas que siguen en curso.'
    ],
    probar: { texto: 'Abrir Mi resumen', url: '/vendedores' }
  }
];

const DIA: Mision = {
  id: 'dia', emoji: '📋', titulo: 'El día: quién viene y qué preparar', escena: 'enc-dia',
  intro: 'Toca una fecha del calendario y ves todo ese día en una sola pantalla.',
  puntos: [
    'Cuántos de cada menú hay que preparar.',
    'Cómo viene el pago: cuánta gente ya pagó y a cuánta hay que cobrarle.',
    'Anota a alguien que llamó o escribió por WhatsApp.',
    'Cada reserva con su pago; el + la abre.'
  ],
  probar: { texto: 'Abrir el calendario', url: '/' }
};

const TURNOS: Mision = {
  id: 'turnos', emoji: '👥', titulo: 'Turnos: armar el equipo', escena: 'enc-turnos',
  intro: 'El mes completo para asignar gente a cualquier día, también a los de preparación.',
  puntos: [
    'Los días que ya pasaron y falta cerrar.',
    'Toca uno para abrirlo y terminarlo.',
    'Muévete de mes para planificar lo que viene.'
  ],
  probar: { texto: 'Abrir Turnos', url: '/turnos' }
};

const ENCARGADO: Mision[] = [
  DIA,
  TURNOS,
  {
    id: 'cerrar', emoji: '🔒', titulo: 'Marcar quién vino y cerrar el día', escena: 'enc-cerrar',
    intro: 'En la ventana del día marcas Vino o No vino de cada persona y anotas la propina. Al final, '
      + 'Cerrar el día pregunta antes y muestra lo que declaras.',
    puntos: [
      'Las dos caras del día: quién trabaja y quién reservó.',
      'Cada persona con su Vino o No vino. Mientras alguien quede sin marcar, el día no se cierra.',
      'Suma a alguien al puesto. El panel sugiere cuántos hacen falta según la gente reservada.'
    ],
    probar: { texto: 'Abrir Turnos', url: '/turnos' }
  },
  {
    id: 'recepcion', emoji: '🚪', titulo: 'La recepción y qué cobrar', escena: 'enc-recepcion',
    intro: 'La misma pantalla de la entrada. Los avisos que manda la anfitriona te llegan a ti.',
    puntos: [
      'Qué cobrar al abrir la mesa en Fudo.',
      'Marca quién llegó.',
      'El aviso al jefe de turno: lo lees y decides.'
    ],
    probar: { texto: 'Abrir la recepción', url: '/recepcion' }
  }
];

const OPERACIONES: Mision[] = [
  { ...DIA, escena: 'ope-dia' },
  { ...TURNOS, escena: 'ope-turnos' },
  {
    id: 'corregir', emoji: '✏️', titulo: 'Corregir un día cerrado', escena: 'ope-corregir',
    intro: 'Un día cerrado queda en solo lectura. Tú lo puedes corregir, con un motivo que queda en la bitácora.',
    puntos: [
      'Quién lo cerró y cuándo.',
      'Corregir este día: arreglas lo que haga falta y guardas con el motivo. El día sigue cerrado.',
      'Las dos caras: trabajadores y reservas.'
    ],
    probar: { texto: 'Abrir Turnos', url: '/turnos' }
  },
  {
    id: 'informe', emoji: '📊', titulo: 'El informe: lo que cuesta el equipo', escena: 'ope-informe',
    intro: 'Por persona: cuántos días vino, sus jornadas, ajustes y total.',
    puntos: [
      'Elige el periodo: día, semana, mes u otro rango.',
      'Si falta cerrar un turno, el total está incompleto.',
      'Trabajadores y extras, cada uno con lo que falta.'
    ],
    probar: { texto: 'Abrir el informe', url: '/informe' }
  }
];

const PAGOS: Mision[] = [
  {
    id: 'informe', emoji: '📊', titulo: 'El informe: qué se paga', escena: 'pag-informe',
    intro: 'Parte en la semana pasada, que es la que se paga. Todo lo de pagar al equipo sale de aquí.',
    puntos: [
      'El periodo: semana, mes, día u otro rango.',
      'La planilla para el banco: sueldos, propinas o completa.',
      'La transferencia masiva: bajas la planilla, la subes al banco y marcas todos pagados.'
    ],
    probar: { texto: 'Abrir el informe', url: '/informe' }
  },
  {
    id: 'pagar', emoji: '💸', titulo: 'Pagarle a cada uno', escena: 'pag-pagar',
    intro: 'Aprieta la línea de una persona y se abre lo suyo, listo para transferir.',
    puntos: [
      'Copia el sueldo: la cuenta y el monto, para pegarlos en el banco.',
      'La propina va en otra transferencia.',
      'El detalle de los días que vino.'
    ],
    probar: { texto: 'Abrir el informe', url: '/informe' }
  },
  {
    id: 'cobros', emoji: '🧾', titulo: 'La plata de los clientes', escena: 'pag-cobros',
    intro: 'En cada cotización, el paso Envío lleva los pagos del cliente con su comprobante. Tú los revisas. Lo que anotan otros —pagos de reservas, descuentos, cuentas— te llega además a la bandeja de la portada.',
    puntos: [
      'El pago: las condiciones y lo que ya pagó el cliente.',
      'Anota lo que pagó: el anticipo, todo u otro monto, con su comprobante. Una devolución es un pago en negativo.',
      'Cuánto es el anticipo y hasta cuándo se paga el saldo.'
    ],
    probar: { texto: 'Abrir Cotizaciones', url: '/presupuestos' }
  },
  {
    id: 'vendedores', emoji: '🤝', titulo: 'Vendedores y socios', escena: 'pag-vendedores',
    intro: 'Lo que le toca a cada vendedor y socio comercial, y cómo se le paga.',
    puntos: [
      'Elige a quién mirar: vendedores o socios comerciales.',
      'Lo que le toca en el periodo. El ? explica el cálculo.',
      'Lo que ya se le pagó y lo que falta.'
    ],
    probar: { texto: 'Abrir Vendedores', url: '/vendedores' }
  }
];

const ADMIN: Mision[] = [
  {
    id: 'cuentas', emoji: '🔑', titulo: 'Las cuentas de cada uno', escena: 'adm-cuentas',
    intro: 'Una cuenta por persona, con su rol. Así la bitácora dice quién hizo qué.',
    puntos: [
      'Ver como…: mira el panel como cualquier rol.',
      'El rol de la cuenta. Su ? explica qué puede y qué no.',
      'La vista gerencia deja mirar todo y editar solo lo de su rol.'
    ],
    probar: { texto: 'Abrir Cuentas', url: '/usuarios' }
  },
  {
    id: 'config', emoji: '⚙️', titulo: 'La configuración', escena: 'adm-config',
    intro: 'Precios, plazos, el contrato y lo que ve el público, ordenado por secciones.',
    puntos: [
      'Salta directo a cada sección.',
      'Reservas del sitio: esto cambia lo que ve el público.',
      'Mantención técnica.'
    ],
    probar: { texto: 'Abrir Configuración', url: '/config' }
  },
  {
    id: 'bitacora', emoji: '📜', titulo: 'La bitácora: quién hizo qué', escena: 'adm-bitacora',
    intro: 'Cada cambio con nombre y hora. Sirve para saber a quién preguntar, no para deshacer.',
    puntos: ['Cuándo, en hora de Chile.', 'Quién lo hizo.', 'Qué hizo.'],
    probar: { texto: 'Abrir la bitácora', url: '/bitacora' }
  },
  {
    id: 'vercomo', emoji: '👀', titulo: 'Ver el panel como otro rol', escena: 'adm-vercomo',
    intro: 'Elige un rol y recorres su panel y su ayuda tal como los ve esa persona. Vuelves con un toque.',
    puntos: [
      'Cada rol con lo que puede hacer.',
      'Así revisas, por ejemplo, las misiones del encargado de operaciones.',
      'Es para revisar, no para pasarle el teléfono a alguien.'
    ]
  }
];

/** Las cuatro misiones de cada rol, cada una con su captura. */
export function misionesDe(rol: Rol): Mision[] {
  const propias = rol === ROL.anfitrion ? ANFITRION
    : rol === ROL.vendedor ? VENDEDOR
    : rol === ROL.encargado ? ENCARGADO
    : rol === ROL.operaciones ? OPERACIONES
    : rol === ROL.pagos || rol === ROL.gerencia ? PAGOS
    : rol === ROL.admin ? ADMIN
    : [];
  // La gerencia general tiene las de quien paga, con sus propias capturas
  // (su menú dice *Gerencia general*).
  const con = rol === ROL.gerencia
    ? propias.map((m) => ({ ...m, escena: m.escena.replace(/^pag-/, 'ger-') }))
    : propias;
  return con;
}

/** Todas las escenas que hay que fotografiar, sin repetir. */
export function escenasDeLasMisiones(): string[] {
  const roles = [ROL.anfitrion, ROL.vendedor, ROL.encargado, ROL.operaciones, ROL.pagos, ROL.gerencia, ROL.admin];
  return [...new Set(roles.flatMap((r) => misionesDe(r).map((m) => m.escena)))];
}
